"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { cellKey, isCellValid } from "./utils";
import type { SpecContext, SpecCriterion, CellMap, CellAddress } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SpecMatrixProps {
  contexts: SpecContext[];
  criteria: SpecCriterion[];
  cells: CellMap;
  onCellChange: (contextId: string, criterionId: string, value: string) => void;
}

// ---------------------------------------------------------------------------
// Individual cell
// ---------------------------------------------------------------------------

interface MatrixCellProps {
  contextId: string;
  criterionId: string;
  value: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (value: string) => void;
  onTabNext: () => void;
  onTabPrev: () => void;
  onEscape: () => void;
}

function MatrixCell({
  contextId,
  criterionId,
  value,
  isEditing,
  onStartEdit,
  onSave,
  onTabNext,
  onTabPrev,
  onEscape,
}: MatrixCellProps) {
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isValid = isCellValid(value);

  // Sync draft when value changes from outside (e.g. undo)
  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  // Auto-focus and auto-resize when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const ta = textareaRef.current;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
      autoResize(ta);
    }
  }, [isEditing]);

  const autoResize = (ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    ta.style.height = `${Math.max(72, ta.scrollHeight)}px`;
  };

  const commit = useCallback(() => {
    onSave(draft);
  }, [draft, onSave]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      commit();
      if (e.shiftKey) onTabPrev();
      else onTabNext();
    } else if (e.key === "Escape") {
      setDraft(value);
      onEscape();
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
  };

  if (isEditing) {
    return (
      <div className="relative min-h-[80px] bg-surface border border-accent shadow-glow-sm rounded">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            autoResize(e.target);
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          className={cn(
            "w-full min-h-[72px] p-2.5 bg-transparent text-sm text-text-primary",
            "outline-none resize-none leading-relaxed font-mono"
          )}
          placeholder="Describe the behavior..."
          rows={3}
        />
        {/* Edit indicator */}
        <div className="absolute top-1.5 right-1.5 flex gap-1 items-center">
          <span className="text-[10px] text-accent opacity-70">editing</span>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onStartEdit}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onStartEdit(); }}
      aria-label={`Edit cell for ${contextId} / ${criterionId}`}
      className={cn(
        "group relative min-h-[80px] p-2.5 rounded cursor-text",
        "border transition-all duration-150",
        "hover:border-accent/40 hover:bg-white/[0.02]",
        value
          ? "border-border bg-background"
          : "border-border/50 bg-background/50"
      )}
    >
      {value ? (
        <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap break-words">
          {value}
        </p>
      ) : (
        <p className="text-sm text-text-secondary/40 italic">Add value…</p>
      )}

      {/* Validation dot */}
      {value && (
        <span
          className={cn(
            "absolute top-2 right-2 w-2 h-2 rounded-full transition-colors duration-200",
            isValid ? "bg-success" : "bg-warning"
          )}
          title={isValid ? "Valid" : "Too short"}
        />
      )}

      {/* Click hint */}
      <span className="absolute bottom-1.5 right-2 text-[10px] text-accent/0 group-hover:text-accent/50 transition-colors duration-150">
        click to edit
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main matrix
// ---------------------------------------------------------------------------

