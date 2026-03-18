/**
 * lib/sync.ts
 *
 * Bidirectional sync between Zustand stores and Supabase.
 *
 * Design
 * ──────
 *   Online  → mutations write to Supabase immediately (fire-and-forget)
 *   Offline → mutations are queued in IDB (pendingOps store)
 *   On reconnect → flushPendingOps() drains the queue with retries
 *
 * Conflict resolution — last-write-wins via updatedAt / created_at timestamps.
 * If the remote record is newer, the remote value wins and the local store is
 * updated. If the local record is newer (or equal), the local value is pushed.
 *
 * Usage
 * ──────
 *   // 1. Boot: replace IDB-only hydration with Supabase hydration
 *   const manager = createSyncManager(userId, supabaseClient);
 *   await manager.hydrateFromSupabase();
 *
 *   // 2. Auto-sync: subscribe to store changes
 *   const stop = manager.startSync();
 *   // … later:
 *   stop();
 *
 *   // 3. Manual sync of a single entity after a store mutation
 *   await manager.syncAgent(agent, 'upsert');
 *
 *   // 4. Drain the offline queue when the connection is restored
 *   await manager.flushPendingOps();
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateId } from "@/lib/utils";
import {
  dbPut, dbDelete, dbQueueOp, dbGetPendingOps,
  dbRemovePendingOp, dbBumpRetry,
} from "@/lib/db";
import { createRepositories, type Repositories } from "@/lib/repositories";
import { useAgentStore }   from "@/lib/stores/agentStore";
import { useNetworkStore }  from "@/lib/stores/networkStore";
import { useSpecStore }     from "@/lib/stores/specStore";
import type { Database } from "@/types/database";
import type { Agent }    from "@/types/agent";
import type { Network, Connection } from "@/types/network";
import type { AgentSpec }  from "@/types/agent";
import type { PendingOp, SyncEntity, SyncOperation } from "@/lib/db";

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface SyncResult {
  flushed: number;
  failed: number;
  skipped: number;
  errors: Array<{ opId: string; error: string }>;
}

// ---------------------------------------------------------------------------
// Conflict resolution helper
// ---------------------------------------------------------------------------

/** Returns true when `local` is strictly newer than `remote`. */
function localIsNewer(
  localTs: string | undefined,
  remoteTs: string | undefined
): boolean {
  if (!localTs) return false;
  if (!remoteTs) return true;
  return new Date(localTs) > new Date(remoteTs);
}

// ---------------------------------------------------------------------------
// SyncManager
// ---------------------------------------------------------------------------

export class SyncManager {
  private readonly repos: Repositories;
  private _isOnline: boolean;
  private _unsubscribers: Array<() => void> = [];

  constructor(
    private readonly userId: string,
    client: SupabaseClient<Database>
  ) {
    this.repos    = createRepositories(client);
    this._isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;
  }

  get isOnline(): boolean {
    return this._isOnline;
  }

  // ── Hydration ─────────────────────────────────────────────────────────────

