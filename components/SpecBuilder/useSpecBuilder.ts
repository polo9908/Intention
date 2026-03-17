"use client";

/**
 * useSpecBuilder — central state hook for the SpecBuilder UI.
 *
 * Manages the matrix data locally, derives an AgentSpec from it, and
 * syncs the spec to the Zustand specStore with a 300ms debounce.
 */

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { generateId } from "@/lib/utils";
import { useSpecStore } from "@/lib/stores/specStore";
import type { AgentSpec, ClaudeModel } from "@/types/agent";
import type { SpecContext, SpecCriterion, CellMap, SpecBuilderConfig } from "./types";
import {
  buildAgentSpec,
  buildSystemPrompt,
  cellKey,
  computeStats,
  DEFAULT_CONTEXTS,
  DEFAULT_CRITERIA,
  DEFAULT_CONFIG,
} from "./utils";

// ---------------------------------------------------------------------------
// Fixed spec ID for the demo builder session
// ---------------------------------------------------------------------------

const BUILDER_SPEC_ID = "builder-spec-v1";

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSpecBuilderReturn {
  // ── Config ─────────────────────────────────────────────────────────────────
  agentName: string;
  model: ClaudeModel;
  temperature: number;
  maxTokens: number;
  setAgentName: (v: string) => void;
  setModel: (v: ClaudeModel) => void;
  setTemperature: (v: number) => void;
  setMaxTokens: (v: number) => void;

  // ── Matrix data ────────────────────────────────────────────────────────────
  contexts: SpecContext[];
  criteria: SpecCriterion[];
  cells: CellMap;

  // ── Context actions ────────────────────────────────────────────────────────
  addContext: () => void;
  removeContext: (id: string) => void;
  renameContext: (id: string, name: string) => void;
  reorderContexts: (fromIndex: number, toIndex: number) => void;

  // ── Criterion actions ──────────────────────────────────────────────────────
  addCriterion: () => void;
  removeCriterion: (id: string) => void;
  renameCriterion: (id: string, name: string) => void;
  toggleCriterion: (id: string) => void;
  reorderCriteria: (fromIndex: number, toIndex: number) => void;

  // ── Cell actions ───────────────────────────────────────────────────────────
  setCellValue: (contextId: string, criterionId: string, value: string) => void;

  // ── Derived ────────────────────────────────────────────────────────────────
  currentSpec: AgentSpec;
  systemPrompt: string;
  stats: ReturnType<typeof computeStats>;
  isSyncing: boolean;
}

