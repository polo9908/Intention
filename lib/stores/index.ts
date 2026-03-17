/**
 * lib/stores/index.ts
 *
 * Central export and boot-time hydration.
 *
 * Usage in the root layout (client component):
 *
 *   import { initializeStores } from '@/lib/stores';
 *   useEffect(() => { void initializeStores(); }, []);
 */

export { useAgentStore } from "./agentStore";
export { useNetworkStore } from "./networkStore";
export { useSpecStore } from "./specStore";

import { useAgentStore } from "./agentStore";
import { useNetworkStore } from "./networkStore";
import { useSpecStore } from "./specStore";

let _initialized = false;

/**
 * Hydrate all Zustand stores from IndexedDB.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Must be called in a browser context (not during SSR).
 */
export async function initializeStores(): Promise<void> {
  if (_initialized || typeof window === "undefined") return;
  _initialized = true;

  await Promise.all([
    useAgentStore.getState().hydrateAgents(),
    useNetworkStore.getState().hydrateNetworks(),
    useSpecStore.getState().hydrateSpecs(),
  ]);
}

/**
 * Reset the initialization flag (useful in tests or after a full reset).
 */
export function resetStoreInitialization(): void {
  _initialized = false;
}
