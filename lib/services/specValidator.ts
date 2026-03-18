/**
 * lib/services/specValidator.ts
 *
 * Pure, synchronous analysis of an AgentSpec.
 * No API calls — safe to import on both client and server.
 *
 * Public API
 * ──────────
 *   validateSpec(spec)         → ValidationResult  (errors + warnings + score)
 *   checkForContradictions(spec) → Contradiction[]
 *   measureCompleteness(spec)  → 0–100
 */

import type { AgentSpec } from "@/types/agent";
import type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  Contradiction,
} from "@/types/preview";

// ---------------------------------------------------------------------------
// Keyword sets used for semantic analysis of systemPrompt
// ---------------------------------------------------------------------------

const TONE_FORMAL = ["accordingly", "furthermore", "therefore", "hereby",
  "pursuant", "professional", "formal", "respectfully", "sincerely"] as const;

const TONE_CASUAL = ["hey", "yeah", "cool", "awesome", "gonna", "wanna",
  "kinda", "chill", "guys", "stuff", "things", "basically"] as const;

const TONE_TECHNICAL = ["implementation", "algorithm", "architecture", "schema",
  "protocol", "interface", "api", "function", "endpoint", "repository"] as const;

const TONE_SIMPLE = ["simple", "easy", "basic", "beginner", "plain",
  "straightforward", "non-technical", "layman"] as const;

const LENGTH_BRIEF = ["brief", "concise", "short", "terse", "succinct",
  "one sentence", "one paragraph", "few words"] as const;

const LENGTH_DETAILED = ["detailed", "comprehensive", "thorough", "extensive",
  "in-depth", "exhaustive", "complete explanation", "elaborate"] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lower(text: string): string {
  return text.toLowerCase();
}

function countMatches(text: string, terms: readonly string[]): number {
  const t = lower(text);
  return terms.filter((kw) => t.includes(kw)).length;
}

// ---------------------------------------------------------------------------
// Public: measureCompleteness
// ---------------------------------------------------------------------------

/**
 * Returns 0–100 representing how complete the spec is.
 *
 * Weight breakdown (must total 100):
 *   Required  (60 pts): name, systemPrompt, model, ≥1 capability
 *   Preferred (40 pts): description, temperature, maxTokens, ≥2 capabilities,
 *                       metadata, version ≥ 2
 */
export function measureCompleteness(spec: AgentSpec): number {
  let score = 0;

  // Required (60 pts)
  if (spec.name.trim().length > 0) score += 15;
  if (spec.systemPrompt.trim().length >= 10) score += 30;
  if (spec.model) score += 10;
  if (spec.capabilities.length > 0) score += 5;

  // Preferred (40 pts)
  if (spec.description.trim().length > 0) score += 10;
  if (spec.temperature !== undefined && spec.temperature !== null) score += 5;
  if (spec.maxTokens > 0) score += 5;
  if (spec.capabilities.length >= 2) score += 8;
  if (spec.metadata && Object.keys(spec.metadata).length > 0) score += 5;
  if (spec.version >= 2) score += 7;

  return Math.min(100, score);
}

// ---------------------------------------------------------------------------
// Public: checkForContradictions
// ---------------------------------------------------------------------------

export function checkForContradictions(spec: AgentSpec): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const prompt = spec.systemPrompt;

  // Tone: formal ↔ casual
  const formalCount = countMatches(prompt, TONE_FORMAL);
  const casualCount = countMatches(prompt, TONE_CASUAL);
  if (formalCount >= 1 && casualCount >= 2) {
    contradictions.push({
      field1: "systemPrompt (formal tone)",
      field2: "systemPrompt (casual tone)",
      description:
        "The system prompt contains both formal language directives and casual phrasing, " +
        "which may confuse the agent about the expected communication style.",
      severity: "warning",
    });
  }

  // Tone: technical ↔ simple
  const technicalCount = countMatches(prompt, TONE_TECHNICAL);
  const simpleCount = countMatches(prompt, TONE_SIMPLE);
  if (technicalCount >= 2 && simpleCount >= 2) {
    contradictions.push({
      field1: "systemPrompt (technical language)",
      field2: "systemPrompt (simplicity directive)",
      description:
        "The spec requests technical depth but also instructs the agent to use simple, " +
        "non-technical language.",
      severity: "warning",
    });
  }

  // Length: brief ↔ detailed
  const briefCount = countMatches(prompt, LENGTH_BRIEF);
  const detailedCount = countMatches(prompt, LENGTH_DETAILED);
  if (briefCount >= 1 && detailedCount >= 1) {
    contradictions.push({
      field1: "systemPrompt (brevity directive)",
      field2: "systemPrompt (detail directive)",
      description:
        "The system prompt simultaneously asks for brief and detailed responses.",
      severity: "error",
    });
  }

  // Temperature ↔ creativity instructions
  if (spec.temperature < 0.2 && countMatches(prompt, ["creative", "varied", "diverse", "imaginative"]) >= 1) {
    contradictions.push({
      field1: "temperature",
      field2: "systemPrompt (creativity directive)",
      description:
        `Temperature is very low (${spec.temperature}) which suppresses variation, ` +
        "but the system prompt requests creative or varied output.",
      severity: "warning",
    });
  }

  if (spec.temperature > 0.9 && countMatches(prompt, ["consistent", "deterministic", "exact", "precise", "reproducible"]) >= 1) {
    contradictions.push({
      field1: "temperature",
      field2: "systemPrompt (consistency directive)",
      description:
        `Temperature is very high (${spec.temperature}) which introduces high randomness, ` +
        "but the system prompt requests consistent or deterministic output.",
      severity: "warning",
    });
  }

  // Capability ↔ systemPrompt
  if (spec.capabilities.includes("code") && countMatches(prompt, ["no code", "without code", "avoid code", "no programming"])) {
    contradictions.push({
      field1: "capabilities (code)",
      field2: "systemPrompt (no-code directive)",
      description:
        "The spec declares 'code' as a capability but the system prompt instructs the agent to avoid code.",
      severity: "error",
    });
  }

  // maxTokens ↔ length instructions
  if (spec.maxTokens > 4096 && briefCount >= 2) {
    contradictions.push({
      field1: "maxTokens",
      field2: "systemPrompt (brevity directive)",
      description:
        `maxTokens is set to ${spec.maxTokens} (high), but the system prompt strongly emphasises brevity. ` +
        "Consider reducing maxTokens to enforce the length constraint.",
      severity: "warning",
    });
  }

  if (spec.maxTokens < 256 && detailedCount >= 1) {
    contradictions.push({
      field1: "maxTokens",
      field2: "systemPrompt (detail directive)",
      description:
        `maxTokens is set to ${spec.maxTokens} (very low), which will truncate detailed responses ` +
        "before they are complete.",
      severity: "error",
    });
  }

  return contradictions;
}

