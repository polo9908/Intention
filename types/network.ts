import type { ID, Status, Timestamp } from "./common";

// ---------------------------------------------------------------------------
// Connection — directed edge between two agents inside a network
// ---------------------------------------------------------------------------

/** How data or control flows along a connection */
export type ConnectionType =
  | "sequential"  // A completes, then B starts
  | "parallel"    // A and B run simultaneously
  | "conditional" // B starts only if A's output meets a condition
  | "feedback";   // B's output loops back as input to A

/** A directed edge between two agents */
export interface Connection {
  id: ID;
  networkId: ID;
  sourceAgentId: ID;
  targetAgentId: ID;
  type: ConnectionType;
  /** Optional label shown on the canvas edge */
  label?: string;
  /** For conditional connections, the expression evaluated at runtime */
  condition?: string;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------------------
// Network — a named graph of agents and their connections
// ---------------------------------------------------------------------------

export type NetworkStatus = "draft" | "active" | "archived";

/** A named, reusable graph of agents and connections */
export interface Network {
  id: ID;
  name: string;
  description: string;
  status: NetworkStatus;
  /** Ordered or unordered list of agent IDs participating in this network */
  agentIds: ID[];
  /** Connections are stored separately but referenced here for fast lookup */
  connectionIds: ID[];
  /** Optional entry-point agent for sequential networks */
  entryAgentId?: ID;
  tags: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
