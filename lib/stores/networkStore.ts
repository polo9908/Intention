/**
 * lib/stores/networkStore.ts
 *
 * State
 * ─────
 *   networks            – all known networks
 *   selectedNetworkId   – currently active network
 *   networkConnections  – connections for the selected network
 *
 * Persistence
 * ─────────────
 *   Same fire-and-forget IDB strategy as agentStore.
 *   Call `hydrateNetworks()` once on app boot.
 */

import { create } from "zustand";
import { generateId } from "@/lib/utils";
import { dbGetAll, dbGetByIndex, dbPut, dbDelete } from "@/lib/db";
import type { Network, Connection, ConnectionType } from "@/types/network";

// ---------------------------------------------------------------------------
// State & actions interface
// ---------------------------------------------------------------------------

interface NetworkState {
  networks: Network[];
  selectedNetworkId: string | null;
  /** Connections belonging to the currently selected network */
  networkConnections: Connection[];
  isHydrated: boolean;

  // ── Reads ──────────────────────────────────────────────────────────────────
  getSelectedNetwork: () => Network | undefined;
  getNetworkById: (id: string) => Network | undefined;

  // ── Network mutations ──────────────────────────────────────────────────────
  createNetwork: (network: Network) => void;
  /** Convenience factory */
  buildNetwork: (
    name: string,
    description: string,
    agentIds?: string[]
  ) => Network;
  updateNetwork: (id: string, patch: Partial<Network>) => void;
  deleteNetwork: (id: string) => void;
  selectNetwork: (id: string | null) => void;

  // ── Connection mutations ───────────────────────────────────────────────────
  addConnectionToNetwork: (connection: Connection) => void;
  /** Convenience factory */
  buildConnection: (
    networkId: string,
    sourceAgentId: string,
    targetAgentId: string,
    type?: ConnectionType,
    label?: string
  ) => Connection;
  updateConnection: (id: string, patch: Partial<Connection>) => void;
  removeConnectionFromNetwork: (id: string) => void;

  // ── Hydration ──────────────────────────────────────────────────────────────
  hydrateNetworks: () => Promise<void>;
  /** Load connections for a specific network into networkConnections */
  loadConnectionsForNetwork: (networkId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useNetworkStore = create<NetworkState>()((set, get) => ({
  networks: [],
  selectedNetworkId: null,
  networkConnections: [],
  isHydrated: false,

  // ── Reads ──────────────────────────────────────────────────────────────────

  getSelectedNetwork: () => {
    const { networks, selectedNetworkId } = get();
    return networks.find((n) => n.id === selectedNetworkId);
  },

  getNetworkById: (id) => get().networks.find((n) => n.id === id),

  // ── Network mutations ──────────────────────────────────────────────────────

  createNetwork: (network) => {
    set((s) => ({ networks: [...s.networks, network] }));
    void dbPut("networks", network);
  },

  buildNetwork: (name, description, agentIds = []) => {
    const now = new Date().toISOString();
    const network: Network = {
      id: generateId("net"),
      name,
      description,
      status: "draft",
      agentIds,
      connectionIds: [],
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
    set((s) => ({ networks: [...s.networks, network] }));
    void dbPut("networks", network);
    return network;
  },

  updateNetwork: (id, patch) => {
    let updated: Network | undefined;
    set((s) => ({
      networks: s.networks.map((n) => {
        if (n.id !== id) return n;
        updated = { ...n, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      }),
    }));
    if (updated) void dbPut("networks", updated);
  },

  deleteNetwork: (id) => {
    set((s) => ({
      networks: s.networks.filter((n) => n.id !== id),
      selectedNetworkId:
        s.selectedNetworkId === id ? null : s.selectedNetworkId,
      networkConnections:
        s.selectedNetworkId === id ? [] : s.networkConnections,
    }));
    void dbDelete("networks", id);
    // Orphaned connections are cleaned up lazily on next hydration
  },

  selectNetwork: (id) => {
    const exists = id === null || get().networks.some((n) => n.id === id);
    if (!exists) return;
    set({ selectedNetworkId: id, networkConnections: [] });
    if (id) void get().loadConnectionsForNetwork(id);
  },

  // ── Connection mutations ───────────────────────────────────────────────────

  addConnectionToNetwork: (connection) => {
    // Update the network's connectionIds list
    const { networks } = get();
    const network = networks.find((n) => n.id === connection.networkId);
    if (network && !network.connectionIds.includes(connection.id)) {
      const updated: Network = {
        ...network,
        connectionIds: [...network.connectionIds, connection.id],
        updatedAt: new Date().toISOString(),
      };
      set((s) => ({
        networks: s.networks.map((n) => (n.id === updated.id ? updated : n)),
        networkConnections:
          s.selectedNetworkId === connection.networkId
            ? [...s.networkConnections, connection]
            : s.networkConnections,
      }));
      void dbPut("networks", updated);
    } else {
      set((s) => ({
        networkConnections:
          s.selectedNetworkId === connection.networkId
            ? [...s.networkConnections, connection]
            : s.networkConnections,
      }));
    }
    void dbPut("connections", connection);
  },

  buildConnection: (networkId, sourceAgentId, targetAgentId, type = "sequential", label) => {
    const connection: Connection = {
      id: generateId("conn"),
      networkId,
      sourceAgentId,
      targetAgentId,
      type,
      label,
      createdAt: new Date().toISOString(),
    };
    get().addConnectionToNetwork(connection);
    return connection;
  },

  updateConnection: (id, patch) => {
    let updated: Connection | undefined;
    set((s) => ({
      networkConnections: s.networkConnections.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, ...patch };
        return updated;
      }),
    }));
    if (updated) void dbPut("connections", updated);
  },

  removeConnectionFromNetwork: (id) => {
    const connection = get().networkConnections.find((c) => c.id === id);
    set((s) => ({
      networkConnections: s.networkConnections.filter((c) => c.id !== id),
      networks: s.networks.map((n) =>
        n.id === connection?.networkId
          ? {
              ...n,
              connectionIds: n.connectionIds.filter((cid) => cid !== id),
              updatedAt: new Date().toISOString(),
            }
          : n
      ),
    }));
    void dbDelete("connections", id);
    // Persist updated network too
    const updated = get().networks.find((n) => n.id === connection?.networkId);
    if (updated) void dbPut("networks", updated);
  },

  // ── Hydration ──────────────────────────────────────────────────────────────

  hydrateNetworks: async () => {
    const networks = await dbGetAll("networks");
    set({ networks, isHydrated: true });
  },

  loadConnectionsForNetwork: async (networkId) => {
    const connections = await dbGetByIndex("connections", "by-networkId", networkId);
    set({ networkConnections: connections });
  },
}));
