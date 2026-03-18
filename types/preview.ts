/**
 * types/preview.ts
 *
 * Shared types for spec validation, preview generation, and compliance
 * measurement.  These are intentionally framework-agnostic so they can be
 * imported from both server-side services and client-side hooks.
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationError {
  field: string;
  message: string;
  severity: "error";
}

export interface ValidationWarning {
  field: string;
  message: string;
  severity: "warning" | "info";
}

/** A detected contradiction between two fields / phrases in the spec */
export interface Contradiction {
  field1: string;
  field2: string;
  description: string;
  severity: "error" | "warning";
}

/** Full output of validateSpec() */
export interface ValidationResult {
  /** True when there are no errors (warnings are acceptable) */
  isValid: boolean;
  /** 0–100 overall validation score (penalises errors more than warnings) */
  score: number;
  /** 0–100 completeness score — how many optional fields are filled */
  completeness: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  contradictions: Contradiction[];
}

// ---------------------------------------------------------------------------
// Compliance
// ---------------------------------------------------------------------------

export interface ComplianceDetail {
  aspect: string;
  score: number; // 0-100
  description: string;
}

export interface ComplianceResult {
  /** 0–100 — how well the response matches the expected tone */
  toneScore: number;
  /** 0–100 — how well response length matches spec constraints */
  lengthScore: number;
  /** Whether response respects the spec's prohibited actions */
  actionsAllowed: boolean;
  /** Weighted average of the three scores above */
  overallScore: number;
  details: ComplianceDetail[];
}

// ---------------------------------------------------------------------------
// Preview
// ---------------------------------------------------------------------------

/** Returned by testSpecWithPrompt() / the /api/preview endpoint */
export interface PreviewResult {
  /** Full text response from Claude */
  response: string;
  /** True when overallScore ≥ 70 */
  matchesSpec: boolean;
  /** Human-readable list of spec violations or concerns */
  issues: string[];
  compliance: ComplianceResult;
  /** Round-trip latency in milliseconds */
  latencyMs: number;
}

// ---------------------------------------------------------------------------
// Streaming events (from /api/preview SSE stream)
// ---------------------------------------------------------------------------

export type PreviewStreamEvent =
  | { type: "chunk"; text: string }
  | { type: "result"; data: PreviewResult }
  | { type: "error"; message: string };