  /**
   * Pull the latest state from Supabase and populate all three Zustand stores.
   * Also writes records to IDB for offline access.
   * Replaces the IDB-only `initializeStores()` call when online.
   */
  async hydrateFromSupabase(): Promise<void> {
    try {
      const [agentsPage, networksPage, specsArr] = await Promise.all([
        this.repos.agents.list({ limit: 500 }),
        this.repos.networks.list({ limit: 500 }),
        this.repos.specs.list({ limit: 500 }),
      ]);

      const agents   = agentsPage.data;
      const networks = networksPage.data;
      const specs    = specsArr;

      // Hydrate Zustand stores
      useAgentStore.setState({ agents, isHydrated: true });
      useSpecStore.setState({ specs, isHydrated: true });

      // Fetch connections for all networks
      const connectionArrays = await Promise.all(
        networks.map((n) => this.repos.networks.list(n.id))
      );
      const allConnections = connectionArrays.flat();

      // Merge connectionIds back into networks
      const networksWithConns = networks.map((n) => ({
        ...n,
        connectionIds: allConnections
          .filter((c) => c.networkId === n.id)
          .map((c) => c.id),
      }));

      useNetworkStore.setState({
        networks: networksWithConns,
        isHydrated: true,
      });

      // Persist everything to IDB for offline access
      await Promise.all([
        ...agents.map((a)   => dbPut("agents",  a)),
        ...specs.map((s)    => dbPut("specs",   s)),
        ...networksWithConns.map((n) => dbPut("networks", n)),
        ...allConnections.map((c)    => dbPut("connections", c)),
      ]);
    } catch (err) {
      console.error("[Sync] hydrateFromSupabase failed, falling back to IDB:", err);
      // Fall back to IDB hydration
      await Promise.all([
        useAgentStore.getState().hydrateAgents(),
        useNetworkStore.getState().hydrateNetworks(),
        useSpecStore.getState().hydrateSpecs(),
      ]);
    }
  }

  // ── Individual entity sync ─────────────────────────────────────────────────

  /** Sync a single agent to Supabase. Queues if offline. */
  async syncAgent(agent: Agent, op: "upsert" | "delete"): Promise<void> {
    if (!this._isOnline) {
      await this._queue("agent", op === "delete" ? "delete" : "upsert", agent);
      return;
    }
    try {
      if (op === "delete") {
        await this.repos.agents.delete(agent.id);
        await dbDelete("agents", agent.id);
      } else {
        const remote = await this.repos.agents.read(agent.id);
        if (remote && !localIsNewer(agent.updatedAt, remote.updatedAt)) {
          // Remote is newer — update local store
          useAgentStore.setState((s) => ({
            agents: s.agents.map((a) => (a.id === remote.id ? remote : a)),
          }));
          await dbPut("agents", remote);
          return;
        }
        await this.repos.agents.create(agent, this.userId).catch(async () => {
          // create may fail if row exists — try update instead
          await this.repos.agents.update(agent.id, agent);
        });
        await dbPut("agents", agent);
      }
    } catch (err) {
      console.error("[Sync] syncAgent failed, queuing:", err);
      await this._queue("agent", op === "delete" ? "delete" : "update", agent);
    }
  }

  /** Sync a network (and optionally its connections). Queues if offline. */
  async syncNetwork(
    network: Network,
    connections: Connection[],
    op: "upsert" | "delete"
  ): Promise<void> {
    if (!this._isOnline) {
      await this._queue("network", op === "delete" ? "delete" : "upsert", { network, connections });
      return;
    }
    try {
      if (op === "delete") {
        await this.repos.networks.delete(network.id);
        await dbDelete("networks", network.id);
      } else {
        const remote = await this.repos.networks.read(network.id);
        if (remote && !localIsNewer(network.updatedAt, remote.updatedAt)) {
          useNetworkStore.setState((s) => ({
            networks: s.networks.map((n) => (n.id === remote.id ? remote : n)),
          }));
          await dbPut("networks", remote);
          return;
        }
        await this.repos.networks.create(network, this.userId).catch(async () => {
          await this.repos.networks.update(network.id, network);
        });
        await dbPut("networks", network);

        // Sync connections
        await Promise.all(
          connections.map((c) =>
            this.repos.networks.createConnection(c).catch(() =>
              this.repos.networks.updateConnection(c.id, c)
            ).then(() => dbPut("connections", c))
          )
        );
      }
    } catch (err) {
      console.error("[Sync] syncNetwork failed, queuing:", err);
      await this._queue("network", op === "delete" ? "delete" : "update", { network, connections });
    }
  }

