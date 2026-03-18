import type { Status, AgentRole, ConnectionType } from "@/types";

// ---------------------------------------------------------------------------
// Canvas node — visual representation of an agent on the canvas
// ---------------------------------------------------------------------------

export interface CanvasNode {
  id: string;
  /** Underlying agent id */
  agentId: string;
  label: string;
  role: AgentRole;
  status: Status;
  /** Whether this is the entry point of the network */
  isEntry: boolean;
  /** Pixel position assigned by the layout algorithm */
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Canvas edge — visual representation of a connection
// ---------------------------------------------------------------------------

export interface CanvasEdge {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
  /** Optional display label (e.g. "escalation 22%") */
  label?: string;
  /** feedback connections are drawn as curved arcs looping back */
  isFeedback: boolean;
}

// ---------------------------------------------------------------------------
// Pan / zoom transform
// ---------------------------------------------------------------------------

export interface Transform {
  /** Canvas translation x (px) */
  x: number;
  /** Canvas translation y (px) */
  y: number;
  /** Zoom scale factor */
  scale: number;
}

export const DEFAULT_TRANSFORM: Transform = { x: 0, y: 0, scale: 1 };

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

export interface ContextMenuState {
  /** Screen-space x (relative to the SVG element) */
  screenX: number;
  /** Screen-space y (relative to the SVG element) */
  screenY: number;
  nodeId: string;
}

// ---------------------------------------------------------------------------
// Canvas state (internal to NetworkCanvas)
// ---------------------------------------------------------------------------

export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  transform: Transform;
  contextMenu: ContextMenuState | null;
}

// ---------------------------------------------------------------------------
// NetworkCanvas public props
// ---------------------------------------------------------------------------

export interface NetworkCanvasProps {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  /** Called when user double-clicks a node to open the spec editor */
  onEditSpec?: (agentId: string) => void;
  /** Called when user requests to delete a node via context menu */
  onDeleteNode?: (nodeId: string) => void;
  /** Called when user requests to duplicate a node via context menu */
  onDuplicateNode?: (nodeId: string) => void;
  /** Called when selected node changes (null = deselected) */
  onSelectNode?: (nodeId: string | null) => void;
  className?: string;
}
