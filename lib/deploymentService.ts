/**
 * deploymentService.ts — Track when and where agent specs have been deployed.
 *
 * Phase 1 (this file): all state is stored in localStorage under
 *   `cl:deployments`.  The API is designed so Phase 2 can swap the
 *   localStorage calls for Supabase inserts/selects with no UI changes.
 *
 * Concepts
 * ──────────
 *   DeploymentRecord   – one deployment event (a point in time)
 *   DeploymentTarget   – where the spec was deployed (mcp | api | custom)
 *   LiveDeployment     – which record is currently "live" for a spec
 *   DeploymentDiff     – what changed between live and local spec
 */

import type { AgentSpec } from "@/types";
import { generateId }     from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DeploymentTarget = "mcp" | "api" | "custom";
export type DeploymentStatus = "pending" | "success" | "failed" | "rolled_back";

export interface DeploymentRecord {
  id: string;
  specId: string;
  agentId: string;
  specName: string;
  /** The version of the spec that was deployed */
  specVersion: number;
  target: DeploymentTarget;
  status: DeploymentStatus;
  deployedAt: string;
  /** SHA-like fingerprint of the spec content at deploy time */
  contentHash: string;
  /** Optional user-facing label */
  label?: string;
  /** Error message if status === "failed" */
  error?: string;
  /** The full spec snapshot frozen at deploy time */
  snapshot: AgentSpec;
}

export interface LiveDeployment {
  specId: string;
  /** The most recent successful deployment record */
  record: DeploymentRecord | null;
}

export type DiffField =
  | "model"
  | "systemPrompt"
  | "maxTokens"
  | "temperature"
  | "capabilities"
  | "description";

export interface SpecDiff {
  field: DiffField;
  liveValue: unknown;
  localValue: unknown;
  /** Human-readable summary of the change */
  summary: string;
}

export interface DeploymentDiff {
  isInSync: boolean;
  liveVersion: number | null;
  localVersion: number;
  changes: SpecDiff[];
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = "cl:deployments";

function loadRecords(): DeploymentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as DeploymentRecord[];
  } catch {
    return [];
  }
}

