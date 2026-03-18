"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { AgentSpec, SpecVersion } from "@/types";

// ---------------------------------------------------------------------------
// Syntax-highlighted value renderer
// ---------------------------------------------------------------------------

function SpecValue({ value }: { value: unknown }) {
  if (typeof value === "boolean") {
    return <span className="text-violet-400">{String(value)}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-amber-400 font-mono">{value}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-text-secondary/60">[ ]</span>;
    return (
      <div className="flex flex-wrap gap-1 mt-0.5">
        {value.map((v, i) => (
          <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono border border-accent/20">
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === "object" && value !== null) {
    return (
      <div className="space-y-0.5 mt-0.5">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => (
          <div key={k} className="text-[10px] font-mono">
            <span className="text-text-secondary">{k}: </span>
            <span className="text-emerald-400">{JSON.stringify(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  // String
  const str = String(value);
  if (str.length > 80) {
    return (
      <details className="cursor-pointer">
        <summary className="text-emerald-400 text-[11px] font-mono leading-relaxed list-none select-none">
          {str.slice(0, 60)}<span className="text-text-secondary">… (expand)</span>
        </summary>
        <p className="text-emerald-400 text-[11px] font-mono leading-relaxed whitespace-pre-wrap mt-1">
          {str}
        </p>
      </details>
    );
  }
  return <span className="text-emerald-400 font-mono text-[11px]">{str}</span>;
}

// ---------------------------------------------------------------------------
// Spec field row
// ---------------------------------------------------------------------------

const EDITABLE_FIELDS: (keyof AgentSpec)[] = ["model", "systemPrompt", "maxTokens", "temperature", "capabilities"];

interface FieldRowProps {
  fieldKey: string;
  value: unknown;
  onEdit?: () => void;
}

function FieldRow({ fieldKey, value, onEdit }: FieldRowProps) {
  return (
    <div className={cn(
      "group flex items-start gap-2 py-2.5 border-b border-border/50 last:border-0",
      onEdit && "hover:bg-surface/50 -mx-3 px-3 rounded transition-colors duration-100"
    )}>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-[10px] text-text-secondary font-mono uppercase tracking-wider leading-none">{fieldKey}</p>
        <div className="text-xs"><SpecValue value={value} /></div>
      </div>
      {onEdit && (
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 shrink-0 p-1 rounded hover:bg-accent/10 text-text-secondary hover:text-accent transition-all duration-100"
          title={`Edit ${fieldKey}`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpecTab
// ---------------------------------------------------------------------------

interface SpecTabProps {
  spec: AgentSpec | null;
  versions: SpecVersion[];
  onRollback?: (specId: string, versionId: string) => void;
  onEditSpec?: (agentId: string) => void;
}

export function SpecTab({ spec, versions, onRollback, onEditSpec }: SpecTabProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-32 px-4">
        <p className="text-xs text-text-secondary text-center">
          No spec found for this agent.<br />
          <button className="text-accent underline mt-1" onClick={() => onEditSpec?.("")}>Create spec →</button>
        </p>
      </div>
    );
  }

  // Show selected version or live spec
  const displayVersion = selectedVersionId
    ? versions.find((v) => v.id === selectedVersionId)
    : null;
  const displaySpec = displayVersion?.snapshot ?? spec;
  const isViewingHistory = selectedVersionId !== null;

  const DISPLAY_FIELDS: [keyof AgentSpec, string][] = [
    ["model",        "model"],
    ["systemPrompt", "systemPrompt"],
    ["maxTokens",    "maxTokens"],
    ["temperature",  "temperature"],
    ["capabilities", "capabilities"],
    ["description",  "description"],
    ["metadata",     "metadata"],
  ];

  return (
    <div className="flex flex-col overflow-hidden h-full">
      {/* Version selector header */}
      <div className="px-4 py-3 border-b border-border bg-surface/20 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <select
            value={selectedVersionId ?? ""}
            onChange={(e) => setSelectedVersionId(e.target.value || null)}
            className={cn(
              "w-full bg-background border border-border rounded px-2 py-1 text-xs text-text-primary",
              "focus:outline-none focus:border-accent/60 transition-colors",
              isViewingHistory && "text-warning border-warning/40"
            )}
          >
            <option value="">Current — v{spec.version}</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version} — {formatRelativeTime(v.createdAt)}
                {v.changeMessage ? ` (${v.changeMessage.slice(0, 30)})` : ""}
              </option>
            ))}
          </select>
        </div>

        {isViewingHistory && onRollback && (
          <button
            onClick={() => {
              if (selectedVersionId) onRollback(spec.id, selectedVersionId);
              setSelectedVersionId(null);
            }}
            className={cn(
              "shrink-0 flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium",
              "bg-warning/10 text-warning border border-warning/30 hover:bg-warning/20 transition-colors"
            )}
            title="Restore this version"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            Rollback
          </button>
        )}
      </div>

      {/* Historical banner */}
      {isViewingHistory && displayVersion && (
        <div className="mx-4 mt-3 px-3 py-2 rounded-lg border border-warning/30 bg-warning/5">
          <p className="text-[11px] text-warning font-medium">
            Viewing v{displayVersion.version} — {formatRelativeTime(displayVersion.createdAt)}
          </p>
          {displayVersion.changeMessage && (
            <p className="text-[10px] text-text-secondary mt-0.5">{displayVersion.changeMessage}</p>
          )}
        </div>
      )}

      {/* Spec fields */}
      <div className="flex-1 overflow-y-auto px-4 py-2">
        {DISPLAY_FIELDS.map(([key, label]) => {
          const value = displaySpec[key];
          if (value === undefined || value === null) return null;
          if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return null;
          const isEditable = !isViewingHistory && EDITABLE_FIELDS.includes(key);
          return (
            <FieldRow
              key={key}
              fieldKey={label}
              value={value}
              onEdit={isEditable ? () => onEditSpec?.(displaySpec.agentId) : undefined}
            />
          );
        })}
      </div>

      {/* Footer: open full spec editor */}
      {!isViewingHistory && onEditSpec && (
        <div className="px-4 py-3 border-t border-border">
          <button
            onClick={() => onEditSpec(spec.agentId)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-medium",
              "bg-accent/10 text-accent border border-accent/30",
              "hover:bg-accent/20 hover:border-accent/50 transition-all duration-150"
            )}
          >
            Open in Spec Editor
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
