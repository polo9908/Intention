/**
 * yamlExporter.ts — Serialize an AgentSpec to YAML.
 *
 * Implements a minimal hand-rolled YAML serializer (no external dependency)
 * that handles the AgentSpec shape exactly.  Multiline strings (systemPrompt)
 * are emitted using the `|` block-scalar style so they stay readable.
 */

import type { AgentSpec } from "@/types";
import type { Metadata }  from "@/types/common";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface YamlExportOptions {
  /** Include `#` comment lines above each key (default true) */
  includeComments?: boolean;
  /** Include internal ids (default true) */
  includeIds?: boolean;
}

export interface YamlExportResult {
  content: string;
  filename: string;
  mimeType: "text/yaml";
}

// ---------------------------------------------------------------------------
// Field comments
// ---------------------------------------------------------------------------

const FIELD_COMMENTS: Record<string, string> = {
  "$schema":     "ContextLayer AgentSpec — https://contextlayer.dev/schema/v1",
  exportedAt:    "Generated at (ISO 8601)",
  id:            "Unique spec identifier — regenerate when forking",
  agentId:       "Agent this spec belongs to",
  name:          "Human-readable name",
  description:   "What this agent does",
  version:       "Auto-incremented on every save",
  model:         "claude-opus-4-6 | claude-sonnet-4-6 | claude-haiku-4-5-20251001",
  systemPrompt:  "Full system prompt — use | for multiline",
  maxTokens:     "Max tokens per response (1–200000)",
  temperature:   "Sampling temperature (0 = deterministic, 1 = creative)",
  capabilities:  "Routing / compliance tags",
  metadata:      "Free-form key-value metadata",
  createdAt:     "ISO 8601 creation timestamp",
  updatedAt:     "ISO 8601 last-modified timestamp",
};

// ---------------------------------------------------------------------------
// Primitive serialisers
// ---------------------------------------------------------------------------

function escapeYamlString(s: string): string {
  // Strings that need quoting: start with special chars, contain : #, etc.
  if (/^[{}\[\],&*#?|<>=!%@`]/.test(s) ||
      /: /.test(s) || /#/.test(s) || s === "" ||
      s === "true" || s === "false" || s === "null" ||
      /^\d/.test(s)) {
    return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;
  }
  return s;
}

/** Emit a multiline string as a YAML literal block scalar (the | style). */
function blockScalar(text: string, indent = 2): string {
  const pad = " ".repeat(indent);
  const lines = text.split("\n").map((l) => (l === "" ? "" : `${pad}${l}`));
  return `|\n${lines.join("\n")}`;
}

function serializeValue(val: unknown, indent = 0): string {
  const pad = " ".repeat(indent);

  if (val === null || val === undefined) return "null";
  if (typeof val === "boolean")          return val ? "true" : "false";
  if (typeof val === "number")           return String(val);

  if (typeof val === "string") {
    if (val.includes("\n")) return blockScalar(val, indent + 2);
    return escapeYamlString(val);
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return "[]";
    return "\n" + val.map((v) => `${pad}- ${serializeValue(v, indent + 2)}`).join("\n");
  }

  if (typeof val === "object") {
    const obj = val as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return "{}";
    return (
      "\n" +
      keys
        .map((k) => {
          const v = serializeValue(obj[k], indent + 2);
          const sep = v.startsWith("\n") ? "" : " ";
          return `${pad}  ${k}:${sep}${v}`;
        })
        .join("\n")
    );
  }

  return escapeYamlString(String(val));
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

type SpecEntry = {
  key: string;
  comment?: string;
  value: unknown;
};

function buildEntries(spec: AgentSpec, opts: Required<YamlExportOptions>): SpecEntry[] {
  const entries: SpecEntry[] = [];

  const add = (key: string, value: unknown) => {
    entries.push({
      key,
      comment: opts.includeComments ? FIELD_COMMENTS[key] : undefined,
      value,
    });
  };

  if (opts.includeComments) {
    add("$schema", "https://contextlayer.dev/schema/v1/agent-spec.yaml");
    add("exportedAt", new Date().toISOString());
  }

  if (opts.includeIds) {
    add("id",      spec.id);
    add("agentId", spec.agentId);
  }

  add("name",        spec.name);
  add("description", spec.description);
  add("version",     spec.version);
  add("model",       spec.model);
  add("systemPrompt", spec.systemPrompt);
  add("maxTokens",   spec.maxTokens);
  add("temperature", spec.temperature);
  add("capabilities", spec.capabilities);

  if (spec.metadata && Object.keys(spec.metadata).length > 0) {
    add("metadata", spec.metadata as Metadata);
  }

  add("createdAt", spec.createdAt);
  add("updatedAt", spec.updatedAt);

  return entries;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function exportToYaml(
  spec: AgentSpec,
  options: YamlExportOptions = {},
): YamlExportResult {
  const opts: Required<YamlExportOptions> = {
    includeComments: options.includeComments ?? true,
    includeIds:      options.includeIds      ?? true,
  };

  const lines: string[] = ["---"];
  const entries = buildEntries(spec, opts);

  for (const entry of entries) {
    if (entry.comment) {
      lines.push(`# ${entry.comment}`);
    }
    const serialized = serializeValue(entry.value);
    const sep = serialized.startsWith("\n") || serialized.startsWith("|") ? "\n" : " ";
    lines.push(`${entry.key}:${sep === "\n" ? "" : " "}${serialized}`);
    if (entry.comment) lines.push(""); // blank line after commented fields
  }

  const slug    = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const content = lines.join("\n") + "\n";

  return {
    content,
    filename: `${slug}-v${spec.version}.agent.yaml`,
    mimeType: "text/yaml",
  };
}
