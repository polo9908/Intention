"use client";

/**
 * hooks/useLivePreview.ts
 *
 * React hook that watches an AgentSpec + user input, debounces changes,
 * and streams a live preview from /api/preview.
 *
 * Usage
 * ──────
 *   const {
 *     response,      // streamed text (grows in real-time)
 *     isLoading,     // true while request is in-flight
 *     error,         // error message or null
 *     result,        // full PreviewResult once stream completes
 *     validation,    // ValidationResult (client-side, synchronous)
 *     trigger,       // call this to fire immediately without waiting for debounce
 *     cancel,        // abort the in-flight request
 *   } = useLivePreview({ spec, userInput });
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { validateSpec } from "@/lib/services/specValidator";
import type { AgentSpec } from "@/types/agent";
import type { PreviewResult, ValidationResult, PreviewStreamEvent } from "@/types/preview";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseLivePreviewOptions {
  spec: AgentSpec | null;
  userInput: string;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Skip automatic triggering — useful when you only want manual calls */
  manual?: boolean;
}

export interface UseLivePreviewReturn {
  /** Partial (streaming) or full response text */
  response: string;
  isLoading: boolean;
  error: string | null;
  /** Populated once the stream completes */
  result: PreviewResult | null;
  /** Synchronous client-side spec validation, updated whenever spec changes */
  validation: ValidationResult | null;
  /** Fire a preview call immediately, bypassing debounce */
  trigger: () => void;
  /** Abort the in-flight request */
  cancel: () => void;
}

// ---------------------------------------------------------------------------
// SSE stream parser
// ---------------------------------------------------------------------------

async function* parseSSE(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<PreviewStreamEvent> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") return;
      try {
        yield JSON.parse(payload) as PreviewStreamEvent;
      } catch {
        // malformed chunk — skip
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useLivePreview({
  spec,
  userInput,
  debounceMs = 500,
  manual = false,
}: UseLivePreviewOptions): UseLivePreviewReturn {
  const [response, setResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PreviewResult | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronous client-side validation — runs instantly on spec change
  const validation: ValidationResult | null = useMemo(
    () => (spec ? validateSpec(spec) : null),
    [spec]
  );

  // ── Core fetch ────────────────────────────────────────────────────────────

  const run = useCallback(
    async (currentSpec: AgentSpec, input: string) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError(null);
      setResponse("");
      setResult(null);

      try {
        const res = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spec: currentSpec, userInput: input }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const json = (await res.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(json?.error?.message ?? `HTTP ${res.status}`);
        }

        if (!res.body) throw new Error("Response has no body");

        const reader = res.body.getReader();

        for await (const event of parseSSE(reader)) {
          if (controller.signal.aborted) break;

          if (event.type === "chunk") {
            setResponse((prev) => prev + event.text);
          } else if (event.type === "result") {
            setResult(event.data);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          // Cancelled by the user or superseded — not an error
          return;
        }
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  // ── Manual trigger ────────────────────────────────────────────────────────

  const trigger = useCallback(() => {
    if (!spec || !userInput.trim()) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    void run(spec, userInput);
  }, [spec, userInput, run]);

  // ── Cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  // ── Auto-trigger with debounce ────────────────────────────────────────────

  useEffect(() => {
    if (manual || !spec || !userInput.trim()) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      void run(spec, userInput);
    }, debounceMs);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // run is stable (useCallback with []), so including it is safe
  }, [spec, userInput, debounceMs, manual, run]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  return { response, isLoading, error, result, validation, trigger, cancel };
}
