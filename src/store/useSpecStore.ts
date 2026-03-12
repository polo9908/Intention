/**
 * useSpecStore — persistent spec storage
 *
 * Holds every generated spec (ComponentSpec | AgentSpec | AdaptSpec) in a
 * plain-object map (semantically Map<id, SpecResult>) persisted to IndexedDB
 * via idb-keyval. Zustand's persist middleware handles JSON serialisation.
 *
 * Actions
 *   addSpec(prompt, scenario)        — mint a new spec, set as current, return id
 *   updateToken(specId, name, patch) — mutate a DesignToken on a ComponentSpec
 *   updateSlider(specId, key, value) — mutate an AgentSlider value on an AgentSpec
 *   setCurrentSpec(id | null)        — switch active spec
 *
 * Helpers
 *   getSpec(id)   — O(1) lookup
 *   specAsMap()   — returns a real Map<string, SpecResult> snapshot
 */

import { create }                        from 'zustand'
import { persist, createJSONStorage }    from 'zustand/middleware'
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval'
import type {
  Scenario,
  DesignToken,
  ComponentSpec,
  AgentSpec,
  SpecResult,
} from '@/types'

// ── IndexedDB storage adapter (Zustand StateStorage interface) ────────────────

const idbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const val = await idbGet<string>(name)
    return val ?? null
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await idbSet(name, value)
  },
  removeItem: async (name: string): Promise<void> => {
    await idbDel(name)
  },
}

// ── Store interface ───────────────────────────────────────────────────────────

interface SpecStore {
  /**
   * Semantically Map<id, SpecResult>.
   * Stored as a plain Record for JSON-serialisability.
   */
  specs:         Record<string, SpecResult>

  /** ID of the spec currently being viewed / edited. */
  currentSpecId: string | null

  // ── Mutations ──────────────────────────────────────────────────────────────

  /**
   * Create a new spec from a raw Scenario + the originating prompt text.
   * Assigns a unique id, sets it as currentSpecId, and persists to IndexedDB.
   * Returns the new spec id.
   */
  addSpec: (prompt: string, scenario: Scenario) => string

  /**
   * Patch a single DesignToken on a ComponentSpec by token name.
   * No-op if specId doesn't exist or spec is not a ComponentSpec.
   */
  updateToken: (
    specId:    string,
    tokenName: string,
    patch:     Partial<DesignToken>,
  ) => void

  /**
   * Update an AgentSlider value by slider key on an AgentSpec.
   * No-op if specId doesn't exist or spec is not an AgentSpec.
   */
  updateSlider: (
    specId:    string,
    sliderKey: string,
    value:     number,
  ) => void

  /** Set (or clear) the active spec. */
  setCurrentSpec: (id: string | null) => void

  // ── Derived helpers ────────────────────────────────────────────────────────

  /** O(1) lookup — returns undefined if id not found. */
  getSpec: (id: string) => SpecResult | undefined

  /** Snapshot of specs as a proper Map<string, SpecResult>. */
  specAsMap: () => Map<string, SpecResult>

  /** Convenience getter — resolves currentSpecId to the live SpecResult. */
  currentSpec: () => SpecResult | undefined
}

// ── Internal helper — lift Scenario → SpecResult ─────────────────────────────

function scenarioToSpec(
  id:       string,
  prompt:   string,
  scenario: Scenario,
): SpecResult {
  return { ...scenario, id, prompt, createdAt: Date.now() } as SpecResult
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSpecStore = create<SpecStore>()(
  persist(
    (set, get) => ({
      specs:         {},
      currentSpecId: null,

      // ── addSpec ─────────────────────────────────────────────────────────────
      addSpec: (prompt, scenario) => {
        const id   = `spec-${Date.now()}`
        const spec = scenarioToSpec(id, prompt, scenario)
        set((s) => ({
          specs:         { ...s.specs, [id]: spec },
          currentSpecId: id,
        }))
        return id
      },

      // ── updateToken ──────────────────────────────────────────────────────────
      updateToken: (specId, tokenName, patch) => {
        set((s) => {
          const spec = s.specs[specId]
          if (!spec || spec.type !== 'component') return s

          const updated: ComponentSpec = {
            ...spec,
            tokens: spec.tokens.map((t) =>
              t.name === tokenName ? { ...t, ...patch } : t,
            ),
          }
          return { specs: { ...s.specs, [specId]: updated } }
        })
      },

      // ── updateSlider ─────────────────────────────────────────────────────────
      updateSlider: (specId, sliderKey, value) => {
        set((s) => {
          const spec = s.specs[specId]
          if (!spec || spec.type !== 'agent') return s

          const updated: AgentSpec = {
            ...spec,
            sliders: spec.sliders.map((sl) =>
              sl.key === sliderKey ? { ...sl, value } : sl,
            ),
          }
          return { specs: { ...s.specs, [specId]: updated } }
        })
      },

      // ── setCurrentSpec ───────────────────────────────────────────────────────
      setCurrentSpec: (id) => set({ currentSpecId: id }),

      // ── helpers ──────────────────────────────────────────────────────────────
      getSpec:     (id) => get().specs[id],
      specAsMap:   ()   => new Map(Object.entries(get().specs)),
      currentSpec: ()   => {
        const { specs, currentSpecId } = get()
        return currentSpecId ? specs[currentSpecId] : undefined
      },
    }),
    {
      name:    'contextlayer-specs',           // IndexedDB key
      storage: createJSONStorage(() => idbStorage),

      // Only persist data fields; derived helpers are re-created on hydration
      partialize: (s) => ({
        specs:         s.specs,
        currentSpecId: s.currentSpecId,
      }),
    },
  ),
)
