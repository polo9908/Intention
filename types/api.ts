import type { ID } from "./common";

/** Generic API success response */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  requestId?: string;
}

/** Generic API error response */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

/** Union of all API responses */
export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse;

/** Claude streaming chunk event types */
export type StreamEventType =
  | "message_start"
  | "content_block_start"
  | "content_block_delta"
  | "content_block_stop"
  | "message_delta"
  | "message_stop"
  | "error";

/** A single streamed chunk from Claude */
export interface StreamChunk {
  type: StreamEventType;
  index?: number;
  delta?: {
    type: "text_delta" | "input_json_delta";
    text?: string;
  };
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

/** Request body for /api/chat */
export interface ChatRequest {
  agentId?: ID;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  systemPrompt?: string;
  model?: string;
  maxTokens?: number;
  stream?: boolean;
}

/** Non-streaming chat response */
export interface ChatResponse {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  model: string;
  stopReason: string;
}
