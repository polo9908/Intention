"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAgentStore } from "@/lib/stores/agentStore";
import { useSpecStore } from "@/lib/stores/specStore";

import { DetailsPanelTab } from "./DetailsPanelTab";
import { MonitorTab }       from "./MonitorTab";
import { SpecTab }          from "./SpecTab";
import { NetworkInfo }      from "./NetworkInfo";
import { ComplianceStatus } from "./ComplianceStatus";

import {
  MOCK_AGENTS,
  MOCK_SPECS,
  MOCK_SPEC_VERSIONS,
  getMockMetrics,
  getMockConnections,
  getMockCompliance,
} from "./mockData";

import type { InspectorTab, InspectorProps } from "./types";

// ---------------------------------------------------------------------------
// Tab config
// ---------------------------------------------------------------------------

const TABS: { id: InspectorTab; label: string }[] = [
  { id: "details", label: "Details"  },
  { id: "monitor", label: "Monitor"  },
  { id: "spec",    label: "Spec"     },
];

// ---------------------------------------------------------------------------
// Empty / no-selection state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 px-6 text-center">
      <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center">
        <svg className="w-5 h-5 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" />
        </svg>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-text-secondary">Select an agent</p>
        <p className="text-xs text-text-secondary/60">Click any node on the canvas to inspect it</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Divider with label
// ---------------------------------------------------------------------------

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <div className="flex-1 h-px bg-border/60" />
      <span className="text-[10px] font-semibold text-text-secondary/60 uppercase tracking-widest shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-border/60" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Inspector
// ---------------------------------------------------------------------------

export function Inspector({ agentId, onEditSpec, onClose, className }: InspectorProps) {
  const [activeTab, setActiveTab] = useState<InspectorTab>("details");

  // ── Data from stores (fall back to mock if not in store) ─────────────────
  const storeAgent   = useAgentStore((s) => s.agents.find((a) => a.id === agentId));
  const allAgents    = useAgentStore((s) => s.agents);
  const storeSpec    = useSpecStore((s) => s.specs.find((sp) => sp.agentId === agentId));
  const storeHistory = useSpecStore((s) =>
    s.selectedSpecId === storeSpec?.id ? s.specHistory : []
  );
  const rollbackSpec  = useSpecStore((s) => s.rollbackSpec);

  const agent   = agentId ? (storeAgent ?? MOCK_AGENTS[agentId] ?? null)    : null;
  const spec    = agentId ? (storeSpec  ?? MOCK_SPECS[agentId]  ?? null)    : null;
  const history = storeHistory.length > 0
    ? storeHistory
    : (agentId && spec ? (MOCK_SPEC_VERSIONS[spec.id] ?? []) : []);

  const metrics     = useMemo(() => agentId ? getMockMetrics(agentId)     : null, [agentId]);
  const connections = useMemo(() => agentId ? getMockConnections(agentId) : null, [agentId]);
  const compliance  = useMemo(() => agentId ? getMockCompliance(agentId)  : null, [agentId]);

  const networkAgentCount = allAgents.length || Object.keys(MOCK_AGENTS).length;

  // ── Compliance score badge in header ──────────────────────────────────────
  const complianceScore = compliance?.score ?? null;
  const complianceBadgeColor =
    complianceScore === null ? "text-text-secondary" :
    complianceScore >= 90    ? "text-success"         :
    complianceScore >= 70    ? "text-warning"          :
                               "text-error";

  return (
    <div className={cn("flex flex-col bg-surface border-l border-border h-full", className)}>
      {/* ── Panel header ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-surface/80 shrink-0">
        <svg className="w-3.5 h-3.5 text-text-secondary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <span className="text-xs font-semibold text-text-primary flex-1">Inspector</span>

        {/* Compliance score mini badge */}
        {complianceScore !== null && agent && (
          <span className={cn("text-[11px] font-mono font-bold", complianceBadgeColor)}>
            {complianceScore}%
          </span>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors ml-1"
            aria-label="Close inspector"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Agent not selected ────────────────────────────────────────────── */}
      {!agent && <EmptyState />}

      {/* ── Agent selected ───────────────────────────────────────────────── */}
      {agent && (
        <>
          {/* Tab switcher */}
          <div className="flex border-b border-border shrink-0 px-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex-1 py-2.5 text-xs font-medium transition-all duration-150 relative",
                  activeTab === tab.id
                    ? "text-accent"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {tab.label}
                {activeTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {/* ── Details tab ──────────────────────────────────────────── */}
            {activeTab === "details" && (
              <>
                <DetailsPanelTab
                  agent={agent}
                  spec={spec}
                  networkAgentCount={networkAgentCount}
                  onEditSpec={onEditSpec}
                />

                <SectionDivider label="Network" />
                {connections && <NetworkInfo connections={connections} />}

                <SectionDivider label="Compliance" />
                {compliance && (
                  <ComplianceStatus
                    data={compliance}
                    agentId={agent.id}
                  />
                )}
              </>
            )}

            {/* ── Monitor tab ──────────────────────────────────────────── */}
            {activeTab === "monitor" && metrics && (
              <MonitorTab metrics={metrics} agentName={agent.name} />
            )}

            {/* ── Spec tab ─────────────────────────────────────────────── */}
            {activeTab === "spec" && (
              <div className="flex flex-col h-full">
                <SpecTab
                  spec={spec}
                  versions={history}
                  onRollback={async (specId, versionId) => {
                    await rollbackSpec(specId, versionId);
                  }}
                  onEditSpec={onEditSpec}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
