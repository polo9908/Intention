"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useLivePreview } from "@/hooks/useLivePreview";
import type { AgentSpec } from "@/types/agent";
import type { SpecContext } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LivePreviewProps {
  spec: AgentSpec;
  contexts: SpecContext[];
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-text-secondary">{label}</span>
        <span
          className={cn(
            "text-xs font-mono font-medium",
            score >= 70 ? "text-success" : score >= 40 ? "text-warning" : "text-error"
          )}
        >
          {score}%
        </span>
      </div>
      <div className="h-1 bg-background rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            score >= 70 ? "bg-success" : score >= 40 ? "bg-warning" : "bg-error"
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function StatusBadge({ matches }: { matches: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        matches
          ? "bg-success/15 text-success border border-success/30"
          : "bg-warning/15 text-warning border border-warning/30"
      )}
    >
      {matches ? (
        <>
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
          </svg>
          MATCHES SPEC
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" />
          </svg>
          DOESN'T MATCH
        </>
      )}
    </div>
  );
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-0.5 items-center ml-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-accent animate-pulse"
          style={{ animationDelay: `${i * 150}ms` }}
        />
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function LivePreview({ spec, contexts }: LivePreviewProps) {
  const sortedContexts = [...contexts].sort((a, b) => a.order - b.order);
  const [selectedContextId, setSelectedContextId] = useState<string>(
    sortedContexts[0]?.id ?? ""
  );
  const [testInput, setTestInput] = useState("");
  const [showPrompt, setShowPrompt] = useState(false);

  const selectedContext = sortedContexts.find((c) => c.id === selectedContextId);

  // Build a context-flavoured user input for the auto-preview
  const effectiveInput =
    testInput ||
    (selectedContext
      ? `I have a question about ${selectedContext.name.toLowerCase()}.`
      : "Hello, I need help.");

  const { response, isLoading, error, result, validation, trigger, cancel } =
    useLivePreview({
      spec,
      userInput: effectiveInput,
      debounceMs: 500,
      manual: true, // only run when user explicitly clicks TEST
    });

  const handleTest = useCallback(() => {
    if (isLoading) {
      cancel();
    } else {
      trigger();
    }
  }, [isLoading, trigger, cancel]);

  return (
    <aside className="flex flex-col h-full bg-surface border-l border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Live Preview
        </h2>
        {validation && (
          <span
            className={cn(
              "text-[10px] font-mono px-1.5 py-0.5 rounded",
              validation.isValid
                ? "bg-success/15 text-success"
                : "bg-error/15 text-error"
            )}
          >
            {validation.isValid ? "spec valid" : `${validation.errors.length} error${validation.errors.length !== 1 ? "s" : ""}`}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Context selector */}
        <section className="px-4 pt-4 pb-3 border-b border-border">
          <label className="block text-xs text-text-secondary mb-1.5 font-medium">
            Test context
          </label>
          {sortedContexts.length > 0 ? (
            <select
              value={selectedContextId}
              onChange={(e) => setSelectedContextId(e.target.value)}
              className={cn(
                "w-full bg-background border border-border rounded px-3 py-2",
                "text-sm text-text-primary outline-none",
                "focus:border-accent/60 focus:shadow-glow-sm transition-all duration-150",
                "appearance-none"
              )}
            >
              {sortedContexts.map((ctx) => (
                <option key={ctx.id} value={ctx.id}>
                  {ctx.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-text-secondary italic">No contexts defined yet.</p>
          )}
        </section>

        {/* Test input */}
        <section className="px-4 py-3 border-b border-border">
          <label className="block text-xs text-text-secondary mb-1.5 font-medium">
            Test input{" "}
            <span className="text-text-secondary/50 font-normal">(optional)</span>
          </label>
          <textarea
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder={
              selectedContext
                ? `e.g. I have a ${selectedContext.name.toLowerCase()} issue…`
                : "Type a test message…"
            }
            rows={3}
            className={cn(
              "w-full bg-background border border-border rounded px-3 py-2",
              "text-sm text-text-primary placeholder:text-text-secondary/40",
              "outline-none resize-none leading-relaxed",
              "focus:border-accent/60 transition-all duration-150"
            )}
          />

          {/* Test / cancel button */}
          <button
            onClick={handleTest}
            disabled={!spec.systemPrompt.trim() || sortedContexts.length === 0}
            className={cn(
              "mt-2 w-full py-2 rounded text-sm font-medium transition-all duration-150",
              isLoading
                ? "bg-surface border border-border text-text-secondary hover:border-error/50 hover:text-error"
                : "bg-accent/15 border border-accent/40 text-accent hover:bg-accent/25 hover:shadow-glow-sm",
              "disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Stop
              </span>
            ) : (
              "Test spec →"
            )}
          </button>
        </section>

        {/* Response area */}
        {(response || isLoading) && (
          <section className="px-4 py-3 border-b border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                Response
              </span>
              {isLoading && <StreamingDots />}
              {result && !isLoading && (
                <span className="text-xs text-text-secondary font-mono">
                  {result.latencyMs}ms
                </span>
              )}
            </div>
            <div
              className={cn(
                "bg-background rounded border border-border p-3",
                "text-sm text-text-primary leading-relaxed whitespace-pre-wrap"
              )}
            >
              {response}
              {isLoading && (
                <span className="inline-block w-0.5 h-4 bg-accent align-middle ml-0.5 animate-pulse" />
              )}
            </div>
          </section>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <section className="px-4 py-3 border-b border-border">
            <div className="bg-error/10 border border-error/30 rounded p-3 flex gap-2">
              <svg className="w-4 h-4 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M12 3l9 16H3L12 3z" />
              </svg>
              <p className="text-xs text-error">{error}</p>
            </div>
          </section>
        )}

        {/* Compliance results */}
        {result && !isLoading && (
          <section className="px-4 py-3 space-y-3">
            {/* Match status */}
            <div className="flex items-center justify-between">
              <StatusBadge matches={result.matchesSpec} />
              <span className="text-xs font-mono text-text-secondary">
                {result.compliance.overallScore}% compliant
              </span>
            </div>

            {/* Score bars */}
            <div className="space-y-2">
              <ScoreBar score={result.compliance.toneScore}   label="Tone" />
              <ScoreBar score={result.compliance.lengthScore} label="Length" />
              <ScoreBar score={result.compliance.actionsAllowed ? 100 : 0} label="Allowed actions" />
            </div>

            {/* Issues */}
            {result.issues.length > 0 && (
              <div className="space-y-1">
                <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">
                  Issues
                </span>
                <ul className="space-y-1">
                  {result.issues.map((issue, i) => (
                    <li key={i} className="flex gap-1.5 text-xs text-warning">
                      <span className="flex-shrink-0 mt-0.5">⚠</span>
                      <span>{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* Validation summary */}
        {validation && (
          <section className="px-4 py-3 border-t border-border space-y-2">
            <span className="text-xs text-text-secondary font-medium uppercase tracking-wider">
              Spec validation
            </span>

            {/* Completeness */}
            <ScoreBar score={validation.completeness} label="Completeness" />
            <ScoreBar score={validation.score}        label="Validity score" />

            {/* Errors */}
            {validation.errors.length > 0 && (
              <ul className="space-y-1 mt-1">
                {validation.errors.slice(0, 3).map((e, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-error">
                    <span className="flex-shrink-0">✕</span>
                    <span>{e.message}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <ul className="space-y-1 mt-1">
                {validation.warnings.slice(0, 2).map((w, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-warning">
                    <span className="flex-shrink-0">⚠</span>
                    <span>{w.message}</span>
                  </li>
                ))}
              </ul>
            )}

            {validation.errors.length === 0 && validation.warnings.length === 0 && (
              <p className="text-xs text-success flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
                All checks passed
              </p>
            )}
          </section>
        )}

        {/* System prompt viewer */}
        <section className="px-4 py-3 border-t border-border">
          <button
            onClick={() => setShowPrompt((v) => !v)}
            className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors duration-150 py-1"
          >
            <span className="uppercase tracking-wider font-medium">System prompt</span>
            <svg
              className={cn("w-3.5 h-3.5 transition-transform duration-150", showPrompt && "rotate-180")}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showPrompt && (
            <pre className={cn(
              "mt-2 p-3 bg-background rounded border border-border",
              "text-[11px] text-text-secondary leading-relaxed whitespace-pre-wrap break-words",
              "max-h-64 overflow-y-auto font-mono"
            )}>
              {spec.systemPrompt || "(empty)"}
            </pre>
          )}
        </section>
      </div>
    </aside>
  );
}
