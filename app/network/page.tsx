"use client";

import { useState } from "react";
import Link from "next/link";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { MOCK_NODES, MOCK_EDGES } from "@/components/NetworkCanvas/mockData";
import { Inspector } from "@/components/Inspector";
import type { CanvasNode } from "@/components/NetworkCanvas";
import { cn } from "@/lib/utils";

export default function NetworkPage() {
  const [nodes, setNodes] = useState<CanvasNode[]>(MOCK_NODES);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(true);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleEditSpec = (agentId: string) => {
    notify(`Opening spec editor for: ${agentId}`);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    // If the deleted node was selected, clear inspector
    const deleted = nodes.find((n) => n.id === nodeId);
    if (deleted?.agentId === selectedAgentId) setSelectedAgentId(null);
    notify(`Node removed`);
  };

  const handleDuplicateNode = (nodeId: string) => {
    setNodes((prev) => {
      const src = prev.find((n) => n.id === nodeId);
      if (!src) return prev;
      return [
        ...prev,
        {
          ...src,
          id:      `${src.id}-copy-${Date.now()}`,
          agentId: `${src.agentId}-copy`,
          label:   `${src.label} (copy)`,
          x: src.x + 60,
          y: src.y + 60,
        },
      ];
    });
    notify(`Node duplicated`);
  };

  const handleSelectNode = (nodeId: string | null) => {
    if (!nodeId) {
      setSelectedAgentId(null);
      return;
    }
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedAgentId(node.agentId);
      setInspectorOpen(true);
    }
  };

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/80 backdrop-blur-sm z-10">
        <div className="w-2 h-2 rounded-full bg-accent shadow-glow-sm flex-shrink-0" />
        <span className="text-sm font-medium text-text-primary">Network Canvas</span>

        {/* Agent name breadcrumb */}
        {selectedAgentId && (
          <>
            <span className="text-text-secondary/40 text-sm">/</span>
            <span className="text-xs text-accent font-mono truncate max-w-[140px]">{selectedAgentId}</span>
          </>
        )}

        <div className="flex-1" />

        {/* Inspector toggle */}
        <button
          onClick={() => setInspectorOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-150 border",
            inspectorOpen
              ? "bg-accent/10 text-accent border-accent/30"
              : "text-text-secondary hover:text-text-primary border-transparent hover:border-border"
          )}
          title="Toggle Inspector"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Inspector
        </button>

        <Link
          href="/"
          className="text-xs text-text-secondary hover:text-accent transition-colors px-2 py-1 rounded border border-transparent hover:border-accent/30"
        >
          ← Spec Builder
        </Link>
      </header>

      {/* ── Body: canvas + inspector ─────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-hidden relative">
          <NetworkCanvas
            nodes={nodes}
            edges={MOCK_EDGES}
            onEditSpec={handleEditSpec}
            onDeleteNode={handleDeleteNode}
            onDuplicateNode={handleDuplicateNode}
            onSelectNode={handleSelectNode}
            className="w-full h-full"
          />
        </div>

        {/* Inspector panel */}
        <div
          className={cn(
            "flex-shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out",
            inspectorOpen ? "w-72 xl:w-80" : "w-0"
          )}
        >
          {inspectorOpen && (
            <Inspector
              agentId={selectedAgentId}
              onEditSpec={handleEditSpec}
              onClose={() => setInspectorOpen(false)}
              className="w-full h-full"
            />
          )}
        </div>
      </div>

      {/* Toast */}
      {notification && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-text-primary shadow-lg pointer-events-none animate-fade-in">
          {notification}
        </div>
      )}
    </div>
  );
}
