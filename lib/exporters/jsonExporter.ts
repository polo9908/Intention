/**
 * jsonExporter.ts — Serialize an AgentSpec to annotated JSON.
 *
 * The output is a standalone JSON document that carries everything needed
 * to recreate or deploy the agent: spec fields, metadata, schema version,
 * and human-readable field comments embedded as `_comment_*` keys that
 * JSON editors will display alongside their values.
 */

import type { AgentSpec } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JsonExportOptions {
  /** Include `_comment_*` explanatory keys (default true) */
  includeComments?: boolean;
  /** Pretty-print indentation (default 2) */
  indent?: number;
  /** Include internal ids (default true) */
  includeIds?: boolean;
}

export interface JsonExportResult {
  content: string;
  filename: string;
  mimeType: "application/json";
}

// ---------------------------------------------------------------------------
// Field comments
// ---------------------------------------------------------------------------

const FIELD_COMMENTS: Record<string, string> = {
  "$schema":     "ContextLayer AgentSpec schema — https://contextlayer.dev/schema/v1",
  exportedAt:    "ISO 8601 timestamp of when this file was generated",
  id:            "Unique spec identifier — regenerate when forking",
  agentId:       "Agent this spec belongs to",
  name:          "Human-readable spec name shown in the ContextLayer UI",
  description:   "What this agent does in plain language",
  version:       "Monotonically increasing; bumped on every save",
  model:         "Claude model to use — opus-4-6 | sonnet-4-6 | haiku-4-5-20251001",
  systemPrompt:  "Full system prompt sent to the model on every request",
  maxTokens:     "Maximum tokens the model may generate per response",
  temperature:   "Sampling temperature 0–1. Lower = more deterministic",
  capabilities:  "Capability tags used for routing and compliance checks",
  metadata:      "Arbitrary key-value pairs for your own bookkeeping",
  createdAt:     "ISO 8601 — when this spec was first created",
  updatedAt:     "ISO 8601 — when this spec was last modified",
};

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

function buildExportObject(
  spec: AgentSpec,
  opts: Required<JsonExportOptions>,
): Record<string, unknown> {
  const doc: Record<string, unknown> = {};

  if (opts.includeComments) {
    doc["$schema"]          = "https://contextlayer.dev/schema/v1/agent-spec.json";
    doc["_comment_$schema"] = FIELD_COMMENTS["$schema"];
    doc["exportedAt"]       = new Date().toISOString();
    doc["_comment_exportedAt"] = FIELD_COMMENTS["exportedAt"];
  }

  const fields: (keyof AgentSpec)[] = [
    "id", "agentId", "name", "description", "version",
    "model", "systemPrompt", "maxTokens", "temperature",
    "capabilities", "metadata", "createdAt", "updatedAt",
  ];

  for (const key of fields) {
    if (!opts.includeIds && (key === "id" || key === "agentId")) continue;

    const val = spec[key];
    if (val === undefined) continue;

    if (opts.includeComments && FIELD_COMMENTS[key]) {
      doc[`_comment_${key}`] = FIELD_COMMENTS[key];
    }
    doc[key] = val;
  }

  return doc;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function exportToJson(
  spec: AgentSpec,
  options: JsonExportOptions = {},
): JsonExportResult {
  const opts: Required<JsonExportOptions> = {
    includeComments: options.includeComments ?? true,
    indent:          options.indent          ?? 2,
    includeIds:      options.includeIds      ?? true,
  };

  const doc     = buildExportObject(spec, opts);
  const content = JSON.stringify(doc, null, opts.indent);
  const slug    = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return {
    content,
    filename: `${slug}-v${spec.version}.agent.json`,
    mimeType: "application/json",
  };
}
