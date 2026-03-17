import type { ConnectionType } from "@/types";

// ---------------------------------------------------------------------------
// Inspector tabs
// ---------------------------------------------------------------------------

export type InspectorTab = "details" | "monitor" | "spec";

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

export type TrendDirection = "up" | "down" | "flat";

/** Whether "up" is good or bad for this metric */
export type TrendPolarity = "up-good" | "up-bad";

export interface MetricPoint {
  /** Numeric value */
  value: number;
  /** Display string (e.g. "1 234", "98.2%", "0.42 s") */
  formatted: string;
  /** Change vs. previous period (absolute, same unit as formatted) */
  delta: number;
  /** Formatted delta string (e.g. "+12", "-0.3%") */
  deltaFormatted: string;
  trend: TrendDirection;
}

export interface AgentMetrics {
  /** requests per day */
  throughput: MetricPoint;
  /** seconds */
  avgResponseTime: MetricPoint;
  /** 0–100 */
  resolutionRate: MetricPoint;
  /** USD */
  costPerInteraction: MetricPoint;
  /** 0–100 */
  escalationRate: MetricPoint;
}

// ---------------------------------------------------------------------------
// Network connections (Inspector view)
// ---------------------------------------------------------------------------

export interface InspectorConnection {
  id: string;
  agentId: string;
  agentName: string;
  type: ConnectionType;
  /** Percentage of total traffic through this connection (0–100) */
  trafficPct: number;
}

export interface NetworkConnections {
  /** Who calls this agent */
  inputs: InspectorConnection[];
  /** Who this agent calls */
  outputs: InspectorConnection[];
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export interface ComplianceIssue {
  id: string;
  severity: "error" | "warning";
  message: string;
}

export interface ComplianceData {
  /** 0–100 */
  score: number;
  lastValidatedAt: string | null;
  issues: ComplianceIssue[];
}

// ---------------------------------------------------------------------------
// Inspector props
// ---------------------------------------------------------------------------

export interface InspectorProps {
  /** The agent id being inspected (null = nothing selected) */
  agentId: string | null;
  /** Called when user clicks the Edit button in the Details tab */
  onEditSpec?: (agentId: string) => void;
  /** Called when user closes the inspector (e.g. via an X button) */
  onClose?: () => void;
  className?: string;
}
