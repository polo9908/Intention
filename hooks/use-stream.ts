"use client";

import { useState, useCallback, useRef } from "react";
import { consumeSSEStream } from "@/lib/utils";
import type { ChatRequest } from "@/types/api";

interface UseStreamOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: Error) => void;
}

interface UseStreamReturn {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  startStream: (request: ChatRequest) => Promise<void>;
  abort: () => void;
  reset: () => void;
}

export function useStream(options: UseStreamOptions = {}): UseStreamReturn {
  const [content, setContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fullTextRef = useRef("");

  const startStream = useCallback(
    async (request: ChatRequest) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setContent("");
      setError(null);
      setIsStreaming(true);
      fullTextRef.current = "";

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...request, stream: true }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(
            data?.error?.message ?? `HTTP ${response.status}: ${response.statusText}`
          );
        }

        if (!response.body) {
          throw new Error("No response body");
        }

        await consumeSSEStream(
          response.body,
          (chunk) => {
            fullTextRef.current += chunk;
            setContent((prev) => prev + chunk);
            options.onChunk?.(chunk);
          },
          () => {
            setIsStreaming(false);
            options.onComplete?.(fullTextRef.current);
          }
        );
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setIsStreaming(false);
          return;
        }
        const error =
          err instanceof Error ? err : new Error("Stream failed");
        setError(error);
        setIsStreaming(false);
        options.onError?.(error);
      }
    },
    [options]
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setContent("");
    setError(null);
    fullTextRef.current = "";
  }, [abort]);

  return { content, isStreaming, error, startStream, abort, reset };
}
