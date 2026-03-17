import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Generate a random ID (not cryptographically secure, for UI only) */
export function generateId(prefix?: string): string {
  const id = Math.random().toString(36).slice(2, 11);
  return prefix ? `${prefix}_${id}` : id;
}

/** Format a timestamp to a human-readable relative string */
export function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const date = new Date(timestamp).getTime();
  const diffMs = now - date;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/** Truncate a string to a max length */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/** Delay execution for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Parse SSE data lines from a streamed response */
export function parseSSELine(line: string): unknown | null {
  if (!line.startsWith("data: ")) return null;
  const raw = line.slice(6).trim();
  if (raw === "[DONE]") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Consume a ReadableStream of SSE and call onChunk for each text delta */
export async function consumeSSEStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  onDone?: () => void
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const parsed = parseSSELine(line);
        if (!parsed) continue;

        const chunk = parsed as { delta?: { type: string; text?: string } };
        if (chunk.delta?.type === "text_delta" && chunk.delta.text) {
          onChunk(chunk.delta.text);
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone?.();
  }
}