export function useSpecBuilder(): UseSpecBuilderReturn {
  // ── Config state ────────────────────────────────────────────────────────────

  const [agentName, setAgentName] = useState(DEFAULT_CONFIG.agentName);
  const [model, setModel] = useState<ClaudeModel>(DEFAULT_CONFIG.model);
  const [temperature, setTemperature] = useState(DEFAULT_CONFIG.temperature);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_CONFIG.maxTokens);

  // ── Matrix state ────────────────────────────────────────────────────────────

  const [contexts, setContexts] = useState<SpecContext[]>(DEFAULT_CONTEXTS);
  const [criteria, setCriteria] = useState<SpecCriterion[]>(DEFAULT_CRITERIA);
  const [cells, setCells] = useState<CellMap>({});

  // ── Zustand store sync ──────────────────────────────────────────────────────

  const { buildSpec, updateSpec, getSpecById } = useSpecStore();
  const [isSyncing, setIsSyncing] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialisedRef = useRef(false);

  // ── Derived values ──────────────────────────────────────────────────────────

  const config: SpecBuilderConfig = useMemo(
    () => ({ agentName, model, temperature, maxTokens }),
    [agentName, model, temperature, maxTokens]
  );

  const systemPrompt = useMemo(
    () => buildSystemPrompt(config, contexts, criteria, cells),
    [config, contexts, criteria, cells]
  );

  const existingSpec = useMemo(
    () => getSpecById(BUILDER_SPEC_ID),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const currentSpec: AgentSpec = useMemo(
    () => buildAgentSpec(BUILDER_SPEC_ID, config, contexts, criteria, cells, existingSpec),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentName, model, temperature, maxTokens, contexts, criteria, cells]
  );

  const stats = useMemo(
    () => computeStats(contexts, criteria, cells),
    [contexts, criteria, cells]
  );

  // ── Sync to Zustand (debounced) ─────────────────────────────────────────────

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setIsSyncing(true);

    debounceRef.current = setTimeout(() => {
      if (!isInitialisedRef.current) {
        buildSpec(currentSpec.agentId, currentSpec.name, {
          description: currentSpec.description,
          model: currentSpec.model,
          systemPrompt: currentSpec.systemPrompt,
          maxTokens: currentSpec.maxTokens,
          temperature: currentSpec.temperature,
          capabilities: currentSpec.capabilities,
          metadata: currentSpec.metadata,
        });
        isInitialisedRef.current = true;
      } else {
        updateSpec(BUILDER_SPEC_ID, {
          name: currentSpec.name,
          model: currentSpec.model,
          systemPrompt: currentSpec.systemPrompt,
          maxTokens: currentSpec.maxTokens,
          temperature: currentSpec.temperature,
          metadata: currentSpec.metadata,
        });
      }
      setIsSyncing(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSpec.systemPrompt, agentName, model, temperature, maxTokens]);

  // ── Context actions ──────────────────────────────────────────────────────────

  const addContext = useCallback(() => {
    const maxOrder = Math.max(-1, ...contexts.map((c) => c.order));
    setContexts((prev) => [
      ...prev,
      { id: generateId("ctx"), name: "New Context", order: maxOrder + 1 },
    ]);
  }, [contexts]);

  const removeContext = useCallback((id: string) => {
    setContexts((prev) => prev.filter((c) => c.id !== id));
    setCells((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.startsWith(`${id}::`)) delete next[k];
      });
      return next;
    });
  }, []);

  const renameContext = useCallback((id: string, name: string) => {
    setContexts((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const reorderContexts = useCallback((fromIndex: number, toIndex: number) => {
    setContexts((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((c, i) => ({ ...c, order: i }));
    });
  }, []);

  // ── Criterion actions ────────────────────────────────────────────────────────

  const addCriterion = useCallback(() => {
    const maxOrder = Math.max(-1, ...criteria.map((c) => c.order));
    setCriteria((prev) => [
      ...prev,
      { id: generateId("crit"), name: "New Criterion", enabled: true, order: maxOrder + 1 },
    ]);
  }, [criteria]);

  const removeCriterion = useCallback((id: string) => {
    setCriteria((prev) => prev.filter((c) => c.id !== id));
    setCells((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => {
        if (k.endsWith(`::${id}`)) delete next[k];
      });
      return next;
    });
  }, []);

  const renameCriterion = useCallback((id: string, name: string) => {
    setCriteria((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)));
  }, []);

  const toggleCriterion = useCallback((id: string) => {
    setCriteria((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  }, []);

  const reorderCriteria = useCallback((fromIndex: number, toIndex: number) => {
    setCriteria((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return sorted.map((c, i) => ({ ...c, order: i }));
    });
  }, []);

  // ── Cell actions ─────────────────────────────────────────────────────────────

  const setCellValue = useCallback(
    (contextId: string, criterionId: string, value: string) => {
      setCells((prev) => ({ ...prev, [cellKey(contextId, criterionId)]: value }));
    },
    []
  );

  return {
    agentName, setAgentName,
    model, setModel,
    temperature, setTemperature,
    maxTokens, setMaxTokens,
    contexts,
    criteria,
    cells,
    addContext,
    removeContext,
    renameContext,
    reorderContexts,
    addCriterion,
    removeCriterion,
    renameCriterion,
    toggleCriterion,
    reorderCriteria,
    setCellValue,
    currentSpec,
    systemPrompt,
    stats,
    isSyncing,
  };
}
