/**
 * mockData.ts — Demo agents and connections for the NetworkCanvas.
 * No real backend required; this is purely for visual demonstration.
 */

import type { CanvasNode, CanvasEdge } from "./types";

// ---------------------------------------------------------------------------
// Mock agent nodes
// ---------------------------------------------------------------------------

export const MOCK_NODES: CanvasNode[] = [
  // Layer 0 — entry
  {
    id:       "node-input",
    agentId:  "agent-input",
    label:    "User Input",
    role:     "orchestrator",
    status:   "idle",
    isEntry:  true,
    x: 0, y: 0,
  },

  // Layer 1 — routing
  {
    id:       "node-router",
    agentId:  "agent-router",
    label:    "Router",
    role:     "orchestrator",
    status:   "running",
    isEntry:  false,
    x: 0, y: 0,
  },

  // Layer 2 — specialists
  {
    id:       "node-coder",
    agentId:  "agent-coder",
    label:    "Code Agent",
    role:     "specialist",
    status:   "running",
    isEntry:  false,
    x: 0, y: 0,
  },
  {
    id:       "node-analyst",
    agentId:  "agent-analyst",
    label:    "Analyst",
    role:     "specialist",
    status:   "paused",
    isEntry:  false,
    x: 0, y: 0,
  },
  {
    id:       "node-writer",
    agentId:  "agent-writer",
    label:    "Writer",
    role:     "worker",
    status:   "idle",
    isEntry:  false,
    x: 0, y: 0,
  },

  // Layer 3 — critic / review
  {
    id:       "node-critic",
    agentId:  "agent-critic",
    label:    "Critic",
    role:     "critic",
    status:   "idle",
    isEntry:  false,
    x: 0, y: 0,
  },
  {
    id:       "node-qa",
    agentId:  "agent-qa",
    label:    "QA Worker",
    role:     "worker",
    status:   "error",
    isEntry:  false,
    x: 0, y: 0,
  },

  // Layer 4 — output
  {
    id:       "node-output",
    agentId:  "agent-output",
    label:    "Output",
    role:     "worker",
    status:   "completed",
    isEntry:  false,
    x: 0, y: 0,
  },
];

// ---------------------------------------------------------------------------
// Mock connections
// ---------------------------------------------------------------------------

export const MOCK_EDGES: CanvasEdge[] = [
  {
    id:         "edge-input-router",
    sourceId:   "node-input",
    targetId:   "node-router",
    type:       "sequential",
    isFeedback: false,
  },
  {
    id:         "edge-router-coder",
    sourceId:   "node-router",
    targetId:   "node-coder",
    type:       "conditional",
    label:      "code request",
    isFeedback: false,
  },
  {
    id:         "edge-router-analyst",
    sourceId:   "node-router",
    targetId:   "node-analyst",
    type:       "conditional",
    label:      "analysis",
    isFeedback: false,
  },
  {
    id:         "edge-router-writer",
    sourceId:   "node-router",
    targetId:   "node-writer",
    type:       "conditional",
    label:      "writing",
    isFeedback: false,
  },
  {
    id:         "edge-coder-critic",
    sourceId:   "node-coder",
    targetId:   "node-critic",
    type:       "sequential",
    isFeedback: false,
  },
  {
    id:         "edge-analyst-critic",
    sourceId:   "node-analyst",
    targetId:   "node-critic",
    type:       "parallel",
    isFeedback: false,
  },
  {
    id:         "edge-writer-qa",
    sourceId:   "node-writer",
    targetId:   "node-qa",
    type:       "sequential",
    isFeedback: false,
  },
  {
    id:         "edge-critic-output",
    sourceId:   "node-critic",
    targetId:   "node-output",
    type:       "sequential",
    isFeedback: false,
  },
  {
    id:         "edge-qa-output",
    sourceId:   "node-qa",
    targetId:   "node-output",
    type:       "sequential",
    isFeedback: false,
  },
  // Feedback loop: output can re-trigger the router
  {
    id:         "edge-critic-router-feedback",
    sourceId:   "node-critic",
    targetId:   "node-router",
    type:       "feedback",
    label:      "retry",
    isFeedback: true,
  },
];

// ---------------------------------------------------------------------------
// Layout edges for graphLayout (no isFeedback on sequential/parallel/conditional)
// ---------------------------------------------------------------------------

import type { LayoutNode, LayoutEdge } from "@/lib/graphLayout";

export const MOCK_LAYOUT_NODES: LayoutNode[] = MOCK_NODES.map((n) => ({
  id:    n.id,
  label: n.label,
}));

export const MOCK_LAYOUT_EDGES: LayoutEdge[] = MOCK_EDGES.map((e) => ({
  sourceId:   e.sourceId,
  targetId:   e.targetId,
  isFeedback: e.isFeedback,
}));