export function SpecMatrix({ contexts, criteria, cells, onCellChange }: SpecMatrixProps) {
  const [editingCell, setEditingCell] = useState<CellAddress | null>(null);

  const sortedContexts = [...contexts].sort((a, b) => a.order - b.order);
  const activeCriteria = [...criteria]
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order);

  const isEmpty = sortedContexts.length === 0 || activeCriteria.length === 0;

  const startEdit = useCallback((contextId: string, criterionId: string) => {
    setEditingCell({ contextId, criterionId });
  }, []);

  const saveCell = useCallback(
    (contextId: string, criterionId: string, value: string) => {
      onCellChange(contextId, criterionId, value);
      setEditingCell(null);
    },
    [onCellChange]
  );

  const cancelEdit = useCallback(() => setEditingCell(null), []);

  const navigateCell = useCallback(
    (contextId: string, criterionId: string, direction: "next" | "prev") => {
      const ctxIdx  = sortedContexts.findIndex((c) => c.id === contextId);
      const critIdx = activeCriteria.findIndex((c) => c.id === criterionId);

      let nextCtx  = ctxIdx;
      let nextCrit = critIdx + (direction === "next" ? 1 : -1);

      if (nextCrit >= activeCriteria.length) {
        nextCrit = 0;
        nextCtx  = ctxIdx + 1;
      } else if (nextCrit < 0) {
        nextCrit = activeCriteria.length - 1;
        nextCtx  = ctxIdx - 1;
      }

      if (nextCtx >= 0 && nextCtx < sortedContexts.length) {
        setEditingCell({
          contextId: sortedContexts[nextCtx].id,
          criterionId: activeCriteria[nextCrit].id,
        });
      } else {
        setEditingCell(null);
      }
    },
    [sortedContexts, activeCriteria]
  );

  // Dismiss on Escape from the whole matrix area
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEditingCell(null);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (isEmpty) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div className="space-y-3">
          <div className="w-12 h-12 mx-auto rounded-xl bg-surface border border-border flex items-center justify-center">
            <svg className="w-6 h-6 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M3 10h18M3 14h18M10 3v18M14 3v18" />
            </svg>
          </div>
          <p className="text-text-secondary text-sm">
            {sortedContexts.length === 0
              ? "Add at least one context in the sidebar to begin."
              : "Enable at least one criterion in the sidebar to begin."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Sticky header row */}
      <div className="flex-shrink-0 overflow-x-auto border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `160px repeat(${activeCriteria.length}, minmax(200px, 1fr))`,
            minWidth: `${160 + activeCriteria.length * 200}px`,
          }}
        >
          {/* Corner cell */}
          <div className="px-3 py-2 border-r border-border flex items-end">
            <span className="text-[11px] text-text-secondary uppercase tracking-wider font-medium">
              Context ↓ / Criterion →
            </span>
          </div>

          {/* Criterion headers */}
          {activeCriteria.map((crit) => (
            <div
              key={crit.id}
              className="px-3 py-2 border-r border-border last:border-r-0 flex items-end"
            >
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wide">
                {crit.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-auto">
        <div
          style={{ minWidth: `${160 + activeCriteria.length * 200}px` }}
        >
          {sortedContexts.map((ctx, ctxIndex) => (
            <div
              key={ctx.id}
              className={cn(
                "grid border-b border-border",
                ctxIndex % 2 === 0 ? "bg-background" : "bg-surface/30"
              )}
              style={{
                gridTemplateColumns: `160px repeat(${activeCriteria.length}, minmax(200px, 1fr))`,
              }}
            >
              {/* Context label */}
              <div className="px-3 py-3 border-r border-border flex items-start sticky left-0 bg-inherit z-[1]">
                <div className="flex items-center gap-2 w-full">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent/60 flex-shrink-0 mt-0.5" />
                  <span className="text-sm font-medium text-text-primary leading-snug">
                    {ctx.name}
                  </span>
                </div>
              </div>

              {/* Cells */}
              {activeCriteria.map((crit) => {
                const key = cellKey(ctx.id, crit.id);
                const value = cells[key] ?? "";
                const isEdit =
                  editingCell?.contextId === ctx.id &&
                  editingCell?.criterionId === crit.id;

                return (
                  <div
                    key={crit.id}
                    className="p-2 border-r border-border last:border-r-0 min-h-[88px]"
                  >
                    <MatrixCell
                      contextId={ctx.id}
                      criterionId={crit.id}
                      value={value}
                      isEditing={isEdit}
                      onStartEdit={() => startEdit(ctx.id, crit.id)}
                      onSave={(v) => saveCell(ctx.id, crit.id, v)}
                      onTabNext={() => navigateCell(ctx.id, crit.id, "next")}
                      onTabPrev={() => navigateCell(ctx.id, crit.id, "prev")}
                      onEscape={cancelEdit}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Footer hint */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-border bg-surface/50 flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Tab</kbd>
          <span>next cell</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Enter</kbd>
          <span>save</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary">
          <kbd className="px-1.5 py-0.5 bg-background border border-border rounded text-[10px] font-mono">Esc</kbd>
          <span>cancel</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-text-secondary ml-auto">
          <span className="w-2 h-2 rounded-full bg-success inline-block" />
          <span>valid</span>
          <span className="w-2 h-2 rounded-full bg-warning inline-block ml-2" />
          <span>short</span>
        </div>
      </div>
    </div>
  );
}
