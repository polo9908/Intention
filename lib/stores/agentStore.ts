/**
 * lib/stores/agentStore.ts
 *
 * State
 * ─────
 *   agents           – all loaded agents (in-memory)
 *   selectedAgentId  – currently focused agent
 *   currentNetwork   – subset of agents active in the selected network
 *
 * Persistence strategy
 * ─────────────────────
 *   Every mutating action fires an async IDB write in the background.
 *   On app boot call `hydrateAgents()` once to restore state from IDB.
 *   This keeps all actions synchronous (no await in UI code) while still
 *   surviving page reloads and working fully offline.
 */

import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { dbGetAll, dbPut, dbDelete } from "@/lib/db";
import type { Agent, AgentConfig } from "@/types/agent";

// ---------------------------------------------------------------------------
// State & actions interface
// ---------------------------------------------------------------------------

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;
  currentNetwork: Agent[];
  /** True while the initial IDB hydration is in progress */
  isHydrated: boolean;

  // ── Reads ──────────────────────────────────────────────────────────────────
  getSelectedAgent: () => Agent | undefined;
  getAgentById: (id: string) => Agent | undefined;

  // ── Mutations ──────────────────────────────────────────────────────────────
  addAgent: (agent: Agent) => void;
  /** Convenience factory — generates id + timestamps automatically */
  createAgent: (
    name: string,
    description: string,
    config: AgentConfig
  ) => Agent;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  deleteAgent: (id: string) => void;
  selectAgent: (id: string | null) => void;

  // ── Network helpers ────────────────────────────────────────────────────────
  setCurrentNetwork: (agentIds: string[]) => void;

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrateAgents: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAgentStore = create<AgentState>()((set, get) => ({
  agents: [],
  selectedAgentId: null,
  currentNetwork: [],
  isHydrated: false,

  // ── Reads ──────────────────────────────────────────────────────────────────

  getSelectedAgent: () => {
    const { agents, selectedAgentId } = get();
    return agents.find((a) => a.id === selectedAgentId);
  },

  getAgentById: (id) => get().agents.find((a) => a.id === id),

  // ── Mutations ──────────────────────────────────────────────────────────────

  addAgent: (agent) => {
    set((s) => ({ agents: [...s.agents, agent] }));
    void dbPut("agents", agent);
  },

  createAgent: (name, description, config) => {
    const now = new Date().toISOString();
    const agent: Agent = {
      id: generateId("agent"),
      name,
      description,
      role: "worker",
      status: "idle",
      config,
      metadata: {},
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ agents: [...s.agents, agent] }));
    void dbPut("agents", agent);
    return agent;
  },

  updateAgent: (id, patch) => {
    let updated: Agent | undefined;
    set((s) => ({
      agents: s.agents.map((a) => {
        if (a.id !== id) return a;
        updated = { ...a, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
      // Keep currentNetwork in sync
      currentNetwork: s.currentNetwork.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: new Date().toISOString() } : a
      ),
    }));
    if (updated) void dbPut("agents", updated);
  },

  deleteAgent: (id) => {
    set((s) => ({
      agents: s.agents.filter((a) => a.id !== id),
      currentNetwork: s.currentNetwork.filter((a) => a.id !== id),
      selectedAgentId: s.selectedAgentId === id ? null : s.selectedAgentId,
    }));
    void dbDelete("agents", id);
  },

  selectAgent: (id) => {
    const exists = id === null || get().agents.some((a) => a.id === id);
    if (!exists) return;
    set({ selectedAgentId: id });
  },

  // ── Network helpers ────────────────────────────────────────────────────────

  setCurrentNetwork: (agentIds) => {
    const lookup = new Map(get().agents.map((a) => [a.id, a]));
    const network = agentIds.flatMap((id) => {
      const a = lookup.get(id);
      return a ? [a] : [];
    });
    set({ currentNetwork: network });
  },

  // ── Hydration ──────────────────────────────────────────────────────────────

  hydrateAgents: async () => {
    const agents = await dbGetAll("agents");
    set({ agents, isHydrated: true });
  },
}));
