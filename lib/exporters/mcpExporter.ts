/**
 * mcpExporter.ts — Thin wrapper around mcpGenerator for the exporter interface.
 *
 * The MCP export produces a zip-like "bundle" represented as multiple named
 * files.  Since we can't bundle into a real zip in the browser without an
 * external library, we expose both individual files and a combined download
 * that concatenates them with clear delimiters.
 */

import type { AgentSpec } from "@/types";
import { generateMcpServer } from "@/lib/mcpGenerator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpExportFile {
  name: string;
  content: string;
  mimeType: string;
}

export interface McpExportResult {
  /** Primary file shown in the preview (the server source) */
  preview: string;
  /** All files in the bundle */
  files: McpExportFile[];
  /** Suggested directory / archive name */
  directoryName: string;
  /** Single-file download: all files concatenated with banners */
  combined: string;
  mimeType: "text/plain";
  filename: string;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function exportToMcp(spec: AgentSpec): McpExportResult {
  const result = generateMcpServer(spec);
  const slug   = spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
  const dir    = `${slug}-mcp`;

  const files: McpExportFile[] = [
    { name: "server.ts",    content: result.serverCode,  mimeType: "text/typescript" },
    { name: "package.json", content: result.packageJson, mimeType: "application/json" },
    { name: "README.md",    content: result.readme,      mimeType: "text/markdown"   },
  ];

  // Combined single-file download
  const banner = (name: string) =>
    `${"=".repeat(72)}\n== FILE: ${name.padEnd(60)}==\n${"=".repeat(72)}\n`;

  const combined =
    `# ContextLayer MCP Bundle — ${spec.name} (v${spec.version})\n` +
    `# Generated: ${new Date().toISOString()}\n` +
    `# Unzip instructions: split on the === banners and save each file\n\n` +
    files.map((f) => `${banner(f.name)}\n${f.content}`).join("\n\n");

  return {
    preview:       result.serverCode,
    files,
    directoryName: dir,
    combined,
    mimeType:      "text/plain",
    filename:      `${dir}-bundle.txt`,
  };
}
