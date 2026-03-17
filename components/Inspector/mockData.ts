/**
 * mockData.ts — Demo data for the Inspector panel.
 * Keyed by agentId so the Inspector can look up data for any selected agent.
 */

import type { AgentMetrics, NetworkConnections, ComplianceData } from "./types";
import type { Agent, AgentSpec, SpecVersion } from "@/types";

// ---------------------------------------------------------------------------
// Mock agents (mirrored from NetworkCanvas mock — same agentIds)
// ---------------------------------------------------------------------------

const NOW = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();
const WEEK_AGO   = new Date(Date.now() - 7 * 86_400_000).toISOString();

export const MOCK_AGENTS: Record<string, Agent> = {
  "agent-input": {
    id: "agent-input", name: "User Input", description: "Handles raw user input and intent detection.", role: "orchestrator",
    status: "idle", config: { model: "claude-sonnet-4-6", systemPrompt: "You are a user input handler.", maxTokens: 2048, temperature: 0.3, capabilities: ["analysis"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: YESTERDAY,
  },
  "agent-router": {
    id: "agent-router", name: "Router", description: "Routes requests to the appropriate specialist.", role: "orchestrator",
    status: "running", config: { model: "claude-sonnet-4-6", systemPrompt: "You are a routing orchestrator.", maxTokens: 1024, temperature: 0.1, capabilities: ["planning", "analysis"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: NOW,
  },
  "agent-coder": {
    id: "agent-coder", name: "Code Agent", description: "Writes and reviews code for user requests.", role: "specialist",
    status: "running", config: { model: "claude-opus-4-6", systemPrompt: "You are an expert software engineer.", maxTokens: 8192, temperature: 0.2, capabilities: ["code", "analysis"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: NOW,
  },
  "agent-analyst": {
    id: "agent-analyst", name: "Analyst", description: "Performs deep data analysis and research.", role: "specialist",
    status: "paused", config: { model: "claude-sonnet-4-6", systemPrompt: "You are a data analyst.", maxTokens: 4096, temperature: 0.4, capabilities: ["analysis", "research"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: YESTERDAY,
  },
  "agent-writer": {
    id: "agent-writer", name: "Writer", description: "Generates high-quality written content.", role: "worker",
    status: "idle", config: { model: "claude-sonnet-4-6", systemPrompt: "You are a professional writer.", maxTokens: 4096, temperature: 0.8, capabilities: ["writing"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: YESTERDAY,
  },
  "agent-critic": {
    id: "agent-critic", name: "Critic", description: "Reviews outputs for quality and accuracy.", role: "critic",
    status: "idle", config: { model: "claude-opus-4-6", systemPrompt: "You are a quality critic.", maxTokens: 2048, temperature: 0.3, capabilities: ["analysis"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: YESTERDAY,
  },
  "agent-qa": {
    id: "agent-qa", name: "QA Worker", description: "Automated quality assurance checks.", role: "worker",
    status: "error", config: { model: "claude-haiku-4-5-20251001", systemPrompt: "You are a QA specialist.", maxTokens: 1024, temperature: 0.1, capabilities: ["analysis"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: NOW,
  },
  "agent-output": {
    id: "agent-output", name: "Output", description: "Formats and delivers the final response.", role: "worker",
    status: "completed", config: { model: "claude-haiku-4-5-20251001", systemPrompt: "You format and deliver final responses.", maxTokens: 2048, temperature: 0.5, capabilities: ["writing"] },
    metadata: {}, createdAt: WEEK_AGO, updatedAt: YESTERDAY,
  },
};

// ---------------------------------------------------------------------------
// Mock specs (one per agent, v3 by default)
// ---------------------------------------------------------------------------

export const MOCK_SPECS: Record<string, AgentSpec> = {
  "agent-router": {
    id: "spec-router", agentId: "agent-router", name: "Router Spec", description: "Routes to specialist based on intent classification.",
    version: 3, model: "claude-sonnet-4-6",
    systemPrompt: "You are a routing orchestrator. Classify the user request and forward to the correct specialist: code, analysis, or writing. Always output a JSON routing decision.",
    maxTokens: 1024, temperature: 0.1, capabilities: ["planning", "analysis"],
    metadata: { domain: "orchestration", criticality: "high" },
    createdAt: WEEK_AGO, updatedAt: NOW,
  },
  "agent-coder": {
    id: "spec-coder", agentId: "agent-coder", name: "Code Agent Spec", description: "Expert software engineering assistant.",
    version: 5, model: "claude-opus-4-6",
    systemPrompt: "You are an expert software engineer specialising in TypeScript, React, and Node.js. Write clean, well-typed, documented code. Prefer functional patterns. Always explain your implementation choices.",
    maxTokens: 8192, temperature: 0.2, capabilities: ["code", "analysis"],
    metadata: { language: "TypeScript", framework: "React" },
    createdAt: WEEK_AGO, updatedAt: NOW,
  },
};

// ---------------------------------------------------------------------------
// Mock spec version history
// ---------------------------------------------------------------------------

export const MOCK_SPEC_VERSIONS: Record<string, SpecVersion[]> = {
  "spec-router": [
    { id: "ver-r3", specId: "spec-router", version: 3, snapshot: MOCK_SPECS["agent-router"]!, changeMessage: "Tightened JSON output format", createdAt: NOW },
    { id: "ver-r2", specId: "spec-router", version: 2, snapshot: { ...MOCK_SPECS["agent-router"]!, version: 2, systemPrompt: "Route the request to the correct agent." }, changeMessage: "Added specialist routing logic", createdAt: YESTERDAY },
    { id: "ver-r1", specId: "spec-router", version: 1, snapshot: { ...MOCK_SPECS["agent-router"]!, version: 1, systemPrompt: "Initial routing spec." }, changeMessage: "Initial version", createdAt: WEEK_AGO },
  ],
  "spec-coder": [
    { id: "ver-c5", specId: "spec-coder", version: 5, snapshot: MOCK_SPECS["agent-coder"]!, changeMessage: "Added React & Node specialisation", createdAt: NOW },
    { id: "ver-c4", specId: "spec-coder", version: 4, snapshot: { ...MOCK_SPECS["agent-coder"]!, version: 4 }, changeMessage: "Increased max tokens to 8192", createdAt: YESTERDAY },
    { id: "ver-c3", specId: "spec-coder", version: 3, snapshot: { ...MOCK_SPECS["agent-coder"]!, version: 3 }, changeMessage: "Lowered temperature for determinism", createdAt: WEEK_AGO },
  ],
};

// ---------------------------------------------------------------------------
// Mock metrics (per agentId)
// ---------------------------------------------------------------------------

export const MOCK_METRICS: Record<string, AgentMetrics> = {
  "agent-router": {
    throughput:         { value: 1248, formatted: "1 248",    delta: 87,    deltaFormatted: "+87",    trend: "up"   },
    avgResponseTime:    { value: 0.38, formatted: "0.38 s",   delta: -0.05, deltaFormatted: "−0.05 s", trend: "down" },
    resolutionRate:     { value: 99.1, formatted: "99.1 %",   delta: 0.3,   deltaFormatted: "+0.3 %", trend: "up"   },
    costPerInteraction: { value: 0.002, formatted: "$0.002",  delta: 0,     deltaFormatted: "→",      trend: "flat" },
    escalationRate:     { value: 0.8,  formatted: "0.8 %",    delta: -0.2,  deltaFormatted: "−0.2 %", trend: "down" },
  },
  "agent-coder": {
    throughput:         { value: 412,  formatted: "412",      delta: -18,   deltaFormatted: "−18",    trend: "down" },
    avgResponseTime:    { value: 3.12, formatted: "3.12 s",   delta: 0.4,   deltaFormatted: "+0.4 s", trend: "up"   },
    resolutionRate:     { value: 91.4, formatted: "91.4 %",   delta: -2.1,  deltaFormatted: "−2.1 %", trend: "down" },
    costPerInteraction: { value: 0.018, formatted: "$0.018",  delta: 0.003, deltaFormatted: "+$0.003", trend: "up"  },
    escalationRate:     { value: 8.6,  formatted: "8.6 %",    delta: 2.1,   deltaFormatted: "+2.1 %", trend: "up"   },
  },
  "agent-analyst": {
    throughput:         { value: 287,  formatted: "287",      delta: 12,    deltaFormatted: "+12",    trend: "up"   },
    avgResponseTime:    { value: 2.74, formatted: "2.74 s",   delta: -0.2,  deltaFormatted: "−0.2 s", trend: "down" },
    resolutionRate:     { value: 94.8, formatted: "94.8 %",   delta: 0.6,   deltaFormatted: "+0.6 %", trend: "up"   },
    costPerInteraction: { value: 0.011, formatted: "$0.011",  delta: 0,     deltaFormatted: "→",      trend: "flat" },
    escalationRate:     { value: 5.2,  formatted: "5.2 %",    delta: -0.6,  deltaFormatted: "−0.6 %", trend: "down" },
  },
  "agent-writer": {
    throughput:         { value: 159,  formatted: "159",      delta: 4,     deltaFormatted: "+4",     trend: "up"   },
    avgResponseTime:    { value: 1.85, formatted: "1.85 s",   delta: 0.1,   deltaFormatted: "+0.1 s", trend: "up"   },
    resolutionRate:     { value: 97.2, formatted: "97.2 %",   delta: 1.0,   deltaFormatted: "+1.0 %", trend: "up"   },
    costPerInteraction: { value: 0.007, formatted: "$0.007",  delta: 0,     deltaFormatted: "→",      trend: "flat" },
    escalationRate:     { value: 2.8,  formatted: "2.8 %",    delta: -1.0,  deltaFormatted: "−1.0 %", trend: "down" },
  },
  "agent-critic": {
    throughput:         { value: 698,  formatted: "698",      delta: -30,   deltaFormatted: "−30",    trend: "down" },
    avgResponseTime:    { value: 1.22, formatted: "1.22 s",   delta: 0.05,  deltaFormatted: "+0.05 s", trend: "up"  },
    resolutionRate:     { value: 98.5, formatted: "98.5 %",   delta: 0.2,   deltaFormatted: "+0.2 %", trend: "up"   },
    costPerInteraction: { value: 0.009, formatted: "$0.009",  delta: 0.001, deltaFormatted: "+$0.001", trend: "up"  },
    escalationRate:     { value: 1.5,  formatted: "1.5 %",    delta: -0.2,  deltaFormatted: "−0.2 %", trend: "down" },
  },
  "agent-qa": {
    throughput:         { value: 159,  formatted: "159",      delta: -62,   deltaFormatted: "−62",    trend: "down" },
    avgResponseTime:    { value: 5.40, formatted: "5.40 s",   delta: 2.8,   deltaFormatted: "+2.8 s", trend: "up"   },
    resolutionRate:     { value: 72.3, formatted: "72.3 %",   delta: -18.1, deltaFormatted: "−18.1 %", trend: "down" },
    costPerInteraction: { value: 0.004, formatted: "$0.004",  delta: 0.002, deltaFormatted: "+$0.002", trend: "up"  },
    escalationRate:     { value: 27.7, formatted: "27.7 %",   delta: 18.1,  deltaFormatted: "+18.1 %", trend: "up"  },
  },
  "agent-output": {
    throughput:         { value: 1247, formatted: "1 247",    delta: 85,    deltaFormatted: "+85",    trend: "up"   },
    avgResponseTime:    { value: 0.21, formatted: "0.21 s",   delta: -0.01, deltaFormatted: "−0.01 s", trend: "down" },
    resolutionRate:     { value: 99.9, formatted: "99.9 %",   delta: 0,     deltaFormatted: "→",      trend: "flat" },
    costPerInteraction: { value: 0.001, formatted: "$0.001",  delta: 0,     deltaFormatted: "→",      trend: "flat" },
    escalationRate:     { value: 0.1,  formatted: "0.1 %",    delta: 0,     deltaFormatted: "→",      trend: "flat" },
  },
};

// Fallback metrics for agents without specific data
const FALLBACK_METRICS: AgentMetrics = {
  throughput:         { value: 0, formatted: "—",   delta: 0, deltaFormatted: "→", trend: "flat" },
  avgResponseTime:    { value: 0, formatted: "—",   delta: 0, deltaFormatted: "→", trend: "flat" },
  resolutionRate:     { value: 0, formatted: "—",   delta: 0, deltaFormatted: "→", trend: "flat" },
  costPerInteraction: { value: 0, formatted: "—",   delta: 0, deltaFormatted: "→", trend: "flat" },
  escalationRate:     { value: 0, formatted: "—",   delta: 0, deltaFormatted: "→", trend: "flat" },
};

export function getMockMetrics(agentId: string): AgentMetrics {
  return MOCK_METRICS[agentId] ?? FALLBACK_METRICS;
}

// ---------------------------------------------------------------------------
// Mock network connections (per agentId)
// ---------------------------------------------------------------------------

export const MOCK_CONNECTIONS: Record<string, NetworkConnections> = {
  "agent-router": {
    inputs:  [{ id: "c1", agentId: "agent-input",   agentName: "User Input",  type: "sequential",  trafficPct: 100 }],
    outputs: [
      { id: "c2", agentId: "agent-coder",   agentName: "Code Agent", type: "conditional", trafficPct: 33 },
      { id: "c3", agentId: "agent-analyst", agentName: "Analyst",    type: "conditional", trafficPct: 23 },
      { id: "c4", agentId: "agent-writer",  agentName: "Writer",     type: "conditional", trafficPct: 13 },
    ],
  },
  "agent-coder": {
    inputs:  [{ id: "c2", agentId: "agent-router", agentName: "Router", type: "conditional", trafficPct: 33 }],
    outputs: [{ id: "c5", agentId: "agent-critic", agentName: "Critic", type: "sequential",  trafficPct: 100 }],
  },
  "agent-analyst": {
    inputs:  [{ id: "c3", agentId: "agent-router", agentName: "Router", type: "conditional", trafficPct: 23 }],
    outputs: [{ id: "c6", agentId: "agent-critic", agentName: "Critic", type: "parallel",    trafficPct: 100 }],
  },
  "agent-writer": {
    inputs:  [{ id: "c4", agentId: "agent-router", agentName: "Router", type: "conditional", trafficPct: 13 }],
    outputs: [{ id: "c7", agentId: "agent-qa",     agentName: "QA Worker", type: "sequential", trafficPct: 100 }],
  },
  "agent-critic": {
    inputs: [
      { id: "c5", agentId: "agent-coder",   agentName: "Code Agent", type: "sequential", trafficPct: 59 },
      { id: "c6", agentId: "agent-analyst", agentName: "Analyst",    type: "parallel",   trafficPct: 41 },
    ],
    outputs: [
      { id: "c8",  agentId: "agent-output", agentName: "Output", type: "sequential", trafficPct: 88 },
      { id: "cfb", agentId: "agent-router", agentName: "Router", type: "feedback",   trafficPct: 12 },
    ],
  },
  "agent-qa": {
    inputs:  [{ id: "c7", agentId: "agent-writer", agentName: "Writer", type: "sequential", trafficPct: 100 }],
    outputs: [{ id: "c9", agentId: "agent-output", agentName: "Output", type: "sequential", trafficPct: 100 }],
  },
  "agent-output": {
    inputs: [
      { id: "c8", agentId: "agent-critic", agentName: "Critic",    type: "sequential", trafficPct: 81 },
      { id: "c9", agentId: "agent-qa",     agentName: "QA Worker", type: "sequential", trafficPct: 19 },
    ],
    outputs: [],
  },
  "agent-input": {
    inputs:  [],
    outputs: [{ id: "c1", agentId: "agent-router", agentName: "Router", type: "sequential", trafficPct: 100 }],
  },
};

export function getMockConnections(agentId: string): NetworkConnections {
  return MOCK_CONNECTIONS[agentId] ?? { inputs: [], outputs: [] };
}

// ---------------------------------------------------------------------------
// Mock compliance data (per agentId)
// ---------------------------------------------------------------------------

export const MOCK_COMPLIANCE: Record<string, ComplianceData> = {
  "agent-router": {
    score: 96,
    lastValidatedAt: NOW,
    issues: [
      { id: "i1", severity: "warning", message: "System prompt missing fallback routing instruction" },
    ],
  },
  "agent-coder": {
    score: 88,
    lastValidatedAt: YESTERDAY,
    issues: [
      { id: "i2", severity: "warning", message: "Temperature above recommended for code generation (≤ 0.3)" },
      { id: "i3", severity: "warning", message: "No explicit output format constraint in system prompt" },
    ],
  },
  "agent-analyst": {
    score: 100,
    lastValidatedAt: YESTERDAY,
    issues: [],
  },
  "agent-writer": {
    score: 94,
    lastValidatedAt: WEEK_AGO,
    issues: [
      { id: "i4", severity: "warning", message: "Spec not validated in the last 24 hours" },
    ],
  },
  "agent-critic": {
    score: 100,
    lastValidatedAt: NOW,
    issues: [],
  },
  "agent-qa": {
    score: 51,
    lastValidatedAt: NOW,
    issues: [
      { id: "i5", severity: "error",   message: "Agent status: error — check runtime logs" },
      { id: "i6", severity: "error",   message: "Resolution rate below threshold (< 80%)" },
      { id: "i7", severity: "warning", message: "Avg response time exceeds SLA (> 3 s)" },
    ],
  },
  "agent-output": {
    score: 100,
    lastValidatedAt: NOW,
    issues: [],
  },
  "agent-input": {
    score: 100,
    lastValidatedAt: YESTERDAY,
    issues: [],
  },
};

export function getMockCompliance(agentId: string): ComplianceData {
  return MOCK_COMPLIANCE[agentId] ?? { score: 0, lastValidatedAt: null, issues: [] };
}
