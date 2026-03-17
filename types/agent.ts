import type { ID, Metadata, Status, Timestamp } from "./common";

/** Available Claude models */
export type ClaudeModel =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001";

/** Agent capability tags */
export type AgentCapability =
  | "code"
  | "analysis"
  | "research"
  | "writing"
  | "planning"
  | "tool_use"
  | "vision";

/** Role of an agent within an orchestration */
export type AgentRole = "orchestrator" | "worker" | "critic" | "specialist";

/** Agent configuration */
export interface AgentConfig {
  model: ClaudeModel;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  capabilities: AgentCapability[];
}

/** Core agent definition */
export interface Agent {
  id: ID;
  name: string;
  description: string;
  role: AgentRole;
  status: Status;
  config: AgentConfig;
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** A message within an agent conversation */
export interface AgentMessage {
  id: ID;
  agentId: ID;
  role: "user" | "assistant" | "system";
  content: string;
  tokens?: number;
  createdAt: Timestamp;
}

/** An orchestration run connecting multiple agents */
export interface OrchestrationRun {
  id: ID;
  name: string;
  status: Status;
  agentIds: ID[];
  messages: AgentMessage[];
  startedAt?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

/** Runtime stats for an agent */
export interface AgentStats {
  totalRuns: number;
  totalTokens: number;
  averageLatencyMs: number;
  successRate: number;
  lastActiveAt?: Timestamp;
}

// ---------------------------------------------------------------------------
// Agent Spec — versioned configuration snapshot for an agent
// ---------------------------------------------------------------------------

/** A frozen, versioned snapshot of an agent's configuration */
export interface AgentSpec {
  id: ID;
  /** Agent this spec belongs to */
  agentId: ID;
  name: string;
  description: string;
  /** Monotonically increasing version number */
  version: number;
  model: ClaudeModel;
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  capabilities: AgentCapability[];
  metadata: Metadata;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** One entry in a spec's change history */
export interface SpecVersion {
  id: ID;
  specId: ID;
  version: number;
  /** Full snapshot of the spec at this version */
  snapshot: AgentSpec;
  /** Human-readable description of what changed */
  changeMessage?: string;
  createdAt: Timestamp;
}
