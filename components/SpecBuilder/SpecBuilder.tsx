"use client";

/**
 * SpecBuilder — three-column spec editor
 *
 * Layout
 * ───────────────────────────────────────────────────────────────────
 *   ≥ 1280px  :  [sidebar 280px] [matrix 1fr] [preview 320px]
 *   768-1279px:  [sidebar 280px] [matrix 1fr] + preview in bottom drawer
 *   < 768px   :  full-width single column with tab navigation
 */

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/Export";
import { ContextsSidebar } from "./ContextsSidebar";
import { SpecMatrix }      from "./SpecMatrix";
import { LivePreview }     from "./LivePreview";
import { useSpecBuilder }  from "./useSpecBuilder";
import { MODEL_OPTIONS }   from "./utils";

// ---------------------------------------------------------------------------
// Mobile tab bar
// ---------------------------------------------------------------------------

type MobileTab = "matrix" | "preview";

function MobileTabBar({
  active,
  onChange,
  isSyncing,
}: {
  active: MobileTab;
  onChange: (t: MobileTab) => void;
  isSyncing: boolean;
}) {
  return (
    <div className="flex border-b border-border bg-surface md:hidden flex-shrink-0">
      {(["matrix", "preview"] as MobileTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={cn(
            "flex-1 py-2.5 text-xs font-medium uppercase tracking-wider transition-colors duration-150",
            active === tab
              ? "text-accent border-b-2 border-accent"
              : "text-text-secondary hover:text-text-primary"
          )}
        >
          {tab === "matrix" ? "Matrix" : "Preview"}
          {tab === "matrix" && isSyncing && (
            <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          )}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header toolbar
// ---------------------------------------------------------------------------

function SpecBuilderHeader({
  agentName,
  model,
  temperature,
  maxTokens,
  isSyncing,
  currentSpec,
  onAgentNameChange,
  onModelChange,
  onTemperatureChange,
  onMaxTokensChange,
}: {
  agentName: string;
  model: string;
  temperature: number;
  maxTokens: number;
  isSyncing: boolean;
  currentSpec: import("@/types").AgentSpec | null;
  onAgentNameChange: (v: string) => void;
  onModelChange: (v: string) => void;
  onTemperatureChange: (v: number) => void;
  onMaxTokensChange: (v: number) => void;
}) {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <header className="flex-shrink-0 flex items-center gap-3 px-4 py-2.5 border-b border-border bg-surface/80 backdrop-blur-sm">
      {/* Logo dot */}
      <div className="w-2 h-2 rounded-full bg-accent shadow-glow-sm flex-shrink-0" />

      {/* Agent name */}
      <input
        value={agentName}
        onChange={(e) => onAgentNameChange(e.target.value)}
        placeholder="Agent name…"
        className={cn(
          "bg-transparent border-b border-transparent text-text-primary font-medium text-sm",
          "focus:border-accent/60 outline-none transition-colors duration-150 w-48 truncate"
        )}
      />

      {/* Model selector */}
      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className={cn(
          "bg-background border border-border rounded px-2 py-1 text-xs text-text-secondary",
          "focus:border-accent/60 focus:text-text-primary outline-none transition-all duration-150",
          "appearance-none cursor-pointer"
        )}
      >
        {MODEL_OPTIONS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-150",
          showSettings
            ? "text-accent bg-accent/10 border border-accent/30"
            : "text-text-secondary hover:text-text-primary hover:bg-white/5 border border-transparent"
        )}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {/* Inline settings panel */}
      {showSettings && (
        <div className="flex items-center gap-4 border-l border-border pl-3 animate-fade-in">
          <label className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary whitespace-nowrap">Temp</span>
            <input
              type="range"
              min={0} max={1} step={0.05}
              value={temperature}
              onChange={(e) => onTemperatureChange(Number(e.target.value))}
              className="w-20 accent-accent cursor-pointer"
            />
            <span className="text-text-primary font-mono w-6">{temperature.toFixed(1)}</span>
          </label>
          <label className="flex items-center gap-2 text-xs">
            <span className="text-text-secondary whitespace-nowrap">Max tokens</span>
            <select
              value={maxTokens}
              onChange={(e) => onMaxTokensChange(Number(e.target.value))}
              className="bg-background border border-border rounded px-2 py-0.5 text-xs text-text-primary outline-none appearance-none focus:border-accent/60"
            >
              {[512, 1024, 2048, 4096, 8192].map((n) => (
                <option key={n} value={n}>{n.toLocaleString()}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Export button */}
      <ExportButton spec={currentSpec} />

      {/* Network canvas link */}
      <Link
        href="/network"
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-150",
          "text-text-secondary hover:text-accent hover:bg-accent/5 border border-transparent hover:border-accent/30"
        )}
      >
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        Network
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Sync status */}
      <div className={cn(
        "flex items-center gap-1.5 text-xs transition-opacity duration-300",
        isSyncing ? "opacity-100 text-accent" : "opacity-40 text-text-secondary"
      )}>
        {isSyncing ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            saving…
          </>
        ) : (
          <>
            <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 24 24">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            saved
          </>
        )}
      </div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// Main SpecBuilder
// ---------------------------------------------------------------------------

export function SpecBuilder() {
  const {
    agentName, setAgentName,
    model, setModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    contexts, criteria, cells,
    addContext, removeContext, renameContext, reorderContexts,
    addCriterion, removeCriterion, renameCriterion, toggleCriterion,
    setCellValue,
    currentSpec,
    stats,
    isSyncing,
  } = useSpecBuilder();

  const [mobileTab, setMobileTab] = useState<MobileTab>("matrix");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex flex-col h-dvh bg-background overflow-hidden animate-fade-in">
      {/* Header */}
      <SpecBuilderHeader
        agentName={agentName}
        model={model}
        temperature={temperature}
        maxTokens={maxTokens}
        isSyncing={isSyncing}
        currentSpec={currentSpec}
        onAgentNameChange={setAgentName}
        onModelChange={(v) => setModel(v as typeof model)}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
      />

      {/* Mobile tab bar */}
      <MobileTabBar
        active={mobileTab}
        onChange={setMobileTab}
        isSyncing={isSyncing}
      />

      {/* Body — three columns on desktop */}
      <div className="flex-1 flex overflow-hidden">
        {/* ── Left sidebar ────────────────────────────────────────────── */}
        <div
          className={cn(
            "flex-shrink-0 overflow-hidden transition-all duration-200",
            // Desktop: always visible (collapsible)
            "hidden md:flex flex-col",
            sidebarOpen ? "w-[280px]" : "w-0"
          )}
        >
          <ContextsSidebar
            contexts={contexts}
            criteria={criteria}
            stats={stats}
            onAddContext={addContext}
            onRemoveContext={removeContext}
            onRenameContext={renameContext}
            onReorderContexts={reorderContexts}
            onAddCriterion={addCriterion}
            onRemoveCriterion={removeCriterion}
            onRenameCriterion={renameCriterion}
            onToggleCriterion={toggleCriterion}
          />
        </div>

        {/* Sidebar toggle button (desktop) */}
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className={cn(
            "hidden md:flex items-center justify-center",
            "w-5 flex-shrink-0 bg-surface border-r border-border",
            "text-text-secondary hover:text-accent hover:bg-accent/5",
            "transition-colors duration-150 group"
          )}
          title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          <svg
            className={cn(
              "w-3 h-3 transition-transform duration-200",
              sidebarOpen ? "" : "rotate-180"
            )}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* ── Mobile sidebar overlay ────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden md:flex-row">
          {/* Mobile: full-width sidebar shown at top */}
          <div className="md:hidden border-b border-border flex-shrink-0">
            <ContextsSidebar
              contexts={contexts}
              criteria={criteria}
              stats={stats}
              onAddContext={addContext}
              onRemoveContext={removeContext}
              onRenameContext={renameContext}
              onReorderContexts={reorderContexts}
              onAddCriterion={addCriterion}
              onRemoveCriterion={removeCriterion}
              onRenameCriterion={renameCriterion}
              onToggleCriterion={toggleCriterion}
            />
          </div>

          {/* ── Center matrix ───────────────────────────────────────── */}
          <div
            className={cn(
              "flex-1 flex flex-col overflow-hidden",
              // On mobile: show only when matrix tab is active
              mobileTab !== "matrix" && "hidden md:flex"
            )}
          >
            <SpecMatrix
              contexts={contexts}
              criteria={criteria}
              cells={cells}
              onCellChange={setCellValue}
            />
          </div>

          {/* ── Right preview panel — desktop ───────────────────────── */}
          <div className="hidden xl:flex flex-col flex-shrink-0 w-[320px] overflow-hidden">
            <LivePreview spec={currentSpec} contexts={contexts} />
          </div>
        </div>
      </div>

      {/* ── Preview panel — tablet (below matrix) ───────────────────── */}
      <div
        className={cn(
          "xl:hidden border-t border-border flex-shrink-0",
          // On mobile: show only when preview tab is active
          mobileTab !== "preview" && "hidden md:block",
          "md:h-[300px] overflow-hidden"
        )}
      >
        <LivePreview spec={currentSpec} contexts={contexts} />
      </div>
    </div>
  );
}
