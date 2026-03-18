"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import type { SpecContext, SpecCriterion, SpecBuilderStats } from "./types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ContextsSidebarProps {
  contexts: SpecContext[];
  criteria: SpecCriterion[];
  stats: SpecBuilderStats;
  onAddContext: () => void;
  onRemoveContext: (id: string) => void;
  onRenameContext: (id: string, name: string) => void;
  onReorderContexts: (fromIndex: number, toIndex: number) => void;
  onAddCriterion: () => void;
  onRemoveCriterion: (id: string) => void;
  onRenameCriterion: (id: string, name: string) => void;
  onToggleCriterion: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Inline editable label
// ---------------------------------------------------------------------------

function EditableLabel({
  value,
  onSave,
  className,
}: {
  value: string;
  onSave: (v: string) => void;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    else setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <span
        className={cn("cursor-text truncate", className)}
        onDoubleClick={() => {
          setDraft(value);
          setEditing(true);
          setTimeout(() => inputRef.current?.select(), 0);
        }}
        title="Double-click to rename"
      >
        {value}
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      className={cn(
        "bg-transparent border-b border-accent outline-none text-text-primary w-full",
        className
      )}
      value={draft}
      autoFocus
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") { setDraft(value); setEditing(false); }
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Context item with drag-and-drop
// ---------------------------------------------------------------------------

function ContextItem({
  context,
  index,
  sortedLength,
  onRemove,
  onRename,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging,
  isOver,
}: {
  context: SpecContext;
  index: number;
  sortedLength: number;
  onRemove: () => void;
  onRename: (name: string) => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isOver: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "group flex items-center gap-2 px-2 py-1.5 rounded transition-all duration-150",
        "hover:bg-white/5 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
        isOver && "bg-accent/10 border border-accent/30"
      )}
    >
      {/* Drag handle */}
      <svg
        className="w-3 h-3 text-text-secondary flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        fill="currentColor"
        viewBox="0 0 24 24"
      >
        <circle cx="9" cy="6" r="1.5" />
        <circle cx="15" cy="6" r="1.5" />
        <circle cx="9" cy="12" r="1.5" />
        <circle cx="15" cy="12" r="1.5" />
        <circle cx="9" cy="18" r="1.5" />
        <circle cx="15" cy="18" r="1.5" />
      </svg>

      {/* Index badge */}
      <span className="text-xs text-text-secondary w-4 flex-shrink-0">{index + 1}</span>

      {/* Name */}
      <EditableLabel
        value={context.name}
        onSave={onRename}
        className="text-sm text-text-primary flex-1 min-w-0"
      />

      {/* Remove (only show if >1 context) */}
      {sortedLength > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-error transition-all duration-150 flex-shrink-0"
          title="Remove context"
          aria-label={`Remove ${context.name}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main sidebar
// ---------------------------------------------------------------------------

export function ContextsSidebar({
  contexts,
  criteria,
  stats,
  onAddContext,
  onRemoveContext,
  onRenameContext,
  onReorderContexts,
  onAddCriterion,
  onRemoveCriterion,
  onRenameCriterion,
  onToggleCriterion,
}: ContextsSidebarProps) {
  const [dragState, setDragState] = useState<{
    dragging: number | null;
    over: number | null;
  }>({ dragging: null, over: null });

  const sortedContexts = [...contexts].sort((a, b) => a.order - b.order);
  const sortedCriteria = [...criteria].sort((a, b) => a.order - b.order);

  return (
    <aside className="flex flex-col h-full bg-surface border-r border-border overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-text-secondary">
          Spec Builder
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Contexts section ────────────────────────────────────────── */}
        <section className="px-3 pt-4 pb-2">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Contexts
            </span>
            <span className="text-xs text-text-secondary bg-background rounded px-1.5 py-0.5">
              {sortedContexts.length}
            </span>
          </div>

          <div className="space-y-0.5">
            {sortedContexts.map((ctx, index) => (
              <ContextItem
                key={ctx.id}
                context={ctx}
                index={index}
                sortedLength={sortedContexts.length}
                onRemove={() => onRemoveContext(ctx.id)}
                onRename={(name) => onRenameContext(ctx.id, name)}
                onDragStart={() => setDragState({ dragging: index, over: index })}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragState((s) => ({ ...s, over: index }));
                }}
                onDrop={() => {
                  if (dragState.dragging !== null && dragState.dragging !== index) {
                    onReorderContexts(dragState.dragging, index);
                  }
                  setDragState({ dragging: null, over: null });
                }}
                onDragEnd={() => setDragState({ dragging: null, over: null })}
                isDragging={dragState.dragging === index}
                isOver={dragState.over === index && dragState.dragging !== index}
              />
            ))}
          </div>

          <button
            onClick={onAddContext}
            className={cn(
              "mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded",
              "text-xs text-accent hover:bg-accent/10 transition-colors duration-150",
              "border border-dashed border-accent/30 hover:border-accent/60"
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add context
          </button>
        </section>

        {/* Divider */}
        <div className="mx-3 my-1 border-t border-border" />

        {/* ── Criteria section ────────────────────────────────────────── */}
        <section className="px-3 pt-2 pb-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
              Criteria
            </span>
            <span className="text-xs text-text-secondary bg-background rounded px-1.5 py-0.5">
              {stats.activeCriteriaCount}/{sortedCriteria.length}
            </span>
          </div>

          <div className="space-y-0.5">
            {sortedCriteria.map((crit) => (
              <div
                key={crit.id}
                className="group flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/5 transition-colors duration-150"
              >
                {/* Toggle checkbox */}
                <button
                  role="checkbox"
                  aria-checked={crit.enabled}
                  onClick={() => onToggleCriterion(crit.id)}
                  className={cn(
                    "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150",
                    crit.enabled
                      ? "bg-accent border-accent text-background"
                      : "border-border hover:border-accent/50"
                  )}
                >
                  {crit.enabled && (
                    <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  )}
                </button>

                {/* Name */}
                <EditableLabel
                  value={crit.name}
                  onSave={(name) => onRenameCriterion(crit.id, name)}
                  className={cn(
                    "text-sm flex-1 min-w-0",
                    crit.enabled ? "text-text-primary" : "text-text-secondary line-through"
                  )}
                />

                {/* Remove */}
                {sortedCriteria.length > 1 && (
                  <button
                    onClick={() => onRemoveCriterion(crit.id)}
                    className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-error transition-all duration-150 flex-shrink-0"
                    title="Remove criterion"
                    aria-label={`Remove ${crit.name}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            onClick={onAddCriterion}
            className={cn(
              "mt-2 w-full flex items-center gap-1.5 px-2 py-1.5 rounded",
              "text-xs text-accent hover:bg-accent/10 transition-colors duration-150",
              "border border-dashed border-accent/30 hover:border-accent/60"
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add criterion
          </button>
        </section>
      </div>

      {/* ── Stats footer ──────────────────────────────────────────────── */}
      <div className="flex-shrink-0 border-t border-border px-4 py-3 space-y-2">
        {/* Completeness bar */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs text-text-secondary">Completeness</span>
            <span
              className={cn(
                "text-xs font-mono font-medium",
                stats.completeness >= 80
                  ? "text-success"
                  : stats.completeness >= 50
                  ? "text-warning"
                  : "text-text-secondary"
              )}
            >
              {stats.completeness}%
            </span>
          </div>
          <div className="h-1.5 bg-background rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                stats.completeness >= 80
                  ? "bg-success"
                  : stats.completeness >= 50
                  ? "bg-warning"
                  : "bg-accent/50"
              )}
              style={{ width: `${stats.completeness}%` }}
            />
          </div>
        </div>

        {/* Cell counts */}
        <div className="flex gap-3 text-xs text-text-secondary">
          <span>{stats.filledCells}/{stats.totalCells} cells</span>
          <span className="opacity-40">·</span>
          <span>{stats.contextCount} contexts</span>
          <span className="opacity-40">·</span>
          <span>{stats.activeCriteriaCount} active</span>
        </div>
      </div>
    </aside>
  );
}
