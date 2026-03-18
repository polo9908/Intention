"use client";

import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/utils";
import type { Agent, AgentSpec } from "@/types";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

const STATUS_COLOR: Record<string, { dot: string; label: string; bg: string }> = {
  idle:      { dot: "bg-text-secondary", label: "text-text-secondary", bg: "bg-text-secondary/10" },
  running:   { dot: "bg-success",        label: "text-success",        bg: "bg-success/10"        },
  paused:    { dot: "bg-warning",        label: "text-warning",        bg: "bg-warning/10"        },
  completed: { dot: "bg-success",        label: "text-success",        bg: "bg-success/10"        },
  error:     { dot: "bg-error",          label: "text-error",          bg: "bg-error/10"          },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR["idle"]!;
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium", c.bg, c.label)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", c.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Row helper
// ---------------------------------------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-text-secondary shrink-0 pt-0.5">{label}</span>
      <div className="text-xs text-right text-text-primary">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Capability pill
// ---------------------------------------------------------------------------

function CapPill({ cap }: { cap: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[10px] font-mono border border-accent/20">
      {cap}
    </span>
  );
}

// ---------------------------------------------------------------------------
// DetailsPanelTab
// ---------------------------------------------------------------------------

interface DetailsPanelTabProps {
  agent: Agent;
  spec: AgentSpec | null;
  networkAgentCount: number;
  onEditSpec?: (agentId: string) => void;
}

export function DetailsPanelTab({ agent, spec, networkAgentCount, onEditSpec }: DetailsPanelTabProps) {
  return (
    <div className="flex flex-col gap-0 overflow-y-auto">
      {/* Agent header card */}
      <div className="px-4 py-4 border-b border-border bg-surface/30">
        <div className="flex items-start justify-between gap-3 mb-3">
          {/* Role icon + name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
              agent.role === "orchestrator" ? "bg-violet-500/20 text-violet-300" :
              agent.role === "critic"       ? "bg-cyan-500/20 text-cyan-300"     :
              agent.role === "specialist"   ? "bg-emerald-500/20 text-emerald-300" :
                                             "bg-slate-500/20 text-slate-300"
            )}>
              {agent.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{agent.name}</p>
              <p className="text-[11px] text-text-secondary capitalize">{agent.role}</p>
            </div>
          </div>
          <StatusBadge status={agent.status} />
        </div>

        {agent.description && (
          <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{agent.description}</p>
        )}

        {/* Capabilities */}
        {agent.config.capabilities.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.config.capabilities.map((cap) => (
              <CapPill key={cap} cap={cap} />
            ))}
          </div>
        )}
      </div>

      {/* Details rows */}
      <div className="px-4 py-1">
        <Row label="Model">
          <span className="font-mono text-accent">{agent.config.model}</span>
        </Row>
        <Row label="Network agents">
          <span className="tabular-nums">{networkAgentCount}</span>
        </Row>
        {spec && (
          <Row label="Spec version">
            <span className="tabular-nums font-mono">v{spec.version}</span>
          </Row>
        )}
        <Row label="Temperature">
          <span className="tabular-nums font-mono">{agent.config.temperature ?? "—"}</span>
        </Row>
        <Row label="Max tokens">
          <span className="tabular-nums font-mono">{agent.config.maxTokens?.toLocaleString() ?? "—"}</span>
        </Row>
        <Row label="Created">
          <span>{formatRelativeTime(agent.createdAt)}</span>
        </Row>
        <Row label="Last modified">
          <span>{formatRelativeTime(agent.updatedAt)}</span>
        </Row>
        {Object.keys(agent.metadata).length > 0 && (
          <Row label="Metadata">
            <div className="space-y-0.5">
              {Object.entries(agent.metadata).map(([k, v]) => (
                <div key={k} className="font-mono text-[10px]">
                  <span className="text-text-secondary">{k}:</span>{" "}
                  <span className="text-text-primary">{String(v)}</span>
                </div>
              ))}
            </div>
          </Row>
        )}
      </div>

      {/* Edit button */}
      {onEditSpec && (
        <div className="px-4 pt-2 pb-4">
          <button
            onClick={() => onEditSpec(agent.id)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium",
              "bg-accent/10 text-accent border border-accent/30",
              "hover:bg-accent/20 hover:border-accent/50 transition-all duration-150"
            )}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Spec
          </button>
        </div>
      )}
    </div>
  );
}
