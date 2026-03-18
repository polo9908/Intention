/**
 * lib/services/complianceChecker.ts
 *
 * Measures how well a Claude response respects an AgentSpec.
 * Pure text analysis — no API calls, safe to run client-side.
 *
 * Public API
 * ──────────
 *   measureToneCompliance(spec, response)    → 0–100
 *   measureLengthCompliance(spec, response)  → 0–100
 *   checkAllowedActions(spec, response)      → boolean
 *   measureCompliance(spec, response)        → ComplianceResult
 */

import type { AgentSpec } from "@/types/agent";
import type { ComplianceResult, ComplianceDetail } from "@/types/preview";

// ---------------------------------------------------------------------------
// Tone analysis keyword sets
// ---------------------------------------------------------------------------

const TONE_SIGNALS: Record<string, readonly string[]> = {
  formal:    ["accordingly", "furthermore", "therefore", "hereby", "respectfully",
              "sincerely", "please be advised", "kindly", "pursuant", "regarding"],
  casual:    ["hey", "yeah", "cool", "awesome", "gonna", "wanna", "kinda",
              "honestly", "basically", "you know", "like,", "super ", "totally"],
  technical: ["implementation", "algorithm", "architecture", "schema", "protocol",
              "repository", "endpoint", "function(", "() =>", "interface ", "const "],
  simple:    ["simply", "just ", "easy", "straightforward", "in other words",
              "to put it simply", "basically", "think of it as"],
  empathetic:["understand", "i hear you", "that makes sense", "i appreciate",
              "i'm sorry", "let me help", "don't worry", "you're not alone"],
  assertive: ["you must", "always ", "never ", "it is required", "mandatory",
              "you are expected", "ensure that", "do not"],
};

// ---------------------------------------------------------------------------
// Length estimation
// ---------------------------------------------------------------------------

/** Count approximate words in a string */
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Infer the expected word-count range from the spec's system prompt and maxTokens.
 * Returns [min, max] in words.
 */
function expectedWordRange(spec: AgentSpec): [number, number] {
  const prompt = spec.systemPrompt.toLowerCase();

  // Explicit length keywords override token-based estimation
  const hasBrief =  /\b(brief|concise|short|terse|succinct|one sentence|few words|one paragraph)\b/.test(prompt);
  const hasDetailed = /\b(detailed|comprehensive|thorough|extensive|in-depth|exhaustive|elaborate)\b/.test(prompt);

  if (hasBrief && !hasDetailed) return [10, 150];
  if (hasDetailed && !hasBrief) return [300, 1200];
  if (hasBrief && hasDetailed) return [50, 400]; // contradictory — allow wide range

  // Fall back to token estimate (≈ 0.75 words per token)
  const upperWords = Math.round(spec.maxTokens * 0.75);
  const lowerWords = Math.round(upperWords * 0.1);
  return [lowerWords, upperWords];
}

// ---------------------------------------------------------------------------
// Prohibition extraction
// ---------------------------------------------------------------------------

/** Extract keywords that the spec says the agent should NOT do / say */
function extractProhibitions(systemPrompt: string): string[] {
  const prohibitions: string[] = [];
  const patterns = [
    /(?:do not|don't|never|avoid|refrain from|must not)\s+([a-z][a-z ,]{3,40})/gi,
    /(?:prohibited|forbidden|not allowed):\s*([a-z][a-z ,]{3,40})/gi,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(systemPrompt)) !== null) {
      // Take only the first meaningful keyword from the captured phrase
      const keyword = match[1].trim().split(/[\s,]+/)[0];
      if (keyword.length >= 3) prohibitions.push(keyword.toLowerCase());
    }
  }

  return [...new Set(prohibitions)];
}

// ---------------------------------------------------------------------------
// Public: measureToneCompliance
// ---------------------------------------------------------------------------

/**
 * Compares the dominant tone of the spec's systemPrompt to the response.
 * Returns 0–100 where 100 = perfect tone match.
 */
