/**
 * NodeVisualizer.ts — Pure helpers for rendering agent nodes on the SVG canvas.
 *
 * Nothing here touches React state; all functions are pure transformations
 * from data → SVG attribute strings or style objects.
 */

import type { Status, AgentRole } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const NODE_RADIUS = 32;
/** Extra radius for the selection / hover ring */
export const NODE_RING_RADIUS = NODE_RADIUS + 7;
/** Glow filter id prefix */
export const GLOW_FILTER_ID = "node-glow";

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

/** Fill colour keyed by agent status */
export const STATUS_FILL: Record<Status, string> = {
  idle:      "#1e2a4a",
  running:   "#0e2a1e",
  paused:    "#2a2a0e",
  completed: "#0e2a1e",
  error:     "#2a0e0e",
};

/** Stroke (border) colour keyed by agent status */
export const STATUS_STROKE: Record<Status, string> = {
  idle:      "#3a4a7a",
  running:   "#22c55e",  // green-500
  paused:    "#eab308",  // yellow-500
  completed: "#22c55e",
  error:     "#ef4444",  // red-500
};

/** Subtle indicator dot colour keyed by status */
export const STATUS_DOT_COLOR: Record<Status, string> = {
  idle:      "#6b7280",
  running:   "#22c55e",
  paused:    "#eab308",
  completed: "#22c55e",
  error:     "#ef4444",
};

/** Accent cyan used for selection, hover, and entry nodes */
export const ACCENT_COLOR = "#00d9ff";

// ---------------------------------------------------------------------------
// Role icons (12×12 SVG path data, centred at 0,0)
// ---------------------------------------------------------------------------

/** Returns the SVG `d` attribute for a small role icon centred at (0,0) */
export function getRoleIconPath(role: AgentRole): string {
  switch (role) {
    case "orchestrator":
      // Crown-like shape
      return "M-5 4 L-5-2 L-2 2 L0-5 L2 2 L5-2 L5 4 Z";
    case "critic":
      // Magnifying glass
      return "M-2-4 A3 3 0 1 1-2 2 A3 3 0 1 1-2-4 M1.5 1.5 L5 5";
    case "specialist":
      // Lightning bolt
      return "M1-5 L-2 0 L1 0 L-1 5 L2 0 L-1 0 Z";
    case "worker":
    default:
      // Simple gear shape (hexagon-ish)
      return "M0-5 L4.3-2.5 L4.3 2.5 L0 5 L-4.3 2.5 L-4.3-2.5 Z M0-2.5 A2.5 2.5 0 1 1 0 2.5 A2.5 2.5 0 1 1 0-2.5";
  }
}

/** Role abbreviation shown inside the node */
export function getRoleLabel(role: AgentRole): string {
  switch (role) {
    case "orchestrator": return "ORC";
    case "critic":       return "CRT";
    case "specialist":   return "SPC";
    case "worker":       return "WKR";
  }
}

/** Full colour for role badge background */
export const ROLE_BADGE_COLOR: Record<AgentRole, string> = {
  orchestrator: "#7c3aed",  // violet
  critic:       "#0891b2",  // cyan
  specialist:   "#059669",  // emerald
  worker:       "#374151",  // gray
};

// ---------------------------------------------------------------------------
// State-derived helpers
// ---------------------------------------------------------------------------

/** Returns the effective stroke colour for a node given selection / hover state */
export function getNodeStroke(
  status: Status,
  selected: boolean,
  hovered: boolean,
): string {
  if (selected) return ACCENT_COLOR;
  if (hovered)  return ACCENT_COLOR + "aa"; // 67% opacity cyan
  return STATUS_STROKE[status];
}

/** Stroke width — thicker when selected */
export function getNodeStrokeWidth(selected: boolean, hovered: boolean): number {
  if (selected) return 2.5;
  if (hovered)  return 1.5;
  return 1.5;
}

/** Returns the SVG filter reference string for drop-shadow glow */
export function getNodeFilter(
  status: Status,
  selected: boolean,
  hovered: boolean,
): string | undefined {
  if (selected || hovered || status === "running") {
    return `url(#${GLOW_FILTER_ID})`;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Tooltip content builder
// ---------------------------------------------------------------------------

export interface NodeTooltipData {
  label: string;
  role: AgentRole;
  status: Status;
  isEntry: boolean;
}

/** Returns a plain-text multi-line tooltip string */
export function buildNodeTooltip(data: NodeTooltipData): string {
  const lines = [
    data.label,
    `Role: ${data.role}`,
    `Status: ${data.status}`,
  ];
  if (data.isEntry) lines.push("Entry point");
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// SVG defs helpers
// ---------------------------------------------------------------------------

/**
 * Returns the SVG markup (as a string) for a radial glow filter.
 * Inject this into an SVG <defs> block once.
 */
export function glowFilterDef(
  id: string = GLOW_FILTER_ID,
  color: string = ACCENT_COLOR,
): string {
  return `
    <filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur"/>
      <feFlood flood-color="${color}" flood-opacity="0.5" result="color"/>
      <feComposite in="color" in2="blur" operator="in" result="glow"/>
      <feMerge>
        <feMergeNode in="glow"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  `.trim();
}

/** Animated pulse ring for running nodes */
export function pulseAnimationDef(): string {
  return `
    <animate
      attributeName="r"
      values="${NODE_RING_RADIUS};${NODE_RING_RADIUS + 8};${NODE_RING_RADIUS}"
      dur="2s"
      repeatCount="indefinite"
    />
    <animate
      attributeName="opacity"
      values="0.6;0;0.6"
      dur="2s"
      repeatCount="indefinite"
    />
  `.trim();
}
