import type { ClaudeModel } from "@/types/agent";

// ---------------------------------------------------------------------------
// Core matrix data model
// ---------------------------------------------------------------------------

/** A row in the matrix — represents one scenario/situation the agent handles */
export interface SpecContext {
  id: string;
  name: string;
  order: number;
}

/** A column in the matrix — one behavioral dimension to specify */
export interface SpecCriterion {
  id: string;
  name: string;
  /** When false the column is hidden but data is preserved */
  enabled: boolean;
  order: number;
}

/** Flat map of cell values: key = `${contextId}::${criterionId}` */
export type CellMap = Record<string, string>;

// ---------------------------------------------------------------------------
// Top-level config (agent metadata + model settings)
// ---------------------------------------------------------------------------

export interface SpecBuilderConfig {
  agentName: string;
  model: ClaudeModel;
  temperature: number;
  maxTokens: number;
}

// ---------------------------------------------------------------------------
// Derived statistics shown in the sidebar footer
// ---------------------------------------------------------------------------

export interface SpecBuilderStats {
  totalCells: number;
  filledCells: number;
  completeness: number; // 0-100
  activeCriteriaCount: number;
  contextCount: number;
}

// ---------------------------------------------------------------------------
// Editing cursor for the matrix
// ---------------------------------------------------------------------------

export interface CellAddress {
  contextId: string;
  criterionId: string;
}
