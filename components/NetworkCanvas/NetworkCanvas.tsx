"use client";

/**
 * NetworkCanvas — SVG-based interactive multi-agent graph
 *
 * Interactions
 * ─────────────────────────────────────────────────────
 *  Mouse drag on background  →  pan
 *  Scroll wheel              →  zoom (0.15× – 4×)
 *  Click node                →  select (highlight connected edges)
 *  Double-click node         →  onEditSpec callback
 *  Right-click node          →  context menu (delete / duplicate)
 *  Click background          →  deselect
 *
 * Performance
 * ─────────────────────────────────────────────────────
 *  - Layout computed once with useMemo; recomputed only when nodes/edges change
 *  - Visible nodes culled via viewport bounds before rendering
 *  - React.memo on node and edge sub-components
 */

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
  memo,
} from "react";
import { cn } from "@/lib/utils";
import { computeLayout, cullNodes } from "@/lib/graphLayout";
import {
  NODE_RADIUS,
  NODE_RING_RADIUS,
  GLOW_FILTER_ID,
  STATUS_FILL,
  STATUS_STROKE,
  STATUS_DOT_COLOR,
  ACCENT_COLOR,
  ROLE_BADGE_COLOR,
  getRoleLabel,
  getNodeStroke,
  getNodeStrokeWidth,
  getNodeFilter,
  buildNodeTooltip,
} from "./NodeVisualizer";
import {
  ARROW_MARKER_ID_PREFIX,
  EDGE_COLOR,
  EDGE_STROKE_WIDTH,
  arrowMarkerDef,
  buildEdgePath,
  buildEdgeLabelPos,
} from "./ConnectionRenderer";
import type {
  CanvasNode,
  CanvasEdge,
  Transform,
  ContextMenuState,
  NetworkCanvasProps,
} from "./types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_SCALE = 0.15;
const MAX_SCALE = 4;
const ZOOM_FACTOR = 0.001;
const PAN_BUTTON = 0; // left mouse button

// ---------------------------------------------------------------------------
// SVG Defs — rendered once inside the <svg>
// ---------------------------------------------------------------------------

const CanvasDefs = memo(function CanvasDefs() {
  const types = ["sequential", "parallel", "conditional", "feedback"] as const;
  return (
    <defs>
      {/* Glow filter */}
      <filter id={GLOW_FILTER_ID} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feFlood floodColor={ACCENT_COLOR} floodOpacity="0.45" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Running-node pulse filter (green tint) */}
      <filter id="node-glow-running" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
        <feFlood floodColor="#22c55e" floodOpacity="0.4" result="color" />
        <feComposite in="color" in2="blur" operator="in" result="glow" />
        <feMerge>
          <feMergeNode in="glow" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>

      {/* Arrow markers */}
      {types.map((t) => (
        <marker
          key={t}
          id={`${ARROW_MARKER_ID_PREFIX}-${t}`}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={EDGE_COLOR[t]} />
        </marker>
      ))}
    </defs>
  );
});

// ---------------------------------------------------------------------------
// Edge component
// ---------------------------------------------------------------------------

interface EdgeProps {
  edge: CanvasEdge;
  nodeMap: Map<string, CanvasNode>;
  allEdges: CanvasEdge[];
  isHighlighted: boolean;
}

const Edge = memo(function Edge({ edge, nodeMap, allEdges, isHighlighted }: EdgeProps) {
  const pathD = buildEdgePath(edge, nodeMap, allEdges);
  const labelPos = buildEdgeLabelPos(edge, nodeMap, allEdges);
  if (!pathD) return null;

  const color  = EDGE_COLOR[edge.type];
  const width  = EDGE_STROKE_WIDTH[edge.type];
  const markId = `${ARROW_MARKER_ID_PREFIX}-${edge.type}`;

  return (
    <g
      style={{
        opacity: isHighlighted ? 1 : 0.35,
        transition: "opacity 150ms",
      }}
    >
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth={isHighlighted ? width + 1 : width}
        strokeDasharray={edge.type === "feedback" ? "5 4" : undefined}
        markerEnd={`url(#${markId})`}
        style={{ transition: "stroke-width 150ms" }}
      />
      {edge.label && labelPos && (
        <g transform={`translate(${labelPos.x},${labelPos.y})`}>
          <rect
            x={-28} y={-9} width={56} height={14}
            rx={3}
            fill="#0a0e27"
            stroke={color}
            strokeWidth={0.5}
            opacity={0.9}
          />
          <text
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={9}
            fill={color}
            fontFamily="monospace"
          >
            {edge.label}
          </text>
        </g>
      )}
    </g>
  );
});

