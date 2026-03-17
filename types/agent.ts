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
