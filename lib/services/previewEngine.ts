/**
 * lib/services/previewEngine.ts
 *
 * Server-side only — calls Claude API.
 * Builds a prompt from an AgentSpec, runs it, and returns a PreviewResult
 * with compliance analysis baked in.
 *
 * Public API
 * ──────────
 *   buildSystemPrompt(spec)                         → string
 *   testSpecWithPrompt(spec, userInput, options?)   → Promise<PreviewResult>
 *   streamPreview(spec, userInput, signal?)         → AsyncGenerator<string>
 */

import { generateAgentPreview, streamAgentPreview } from "@/lib/claude-client";
import { measureCompliance } from "@/lib/services/complianceChecker";
import type { AgentSpec } from "@/types/agent";
import type { PreviewResult } from "@/types/preview";

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

/**
 * Constructs the effective system prompt sent to Claude during preview.
 * Wraps the raw spec systemPrompt with a lightweight constraint preamble so
 * the model understands it is operating in preview / test mode.
 */
export function buildSystemPrompt(spec: AgentSpec): string {
  const capabilityLine =
    spec.capabilities.length > 0
      ? `Capabilities enabled: ${spec.capabilities.join(", ")}.`
      : "";

  const constraintLines: string[] = [];

  if (spec.maxTokens <= 512) {
    constraintLines.push("Keep responses brief — a few sentences at most.");
  } else if (spec.maxTokens >= 8192) {
    constraintLines.push("You may provide thorough, detailed responses when warranted.");
  }

  if (spec.temperature < 0.3) {
    constraintLines.push("Be precise and consistent. Avoid speculation.");
  } else if (spec.temperature > 0.8) {
    constraintLines.push("Feel free to be creative and explore different angles.");
  }

  const parts = [
    "<!-- PREVIEW MODE: responding as the agent defined below -->",
    spec.systemPrompt.trim(),
    capabilityLine,
    ...constraintLines,
  ].filter(Boolean);

  return parts.join("\n\n");
}

// ---------------------------------------------------------------------------
// Issue extraction
// ---------------------------------------------------------------------------

function extractIssues(spec: AgentSpec, response: string, compliance: ReturnType<typeof measureCompliance>): string[] {
  const issues: string[] = [];

  for (const detail of compliance.details) {
    if (detail.score < 50) {
      issues.push(`[${detail.aspect}] ${detail.description}`);
    }
  }

  if (!compliance.actionsAllowed) {
    issues.push("The response appears to contain content that the spec prohibits.");
  }

  // Check for truncation hint
  if (response.endsWith("...") || response.endsWith("…")) {
    issues.push("Response appears to be truncated — consider increasing maxTokens.");
  }

  // Spec-level: very short system prompt may cause poor adherence
  if (spec.systemPrompt.trim().length < 30) {
    issues.push("System prompt is very short — the agent had little guidance to follow.");
  }

  return issues;
}

// ---------------------------------------------------------------------------
// Public: testSpecWithPrompt
// ---------------------------------------------------------------------------

export interface PreviewOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function testSpecWithPrompt(
  spec: AgentSpec,
  userInput: string,
  options: PreviewOptions = {}
): Promise<PreviewResult> {
  const start = Date.now();

  // Clone spec with the engineered system prompt
  const effectiveSpec: AgentSpec = {
    ...spec,
    systemPrompt: buildSystemPrompt(spec),
  };

  const response = await generateAgentPreview(effectiveSpec, userInput, options);
  const latencyMs = Date.now() - start;

  const compliance = measureCompliance(spec, response);
  const issues = extractIssues(spec, response, compliance);

  return {
    response,
    matchesSpec: compliance.overallScore >= 70,
    issues,
    compliance,
    latencyMs,
  };
}

// ---------------------------------------------------------------------------
// Public: streamPreview
// ---------------------------------------------------------------------------

/**
 * Async generator version — yields text chunks as they arrive.
 * Use this in API routes that stream SSE to the client.
 */
export async function* streamPreview(
  spec: AgentSpec,
  userInput: string,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const effectiveSpec: AgentSpec = {
    ...spec,
    systemPrompt: buildSystemPrompt(spec),
  };

  yield* streamAgentPreview(effectiveSpec, userInput, { signal });
}
