/**
 * graphLayout.ts — Hierarchical graph layout algorithm
 *
 * Assigns (x, y) positions to nodes using a BFS-based layered layout:
 *   Layer 0  →  Layer 1  →  Layer 2  …  Layer N
 *   (entry)     (tier-1)    (tier-2)     (output)
 *
 * Features:
 *  - BFS from entry node to assign layers
 *  - Feedback edges (cycles) are detected and skipped during BFS
 *  - Within-layer ordering to minimise edge crossings (barycenter heuristic)
 *  - Horizontal centering per layer
 *  - Smooth transition support (returns previous + next positions)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface LayoutNode {
  id: string;
  /** Label used only for debugging */
  label?: string;
}

export interface LayoutEdge {
  sourceId: string;
  targetId: string;
  /** feedback edges are drawn differently and ignored in BFS layering */
  isFeedback?: boolean;
}

export interface LayoutPosition {
  x: number;
  y: number;
  /** Which horizontal layer (0 = leftmost / entry) */
  layer: number;
  /** Position within the layer (0 = topmost) */
  index: number;
}

export type LayoutResult = Record<string, LayoutPosition>;

export interface LayoutOptions {
  /** Horizontal gap between layer centres (px) */
  layerSpacing?: number;
  /** Vertical gap between nodes within a layer (px) */
  nodeSpacing?: number;
  /** Node radius — used to guarantee minimum overlap-free spacing */
  nodeRadius?: number;
  /** Entry node id. If omitted, the node with no incoming edges is used. */
  entryNodeId?: string;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

const DEFAULT_LAYER_SPACING = 220;
const DEFAULT_NODE_SPACING  = 120;
const DEFAULT_NODE_RADIUS   = 32;

// ---------------------------------------------------------------------------
// BFS layering
// ---------------------------------------------------------------------------

function buildAdjacency(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
): {
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
} {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();

  for (const n of nodes) {
    outgoing.set(n.id, []);
    incoming.set(n.id, []);
  }

  for (const e of edges) {
    if (!e.isFeedback) {
      outgoing.get(e.sourceId)?.push(e.targetId);
      incoming.get(e.targetId)?.push(e.sourceId);
    }
  }

  return { outgoing, incoming };
}

/** Assign a layer (depth from root) to every node via BFS */
function assignLayers(
  nodes: LayoutNode[],
  outgoing: Map<string, string[]>,
  incoming: Map<string, string[]>,
  entryNodeId?: string,
): Map<string, number> {
  const layers = new Map<string, number>();

  // Find entry: prefer the provided entryNodeId, then nodes with no incoming edges
  let roots: string[];
  if (entryNodeId && nodes.find((n) => n.id === entryNodeId)) {
    roots = [entryNodeId];
  } else {
    roots = nodes
      .filter((n) => (incoming.get(n.id)?.length ?? 0) === 0)
      .map((n) => n.id);
    if (roots.length === 0) roots = [nodes[0]?.id].filter(Boolean) as string[];
  }

  const queue: string[] = [...roots];
  for (const r of roots) layers.set(r, 0);

  while (queue.length > 0) {
    const cur = queue.shift()!;
    const curLayer = layers.get(cur) ?? 0;
    for (const next of (outgoing.get(cur) ?? [])) {
      const existing = layers.get(next);
      if (existing === undefined || existing < curLayer + 1) {
        layers.set(next, curLayer + 1);
        queue.push(next);
      }
    }
  }

  // Any unreachable node gets placed in layer 0
  for (const n of nodes) {
    if (!layers.has(n.id)) layers.set(n.id, 0);
  }

  return layers;
}

// ---------------------------------------------------------------------------
// Barycenter within-layer ordering
// ---------------------------------------------------------------------------

/** Sort nodes in each layer by the average layer position of their predecessors */
function sortLayersByBarycenter(
  layerGroups: Map<number, string[]>,
  incoming: Map<string, string[]>,
  layerOf: Map<string, number>,
  indexInLayer: Map<string, number>,
): void {
  const sortedLayers = [...layerGroups.keys()].sort((a, b) => a - b);

  for (const layer of sortedLayers) {
    const ids = layerGroups.get(layer)!;
    const scored = ids.map((id) => {
      const preds = incoming.get(id) ?? [];
      if (preds.length === 0) return { id, score: 0 };
      const sum = preds.reduce((acc, pid) => {
        const pl = layerOf.get(pid) ?? 0;
        const pi = indexInLayer.get(pid) ?? 0;
        return acc + (pl * 1000 + pi); // weight by layer first, then position
      }, 0);
      return { id, score: sum / preds.length };
    });

    scored.sort((a, b) => a.score - b.score);
    const sorted = scored.map((s) => s.id);
    layerGroups.set(layer, sorted);
    sorted.forEach((id, i) => indexInLayer.set(id, i));
  }
}

// ---------------------------------------------------------------------------
// Main layout function
// ---------------------------------------------------------------------------

export function computeLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options: LayoutOptions = {},
): LayoutResult {
  const {
    layerSpacing = DEFAULT_LAYER_SPACING,
    nodeSpacing  = DEFAULT_NODE_SPACING,
    nodeRadius   = DEFAULT_NODE_RADIUS,
    entryNodeId,
  } = options;

  if (nodes.length === 0) return {};

  const effectiveNodeSpacing = Math.max(nodeSpacing, nodeRadius * 2 + 20);

  const { outgoing, incoming } = buildAdjacency(nodes, edges);
  const layerOf = assignLayers(nodes, outgoing, incoming, entryNodeId);

  // Group nodes by layer
  const layerGroups = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layerOf.get(n.id) ?? 0;
    if (!layerGroups.has(l)) layerGroups.set(l, []);
    layerGroups.get(l)!.push(n.id);
  }

  // Initial index assignment
  const indexInLayer = new Map<string, number>();
  for (const [, ids] of layerGroups) {
    ids.forEach((id, i) => indexInLayer.set(id, i));
  }

  // Barycenter ordering pass (2 iterations is usually enough)
  sortLayersByBarycenter(layerGroups, incoming, layerOf, indexInLayer);
  sortLayersByBarycenter(layerGroups, incoming, layerOf, indexInLayer);

  // Compute positions
  const result: LayoutResult = {};

  for (const [layer, ids] of layerGroups) {
    const layerHeight = (ids.length - 1) * effectiveNodeSpacing;
    ids.forEach((id, i) => {
      const x = layer * layerSpacing;
      const y = i * effectiveNodeSpacing - layerHeight / 2;
      result[id] = { x, y, layer, index: i };
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Viewport culling helper
// ---------------------------------------------------------------------------

export interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Returns the subset of node ids that are within (or near) the viewport.
 * `margin` adds extra pixels outside the viewport to avoid pop-in.
 */
export function cullNodes(
  positions: LayoutResult,
  viewport: ViewportBounds,
  margin = 80,
): string[] {
  return Object.entries(positions)
    .filter(([, pos]) => (
      pos.x >= viewport.minX - margin &&
      pos.x <= viewport.maxX + margin &&
      pos.y >= viewport.minY - margin &&
      pos.y <= viewport.maxY + margin
    ))
    .map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Transition interpolation
// ---------------------------------------------------------------------------

/** Linearly interpolate between two layout results (t ∈ [0, 1]) */
export function interpolateLayouts(
  from: LayoutResult,
  to: LayoutResult,
  t: number,
): LayoutResult {
  const result: LayoutResult = {};
  const allIds = new Set([...Object.keys(from), ...Object.keys(to)]);

  for (const id of allIds) {
    const f = from[id] ?? to[id];
    const tgt = to[id] ?? from[id];
    result[id] = {
      x:     f.x     + (tgt.x     - f.x)     * t,
      y:     f.y     + (tgt.y     - f.y)     * t,
      layer: tgt.layer,
      index: tgt.index,
    };
  }

  return result;
}
