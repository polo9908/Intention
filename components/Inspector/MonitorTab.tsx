"use client";

import { cn } from "@/lib/utils";
import type { AgentMetrics, MetricPoint, TrendDirection, TrendPolarity } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function trendIcon(trend: TrendDirection): string {
  if (trend === "up")   return "↑";
  if (trend === "down") return "↓";
  return "→";
}

/**
 * Green = performing well, amber = warning.
 * `polarity` tells us whether "up" is good or bad for this metric.
 */
function metricColor(point: MetricPoint, polarity: TrendPolarity): string {
  if (point.trend === "flat") return "text-text-secondary";
  const isGood =
    (polarity === "up-good"  && point.trend === "up")   ||
    (polarity === "up-bad"   && point.trend === "down");
  return isGood ? "text-success" : "text-warning";
}

// ---------------------------------------------------------------------------
// MetricCard
// ---------------------------------------------------------------------------

interface MetricCardProps {
  label: string;
  point: MetricPoint;
  polarity: TrendPolarity;
  /** Subtitle / unit description shown below the label */
  unit?: string;
  /** Optional threshold strings, e.g. "< 2 s" shown in muted text */
  threshold?: string;
}

function MetricCard({ label, point, polarity, unit, threshold }: MetricCardProps) {
  const color   = metricColor(point, polarity);
  const icon    = trendIcon(point.trend);
  const isFlat  = point.trend === "flat";

  return (
    <div className="bg-surface/60 border border-border rounded-lg p-3 space-y-2">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-text-secondary leading-none">{label}</p>
          {unit && <p className="text-[10px] text-text-secondary/60 mt-0.5">{unit}</p>}
        </div>
        {threshold && (
          <span className="text-[9px] text-text-secondary/50 font-mono shrink-0 mt-0.5">{threshold}</span>
        )}
      </div>

      {/* Value */}
      <p className="text-xl font-semibold tabular-nums text-text-primary leading-none">
        {point.formatted}
      </p>

      {/* Trend delta */}
      <div className={cn("flex items-center gap-1 text-[11px]", isFlat ? "text-text-secondary/50" : color)}>
        <span className="font-mono font-bold leading-none">{icon}</span>
        <span className="font-mono">{isFlat ? "no change" : point.deltaFormatted}</span>
        <span className="text-text-secondary/40 text-[10px]">vs yesterday</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonitorTab
// ---------------------------------------------------------------------------

interface MonitorTabProps {
  metrics: AgentMetrics;
  agentName: string;
}

export function MonitorTab({ metrics, agentName }: MonitorTabProps) {
  // Overall health score: weighted average of key metrics
  const health = Math.round(
    metrics.resolutionRate.value * 0.4 +
    Math.max(0, 100 - metrics.escalationRate.value * 5) * 0.3 +
    Math.max(0, 100 - metrics.avgResponseTime.value * 10) * 0.3
  );

  const healthColor =
    health >= 90 ? "text-success" :
    health >= 70 ? "text-warning"  :
                   "text-error";

  const healthLabel =
    health >= 90 ? "Healthy" :
    health >= 70 ? "Degraded" :
                   "Critical";

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto">
      {/* Health summary banner */}
      <div className={cn(
        "rounded-lg border px-3 py-2.5 flex items-center justify-between",
        health >= 90 ? "border-success/30 bg-success/5"  :
        health >= 70 ? "border-warning/30 bg-warning/5"  :
                       "border-error/30   bg-error/5"
      )}>
        <div>
          <p className="text-[11px] text-text-secondary">Overall health</p>
          <p className={cn("text-sm font-semibold", healthColor)}>{healthLabel}</p>
        </div>
        <div className={cn("text-2xl font-bold tabular-nums", healthColor)}>
          {health}
          <span className="text-sm font-normal text-text-secondary ml-0.5">%</span>
        </div>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-1 gap-2.5">
        <MetricCard
          label="Throughput"
          point={metrics.throughput}
          polarity="up-good"
          unit="requests / day"
        />
        <MetricCard
          label="Avg response time"
          point={metrics.avgResponseTime}
          polarity="up-bad"
          unit="seconds"
          threshold="< 2 s"
        />
        <MetricCard
          label="Resolution rate"
          point={metrics.resolutionRate}
          polarity="up-good"
          unit="% of requests resolved"
          threshold="> 90 %"
        />
        <MetricCard
          label="Cost per interaction"
          point={metrics.costPerInteraction}
          polarity="up-bad"
          unit="USD"
        />
        <MetricCard
          label="Escalation rate"
          point={metrics.escalationRate}
          polarity="up-bad"
          unit="% forwarded to parent"
          threshold="< 10 %"
        />
      </div>

      {/* Phase 2 placeholder */}
      <div className="rounded-lg border border-dashed border-border/60 px-3 py-4 text-center">
        <p className="text-[11px] text-text-secondary/60 font-mono">
          Real-time updates — Phase 2
        </p>
        <p className="text-[10px] text-text-secondary/40 mt-0.5">
          WebSocket streaming for {agentName}
        </p>
      </div>
    </div>
  );
}
