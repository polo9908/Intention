/**
 * lib/db.ts
 *
 * IndexedDB initialisation via `idb`.
 *
 * Schema (v2)
 * ──────────────────────────────────────────────────────────────────────────
 *   agents           – Agent records, indexed by status & createdAt
 *   networks         – Network records, indexed by status
 *   connections      – Connection records, indexed by networkId
 *   specs            – AgentSpec records, indexed by agentId
 *   specVersions     – SpecVersion records, indexed by specId
 *   pendingOps       – Offline sync queue (new in v2)
 *
 * The three Zustand stores use the helpers below to persist / hydrate.
 * The sync layer uses pendingOps to queue mutations when offline.
 */

import { openDB, type IDBPDatabase } from "idb";
import type { Agent, AgentSpec, SpecVersion } from "@/types/agent";
import type { Network, Connection } from "@/types/network";

// ---------------------------------------------------------------------------
// Pending operation (offline sync queue)
// ---------------------------------------------------------------------------

export type SyncEntity = "agent" | "network" | "connection" | "spec";
export type SyncOperation = "create" | "update" | "delete";

export interface PendingOp {
  id: string;
  entity: SyncEntity;
  operation: SyncOperation;
  /** Serialised entity data (for create/update) or just { id } for delete */
  data: unknown;
  /** ISO timestamp of when the operation was queued */
  queuedAt: string;
  retryCount: number;
}

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
  pendingOps: {
    key: string;
    value: PendingOp;
    indexes: {
      "by-queuedAt": string;
      "by-entity": string;
    };
  };
}

export type ContextLayerDB = IDBPDatabase<ContextLayerDBSchema>;

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

const DB_NAME = "contextlayer";
/** Bump to 2 to add the pendingOps store. */
const DB_VERSION = 2;

let _dbPromise: Promise<ContextLayerDB> | null = null;

export function getDB(): Promise<ContextLayerDB> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("[DB] IndexedDB is not available server-side"));
  }

  if (!_dbPromise) {
    _dbPromise = openDB<ContextLayerDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // v1 stores (create only if missing — safe for fresh installs)
        if (oldVersion < 1) {
          const agents = db.createObjectStore("agents", { keyPath: "id" });
          agents.createIndex("by-status", "status");
          agents.createIndex("by-createdAt", "createdAt");

          const networks = db.createObjectStore("networks", { keyPath: "id" });
          networks.createIndex("by-status", "status");
          networks.createIndex("by-createdAt", "createdAt");

          const connections = db.createObjectStore("connections", { keyPath: "id" });
          connections.createIndex("by-networkId", "networkId");

          const specs = db.createObjectStore("specs", { keyPath: "id" });
          specs.createIndex("by-agentId", "agentId");
          specs.createIndex("by-createdAt", "createdAt");

          const versions = db.createObjectStore("specVersions", { keyPath: "id" });
          versions.createIndex("by-specId", "specId");
        }

        // v2: add pendingOps store for offline sync queue
        if (oldVersion < 2) {
          if (!db.objectStoreNames.contains("pendingOps")) {
            const ops = db.createObjectStore("pendingOps", { keyPath: "id" });
            ops.createIndex("by-queuedAt", "queuedAt");
            ops.createIndex("by-entity", "entity");
          }
        }
      },

      blocked() {
        console.warn("[DB] Upgrade blocked — close other ContextLayer tabs and reload.");
      },

      blocking() {
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
// Generic helpers (entity stores)
// ---------------------------------------------------------------------------

/** Read all records from a store. Returns [] if IDB is unavailable. */
export async function dbGetAll<
  S extends Exclude<keyof ContextLayerDBSchema, "pendingOps">,
>(store: S): Promise<ContextLayerDBSchema[S]["value"][]> {
  try {
    const db = await getDB();
    return (await db.getAll(store)) as ContextLayerDBSchema[S]["value"][];
  } catch (err) {
    console.error(`[DB] getAll(${store}) failed:`, err);
    return [];
  }
}

/** Upsert a single record. */
export async function dbPut<
  S extends Exclude<keyof ContextLayerDBSchema, "pendingOps">,
>(store: S, value: ContextLayerDBSchema[S]["value"]): Promise<void> {
  try {
    const db = await getDB();
    await db.put(store, value as Parameters<typeof db.put>[1]);
  } catch (err) {
    console.error(`[DB] put(${store}) failed:`, err);
  }
}

/** Delete a record by key. */
export async function dbDelete<
  S extends Exclude<keyof ContextLayerDBSchema, "pendingOps">,
>(store: S, key: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete(store, key);
  } catch (err) {
    console.error(`[DB] delete(${store}, ${key}) failed:`, err);
  }
}

/** Get all records matching an index value. */
export async function dbGetByIndex<
  S extends Exclude<keyof ContextLayerDBSchema, "pendingOps">,
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

// ---------------------------------------------------------------------------
// Pending ops helpers
// ---------------------------------------------------------------------------

/** Enqueue an offline sync operation. */
export async function dbQueueOp(op: PendingOp): Promise<void> {
  try {
    const db = await getDB();
    await db.put("pendingOps", op);
  } catch (err) {
    console.error("[DB] queueOp failed:", err);
  }
}

/** Return all pending ops sorted by queuedAt (oldest first). */
export async function dbGetPendingOps(): Promise<PendingOp[]> {
  try {
    const db = await getDB();
    const ops = await db.getAllFromIndex("pendingOps", "by-queuedAt");
    return ops.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  } catch (err) {
    console.error("[DB] getPendingOps failed:", err);
    return [];
  }
}

/** Remove a pending op after it has been successfully synced. */
export async function dbRemovePendingOp(id: string): Promise<void> {
  try {
    const db = await getDB();
    await db.delete("pendingOps", id);
  } catch (err) {
    console.error("[DB] removePendingOp failed:", err);
  }
}

/** Update retryCount on a failed op. */
export async function dbBumpRetry(id: string): Promise<void> {
  try {
    const db = await getDB();
    const op = await db.get("pendingOps", id);
    if (op) await db.put("pendingOps", { ...op, retryCount: op.retryCount + 1 });
  } catch (err) {
    console.error("[DB] bumpRetry failed:", err);
  }
}
