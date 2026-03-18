/**
 * ConnectionRenderer.ts — Pure helpers for rendering directed edges on the SVG canvas.
 *
 * All functions are pure; no React imports.
 */

import type { ConnectionType } from "@/types";
import type { CanvasEdge, CanvasNode } from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ARROW_MARKER_ID_PREFIX = "arrow";
/** How far from the node centre the edge starts/ends (accounts for NODE_RADIUS) */
export const EDGE_NODE_MARGIN = 36;

// ---------------------------------------------------------------------------
// Colours
// ---------------------------------------------------------------------------

export const EDGE_COLOR: Record<ConnectionType, string> = {
  sequential:  "#4b5563",  // gray-600
  parallel:    "#00d9ff",  // cyan accent
  conditional: "#f59e0b",  // amber-400
  feedback:    "#8b5cf6",  // violet-500
};

export const EDGE_STROKE_WIDTH: Record<ConnectionType, number> = {
  sequential:  1.5,
  parallel:    2,
  conditional: 1.5,
  feedback:    1.5,
};

// ---------------------------------------------------------------------------
// Arrow marker defs
// ---------------------------------------------------------------------------

/** Returns the SVG `<marker>` element markup for a given connection type */
export function arrowMarkerDef(type: ConnectionType): string {
  const id    = `${ARROW_MARKER_ID_PREFIX}-${type}`;
  const color = EDGE_COLOR[type];
  return `
    <marker
      id="${id}"
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="6"
      markerHeight="6"
      orient="auto-start-reverse"
    >
      <path d="M 0 0 L 10 5 L 0 10 z" fill="${color}" />
    </marker>
  `.trim();
}

// ---------------------------------------------------------------------------
// Geometry
// ---------------------------------------------------------------------------

interface Point { x: number; y: number; }

/** Unit vector from a to b */
function unit(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: dx / len, y: dy / len };
}

/** Move point p by `dist` in direction `dir` */
function offset(p: Point, dir: Point, dist: number): Point {
  return { x: p.x + dir.x * dist, y: p.y + dir.y * dist };
}

/**
 * Normal vector (perpendicular to the line a→b, rotated 90° clockwise).
 * Used to spread parallel edges apart.
 */
function normal(a: Point, b: Point): Point {
  const u = unit(a, b);
  return { x: u.y, y: -u.x };
}

// ---------------------------------------------------------------------------
// Path builders
// ---------------------------------------------------------------------------

/**
 * Builds a cubic Bézier SVG path string from source node to target node.
 *
 * @param source     Source node centre
 * @param target     Target node centre
 * @param lateralOffset  Pixels to offset perpendicular to the line
 *                       (used when multiple edges connect the same pair)
 */
export function buildStraightPath(
  source: Point,
  target: Point,
  lateralOffset = 0,
): string {
  const dir   = unit(source, target);
  const norm  = normal(source, target);

  // Start / end points inset by EDGE_NODE_MARGIN to sit on the node boundary
  const start = offset(source, dir,  EDGE_NODE_MARGIN);
  const end   = offset(target, dir, -EDGE_NODE_MARGIN);

  if (lateralOffset === 0) {
    // Slightly curved Bézier for visual clarity
    const len  = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
    const cp1  = { x: start.x + dir.x * len * 0.4, y: start.y + dir.y * len * 0.4 };
    const cp2  = { x: end.x   - dir.x * len * 0.4, y: end.y   - dir.y * len * 0.4 };
    return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
  }

  // Offset both points perpendicularly to avoid overlap
  const s = { x: start.x + norm.x * lateralOffset, y: start.y + norm.y * lateralOffset };
  const e = { x: end.x   + norm.x * lateralOffset, y: end.y   + norm.y * lateralOffset };
  const len  = Math.sqrt((e.x - s.x) ** 2 + (e.y - s.y) ** 2);
  const cp1  = { x: s.x + dir.x * len * 0.4 + norm.x * lateralOffset * 0.5, y: s.y + dir.y * len * 0.4 + norm.y * lateralOffset * 0.5 };
  const cp2  = { x: e.x - dir.x * len * 0.4 + norm.x * lateralOffset * 0.5, y: e.y - dir.y * len * 0.4 + norm.y * lateralOffset * 0.5 };
  return `M ${s.x} ${s.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${e.x} ${e.y}`;
}

