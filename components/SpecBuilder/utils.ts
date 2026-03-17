import type { AgentSpec, ClaudeModel } from "@/types/agent";
import type {
  SpecContext,
  SpecCriterion,
  CellMap,
  SpecBuilderStats,
  SpecBuilderConfig,
} from "./types";

// ---------------------------------------------------------------------------
// Cell key encoding
// ---------------------------------------------------------------------------

export function cellKey(contextId: string, criterionId: string): string {
  return `${contextId}::${criterionId}`;
}

export function parseCellKey(key: string): { contextId: string; criterionId: string } | null {
  const parts = key.split("::");
  if (parts.length !== 2) return null;
  return { contextId: parts[0], criterionId: parts[1] };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/** A cell is considered valid when it has at least 4 non-whitespace chars */
export function isCellValid(value: string): boolean {
  return value.trim().length >= 4;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function computeStats(
  contexts: SpecContext[],
  criteria: SpecCriterion[],
  cells: CellMap
): SpecBuilderStats {
  const activeCriteria = criteria.filter((c) => c.enabled);
  const totalCells = contexts.length * activeCriteria.length;
  let filledCells = 0;

  for (const ctx of contexts) {
    for (const crit of activeCriteria) {
      const val = cells[cellKey(ctx.id, crit.id)] ?? "";
      if (val.trim().length > 0) filledCells++;
    }
  }

  return {
    totalCells,
    filledCells,
    completeness: totalCells === 0 ? 0 : Math.round((filledCells / totalCells) * 100),
    activeCriteriaCount: activeCriteria.length,
    contextCount: contexts.length,
  };
}

// ---------------------------------------------------------------------------
// System prompt generation
// ---------------------------------------------------------------------------

export function buildSystemPrompt(
  config: SpecBuilderConfig,
  contexts: SpecContext[],
  criteria: SpecCriterion[],
  cells: CellMap
): string {
  const activeCriteria = criteria
    .filter((c) => c.enabled)
    .sort((a, b) => a.order - b.order);

  const sortedContexts = [...contexts].sort((a, b) => a.order - b.order);

  if (sortedContexts.length === 0 || activeCriteria.length === 0) {
    return `You are ${config.agentName || "an AI assistant"}.`;
  }

  const lines: string[] = [
    `You are ${config.agentName || "an AI assistant"}. Respond according to the behavioral guidelines below.`,
    "",
    "## Behavioral Specifications",
    "",
  ];

  for (const ctx of sortedContexts) {
    lines.push(`### When handling: ${ctx.name}`);
    lines.push("");
    let hasAnyValue = false;
    for (const crit of activeCriteria) {
      const val = (cells[cellKey(ctx.id, crit.id)] ?? "").trim();
      if (val) {
        lines.push(`- **${crit.name}**: ${val}`);
        hasAnyValue = true;
      }
    }
    if (!hasAnyValue) {
      lines.push("_(No specific guidelines defined for this context yet.)_");
    }
    lines.push("");
  }

  lines.push(
    "Always identify the context of the user's request and apply the appropriate guidelines.",
    "If a situation is not explicitly covered, use your best judgment aligned with the overall tone."
  );

  return lines.join("\n").trim();
}

// ---------------------------------------------------------------------------
// AgentSpec assembly
// ---------------------------------------------------------------------------

const DEMO_AGENT_ID = "demo-agent-builder";

export function buildAgentSpec(
  specId: string,
  config: SpecBuilderConfig,
  contexts: SpecContext[],
  criteria: SpecCriterion[],
  cells: CellMap,
  existingSpec?: AgentSpec | null
): AgentSpec {
  const now = new Date().toISOString();
  const systemPrompt = buildSystemPrompt(config, contexts, criteria, cells);

  return {
    id: specId,
    agentId: DEMO_AGENT_ID,
    name: config.agentName || "Unnamed Agent",
    description: "Built with ContextLayer Spec Builder",
    version: (existingSpec?.version ?? 0) + 1,
    model: config.model as ClaudeModel,
    systemPrompt,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    capabilities: ["analysis", "writing"],
    metadata: {
      builderVersion: "1",
      contextsJson: JSON.stringify(contexts),
      criteriaJson: JSON.stringify(criteria),
      cellsJson: JSON.stringify(cells),
    },
    createdAt: existingSpec?.createdAt ?? now,
    updatedAt: now,
  };
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export const DEFAULT_CONTEXTS: SpecContext[] = [
  { id: "ctx_support", name: "Customer Support",   order: 0 },
  { id: "ctx_technical", name: "Technical Issue",  order: 1 },
  { id: "ctx_billing", name: "Billing Question",   order: 2 },
];

export const DEFAULT_CRITERIA: SpecCriterion[] = [
  { id: "crit_tone",       name: "Tone",             enabled: true,  order: 0 },
  { id: "crit_length",     name: "Response Length",  enabled: true,  order: 1 },
  { id: "crit_escalation", name: "Escalation Rules", enabled: true,  order: 2 },
  { id: "crit_actions",    name: "Allowed Actions",  enabled: false, order: 3 },
];

export const DEFAULT_CONFIG: SpecBuilderConfig = {
  agentName: "Support Agent",
  model: "claude-sonnet-4-6",
  temperature: 0.7,
  maxTokens: 2048,
};

export const MODEL_OPTIONS: { label: string; value: ClaudeModel }[] = [
  { label: "Claude Sonnet 4.6",     value: "claude-sonnet-4-6" },
  { label: "Claude Opus 4.6",       value: "claude-opus-4-6" },
  { label: "Claude Haiku 4.5",      value: "claude-haiku-4-5-20251001" },
];
