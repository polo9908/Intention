"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { ComplianceData, ComplianceIssue } from "./types";

// ---------------------------------------------------------------------------
// Score ring (SVG donut)
// ---------------------------------------------------------------------------

function ScoreRing({ score }: { score: number }) {
  const radius    = 28;
  const stroke    = 5;
  const circumference = 2 * Math.PI * radius;
  const filled    = (score / 100) * circumference;

  const ringColor =
    score >= 90 ? "#10b981" :  // success
    score >= 70 ? "#f59e0b" :  // warning
                  "#ef4444";   // error

  const scoreLabel =
    score >= 90 ? "Good"      :
    score >= 70 ? "Degraded"  :
                  "Critical";

  const labelColor =
    score >= 90 ? "text-success" :
    score >= 70 ? "text-warning"  :
                  "text-error";

  return (
    <div className="flex items-center gap-4">
      {/* Ring */}
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 70 70" className="w-full h-full -rotate-90">
          {/* Track */}
          <circle cx="35" cy="35" r={radius} fill="none" stroke="#1a2542" strokeWidth={stroke} />
          {/* Progress */}
          <circle
            cx="35" cy="35" r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 600ms ease" }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("text-sm font-bold tabular-nums", labelColor)}>{score}</span>
        </div>
      </div>

      {/* Label */}
      <div>
        <p className={cn("text-sm font-semibold", labelColor)}>{scoreLabel}</p>
        <p className="text-[11px] text-text-secondary">compliance score</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Issue row
// ---------------------------------------------------------------------------

function IssueRow({ issue }: { issue: ComplianceIssue }) {
  const isError = issue.severity === "error";
  return (
    <div className={cn(
      "flex items-start gap-2.5 px-3 py-2.5 rounded-lg border",
      isError
        ? "bg-error/5 border-error/25 text-error"
        : "bg-warning/5 border-warning/25 text-warning"
    )}>
      <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        {isError ? (
          <path fillRule="evenodd" clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
        ) : (
          <path fillRule="evenodd" clipRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" />
        )}
      </svg>
      <p className="text-xs leading-relaxed">{issue.message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ComplianceStatus
// ---------------------------------------------------------------------------

interface ComplianceStatusProps {
  data: ComplianceData;
  agentId: string;
  onRevalidate?: (agentId: string) => void;
}

export function ComplianceStatus({ data, agentId, onRevalidate }: ComplianceStatusProps) {
  const [isValidating, setIsValidating] = useState(false);

  const handleRevalidate = async () => {
    if (isValidating) return;
    setIsValidating(true);
    // Simulate async validation (Phase 2: real call to complianceChecker)
    await new Promise((r) => setTimeout(r, 1200));
    setIsValidating(false);
    onRevalidate?.(agentId);
  };

  const errorCount   = data.issues.filter((i) => i.severity === "error").length;
  const warningCount = data.issues.filter((i) => i.severity === "warning").length;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Score + metadata */}
      <ScoreRing score={data.score} />

      {/* Last validated + issue counts */}
      <div className="flex items-center justify-between text-[11px] text-text-secondary">
        <span>
          {data.lastValidatedAt
            ? <>Last validated <strong className="text-text-primary">{formatRelativeTime(data.lastValidatedAt)}</strong></>
            : "Never validated"}
        </span>
        {data.issues.length > 0 && (
          <div className="flex items-center gap-2">
            {errorCount > 0 && (
              <span className="flex items-center gap-1 text-error">
                <span className="font-bold">{errorCount}</span> err
              </span>
            )}
            {warningCount > 0 && (
              <span className="flex items-center gap-1 text-warning">
                <span className="font-bold">{warningCount}</span> warn
              </span>
            )}
          </div>
        )}
      </div>

      {/* Re-validate button */}
      <button
        onClick={handleRevalidate}
        disabled={isValidating}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all duration-150",
          isValidating
            ? "bg-surface border border-border text-text-secondary cursor-not-allowed"
            : "bg-surface border border-border text-text-primary hover:border-accent/40 hover:text-accent hover:bg-accent/5"
        )}
      >
        {isValidating ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Validating…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Re-validate
          </>
        )}
      </button>

      {/* Issues list */}
      {data.issues.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            Issues ({data.issues.length})
          </p>
          {data.issues.map((issue) => (
            <IssueRow key={issue.id} issue={issue} />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-3 rounded-lg bg-success/5 border border-success/25">
          <svg className="w-4 h-4 text-success shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" clipRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
          </svg>
          <p className="text-xs text-success">All checks passed</p>
        </div>
      )}
    </div>
  );
}