export function measureToneCompliance(spec: AgentSpec, response: string): number {
  if (!response.trim()) return 0;

  const prompt = spec.systemPrompt.toLowerCase();
  const resp = response.toLowerCase();

  // Determine expected dominant tones from spec (density per 100 chars)
  const specDensity: Record<string, number> = {};
  for (const [tone, keywords] of Object.entries(TONE_SIGNALS)) {
    const hits = keywords.filter((kw) => prompt.includes(kw)).length;
    specDensity[tone] = hits / (prompt.length / 100);
  }

  const dominantTones = Object.entries(specDensity)
    .filter(([, d]) => d > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([tone]) => tone);

  if (dominantTones.length === 0) {
    // No detectable tone requirements — neutral pass
    return 80;
  }

  // Measure response density for dominant tones
  let totalScore = 0;
  for (const tone of dominantTones) {
    const keywords = TONE_SIGNALS[tone];
    const hits = keywords.filter((kw) => resp.includes(kw)).length;
    const responseDensity = hits / (resp.length / 100);
    const expectedDensity = specDensity[tone];

    if (expectedDensity === 0) continue;

    // Score = min(actual / expected, 1) * 100, capped at 100
    const ratio = Math.min(responseDensity / expectedDensity, 2);
    totalScore += Math.min(ratio * 50, 100);
  }

  return Math.round(Math.min(totalScore / dominantTones.length, 100));
}

// ---------------------------------------------------------------------------
// Public: measureLengthCompliance
// ---------------------------------------------------------------------------

/**
 * Returns 0–100 based on how well the response length matches the spec's
 * length expectations (derived from systemPrompt keywords + maxTokens).
 */
export function measureLengthCompliance(spec: AgentSpec, response: string): number {
  const actual = wordCount(response);
  const [minWords, maxWords] = expectedWordRange(spec);

  if (actual >= minWords && actual <= maxWords) return 100;

  if (actual < minWords) {
    // Below minimum — linear penalty
    const deficit = minWords - actual;
    const penalty = Math.min((deficit / minWords) * 100, 100);
    return Math.round(Math.max(0, 100 - penalty));
  }

  // Above maximum — linear penalty
  const excess = actual - maxWords;
  const penalty = Math.min((excess / maxWords) * 100, 100);
  return Math.round(Math.max(0, 100 - penalty));
}

// ---------------------------------------------------------------------------
// Public: checkAllowedActions
// ---------------------------------------------------------------------------

/**
 * Returns true if the response does not appear to violate the spec's
 * explicit prohibition instructions ("do not", "never", "avoid", etc.).
 */
export function checkAllowedActions(spec: AgentSpec, response: string): boolean {
  const prohibitions = extractProhibitions(spec.systemPrompt);
  if (prohibitions.length === 0) return true;

  const resp = response.toLowerCase();
  return !prohibitions.some((p) => resp.includes(p));
}

// ---------------------------------------------------------------------------
// Public: measureCompliance (aggregates all three measures)
// ---------------------------------------------------------------------------

/**
 * Full compliance measurement.
 * Weights: tone 30%, length 30%, actions 40%.
 */
export function measureCompliance(spec: AgentSpec, response: string): ComplianceResult {
  const toneScore   = measureToneCompliance(spec, response);
  const lengthScore = measureLengthCompliance(spec, response);
  const actionsAllowed = checkAllowedActions(spec, response);
  const actionsScore = actionsAllowed ? 100 : 0;

  const overallScore = Math.round(
    toneScore * 0.3 + lengthScore * 0.3 + actionsScore * 0.4
  );

  const [minW, maxW] = expectedWordRange(spec);
  const actual = wordCount(response);

  const details: ComplianceDetail[] = [
    {
      aspect: "Tone",
      score: toneScore,
      description:
        toneScore >= 70
          ? "Response tone aligns with the spec."
          : "Response tone diverges from the spec's expected style.",
    },
    {
      aspect: "Length",
      score: lengthScore,
      description:
        lengthScore >= 70
          ? `Response length (${actual} words) is within the expected range (${minW}–${maxW} words).`
          : `Response length (${actual} words) is outside the expected range (${minW}–${maxW} words).`,
    },
    {
      aspect: "Allowed Actions",
      score: actionsScore,
      description: actionsAllowed
        ? "No prohibited actions detected in the response."
        : "The response may contain content that the spec prohibits.",
    },
  ];

  return { toneScore, lengthScore, actionsAllowed, overallScore, details };
}