/**
 * Builds a loopback arc for feedback connections (source → itself or a previous layer).
 * Draws a wide arc above/below the edge pair.
 */
export function buildFeedbackPath(source: Point, target: Point): string {
  const midX = (source.x + target.x) / 2;
  const minY = Math.min(source.y, target.y);
  // Arc height proportional to distance
  const dist = Math.sqrt((target.x - source.x) ** 2 + (target.y - source.y) ** 2);
  const arcH = Math.min(120, dist * 0.6);

  const dir   = unit(source, target);
  const start = offset(source, dir,  EDGE_NODE_MARGIN);
  const end   = offset(target, dir, -EDGE_NODE_MARGIN);

  const cp1 = { x: start.x, y: minY - arcH };
  const cp2 = { x: end.x,   y: minY - arcH };
  return `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y} ${cp2.x} ${cp2.y} ${end.x} ${end.y}`;
}

// ---------------------------------------------------------------------------
// Label position
// ---------------------------------------------------------------------------

/** Returns the (x, y) centre point of the edge path for placing a label */
export function edgeLabelPosition(source: Point, target: Point, lateralOffset = 0): Point {
  const norm = normal(source, target);
  return {
    x: (source.x + target.x) / 2 + norm.x * lateralOffset,
    y: (source.y + target.y) / 2 + norm.y * lateralOffset - 8,
  };
}

// ---------------------------------------------------------------------------
// Multi-edge spread helper
// ---------------------------------------------------------------------------

/**
 * Given all edges and a specific edge, returns the lateral offset in px
 * to spread parallel edges between the same pair of nodes.
 */
export function computeLateralOffset(
  edge: CanvasEdge,
  allEdges: CanvasEdge[],
): number {
  const sibling = allEdges.filter(
    (e) =>
      e.id !== edge.id &&
      ((e.sourceId === edge.sourceId && e.targetId === edge.targetId) ||
       (e.sourceId === edge.targetId && e.targetId === edge.sourceId)),
  );
  if (sibling.length === 0) return 0;

  const allSiblings = [edge, ...sibling].sort((a, b) => a.id.localeCompare(b.id));
  const myIndex = allSiblings.findIndex((e) => e.id === edge.id);
  const spread  = 18;
  return (myIndex - (allSiblings.length - 1) / 2) * spread;
}

// ---------------------------------------------------------------------------
// Build path from canvas nodes
// ---------------------------------------------------------------------------

/**
 * Resolves source / target positions from the node list and returns
 * the complete SVG path string for an edge.
 */
export function buildEdgePath(
  edge: CanvasEdge,
  nodeMap: Map<string, CanvasNode>,
  allEdges: CanvasEdge[],
): string | null {
  const source = nodeMap.get(edge.sourceId);
  const target = nodeMap.get(edge.targetId);
  if (!source || !target) return null;

  if (edge.isFeedback) {
    return buildFeedbackPath(source, target);
  }

  const lateralOffset = computeLateralOffset(edge, allEdges);
  return buildStraightPath(source, target, lateralOffset);
}

/** Returns the (x, y) for the edge midpoint label given canvas nodes */
export function buildEdgeLabelPos(
  edge: CanvasEdge,
  nodeMap: Map<string, CanvasNode>,
  allEdges: CanvasEdge[],
): Point | null {
  const source = nodeMap.get(edge.sourceId);
  const target = nodeMap.get(edge.targetId);
  if (!source || !target) return null;

  const lateralOffset = computeLateralOffset(edge, allEdges);
  return edgeLabelPosition(source, target, lateralOffset);
}
