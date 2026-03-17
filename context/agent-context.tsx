"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { useAgentStore } from "@/services/agent-store";
import type { Agent, AgentConfig } from "@/types/agent";

interface AgentContextValue {
  agents: Agent[];
  selectedAgent: Agent | null;
  selectAgent: (id: string | null) => void;
  createAgent: (
    name: string,
    description: string,
    config: AgentConfig
  ) => Agent;
  removeAgent: (id: string) => void;
  updateAgent: (id: string, updates: Partial<Agent>) => void;
}

const AgentContext = createContext<AgentContextValue | null>(null);

export function AgentProvider({ children }: { children: ReactNode }) {
  const {
    agents,
    selectedAgentId,
    setSelectedAgentId,
    addAgent,
    removeAgent,
    updateAgent,
  } = useAgentStore();

  const selectedAgent =
    agents.find((a) => a.id === selectedAgentId) ?? null;

  const selectAgent = useCallback(
    (id: string | null) => setSelectedAgentId(id),
    [setSelectedAgentId]
  );

  const createAgent = useCallback(
    (name: string, description: string, config: AgentConfig): Agent => {
      return addAgent(name, description, config);
    },
    [addAgent]
  );

  return (
    <AgentContext.Provider
      value={{
        agents,
        selectedAgent,
        selectAgent,
        createAgent,
        removeAgent,
        updateAgent,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgents(): AgentContextValue {
  const ctx = useContext(AgentContext);
  if (!ctx) {
    throw new Error("useAgents must be used within <AgentProvider>");
  }
  return ctx;
}
