import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatRequest,
  ChatResponse,
  StreamChunk,
} from "@/types/api";
import type { AgentSpec } from "@/types/agent";

// ---------------------------------------------------------------------------
// Client singleton — server-side only
// ---------------------------------------------------------------------------

function createClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeConfigError(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local."
    );
  }
  return new Anthropic({ apiKey });
}

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const DEFAULT_MODEL =
  process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export const DEFAULT_MAX_TOKENS = Number(
  process.env.ANTHROPIC_MAX_TOKENS ?? 8192
);

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

export class ClaudeConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClaudeConfigError";
  }
}

export class ClaudeApiError extends Error {
  public readonly statusCode?: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    options?: { statusCode?: number; requestId?: string; cause?: Error }
  ) {
    super(message, { cause: options?.cause });
    this.name = "ClaudeApiError";
    this.statusCode = options?.statusCode;
    this.requestId = options?.requestId;
  }
}

export class ClaudeStreamError extends Error {
  constructor(message: string, options?: { cause?: Error }) {
    super(message, options);
    this.name = "ClaudeStreamError";
  }
}

export class ClaudeRateLimitError extends Error {
  /** Seconds to wait before retrying, if provided by the API */
  public readonly retryAfter?: number;

  constructor(message: string, options?: { retryAfter?: number; cause?: Error }) {
    super(message, { cause: options?.cause });
    this.name = "ClaudeRateLimitError";
    this.retryAfter = options?.retryAfter;
  }
}

export class ClaudeTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Claude API call timed out after ${timeoutMs}ms`);
    this.name = "ClaudeTimeoutError";
  }
}

// ---------------------------------------------------------------------------
// Non-streaming completion
// ---------------------------------------------------------------------------

export async function complete(request: ChatRequest): Promise<ChatResponse> {
  const client = getClient();

  try {
    const response = await client.messages.create({
      model: request.model ?? DEFAULT_MODEL,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: request.systemPrompt,
      messages: request.messages,
    });

    const content = response.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { type: "text"; text: string }).text)
      .join("");

    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      model: response.model,
      stopReason: response.stop_reason ?? "end_turn",
    };
  } catch (err) {
    throw normalizeError(err);
  }
}

// ---------------------------------------------------------------------------
// Streaming completion — returns a ReadableStream of SSE-formatted chunks
// ---------------------------------------------------------------------------

export async function stream(request: ChatRequest): Promise<ReadableStream> {
  const client = getClient();

  let anthropicStream: AsyncIterable<Anthropic.MessageStreamEvent>;

  try {
    anthropicStream = await client.messages.create({
      model: request.model ?? DEFAULT_MODEL,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: request.systemPrompt,
      messages: request.messages,
      stream: true,
    });
  } catch (err) {
    throw normalizeError(err);
  }

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of anthropicStream) {
          const chunk: StreamChunk = {
            type: event.type as StreamChunk["type"],
          };

          // Forward text deltas
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            chunk.delta = { type: "text_delta", text: event.delta.text };
            chunk.index = event.index;
          }

          // Forward usage on message_delta
          if (event.type === "message_delta" && event.usage) {
            chunk.usage = {
              input_tokens: 0,
              output_tokens: event.usage.output_tokens,
            };
          }

          // Encode as SSE
          const data = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(encoder.encode(data));
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (err) {
        const streamErr = new ClaudeStreamError("Stream interrupted", {
          cause: err instanceof Error ? err : undefined,
        });
        controller.error(streamErr);
      }
    },
  });
}

// ---------------------------------------------------------------------------
// Agent preview — server-side only
// ---------------------------------------------------------------------------

export interface PreviewOptions {
  /** Abort after this many ms (default: 30 000) */
  timeoutMs?: number;
  /** External abort signal — merged with the internal timeout signal */
  signal?: AbortSignal;
}

/**
 * Run an agent spec against a test input and return the full text response.
 * Includes automatic timeout protection and specific handling for rate limits.
 */
export async function generateAgentPreview(
  spec: AgentSpec,
  testInput: string,
  options: PreviewOptions = {}
): Promise<string> {
  const { timeoutMs = 30_000, signal: externalSignal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);

  // Merge external signal if provided
  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason));
  }

  try {
    const client = getClient();
    const response = await client.messages.create(
      {
        model: spec.model,
        max_tokens: spec.maxTokens,
        temperature: spec.temperature,
        system: spec.systemPrompt,
        messages: [{ role: "user", content: testInput }],
      },
      { signal: controller.signal }
    );

    return response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    throw normalizePreviewError(err, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Stream an agent spec response as an async generator of text chunks.
 * Yields each text delta as soon as it arrives from the API.
 */
export async function* streamAgentPreview(
  spec: AgentSpec,
  testInput: string,
  options: PreviewOptions = {}
): AsyncGenerator<string, void, unknown> {
  const { timeoutMs = 30_000, signal: externalSignal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);

  if (externalSignal) {
    externalSignal.addEventListener("abort", () => controller.abort(externalSignal.reason));
  }

  try {
    const client = getClient();
    const stream = client.messages.stream(
      {
        model: spec.model,
        max_tokens: spec.maxTokens,
        temperature: spec.temperature,
        system: spec.systemPrompt,
        messages: [{ role: "user", content: testInput }],
      },
      { signal: controller.signal }
    );

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  } catch (err) {
    throw normalizePreviewError(err, timeoutMs);
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Error normalisation
// ---------------------------------------------------------------------------

function normalizePreviewError(err: unknown, timeoutMs: number): Error {
  // Timeout
  if (
    (err instanceof Error && err.message === "timeout") ||
    (err instanceof DOMException && err.name === "AbortError")
  ) {
    return new ClaudeTimeoutError(timeoutMs);
  }
  return normalizeError(err);
}

function normalizeError(err: unknown): ClaudeApiError | ClaudeRateLimitError {
  if (err instanceof Anthropic.APIError) {
    // Rate limit
    if (err.status === 429) {
      const retryAfter = parseRetryAfter(err.headers);
      return new ClaudeRateLimitError(
        "Rate limit reached. Please wait before retrying.",
        { retryAfter, cause: err }
      );
    }
    return new ClaudeApiError(err.message, {
      statusCode: err.status,
      requestId: err.headers?.["request-id"] as string | undefined,
      cause: err,
    });
  }
  if (err instanceof Error) {
    return new ClaudeApiError(err.message, { cause: err });
  }
  return new ClaudeApiError("Unknown error from Claude API");
}

function parseRetryAfter(headers: unknown): number | undefined {
  if (!headers || typeof headers !== "object") return undefined;
  const value = (headers as Record<string, string>)["retry-after"];
  if (!value) return undefined;
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
}
