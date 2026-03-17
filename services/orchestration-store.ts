import { create } from "zustand";
import { generateId } from "@/lib/utils";
import type { OrchestrationRun, AgentMessage, Status } from "@/types/agent";

interface OrchestrationState {
  runs: OrchestrationRun[];
  activeRunId: string | null;

  // Actions
  createRun: (name: string, agentIds: string[]) => OrchestrationRun;
  setRunStatus: (runId: string, status: Status) => void;
  appendMessage: (runId: string, message: Omit<AgentMessage, "id" | "createdAt">) => void;
  setActiveRun: (runId: string | null) => void;
  clearRuns: () => void;
}

export const useOrchestrationStore = create<OrchestrationState>()((set) => ({
  runs: [],
  activeRunId: null,

  createRun: (name, agentIds) => {
    const run: OrchestrationRun = {
      id: generateId("run"),
      name,
      status: "idle",
      agentIds,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ runs: [...state.runs, run] }));
    return run;
  },

  setRunStatus: (runId, status) => {
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === runId
          ? {
              ...r,
              status,
              startedAt:
                status === "running" ? new Date().toISOString() : r.startedAt,
              completedAt:
                status === "completed" || status === "error"
                  ? new Date().toISOString()
                  : r.completedAt,
            }
          : r
      ),
    }));
  },

  appendMessage: (runId, message) => {
    const fullMessage: AgentMessage = {
      id: generateId("msg"),
      ...message,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({
      runs: state.runs.map((r) =>
        r.id === runId
          ? { ...r, messages: [...r.messages, fullMessage] }
          : r
      ),
    }));
  },

  setActiveRun: (runId) => set({ activeRunId: runId }),

  clearRuns: () => set({ runs: [], activeRunId: null }),
}));
