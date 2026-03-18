"use client";

import { cn } from "@/lib/utils";
import type { InspectorConnection, NetworkConnections } from "./types";
import type { ConnectionType } from "@/types";

// ---------------------------------------------------------------------------
// Connection type badge
// ---------------------------------------------------------------------------

const TYPE_STYLES: Record<ConnectionType, { bg: string; text: string; label: string }> = {
  sequential:  { bg: "bg-slate-500/15",   text: "text-slate-400",   label: "sequential"  },
  parallel:    { bg: "bg-cyan-500/15",     text: "text-cyan-400",    label: "parallel"    },
  conditional: { bg: "bg-amber-500/15",    text: "text-amber-400",   label: "conditional" },
  feedback:    { bg: "bg-violet-500/15",   text: "text-violet-400",  label: "feedback"    },
};

function TypeBadge({ type }: { type: ConnectionType }) {
  const s = TYPE_STYLES[type];
  return (
    <span className={cn("inline-block px-1.5 py-0.5 rounded text-[10px] font-mono", s.bg, s.text)}>
      {s.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Traffic bar
// ---------------------------------------------------------------------------

function TrafficBar({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-accent" :
    pct >= 40 ? "bg-success" :
                "bg-text-secondary/40";

  return (
    <div className="flex items-center gap-2 mt-1.5">
      <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums text-text-secondary w-8 text-right shrink-0">
        {pct}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConnectionRow
// ---------------------------------------------------------------------------

function ConnectionRow({ conn, direction }: { conn: InspectorConnection; direction: "in" | "out" }) {
  const arrow = direction === "in" ? "←" : "→";
  const arrowColor = direction === "in" ? "text-emerald-400" : "text-accent";

  return (
    <div className="py-2.5 border-b border-border/50 last:border-0">
      <div className="flex items-center gap-2">
        <span className={cn("font-mono text-sm leading-none shrink-0", arrowColor)}>{arrow}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-text-primary truncate">{conn.agentName}</span>
            <TypeBadge type={conn.type} />
          </div>
          <TrafficBar pct={conn.trafficPct} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

function Section({
  title,
  icon,
  connections,
  direction,
  emptyText,
}: {
  title: string;
  icon: React.ReactNode;
  connections: InspectorConnection[];
  direction: "in" | "out";
  emptyText: string;
}) {
  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">{title}</p>
        <span className="ml-auto text-[10px] font-mono text-text-secondary/60">{connections.length}</span>
      </div>

      {connections.length === 0 ? (
        <p className="text-xs text-text-secondary/50 py-2 pl-2">{emptyText}</p>
      ) : (
        <div className="pl-1">
          {connections.map((c) => (
            <ConnectionRow key={c.id} conn={c} direction={direction} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NetworkInfo
// ---------------------------------------------------------------------------

interface NetworkInfoProps {
  connections: NetworkConnections;
}

export function NetworkInfo({ connections }: NetworkInfoProps) {
  const totalTrafficIn  = connections.inputs.reduce((s, c) => s + c.trafficPct, 0);
  const totalTrafficOut = connections.outputs.reduce((s, c) => s + c.trafficPct, 0);

  return (
    <div className="px-4 py-4 space-y-5">
      {/* Summary row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface/60 border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold tabular-nums text-emerald-400">{connections.inputs.length}</p>
          <p className="text-[10px] text-text-secondary">inputs</p>
        </div>
        <div className="bg-surface/60 border border-border rounded-lg px-3 py-2 text-center">
          <p className="text-lg font-bold tabular-nums text-accent">{connections.outputs.length}</p>
          <p className="text-[10px] text-text-secondary">outputs</p>
        </div>
      </div>

      {/* Inputs */}
      <Section
        title="Callers"
        direction="in"
        connections={connections.inputs}
        emptyText="No agents call this agent"
        icon={
          <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        }
      />

      {/* Outputs */}
      <Section
        title="Downstream"
        direction="out"
        connections={connections.outputs}
        emptyText="This agent has no outputs"
        icon={
          <svg className="w-3 h-3 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        }
      />
    </div>
  );
}
