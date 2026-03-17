"use client";

import { useState, useMemo } from "react";
import { NetworkCanvas } from "@/components/NetworkCanvas";
import { MOCK_NODES, MOCK_EDGES } from "@/components/NetworkCanvas/mockData";
import type { CanvasNode } from "@/components/NetworkCanvas";
import Link from "next/link";

export default function NetworkPage() {
  const [nodes, setNodes] = useState<CanvasNode[]>(MOCK_NODES);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 2500);
  };

  const handleEditSpec = (agentId: string) => {
    setSelectedAgentId(agentId);
    notify(`Opening spec editor for agent: ${agentId}`);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== nodeId));
    notify(`Node deleted: ${nodeId}`);
  };

  const handleDuplicateNode = (nodeId: string) => {
    setNodes((prev) => {
      const src = prev.find((n) => n.id === nodeId);
      if (!src) return prev;
      const dup: CanvasNode = {
        ...src,
        id:      `${src.id}-copy-${Date.now()}`,
        agentId: `${src.agentId}-copy`,
        label:   `${src.label} (copy)`,
        x: src.x + 60,
        y: src.y + 60,
      };
      return [...prev, dup];
    });
    notify(`Node duplicated: ${nodeId}`);
  };

  const handleSelectNode = (nodeId: string | null) => {
    if (!nodeId) setSelectedAgentId(null);
  };

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="w-2 h-2 rounded-full bg-accent shadow-glow-sm flex-shrink-0" />
        <span className="text-sm font-medium text-text-primary">Network Canvas</span>
        <div className="flex-1" />
        <Link
          href="/"
          className="text-xs text-text-secondary hover:text-accent transition-colors px-2 py-1 rounded border border-transparent hover:border-accent/30"
        >
          ← Spec Builder
        </Link>
      </header>

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

      {/* Toast notification */}
      {notification && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-surface border border-border rounded-lg px-4 py-2 text-xs text-text-primary shadow-lg animate-fade-in pointer-events-none">
          {notification}
        </div>
      )}
    </div>
  );
}