  /** Sync an AgentSpec. Queues if offline. */
  async syncSpec(spec: AgentSpec, op: "upsert" | "delete"): Promise<void> {
    if (!this._isOnline) {
      await this._queue("spec", op === "delete" ? "delete" : "upsert", spec);
      return;
    }
    try {
      if (op === "delete") {
        await this.repos.specs.delete(spec.agentId);
        await dbDelete("specs", spec.id);
      } else {
        await this.repos.specs.create(spec, this.userId).catch(async () => {
          await this.repos.specs.update(spec.agentId, spec, this.userId);
        });
        await dbPut("specs", spec);
      }
    } catch (err) {
      console.error("[Sync] syncSpec failed, queuing:", err);
      await this._queue("spec", op === "delete" ? "delete" : "update", spec);
    }
  }

  // ── Offline queue flushing ────────────────────────────────────────────────

  /**
   * Process all pending offline operations, oldest first.
   * Operations that fail are retried up to MAX_RETRIES times before being dropped.
   */
  async flushPendingOps(maxRetries = 3): Promise<SyncResult> {
    const result: SyncResult = { flushed: 0, failed: 0, skipped: 0, errors: [] };
    const ops = await dbGetPendingOps();

    for (const op of ops) {
      if (op.retryCount >= maxRetries) {
        result.skipped++;
        await dbRemovePendingOp(op.id);
        continue;
      }

      try {
        await this._executeOp(op);
        await dbRemovePendingOp(op.id);
        result.flushed++;
      } catch (err) {
        await dbBumpRetry(op.id);
        result.failed++;
        result.errors.push({
          opId: op.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return result;
  }

  // ── Zustand store subscription (auto-sync) ────────────────────────────────

  /**
   * Subscribe to all three Zustand stores and automatically sync mutations
   * to Supabase. Returns a cleanup function.
   *
   * Note: Uses a diff-based approach — compares lengths + ids to detect
   * additions and deletions; full objects are compared by updatedAt for updates.
   */
  startSync(): () => void {
    const prevAgents:   Map<string, Agent>    = new Map();
    const prevNetworks: Map<string, Network>  = new Map();
    const prevSpecs:    Map<string, AgentSpec> = new Map();

    // Seed initial state so we don't sync the entire history on first tick
    useAgentStore.getState().agents.forEach((a) => prevAgents.set(a.id, a));
    useNetworkStore.getState().networks.forEach((n) => prevNetworks.set(n.id, n));
    useSpecStore.getState().specs.forEach((s) => prevSpecs.set(s.id, s));

    const unsubAgents = useAgentStore.subscribe((state) => {
      this._diffAndSync(state.agents, prevAgents, "agent");
    });

    const unsubNetworks = useNetworkStore.subscribe((state) => {
      const connMap = new Map<string, Connection[]>();
      state.networks.forEach((n) => connMap.set(n.id, []));
      state.networkConnections.forEach((c) => {
        const arr = connMap.get(c.networkId) ?? [];
        arr.push(c);
        connMap.set(c.networkId, arr);
      });
      this._diffAndSyncNetworks(state.networks, prevNetworks, connMap);
    });

    const unsubSpecs = useSpecStore.subscribe((state) => {
      this._diffAndSync(state.specs, prevSpecs, "spec");
    });

    // Online / offline listeners
    const onOnline  = () => { this._isOnline = true;  void this.flushPendingOps(); };
    const onOffline = () => { this._isOnline = false; };

    if (typeof window !== "undefined") {
      window.addEventListener("online",  onOnline);
      window.addEventListener("offline", onOffline);
    }

    const cleanup = () => {
      unsubAgents();
      unsubNetworks();
      unsubSpecs();
      if (typeof window !== "undefined") {
        window.removeEventListener("online",  onOnline);
        window.removeEventListener("offline", onOffline);
      }
    };

    this._unsubscribers.push(cleanup);
    return cleanup;
  }

  /** Stop all sync subscriptions. */
  stopSync(): void {
    this._unsubscribers.forEach((fn) => fn());
    this._unsubscribers = [];
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _diffAndSync<T extends { id: string; updatedAt?: string; createdAt: string }>(
    current: T[],
    prev: Map<string, T>,
    entity: SyncEntity
  ): void {
    const currentMap = new Map(current.map((e) => [e.id, e]));

    // Deletions
    for (const [id] of prev) {
      if (!currentMap.has(id)) {
        prev.delete(id);
        void this._dispatchSync(entity, "delete", { id });
      }
    }

    // Creates + Updates
    for (const [id, item] of currentMap) {
      const previous = prev.get(id);
      if (!previous) {
        prev.set(id, item);
        void this._dispatchSync(entity, "create", item);
      } else if (
        item.updatedAt !== previous.updatedAt ||
        item.createdAt !== previous.createdAt
      ) {
        prev.set(id, item);
        void this._dispatchSync(entity, "update", item);
      }
    }
  }

  private _diffAndSyncNetworks(
    current: Network[],
    prev: Map<string, Network>,
    connMap: Map<string, Connection[]>
  ): void {
    const currentMap = new Map(current.map((n) => [n.id, n]));

    for (const [id] of prev) {
      if (!currentMap.has(id)) {
        prev.delete(id);
        void this.syncNetwork({ id } as Network, [], "delete");
      }
    }

    for (const [id, network] of currentMap) {
      const previous = prev.get(id);
      if (!previous || network.updatedAt !== previous.updatedAt) {
        prev.set(id, network);
        const connections = connMap.get(id) ?? [];
        void this.syncNetwork(network, connections, "upsert");
      }
    }
  }

  private async _dispatchSync(
    entity: SyncEntity,
    op: SyncOperation,
    data: unknown
  ): Promise<void> {
    if (entity === "agent") {
      await this.syncAgent(data as Agent, op === "delete" ? "delete" : "upsert");
    } else if (entity === "spec") {
      await this.syncSpec(data as AgentSpec, op === "delete" ? "delete" : "upsert");
    }
    // network diffs handled in _diffAndSyncNetworks
  }

  private async _executeOp(op: PendingOp): Promise<void> {
    if (op.entity === "agent") {
      const agent = op.data as Agent;
      if (op.operation === "delete") {
        await this.repos.agents.delete(agent.id);
      } else {
        await this.repos.agents.create(agent, this.userId).catch(() =>
          this.repos.agents.update(agent.id, agent)
        );
      }
    } else if (op.entity === "network") {
      const { network, connections } = op.data as { network: Network; connections: Connection[] };
      if (op.operation === "delete") {
        await this.repos.networks.delete(network.id);
      } else {
        await this.repos.networks.create(network, this.userId).catch(() =>
          this.repos.networks.update(network.id, network)
        );
        for (const c of connections ?? []) {
          await this.repos.networks.createConnection(c).catch(() =>
            this.repos.networks.updateConnection(c.id, c)
          );
        }
      }
    } else if (op.entity === "spec") {
      const spec = op.data as AgentSpec;
      if (op.operation === "delete") {
        await this.repos.specs.delete(spec.agentId);
      } else {
        await this.repos.specs.create(spec, this.userId).catch(() =>
          this.repos.specs.update(spec.agentId, spec, this.userId)
        );
      }
    }
  }

  private async _queue(
    entity: SyncEntity,
    operation: SyncOperation,
    data: unknown
  ): Promise<void> {
    const op: PendingOp = {
      id: generateId("op"),
      entity,
      operation,
      data,
      queuedAt: new Date().toISOString(),
      retryCount: 0,
    };
    await dbQueueOp(op);
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Create a SyncManager for a given authenticated user.
 *
 * @example
 *   import { createSyncManager } from '@/lib/sync';
 *   import { getBrowserClient } from '@/lib/supabase';
 *
 *   const manager = createSyncManager(userId, getBrowserClient());
 *   await manager.hydrateFromSupabase();
 *   const stop = manager.startSync();
 */
export function createSyncManager(
  userId: string,
  client: SupabaseClient<Database>
): SyncManager {
  return new SyncManager(userId, client);
}
