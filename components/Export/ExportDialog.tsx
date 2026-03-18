"use client";

import { useState, useCallback, useMemo } from "react";
import { cn }                             from "@/lib/utils";
import { formatRelativeTime }             from "@/lib/utils";
import { exportToJson }                   from "@/lib/exporters/jsonExporter";
import { exportToYaml }                   from "@/lib/exporters/yamlExporter";
import { exportToMcp }                    from "@/lib/exporters/mcpExporter";
import { generateShareLink, listShares, revokeShare, isShareValid } from "@/lib/shareService";
import {
  recordDeployment,
  updateDeploymentStatus,
  getDeploymentHistory,
  getLiveDeployment,
  diffSpecWithLive,
} from "@/lib/deploymentService";
import type { AgentSpec } from "@/types";
import type { DeploymentTarget } from "@/lib/deploymentService";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ExportFormat = "json" | "yaml" | "mcp";
type DialogTab    = "export" | "share" | "deploy";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function downloadText(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Format tab button
// ---------------------------------------------------------------------------

interface FormatBtnProps {
  id: ExportFormat;
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
}

function FormatBtn({ id, label, badge, active, onClick }: FormatBtnProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
        active
          ? "bg-accent/15 text-accent border-accent/40"
          : "bg-transparent text-text-secondary border-border hover:text-text-primary hover:border-border/80",
      )}
    >
      {label}
      {badge && (
        <span className="px-1 py-0.5 rounded text-[9px] bg-accent/20 text-accent font-mono leading-none">
          {badge}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Code preview
// ---------------------------------------------------------------------------

function CodePreview({ content, language }: { content: string; language: string }) {
  const lines = content.split("\n");
  const preview = lines.slice(0, 80).join("\n");
  const truncated = lines.length > 80;

  return (
    <div className="relative bg-background rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-surface/50">
        <span className="text-[10px] font-mono text-text-secondary uppercase tracking-wider">{language}</span>
        <span className="text-[10px] text-text-secondary/60">{lines.length} lines</span>
      </div>
      <pre className="text-[11px] font-mono text-text-primary p-3 overflow-auto max-h-64 leading-relaxed whitespace-pre">
        {preview}
        {truncated && (
          <span className="text-text-secondary/40">{`\n… (${lines.length - 80} more lines)`}</span>
        )}
      </pre>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export tab
// ---------------------------------------------------------------------------

function ExportTabContent({ spec }: { spec: AgentSpec }) {
  const [format, setFormat] = useState<ExportFormat>("json");
  const [copied, setCopied] = useState(false);
  const [includeComments, setIncludeComments] = useState(true);

  const result = useMemo(() => {
    if (format === "json") return exportToJson(spec, { includeComments });
    if (format === "yaml") return exportToYaml(spec, { includeComments });
    return exportToMcp(spec);
  }, [spec, format, includeComments]);

  const preview = format === "mcp"
    ? (result as ReturnType<typeof exportToMcp>).preview
    : (result as { content: string }).content;

  const langMap: Record<ExportFormat, string> = { json: "json", yaml: "yaml", mcp: "typescript" };

  const handleCopy = async () => {
    const ok = await copyText(preview);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (format === "mcp") {
      const r = result as ReturnType<typeof exportToMcp>;
      downloadText(r.combined, r.filename, r.mimeType);
    } else {
      const r = result as { content: string; filename: string; mimeType: string };
      downloadText(r.content, r.filename, r.mimeType);
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Format selector */}
      <div className="flex items-center gap-2">
        <FormatBtn id="json" label="JSON"  active={format === "json"} onClick={() => setFormat("json")} />
        <FormatBtn id="yaml" label="YAML"  active={format === "yaml"} onClick={() => setFormat("yaml")} />
        <FormatBtn id="mcp"  label="MCP"   badge="deploy" active={format === "mcp"}  onClick={() => setFormat("mcp")}  />
      </div>

      {/* Options */}
      {format !== "mcp" && (
        <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
          <input
            type="checkbox"
            checked={includeComments}
            onChange={(e) => setIncludeComments(e.target.checked)}
            className="rounded border-border"
          />
          Include inline comments
        </label>
      )}

      {/* MCP info banner */}
      {format === "mcp" && (
        <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-accent/5 border border-accent/20 text-xs">
          <svg className="w-3.5 h-3.5 text-accent mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="space-y-1 text-text-secondary">
            <p className="font-medium text-text-primary">MCP Server bundle</p>
            <p>Download includes <code className="font-mono text-accent">server.ts</code>, <code className="font-mono text-accent">package.json</code>, and <code className="font-mono text-accent">README.md</code>.</p>
            <p>Run with <code className="font-mono text-accent/80">ANTHROPIC_API_KEY=… node server.js</code></p>
          </div>
        </div>
      )}

      {/* Preview */}
      <CodePreview content={preview} language={langMap[format]} />

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium border transition-all duration-150",
            copied
              ? "bg-success/10 text-success border-success/30"
              : "bg-surface border-border text-text-primary hover:border-accent/40 hover:text-accent hover:bg-accent/5",
          )}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy
            </>
          )}
        </button>
        <button
          onClick={handleDownload}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 hover:border-accent/50 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Share tab
// ---------------------------------------------------------------------------

function ShareTabContent({ spec }: { spec: AgentSpec }) {
  const [shares, setShares]       = useState(() => listShares(spec.id));
  const [copiedId, setCopiedId]   = useState<string | null>(null);
  const [permission, setPermission] = useState<"view" | "clone">("view");

  const handleCreate = () => {
    const record = generateShareLink(spec, { permission });
    setShares(listShares(spec.id));
    void copyText(record.shareUrl).then(() => {
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleRevoke = (shareId: string) => {
    revokeShare(shareId);
    setShares(listShares(spec.id));
  };

  const handleCopyUrl = async (id: string, url: string) => {
    const ok = await copyText(url);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const activeShares = shares.filter(isShareValid);

  return (
    <div className="space-y-4 p-4">
      {/* Create share */}
      <div className="space-y-3 p-3 rounded-lg border border-border bg-surface/40">
        <p className="text-xs font-medium text-text-primary">Generate share link</p>

        <div className="flex gap-2">
          {(["view", "clone"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPermission(p)}
              className={cn(
                "flex-1 py-1.5 rounded text-xs font-medium border transition-all duration-100",
                permission === p
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "text-text-secondary border-border hover:text-text-primary",
              )}
            >
              {p === "view" ? "View only" : "View + Clone"}
            </button>
          ))}
        </div>

        <button
          onClick={handleCreate}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-all duration-150"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Create link &amp; copy
        </button>
      </div>

      {/* Active shares */}
      {activeShares.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider px-0.5">
            Active links ({activeShares.length})
          </p>
          {activeShares.map((share) => (
            <div
              key={share.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg border border-border bg-surface/30"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-mono border",
                    share.permission === "view"
                      ? "bg-slate-500/15 text-slate-400 border-slate-500/20"
                      : "bg-accent/10 text-accent border-accent/20",
                  )}>
                    {share.permission}
                  </span>
                  <span className="text-[10px] text-text-secondary/60">
                    {formatRelativeTime(share.createdAt)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-text-secondary/70 truncate">
                  {share.shareUrl}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => handleCopyUrl(share.id, share.shareUrl)}
                  className={cn(
                    "p-1.5 rounded text-text-secondary hover:text-accent transition-colors",
                    copiedId === share.id && "text-success",
                  )}
                  title="Copy URL"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d={copiedId === share.id
                        ? "M5 13l4 4L19 7"
                        : "M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"} />
                  </svg>
                </button>
                <button
                  onClick={() => handleRevoke(share.id)}
                  className="p-1.5 rounded text-text-secondary hover:text-error transition-colors"
                  title="Revoke link"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeShares.length === 0 && (
        <p className="text-xs text-text-secondary/50 text-center py-4">No active share links</p>
      )}

      <p className="text-[10px] text-text-secondary/40 text-center">
        Links are stored locally (Phase 1). Server-side sharing in Phase 2.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deploy tab
// ---------------------------------------------------------------------------

const TARGET_LABELS: Record<DeploymentTarget, string> = {
  mcp:    "MCP Server",
  api:    "REST API",
  custom: "Custom",
};

function DeployTabContent({ spec }: { spec: AgentSpec }) {
  const [target,   setTarget]   = useState<DeploymentTarget>("mcp");
  const [deploying, setDeploying] = useState(false);
  const [history,  setHistory]  = useState(() => getDeploymentHistory(spec.id));

  const live = getLiveDeployment(spec.id);
  const diff = diffSpecWithLive(spec);

  const handleDeploy = async () => {
    setDeploying(true);
    // Phase 1: simulate async deploy
    const pending = recordDeployment(spec, target, { status: "pending", label: `Deploy to ${TARGET_LABELS[target]}` });
    await new Promise((r) => setTimeout(r, 1400));

    // Simulate success 90% of the time for demo
    const success = Math.random() > 0.1;
    updateDeploymentStatus(
      pending.id,
      success ? "success" : "failed",
      success ? undefined : "Connection refused (demo error)",
    );

    setHistory(getDeploymentHistory(spec.id));
    setDeploying(false);
  };

  const statusColor: Record<string, string> = {
    success:     "text-success",
    failed:      "text-error",
    pending:     "text-warning",
    rolled_back: "text-text-secondary",
  };

  const statusIcon: Record<string, string> = {
    success:     "✓",
    failed:      "✗",
    pending:     "…",
    rolled_back: "↩",
  };

  return (
    <div className="space-y-4 p-4 overflow-y-auto">
      {/* Diff summary */}
      <div className={cn(
        "p-3 rounded-lg border text-xs",
        diff.isInSync
          ? "border-success/30 bg-success/5"
          : diff.liveVersion === null
            ? "border-border bg-surface/40"
            : "border-warning/30 bg-warning/5",
      )}>
        {diff.liveVersion === null ? (
          <p className="text-text-secondary">Never deployed — local v{diff.localVersion}</p>
        ) : diff.isInSync ? (
          <p className="text-success">In sync — live v{diff.liveVersion} matches local</p>
        ) : (
          <div className="space-y-1.5">
            <p className="text-warning font-medium">
              {diff.changes.length} change{diff.changes.length > 1 ? "s" : ""} since v{diff.liveVersion}
            </p>
            {diff.changes.map((c) => (
              <p key={c.field} className="text-text-secondary pl-2 border-l border-warning/30">
                {c.summary}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Target selector */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">Deploy target</p>
        <div className="flex gap-2">
          {(Object.keys(TARGET_LABELS) as DeploymentTarget[]).map((t) => (
            <button
              key={t}
              onClick={() => setTarget(t)}
              className={cn(
                "flex-1 py-1.5 rounded text-xs font-medium border transition-all duration-100",
                target === t
                  ? "bg-accent/15 text-accent border-accent/40"
                  : "text-text-secondary border-border hover:text-text-primary",
              )}
            >
              {TARGET_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Deploy button */}
      <button
        onClick={handleDeploy}
        disabled={deploying}
        className={cn(
          "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold border transition-all duration-150",
          deploying
            ? "bg-surface border-border text-text-secondary cursor-not-allowed"
            : "bg-accent/10 text-accent border-accent/30 hover:bg-accent/20 hover:border-accent/50",
        )}
      >
        {deploying ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Deploying…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Deploy v{spec.version} to {TARGET_LABELS[target]}
          </>
        )}
      </button>

      {/* Deployment history */}
      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold text-text-secondary uppercase tracking-wider">
            History ({history.length})
          </p>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
            {history.map((record) => (
              <div
                key={record.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface/40 border border-border/60 text-xs"
              >
                <span className={cn("font-mono font-bold w-4 text-center shrink-0", statusColor[record.status])}>
                  {statusIcon[record.status]}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-text-secondary/60 text-[10px]">v{record.specVersion}</span>
                    <span className="text-text-secondary/50">→</span>
                    <span className="text-[10px] text-text-secondary">{TARGET_LABELS[record.target]}</span>
                  </div>
                  {record.label && (
                    <p className="text-[10px] text-text-secondary/70 truncate">{record.label}</p>
                  )}
                  {record.error && (
                    <p className="text-[10px] text-error/80 truncate">{record.error}</p>
                  )}
                </div>
                <span className="text-[10px] text-text-secondary/50 shrink-0 tabular-nums">
                  {formatRelativeTime(record.deployedAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ExportDialog
// ---------------------------------------------------------------------------

interface ExportDialogProps {
  spec: AgentSpec;
  /** Controlled: whether the dialog is open */
  open: boolean;
  onClose: () => void;
}

const DIALOG_TABS: { id: DialogTab; label: string; icon: React.ReactNode }[] = [
  {
    id: "export",
    label: "Export",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
  {
    id: "share",
    label: "Share",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
  {
    id: "deploy",
    label: "Deploy",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
];

export function ExportDialog({ spec, open, onClose }: ExportDialogProps) {
  const [tab, setTab] = useState<DialogTab>("export");

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={cn(
            "pointer-events-auto w-full max-w-lg max-h-[85dvh] flex flex-col",
            "bg-surface border border-border rounded-xl shadow-2xl overflow-hidden",
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
            <div className="w-6 h-6 rounded-md bg-accent/15 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{spec.name}</p>
              <p className="text-[10px] text-text-secondary font-mono">v{spec.version} · {spec.model}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/5 text-text-secondary hover:text-text-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-border shrink-0 px-1">
            {DIALOG_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-all duration-150 relative",
                  tab === t.id ? "text-accent" : "text-text-secondary hover:text-text-primary",
                )}
              >
                {t.icon}
                {t.label}
                {tab === t.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-t-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {tab === "export" && <ExportTabContent spec={spec} />}
            {tab === "share"  && <ShareTabContent  spec={spec} />}
            {tab === "deploy" && <DeployTabContent  spec={spec} />}
          </div>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Trigger button (convenience wrapper)
// ---------------------------------------------------------------------------

interface ExportButtonProps {
  spec: AgentSpec | null;
  className?: string;
}

export function ExportButton({ spec, className }: ExportButtonProps) {
  const [open, setOpen] = useState(false);

  if (!spec) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150",
          "text-text-secondary border-border hover:text-accent hover:border-accent/30 hover:bg-accent/5",
          className,
        )}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>
      <ExportDialog spec={spec} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
