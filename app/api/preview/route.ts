/**
 * app/api/preview/route.ts
 *
 * POST /api/preview
 *
 * Accepts { spec: AgentSpec, userInput: string } and streams back:
 *   - SSE "chunk" events as Claude generates text
 *   - A final SSE "result" event containing the full PreviewResult
 *   - A "data: [DONE]" sentinel
 *
 * The hook (useLivePreview) consumes this stream.
 */

import { NextRequest, NextResponse } from "next/server";
import { streamPreview, testSpecWithPrompt } from "@/lib/services/previewEngine";
import { measureCompliance } from "@/lib/services/complianceChecker";
import {
  ClaudeApiError,
  ClaudeConfigError,
  ClaudeRateLimitError,
  ClaudeTimeoutError,
} from "@/lib/claude-client";
import type { AgentSpec } from "@/types/agent";
import type { ApiErrorResponse } from "@/types/api";
import type { PreviewResult, PreviewStreamEvent } from "@/types/preview";

export const runtime = "nodejs";
export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Request body
// ---------------------------------------------------------------------------

interface PreviewRequest {
  spec: AgentSpec;
  userInput: string;
  /** When true, respond with a single JSON object instead of SSE */
  stream?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sseEncode(event: PreviewStreamEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

function errorResponse(message: string, code: string, status: number): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error: { code, message } },
    { status }
  );
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  let body: PreviewRequest;

  try {
    body = (await req.json()) as PreviewRequest;
  } catch {
    return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!body.spec || typeof body.spec !== "object") {
    return errorResponse("spec is required", "VALIDATION_ERROR", 422);
  }

  if (!body.userInput || typeof body.userInput !== "string") {
    return errorResponse("userInput is required", "VALIDATION_ERROR", 422);
  }

  const { spec, userInput } = body;

  // ── Non-streaming path ───────────────────────────────────────────────────

  if (body.stream === false) {
    try {
      const result = await testSpecWithPrompt(spec, userInput);
      return NextResponse.json({ success: true, data: result });
    } catch (err) {
      return handleError(err);
    }
  }

  // ── Streaming path (SSE) ─────────────────────────────────────────────────

  const encoder = new TextEncoder();
  const abortController = new AbortController();

  // Honour client disconnect
  req.signal.addEventListener("abort", () => abortController.abort());

  const readable = new ReadableStream({
    async start(controller) {
      const enqueue = (event: PreviewStreamEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };

      const chunks: string[] = [];

      try {
        const start = Date.now();

        // Stream text chunks
        for await (const text of streamPreview(spec, userInput, abortController.signal)) {
          chunks.push(text);
          enqueue({ type: "chunk", text });
        }

        // Once streaming is done, compute the full PreviewResult
        const fullResponse = chunks.join("");
        const compliance = measureCompliance(spec, fullResponse);
        const issues: string[] = [];

        for (const detail of compliance.details) {
          if (detail.score < 50) {
            issues.push(`[${detail.aspect}] ${detail.description}`);
          }
        }
        if (!compliance.actionsAllowed) {
          issues.push("Response may contain content the spec prohibits.");
        }

        const result: PreviewResult = {
          response: fullResponse,
          matchesSpec: compliance.overallScore >= 70,
          issues,
          compliance,
          latencyMs: Date.now() - start,
        };

        enqueue({ type: "result", data: result });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const message = toErrorMessage(err);
        enqueue({ type: "error", message });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },

    cancel() {
      abortController.abort();
    },
  });

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function handleError(err: unknown): NextResponse<ApiErrorResponse> {
  if (err instanceof ClaudeConfigError) {
    return errorResponse(err.message, "CONFIG_ERROR", 500);
  }
  if (err instanceof ClaudeRateLimitError) {
    return errorResponse(
      err.retryAfter
        ? `Rate limit reached. Retry after ${err.retryAfter}s.`
        : "Rate limit reached. Please try again later.",
      "RATE_LIMITED",
      429
    );
  }
  if (err instanceof ClaudeTimeoutError) {
    return errorResponse(err.message, "TIMEOUT", 504);
  }
  if (err instanceof ClaudeApiError) {
    return errorResponse(err.message, "CLAUDE_API_ERROR", err.statusCode ?? 500);
  }
  console.error("[/api/preview] Unexpected error:", err);
  return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
}

function toErrorMessage(err: unknown): string {
  if (err instanceof ClaudeRateLimitError) {
    return err.retryAfter
      ? `Rate limit reached. Retry after ${err.retryAfter}s.`
      : "Rate limit reached. Please try again later.";
  }
  if (err instanceof ClaudeTimeoutError) return err.message;
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
}
