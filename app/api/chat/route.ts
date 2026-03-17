import { NextRequest, NextResponse } from "next/server";
import { complete, stream, ClaudeApiError, ClaudeConfigError } from "@/lib/claude-client";
import type { ChatRequest, ApiErrorResponse } from "@/types/api";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(
  message: string,
  code: string,
  status: number
): NextResponse<ApiErrorResponse> {
  return NextResponse.json<ApiErrorResponse>(
    { success: false, error: { code, message } },
    { status }
  );
}

export async function POST(req: NextRequest) {
  let body: ChatRequest;

  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return errorResponse("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!body.messages || !Array.isArray(body.messages)) {
    return errorResponse("messages array is required", "VALIDATION_ERROR", 422);
  }

  try {
    // Streaming path
    if (body.stream) {
      const readable = await stream(body);
      return new NextResponse(readable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          "X-Accel-Buffering": "no",
        },
      });
    }

    // Non-streaming path
    const result = await complete(body);
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    if (err instanceof ClaudeConfigError) {
      console.error("[/api/chat] Config error:", err.message);
      return errorResponse(err.message, "CONFIG_ERROR", 500);
    }
    if (err instanceof ClaudeApiError) {
      console.error("[/api/chat] Claude API error:", err.message, {
        statusCode: err.statusCode,
        requestId: err.requestId,
      });
      const status = err.statusCode ?? 500;
      return errorResponse(err.message, "CLAUDE_API_ERROR", status);
    }
    console.error("[/api/chat] Unexpected error:", err);
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
