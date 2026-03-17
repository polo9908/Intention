/**
 * lib/db.ts
 *
 * IndexedDB initialisation via `idb`.
 *
 * Schema
 * ──────
 *   agents        – Agent records, indexed by status & createdAt
 *   networks      – Network records, indexed by status
 *   connections   – Connection records, indexed by networkId
 *   specs         – AgentSpec records, indexed by agentId
 *   specVersions  – SpecVersion records, indexed by specId
 *
 * Usage
 * ──────
 *   const db = await getDB();
 *   await db.put('agents', agent);
 *   const all = await db.getAll('agents');
 *
 * The three Zustand stores import helpers from this file to
 * persist / hydrate their state.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { Agent, AgentSpec, SpecVersion } from "@/types/agent";
import type { Network, Connection } from "@/types/network";

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

export interface ContextLayerDBSchema {
  agents: {
    key: string;
    value: Agent;
    indexes: {
      "by-status": string;
      "by-createdAt": string;
    };
  };
  networks: {
    key: string;
    value: Network;
    indexes: {
      "by-status": string;
      "by-createdAt": string;
    };
  };
  connections: {
    key: string;
    value: Connection;
    indexes: {
      "by-networkId": string;
    };
  };
  specs: {
    key: string;
    value: AgentSpec;
    indexes: {
      "by-agentId": string;
      "by-createdAt": string;
    };
  };
  specVersions: {
    key: string;
    value: SpecVersion;
    indexes: {
      "by-specId": string;
    };
  };
}

export type ContextLayerDB = IDBPDatabase<ContextLayerDBSchema>;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const DB_NAME = "contextlayer";
const DB_VERSION = 1;

let _dbPromise: Promise<ContextLayerDB> | null = null;

export function getDB(): Promise<ContextLayerDB> {
  // Only open in browser environments
  if (typeof window === "undefined") {
    return Promise.reject(new Error("[DB] IndexedDB is not available server-side"));
  }

  if (!_dbPromise) {
    _dbPromise = openDB<ContextLayerDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // agents
        if (!db.objectStoreNames.contains("agents")) {
          const agents = db.createObjectStore("agents", { keyPath: "id" });
          agents.createIndex("by-status", "status");
          agents.createIndex("by-createdAt", "createdAt");
        }

        // networks
        if (!db.objectStoreNames.contains("networks")) {
          const networks = db.createObjectStore("networks", { keyPath: "id" });
          networks.createIndex("by-status", "status");
          networks.createIndex("by-createdAt", "createdAt");
        }

        // connections
        if (!db.objectStoreNames.contains("connections")) {
          const connections = db.createObjectStore("connections", { keyPath: "id" });
          connections.createIndex("by-networkId", "networkId");
        }

        // specs
        if (!db.objectStoreNames.contains("specs")) {
          const specs = db.createObjectStore("specs", { keyPath: "id" });
          specs.createIndex("by-agentId", "agentId");
          specs.createIndex("by-createdAt", "createdAt");
        }

        // specVersions
        if (!db.objectStoreNames.contains("specVersions")) {
          const versions = db.createObjectStore("specVersions", { keyPath: "id" });
          versions.createIndex("by-specId", "specId");
        }
      },

      blocked() {
        console.warn("[DB] Upgrade blocked — close other ContextLayer tabs and reload.");
      },

      blocking() {
        // Another tab is trying to upgrade; release our connection
        console.warn("[DB] Releasing connection for upgrade in another tab.");
        _dbPromise = null;
      },

      terminated() {
        console.error("[DB] Connection terminated unexpectedly. Reconnecting…");
        _dbPromise = null;
      },
    });
  }

  return _dbPromise;
}

// ---------------------------------------------------------------------------
// Generic helpers
// ---------------------------------------------------------------------------

/** Read all records from a store, returns [] if IDB is unavailable */
export async function dbGetAll<
  S extends keyof ContextLayerDBSchema,
>(store: S): Promise<ContextLayerDBSchema[S]["value"][]> {
  try {
    const db = await getDB();
    return (await db.getAll(store)) as ContextLayerDBSchema[S]["value"][];
  } catch (err) {
    console.error(`[DB] getAll(${store}) failed:`, err);
    return [];
  }
}

/** Put (upsert) a single record */
export async function dbPut<
  S extends keyof ContextLayerDBSchema,
>(store: S, value: ContextLayerDBSchema[S]["value"]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(store, value as Parameters<typeof db.put>[1]);
  } catch (err) {
    console.error(`[DB] put(${store}) failed:`, err);
  }
}

/** Delete a record by key */
export async function dbDelete<
  S extends keyof ContextLayerDBSchema,
>(store: S, key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(store, key);
  } catch (err) {
    console.error(`[DB] delete(${store}, ${key}) failed:`, err);
  }
}

/** Get all records matching an index value */
export async function dbGetByIndex<
  S extends keyof ContextLayerDBSchema,
>(
  store: S,
  index: string & keyof ContextLayerDBSchema[S]["indexes"],
  value: string
): Promise<ContextLayerDBSchema[S]["value"][]> {
  try {
    const db = await getDB();
    return (await db.getAllFromIndex(
      store,
      index as Parameters<typeof db.getAllFromIndex>[1],
      value
    )) as ContextLayerDBSchema[S]["value"][];
  } catch (err) {
    console.error(`[DB] getAllFromIndex(${store}, ${index}) failed:`, err);
    return [];
  }
}