// ---------------------------------------------------------------------------
// Public: validateSpec
// ---------------------------------------------------------------------------

export function validateSpec(spec: AgentSpec): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // ── Required field checks ─────────────────────────────────────────────────

  if (!spec.name || spec.name.trim().length === 0) {
    errors.push({ field: "name", message: "Agent name is required.", severity: "error" });
  } else if (spec.name.trim().length < 3) {
    warnings.push({ field: "name", message: "Name is very short — consider something more descriptive.", severity: "warning" });
  }

  if (!spec.systemPrompt || spec.systemPrompt.trim().length === 0) {
    errors.push({ field: "systemPrompt", message: "System prompt is required.", severity: "error" });
  } else if (spec.systemPrompt.trim().length < 10) {
    errors.push({ field: "systemPrompt", message: "System prompt is too short to define meaningful behaviour.", severity: "error" });
  } else if (spec.systemPrompt.trim().length < 50) {
    warnings.push({ field: "systemPrompt", message: "System prompt is brief — the agent may lack sufficient context.", severity: "warning" });
  }

  if (!spec.model) {
    errors.push({ field: "model", message: "A model must be selected.", severity: "error" });
  }

  // ── Value range checks ────────────────────────────────────────────────────

  if (spec.temperature < 0 || spec.temperature > 1) {
    errors.push({ field: "temperature", message: `Temperature must be between 0 and 1 (got ${spec.temperature}).`, severity: "error" });
  }

  if (spec.maxTokens <= 0) {
    errors.push({ field: "maxTokens", message: "maxTokens must be a positive integer.", severity: "error" });
  } else if (spec.maxTokens > 200_000) {
    warnings.push({ field: "maxTokens", message: "maxTokens exceeds 200 000 — ensure the chosen model supports this context length.", severity: "warning" });
  }

  // ── Capability checks ─────────────────────────────────────────────────────

  if (spec.capabilities.length === 0) {
    warnings.push({ field: "capabilities", message: "No capabilities declared — the spec may not be routed correctly in multi-agent networks.", severity: "warning" });
  }

  // ── Escalation logic check ────────────────────────────────────────────────
  // Look for conditional language ("if", "when", "should") without resolution phrases

  const prompt = spec.systemPrompt;
  const hasConditional = /\b(if|when|should|unless)\b/i.test(prompt);
  const hasResolution = /\b(then|escalate|fallback|otherwise|else|handle|respond)\b/i.test(prompt);
  if (hasConditional && !hasResolution) {
    warnings.push({
      field: "systemPrompt",
      message: "Conditional language detected ('if', 'when', 'should') without clear resolution instructions ('then', 'escalate', 'otherwise'). Add explicit handling logic.",
      severity: "warning",
    });
  }

  // ── Tone / length consistency warnings ───────────────────────────────────

  const contradictions = checkForContradictions(spec);
  const errorContradictions = contradictions.filter((c) => c.severity === "error");
  for (const c of errorContradictions) {
    errors.push({
      field: `${c.field1} / ${c.field2}`,
      message: c.description,
      severity: "error",
    });
  }

  // ── Score calculation ─────────────────────────────────────────────────────

  const errorPenalty = errors.length * 15;
  const warnPenalty = warnings.length * 5;
  const score = Math.max(0, 100 - errorPenalty - warnPenalty);
  const completeness = measureCompleteness(spec);

  return {
    isValid: errors.length === 0,
    score,
    completeness,
    errors,
    warnings,
    contradictions,
  };
}