// ---------------------------------------------------------------------------
// Node component
// ---------------------------------------------------------------------------

interface NodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isHovered: boolean;
  isConnected: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onDoubleClick: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDragStart: (e: React.MouseEvent) => void;
}

const AgentNode = memo(function AgentNode({
  node,
  isSelected,
  isHovered,
  isConnected,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onDoubleClick,
  onContextMenu,
  onDragStart,
}: NodeProps) {
  const stroke      = getNodeStroke(node.status, isSelected, isHovered);
  const strokeWidth = getNodeStrokeWidth(isSelected, isHovered);
  const fill        = STATUS_FILL[node.status];
  const roleBg      = ROLE_BADGE_COLOR[node.role];
  const roleLabel   = getRoleLabel(node.role);
  const dotColor    = STATUS_DOT_COLOR[node.status];

  const dimmed = !isSelected && !isHovered && !isConnected;

  // Glow filter
  let filterRef: string | undefined;
  if (isSelected || isHovered) filterRef = `url(#${GLOW_FILTER_ID})`;
  else if (node.status === "running") filterRef = "url(#node-glow-running)";

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      style={{
        opacity: dimmed ? 0.4 : 1,
        cursor: "pointer",
        transition: "opacity 150ms",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      onMouseDown={onDragStart}
      role="button"
      aria-label={buildNodeTooltip({ label: node.label, role: node.role, status: node.status, isEntry: node.isEntry })}
    >
      {/* Pulse ring for running nodes */}
      {node.status === "running" && (
        <circle r={NODE_RING_RADIUS} fill="none" stroke="#22c55e" strokeWidth={1} opacity={0.4}>
          <animate attributeName="r" values={`${NODE_RING_RADIUS};${NODE_RING_RADIUS + 10};${NODE_RING_RADIUS}`} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Selection ring */}
      {isSelected && (
        <circle
          r={NODE_RING_RADIUS}
          fill="none"
          stroke={ACCENT_COLOR}
          strokeWidth={2}
          strokeDasharray="4 3"
          opacity={0.8}
        />
      )}

      {/* Main circle */}
      <circle
        r={NODE_RADIUS}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        filter={filterRef}
        style={{ transition: "stroke 150ms, stroke-width 150ms" }}
      />

      {/* Entry star marker */}
      {node.isEntry && (
        <circle r={4} cx={NODE_RADIUS - 6} cy={-NODE_RADIUS + 6} fill={ACCENT_COLOR} />
      )}

      {/* Status dot */}
      <circle
        r={4}
        cx={NODE_RADIUS - 6}
        cy={NODE_RADIUS - 6}
        fill={dotColor}
      />

      {/* Role badge */}
      <g transform={`translate(0,${-NODE_RADIUS - 14})`}>
        <rect x={-14} y={-7} width={28} height={13} rx={3} fill={roleBg} opacity={0.9} />
        <text
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={7}
          fill="#fff"
          fontWeight="bold"
          fontFamily="monospace"
          letterSpacing={0.5}
        >
          {roleLabel}
        </text>
      </g>

      {/* Agent name label */}
      <text
        y={NODE_RADIUS + 16}
        textAnchor="middle"
        fontSize={11}
        fill={isSelected ? ACCENT_COLOR : "#cbd5e1"}
        fontWeight={isSelected ? "600" : "400"}
        fontFamily="system-ui, sans-serif"
        style={{ transition: "fill 150ms" }}
        pointerEvents="none"
      >
        {node.label.length > 14 ? node.label.slice(0, 12) + "…" : node.label}
      </text>
    </g>
  );
});

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

interface ContextMenuProps {
  state: ContextMenuState;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ContextMenu({ state, onEdit, onDuplicate, onDelete, onClose }: ContextMenuProps) {
  useEffect(() => {
    const handler = () => onClose();
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, [onClose]);

  const items = [
    { label: "Edit spec",     icon: "✏",  action: onEdit      },
    { label: "Duplicate",     icon: "⎘",  action: onDuplicate  },
    { label: "Delete",        icon: "✕",  action: onDelete,  danger: true },
  ];

  return (
    <div
      className="absolute z-50 bg-surface border border-border rounded-lg shadow-lg overflow-hidden text-xs min-w-[140px]"
      style={{ left: state.screenX, top: state.screenY }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          onClick={(e) => { e.stopPropagation(); item.action(); onClose(); }}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors duration-100",
            item.danger
              ? "text-error hover:bg-error/10"
              : "text-text-primary hover:bg-white/5"
          )}
        >
          <span className="opacity-60 font-mono">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar
// ---------------------------------------------------------------------------

interface ToolbarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitView: () => void;
  nodeCount: number;
  edgeCount: number;
}

function Toolbar({ scale, onZoomIn, onZoomOut, onReset, onFitView, nodeCount, edgeCount }: ToolbarProps) {
  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-surface/90 backdrop-blur-sm border border-border rounded-lg px-2 py-1.5 shadow-lg">
      <button onClick={onZoomOut} className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors" title="Zoom out">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      </button>
      <button onClick={onReset} className="px-2 py-0.5 rounded text-xs font-mono text-text-secondary hover:text-accent hover:bg-white/5 transition-colors min-w-[48px] text-center">
        {(scale * 100).toFixed(0)}%
      </button>
      <button onClick={onZoomIn} className="p-1.5 rounded hover:bg-white/10 text-text-secondary hover:text-text-primary transition-colors" title="Zoom in">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16M4 12h16" />
        </svg>
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <button onClick={onFitView} className="px-2 py-0.5 rounded text-xs text-text-secondary hover:text-accent hover:bg-white/5 transition-colors" title="Fit view">
        Fit
      </button>
      <div className="w-px h-4 bg-border mx-1" />
      <span className="text-[10px] text-text-secondary font-mono px-1">
        {nodeCount}n / {edgeCount}e
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-surface border border-border flex items-center justify-center">
          <svg className="w-8 h-8 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-text-primary">No agents in this network</p>
          <p className="text-xs text-text-secondary">Add agents from the sidebar to build your network</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main NetworkCanvas
// ---------------------------------------------------------------------------

export function NetworkCanvas({
  nodes,
  edges,
  onEditSpec,
  onDeleteNode,
  onDuplicateNode,
  onSelectNode,
  className,
}: NetworkCanvasProps) {
  // ── Transform state ───────────────────────────────────────────────────────
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });

  // ── Selection / hover state ───────────────────────────────────────────────
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredNodeId,  setHoveredNodeId]  = useState<string | null>(null);

  // ── Context menu ──────────────────────────────────────────────────────────
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // ── Pan state (refs to avoid stale closures in mousemove) ─────────────────
  const isPanning     = useRef(false);
  const panStart      = useRef({ x: 0, y: 0 });
  const transformRef  = useRef(transform);
  transformRef.current = transform;

  // ── Node drag (separate from canvas pan) ─────────────────────────────────
  const draggingNodeId  = useRef<string | null>(null);
  const dragStartCanvas = useRef({ x: 0, y: 0 });
  const [draggedPositions, setDraggedPositions] = useState<Record<string, { x: number; y: number }>>({});

  // ── SVG container ref ─────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);

  // ── Layout ────────────────────────────────────────────────────────────────
  const layout = useMemo(() => {
    if (nodes.length === 0) return {};
    const entryNode = nodes.find((n) => n.isEntry);
    return computeLayout(
      nodes.map((n) => ({ id: n.id, label: n.label })),
      edges.map((e) => ({ sourceId: e.sourceId, targetId: e.targetId, isFeedback: e.isFeedback })),
      { entryNodeId: entryNode?.id, layerSpacing: 220, nodeSpacing: 130, nodeRadius: NODE_RADIUS },
    );
  }, [nodes, edges]);

  // ── Merge layout positions + drag overrides into final node positions ─────
  const positionedNodes = useMemo<CanvasNode[]>(() => {
    return nodes.map((n) => {
      const pos = layout[n.id];
      const drag = draggedPositions[n.id];
      return {
        ...n,
        x: drag?.x ?? pos?.x ?? 0,
        y: drag?.y ?? pos?.y ?? 0,
      };
    });
  }, [nodes, layout, draggedPositions]);

  // ── Node map for O(1) lookup ──────────────────────────────────────────────
  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((n) => [n.id, n])),
    [positionedNodes],
  );

  // ── Connected node/edge sets for the selected node ────────────────────────
  const { connectedNodeIds, connectedEdgeIds } = useMemo(() => {
    if (!selectedNodeId) return { connectedNodeIds: new Set<string>(), connectedEdgeIds: new Set<string>() };
    const nodeSet = new Set<string>([selectedNodeId]);
    const edgeSet = new Set<string>();
    for (const e of edges) {
      if (e.sourceId === selectedNodeId || e.targetId === selectedNodeId) {
        edgeSet.add(e.id);
        nodeSet.add(e.sourceId);
        nodeSet.add(e.targetId);
      }
    }
    return { connectedNodeIds: nodeSet, connectedEdgeIds: edgeSet };
  }, [selectedNodeId, edges]);

  // ── Fit view helper ───────────────────────────────────────────────────────
  const fitView = useCallback(() => {
    if (nodes.length === 0 || !svgRef.current) return;
    const svg = svgRef.current;
    const W   = svg.clientWidth;
    const H   = svg.clientHeight;

    const xs = positionedNodes.map((n) => n.x);
    const ys = positionedNodes.map((n) => n.y);
    const minX = Math.min(...xs) - NODE_RADIUS * 2;
    const maxX = Math.max(...xs) + NODE_RADIUS * 2;
    const minY = Math.min(...ys) - NODE_RADIUS * 2;
    const maxY = Math.max(...ys) + NODE_RADIUS * 2;

    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.min(W / gw, H / gh) * 0.85));
    const x = W / 2 - ((minX + maxX) / 2) * scale;
    const y = H / 2 - ((minY + maxY) / 2) * scale;
    setTransform({ x, y, scale });
  }, [positionedNodes, nodes.length]);

  // Fit on first layout
  const hasFit = useRef(false);
  useEffect(() => {
    if (!hasFit.current && nodes.length > 0) {
      hasFit.current = true;
      fitView();
    }
  }, [nodes.length, fitView]);

  // ── Pan handlers ──────────────────────────────────────────────────────────
  const handleSvgMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== PAN_BUTTON) return;
    if ((e.target as Element).closest("[data-node]")) return; // let node drag handle it
    isPanning.current = true;
    panStart.current  = { x: e.clientX - transformRef.current.x, y: e.clientY - transformRef.current.y };
    e.preventDefault();
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNodeId.current && svgRef.current) {
      // Node drag
      const svg    = svgRef.current;
      const rect   = svg.getBoundingClientRect();
      const scale  = transformRef.current.scale;
      const tx     = transformRef.current.x;
      const ty     = transformRef.current.y;
      const canvasX = (e.clientX - rect.left - tx) / scale;
      const canvasY = (e.clientY - rect.top  - ty) / scale;
      setDraggedPositions((prev) => ({
        ...prev,
        [draggingNodeId.current!]: {
          x: canvasX - dragStartCanvas.current.x,
          y: canvasY - dragStartCanvas.current.y,
        },
      }));
      return;
    }

    if (!isPanning.current) return;
    setTransform((t) => ({
      ...t,
      x: e.clientX - panStart.current.x,
      y: e.clientY - panStart.current.y,
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
    draggingNodeId.current = null;
  }, []);

  // ── Zoom ──────────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (!svgRef.current) return;

    const rect  = svgRef.current.getBoundingClientRect();
    const mx    = e.clientX - rect.left;
    const my    = e.clientY - rect.top;

    setTransform((t) => {
      const delta    = -e.deltaY * ZOOM_FACTOR;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (1 + delta)));
      const ratio    = newScale / t.scale;
      return {
        scale: newScale,
        x: mx - (mx - t.x) * ratio,
        y: my - (my - t.y) * ratio,
      };
    });
  }, []);

  // ── Node drag start ───────────────────────────────────────────────────────
  const handleNodeDragStart = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!svgRef.current) return;
    const svg   = svgRef.current;
    const rect  = svg.getBoundingClientRect();
    const scale = transformRef.current.scale;
    const tx    = transformRef.current.x;
    const ty    = transformRef.current.y;
    const node  = nodeMap.get(nodeId);
    if (!node) return;

    const canvasX = (e.clientX - rect.left - tx) / scale;
    const canvasY = (e.clientY - rect.top  - ty) / scale;
    draggingNodeId.current = nodeId;
    dragStartCanvas.current = {
      x: canvasX - node.x,
      y: canvasY - node.y,
    };
  }, [nodeMap]);

  // ── Node click / select ───────────────────────────────────────────────────
  const handleNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId((prev) => {
      const next = prev === nodeId ? null : nodeId;
      onSelectNode?.(next);
      return next;
    });
  }, [onSelectNode]);

  const handleBgClick = useCallback(() => {
    setSelectedNodeId(null);
    onSelectNode?.(null);
    setContextMenu(null);
  }, [onSelectNode]);

  // ── Right-click context menu ──────────────────────────────────────────────
  const handleNodeContextMenu = useCallback((nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setContextMenu({
      screenX: e.clientX - rect.left,
      screenY: e.clientY - rect.top,
      nodeId,
    });
  }, []);

  // ── Viewport culling ──────────────────────────────────────────────────────
  const visibleNodeIds = useMemo(() => {
    if (!svgRef.current || positionedNodes.length === 0) {
      return new Set(positionedNodes.map((n) => n.id));
    }
    const svg   = svgRef.current;
    const W     = svg.clientWidth  || 800;
    const H     = svg.clientHeight || 600;
    const scale = transform.scale;
    const tx    = transform.x;
    const ty    = transform.y;

    const ids = cullNodes(
      Object.fromEntries(positionedNodes.map((n) => [n.id, { x: n.x, y: n.y, layer: 0, index: 0 }])),
      {
        minX: -tx / scale,
        minY: -ty / scale,
        maxX: (W - tx) / scale,
        maxY: (H - ty) / scale,
      },
      NODE_RADIUS * 3,
    );
    return new Set(ids);
  }, [positionedNodes, transform]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  const zoomBy = useCallback((factor: number) => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const cx  = svg.clientWidth  / 2;
    const cy  = svg.clientHeight / 2;
    setTransform((t) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * factor));
      const ratio    = newScale / t.scale;
      return { scale: newScale, x: cx - (cx - t.x) * ratio, y: cy - (cy - t.y) * ratio };
    });
  }, []);

  // ── Keyboard shortcut: Escape to deselect ─────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setSelectedNodeId(null); setContextMenu(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasSelection = selectedNodeId !== null;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className={cn("relative w-full h-full bg-background overflow-hidden", className)}>
      {nodes.length === 0 && <EmptyState />}

      <svg
        ref={svgRef}
        className="w-full h-full select-none"
        onMouseDown={handleSvgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleBgClick}
        onContextMenu={(e) => e.preventDefault()}
        style={{ cursor: isPanning.current ? "grabbing" : "grab" }}
      >
        <CanvasDefs />

        {/* Dot grid background */}
        <defs>
          <pattern id="dot-grid" x={transform.x % (20 * transform.scale)} y={transform.y % (20 * transform.scale)} width={20 * transform.scale} height={20 * transform.scale} patternUnits="userSpaceOnUse">
            <circle cx={1} cy={1} r={0.8} fill="#1e2a4a" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dot-grid)" />

        {/* Main canvas group — applies pan + zoom */}
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Edges layer — rendered below nodes */}
          <g>
            {edges.map((edge) => {
              const srcVisible = visibleNodeIds.has(edge.sourceId);
              const tgtVisible = visibleNodeIds.has(edge.targetId);
              if (!srcVisible && !tgtVisible) return null;

              const highlighted =
                !hasSelection || connectedEdgeIds.has(edge.id);

              return (
                <Edge
                  key={edge.id}
                  edge={edge}
                  nodeMap={nodeMap}
                  allEdges={edges}
                  isHighlighted={highlighted}
                />
              );
            })}
          </g>

          {/* Nodes layer */}
          <g>
            {positionedNodes.map((node) => {
              if (!visibleNodeIds.has(node.id)) return null;

              const isSelected  = node.id === selectedNodeId;
              const isHovered   = node.id === hoveredNodeId;
              const isConnected = !hasSelection || connectedNodeIds.has(node.id);

              return (
                <g key={node.id} data-node="true">
                  <AgentNode
                    node={node}
                    isSelected={isSelected}
                    isHovered={isHovered}
                    isConnected={isConnected}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => handleNodeClick(node.id)}
                    onDoubleClick={() => onEditSpec?.(node.agentId)}
                    onContextMenu={(e) => handleNodeContextMenu(node.id, e)}
                    onDragStart={(e) => handleNodeDragStart(node.id, e)}
                  />
                </g>
              );
            })}
          </g>
        </g>
      </svg>

      {/* Toolbar */}
      <Toolbar
        scale={transform.scale}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        onReset={() => setTransform({ x: 0, y: 0, scale: 1 })}
        onFitView={fitView}
        nodeCount={nodes.length}
        edgeCount={edges.length}
      />

      {/* Instructions overlay */}
      <div className="absolute top-3 right-3 text-[10px] text-text-secondary space-y-0.5 pointer-events-none bg-surface/60 backdrop-blur-sm border border-border/50 rounded px-2 py-1.5">
        <p><kbd className="font-mono bg-background/50 px-1 rounded">drag</kbd> pan &nbsp;&nbsp; <kbd className="font-mono bg-background/50 px-1 rounded">scroll</kbd> zoom</p>
        <p><kbd className="font-mono bg-background/50 px-1 rounded">click</kbd> select &nbsp; <kbd className="font-mono bg-background/50 px-1 rounded">dbl</kbd> edit spec</p>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          state={contextMenu}
          onEdit={() => { onEditSpec?.(nodeMap.get(contextMenu.nodeId)?.agentId ?? ""); }}
          onDuplicate={() => onDuplicateNode?.(contextMenu.nodeId)}
          onDelete={() => onDeleteNode?.(contextMenu.nodeId)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}
