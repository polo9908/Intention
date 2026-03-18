/**
 * lib/stores/specStore.ts
 *
 * State
 * ─────
 *   specs          – all AgentSpec records
 *   selectedSpecId – currently focused spec
 *   specHistory    – SpecVersion records for the selected spec
 *
 * Versioning model
 * ─────────────────
 *   Every `updateSpec` call snapshots the current state into specVersions
 *   before applying the patch. `rollbackSpec` replaces the live spec with
 *   the snapshot and saves a new version marking the rollback.
 *
 * Persistence
 * ─────────────
 *   Same fire-and-forget IDB strategy as the other stores.
 *   Call `hydrateSpecs()` once on app boot.
 */

import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { dbGetAll, dbGetByIndex, dbPut, dbDelete } from "@/lib/db";
import type { AgentSpec, SpecVersion } from "@/types/agent";

// ---------------------------------------------------------------------------
// State & actions interface
// ---------------------------------------------------------------------------

interface SpecState {
  specs: AgentSpec[];
  selectedSpecId: string | null;
  /** Full version history for the currently selected spec */
  specHistory: SpecVersion[];
  isHydrated: boolean;

  // ── Reads ──────────────────────────────────────────────────────────────────
  getSelectedSpec: () => AgentSpec | undefined;
  getSpecById: (id: string) => AgentSpec | undefined;
  getSpecHistory: (specId: string) => Promise<SpecVersion[]>;

  // ── Mutations ──────────────────────────────────────────────────────────────
  createSpec: (spec: AgentSpec) => void;
  /** Convenience factory — auto-generates id, version, timestamps */
  buildSpec: (agentId: string, name: string, partial: Omit<AgentSpec, "id" | "agentId" | "name" | "version" | "createdAt" | "updatedAt">) => AgentSpec;
  updateSpec: (id: string, patch: Partial<AgentSpec>, changeMessage?: string) => void;
  deleteSpec: (id: string) => void;
  selectSpec: (id: string | null) => void;

  // ── Versioning ─────────────────────────────────────────────────────────────
  rollbackSpec: (specId: string, versionId: string) => Promise<void>;
  loadSpecHistory: (specId: string) => Promise<void>;

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrateSpecs: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Internal helper — snapshot before a mutation
// ---------------------------------------------------------------------------

async function snapshotSpec(
  spec: AgentSpec,
  changeMessage?: string
): Promise<SpecVersion> {
  const version: SpecVersion = {
    id: generateId("ver"),
    specId: spec.id,
    version: spec.version,
    snapshot: { ...spec },
    changeMessage,
    createdAt: new Date().toISOString(),
  };
  await dbPut("specVersions", version);
  return version;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useSpecStore = create<SpecState>()((set, get) => ({
  specs: [],
  selectedSpecId: null,
  specHistory: [],
  isHydrated: false,

  // ── Reads ──────────────────────────────────────────────────────────────────

  getSelectedSpec: () => {
    const { specs, selectedSpecId } = get();
    return specs.find((s) => s.id === selectedSpecId);
  },

  getSpecById: (id) => get().specs.find((s) => s.id === id),

  getSpecHistory: async (specId: string): Promise<SpecVersion[]> => {
    const versions = await dbGetByIndex("specVersions", "by-specId", specId);
    // Sort descending so newest version is first
    return versions.sort((a, b) => b.version - a.version);
  },

  // ── Mutations ──────────────────────────────────────────────────────────────

  createSpec: (spec) => {
    set((s) => ({ specs: [...s.specs, spec] }));
    void dbPut("specs", spec);
  },

  buildSpec: (agentId, name, partial) => {
    const now = new Date().toISOString();
    const spec: AgentSpec = {
      id: generateId("spec"),
      agentId,
      name,
      version: 1,
      description: partial.description ?? "",
      model: partial.model,
      systemPrompt: partial.systemPrompt,
      maxTokens: partial.maxTokens ?? 8192,
      temperature: partial.temperature ?? 0.7,
      capabilities: partial.capabilities ?? [],
      metadata: partial.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ specs: [...s.specs, spec] }));
    void dbPut("specs", spec);
    return spec;
  },

  updateSpec: (id, patch, changeMessage) => {
    const existing = get().specs.find((s) => s.id === id);
    if (!existing) return;

    // Snapshot the current state before overwriting (fire-and-forget)
    void snapshotSpec(existing, changeMessage);

    const updated: AgentSpec = {
      ...existing,
      ...patch,
      version: existing.version + 1,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      specs: s.specs.map((sp) => (sp.id === id ? updated : sp)),
      // Keep specHistory in sync if this spec is selected
      specHistory:
        s.selectedSpecId === id
          ? [
              {
                id: generateId("ver"),
                specId: id,
                version: existing.version,
                snapshot: existing,
                changeMessage,
                createdAt: new Date().toISOString(),
              },
              ...s.specHistory,
            ]
          : s.specHistory,
    }));
    void dbPut("specs", updated);
  },

  deleteSpec: (id) => {
    set((s) => ({
      specs: s.specs.filter((sp) => sp.id !== id),
      selectedSpecId: s.selectedSpecId === id ? null : s.selectedSpecId,
      specHistory: s.selectedSpecId === id ? [] : s.specHistory,
    }));
    void dbDelete("specs", id);
    // Orphaned specVersions are cleaned up lazily — omitting here to keep
    // action synchronous and avoid a scan of the versions store.
  },

  selectSpec: (id) => {
    const exists = id === null || get().specs.some((s) => s.id === id);
    if (!exists) return;
    set({ selectedSpecId: id, specHistory: [] });
    if (id) void get().loadSpecHistory(id);
  },

  // ── Versioning ─────────────────────────────────────────────────────────────

  rollbackSpec: async (specId, versionId) => {
    const versions = await dbGetByIndex("specVersions", "by-specId", specId);
    const target = versions.find((v) => v.id === versionId);
    if (!target) {
      console.warn(`[specStore] Version ${versionId} not found for spec ${specId}`);
      return;
    }

    const current = get().specs.find((s) => s.id === specId);
    if (current) {
      // Snapshot the pre-rollback state
      await snapshotSpec(current, `Before rollback to v${target.version}`);
    }

    const rolled: AgentSpec = {
      ...target.snapshot,
      // Bump version so the timeline stays monotonic
      version: (current?.version ?? target.version) + 1,
      updatedAt: new Date().toISOString(),
    };

    set((s) => ({
      specs: s.specs.map((sp) => (sp.id === specId ? rolled : sp)),
    }));
    void dbPut("specs", rolled);

    // Reload history for the selected spec
    if (get().selectedSpecId === specId) {
      await get().loadSpecHistory(specId);
    }
  },

  loadSpecHistory: async (specId) => {
    const versions = await dbGetByIndex("specVersions", "by-specId", specId);
    const sorted = versions.sort((a, b) => b.version - a.version);
    set({ specHistory: sorted });
  },

  // ── Hydration ──────────────────────────────────────────────────────────────

  hydrateSpecs: async () => {
    const specs = await dbGetAll("specs");
    set({ specs, isHydrated: true });
  },
}));
