import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateId } from "@/lib/utils";
import type { Agent, AgentConfig } from "@/types/agent";

interface AgentState {
  agents: Agent[];
  selectedAgentId: string | null;

  // Actions
  addAgent: (
    name: string,
    description: string,
    config: AgentConfig
  ) => Agent;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
  setSelectedAgentId: (id: string | null) => void;
  clearAgents: () => void;
}

export const useAgentStore = create<AgentState>()(
  persist(
    (set, get) => ({
      agents: [],
      selectedAgentId: null,

      addAgent: (name, description, config) => {
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
        set((state) => ({ agents: [...state.agents, agent] }));
        return agent;
      },

      removeAgent: (id) => {
        set((state) => ({
          agents: state.agents.filter((a) => a.id !== id),
          selectedAgentId:
            state.selectedAgentId === id ? null : state.selectedAgentId,
        }));
      },

      updateAgent: (id, updates) => {
        set((state) => ({
          agents: state.agents.map((a) =>
            a.id === id
              ? { ...a, ...updates, updatedAt: new Date().toISOString() }
              : a
          ),
        }));
      },

      setSelectedAgentId: (id) => {
        const agent = get().agents.find((a) => a.id === id);
        if (id !== null && !agent) return;
        set({ selectedAgentId: id });
      },

      clearAgents: () => set({ agents: [], selectedAgentId: null }),
    }),
    {
      name: "contextlayer-agents",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