function saveRecords(records: DeploymentRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---------------------------------------------------------------------------
// Content hash (simple, non-cryptographic)
// ---------------------------------------------------------------------------

function hashSpec(spec: AgentSpec): string {
  const content = [
    spec.model, spec.systemPrompt, spec.maxTokens,
    spec.temperature, spec.capabilities.sort().join(","),
    spec.description,
  ].join("|");

  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const chr = content.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // 32-bit
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Public API — Deployments
// ---------------------------------------------------------------------------

/**
 * Record a new deployment.  Returns the created record.
 * Pass `status: "pending"` to track in-flight deploys,
 * then call `updateDeploymentStatus` when done.
 */
export function recordDeployment(
  spec: AgentSpec,
  target: DeploymentTarget,
  options: {
    status?: DeploymentStatus;
    label?: string;
    error?: string;
  } = {},
): DeploymentRecord {
  const record: DeploymentRecord = {
    id:           generateId("dep"),
    specId:       spec.id,
    agentId:      spec.agentId,
    specName:     spec.name,
    specVersion:  spec.version,
    target,
    status:       options.status  ?? "success",
    deployedAt:   new Date().toISOString(),
    contentHash:  hashSpec(spec),
    label:        options.label,
    error:        options.error,
    snapshot:     { ...spec },
  };

  const existing = loadRecords();
  saveRecords([record, ...existing]); // newest first
  return record;
}

/** Update the status of an existing deployment record (e.g., pending → success). */
export function updateDeploymentStatus(
  deploymentId: string,
  status: DeploymentStatus,
  error?: string,
): void {
  const records = loadRecords().map((r) =>
    r.id === deploymentId ? { ...r, status, error } : r,
  );
  saveRecords(records);
}

// ---------------------------------------------------------------------------
// Public API — Queries
// ---------------------------------------------------------------------------

/** Return all deployment records for a spec, newest first. */
export function getDeploymentHistory(specId: string): DeploymentRecord[] {
  return loadRecords().filter((r) => r.specId === specId);
}

/** Return the most recent successful deployment for a spec (null if never deployed). */
export function getLiveDeployment(specId: string): LiveDeployment {
  const history = getDeploymentHistory(specId);
  const live    = history.find((r) => r.status === "success") ?? null;
  return { specId, record: live };
}

/** Return deployment records for all specs, grouped by specId. */
export function getAllLiveDeployments(): Map<string, DeploymentRecord> {
  const records = loadRecords();
  const liveMap = new Map<string, DeploymentRecord>();

  for (const r of records) {
    if (r.status === "success" && !liveMap.has(r.specId)) {
      liveMap.set(r.specId, r);
    }
  }

  return liveMap;
}

// ---------------------------------------------------------------------------
// Public API — Diff
// ---------------------------------------------------------------------------

/** Compare the live (deployed) spec against the current local spec. */
export function diffSpecWithLive(localSpec: AgentSpec): DeploymentDiff {
  const { record: live } = getLiveDeployment(localSpec.id);

  if (!live) {
    return {
      isInSync:    false,
      liveVersion: null,
      localVersion: localSpec.version,
      changes: [],
    };
  }

  const liveSnap = live.snapshot;
  const changes: SpecDiff[] = [];

  const check = (
    field: DiffField,
    liveVal: unknown,
    localVal: unknown,
    summarize: (l: unknown, r: unknown) => string,
  ) => {
    const liveStr  = JSON.stringify(liveVal);
    const localStr = JSON.stringify(localVal);
    if (liveStr !== localStr) {
      changes.push({ field, liveValue: liveVal, localValue: localVal, summary: summarize(liveVal, localVal) });
    }
  };

  check("model",        liveSnap.model,        localSpec.model,
    (l, r) => `Model changed from ${l} → ${r}`);

  check("systemPrompt", liveSnap.systemPrompt,  localSpec.systemPrompt,
    () => "System prompt has been modified");

  check("maxTokens",    liveSnap.maxTokens,     localSpec.maxTokens,
    (l, r) => `Max tokens: ${l} → ${r}`);

  check("temperature",  liveSnap.temperature,   localSpec.temperature,
    (l, r) => `Temperature: ${l} → ${r}`);

  check("capabilities", liveSnap.capabilities,  localSpec.capabilities,
    () => "Capabilities list has changed");

  check("description",  liveSnap.description,   localSpec.description,
    () => "Description has been updated");

  return {
    isInSync:     changes.length === 0,
    liveVersion:  live.specVersion,
    localVersion: localSpec.version,
    changes,
  };
}

// ---------------------------------------------------------------------------
// Public API — Rollback
// ---------------------------------------------------------------------------

/**
 * Mark a previous deployment as rolled-back and record the rollback event.
 * Returns the rollback DeploymentRecord for audit purposes.
 */
export function rollbackToDeployment(
  targetRecord: DeploymentRecord,
): DeploymentRecord {
  // Mark the most recent live deployment as rolled_back
  const allRecords = loadRecords();
  const liveRecord = allRecords.find(
    (r) => r.specId === targetRecord.specId && r.status === "success",
  );

  let updated = allRecords;
  if (liveRecord) {
    updated = allRecords.map((r) =>
      r.id === liveRecord.id ? { ...r, status: "rolled_back" as DeploymentStatus } : r,
    );
  }

  // Record the rollback event
  const rollbackRecord: DeploymentRecord = {
    ...targetRecord,
    id:         generateId("dep"),
    status:     "success",
    deployedAt: new Date().toISOString(),
    label:      `Rollback to v${targetRecord.specVersion}`,
  };

  saveRecords([rollbackRecord, ...updated]);
  return rollbackRecord;
}
