/**
 * lib/repositories/networkRepository.ts
 *
 * CRUD for `networks` and `connections` tables.
 * Networks and their edges are tightly coupled, so both live here.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoError, SupabaseNotFoundError } from "@/lib/supabase";
import type {
  Database,
  NetworkRow,
  NetworkInsert,
  NetworkUpdate,
  ConnectionRow,
  ConnectionInsert,
  ConnectionTypeDB,
} from "@/types/database";
import type { Network, Connection, NetworkStatus } from "@/types/network";
import type { PaginationParams, PaginatedResponse } from "@/types/common";

export type { NetworkInsert, NetworkUpdate };

// ---------------------------------------------------------------------------
// Mappers — network
// ---------------------------------------------------------------------------

function rowToNetwork(row: NetworkRow): Network {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    status: "active" as NetworkStatus, // lifecycle managed client-side
    agentIds: row.agents,
    connectionIds: [], // populated separately by loadConnections()
    tags: [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function networkToInsert(network: Network, userId: string): NetworkInsert {
  return {
    id: network.id,
    user_id: userId,
    name: network.name,
    description: network.description,
    agents: network.agentIds,
    shared_user_ids: [],
  };
}

// ---------------------------------------------------------------------------
// Mappers — connection
// ---------------------------------------------------------------------------

function rowToConnection(row: ConnectionRow): Connection {
  return {
    id: row.id,
    networkId: row.network_id,
    sourceAgentId: row.source_agent_id,
    targetAgentId: row.target_agent_id,
    type: row.connection_type as Connection["type"],
    createdAt: row.created_at,
    condition:
      row.routing_rules && typeof row.routing_rules === "object" && !Array.isArray(row.routing_rules)
        ? ((row.routing_rules as Record<string, unknown>).condition as string | undefined)
        : undefined,
  };
}

function connectionToInsert(conn: Connection): ConnectionInsert {
  return {
    id: conn.id,
    network_id: conn.networkId,
    source_agent_id: conn.sourceAgentId,
    target_agent_id: conn.targetAgentId,
    connection_type: conn.type as ConnectionTypeDB,
    routing_rules: conn.condition ? { condition: conn.condition } : null,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class NetworkRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  // ── Networks ───────────────────────────────────────────────────────────────

  /** Insert a new network. */
  async create(network: Network, userId: string): Promise<Network> {
    const insert = networkToInsert(network, userId);
    const { data, error } = await this.db
      .from("networks")
      .insert(insert)
      .select()
      .single();
    assertNoError(error, "NetworkRepository.create");
    return rowToNetwork(data);
  }

  /** Fetch a network by ID. Returns null if not found. */
  async read(id: string): Promise<Network | null> {
    const { data, error } = await this.db
      .from("networks")
      .select()
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "NetworkRepository.read");
    return data ? rowToNetwork(data) : null;
  }

  /** Fetch a network or throw SupabaseNotFoundError. */
  async findById(id: string): Promise<Network> {
    const network = await this.read(id);
    if (!network) throw new SupabaseNotFoundError("Network", id);
    return network;
  }

  async update(id: string, patch: Partial<Network>): Promise<Network> {
    const update: NetworkUpdate = {
      ...(patch.name        !== undefined && { name: patch.name }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.agentIds    !== undefined && { agents: patch.agentIds }),
    };
    const { data, error } = await this.db
      .from("networks")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "NetworkRepository.update");
    return rowToNetwork(data);
  }

  /** Hard-delete a network (cascades to connections). */
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("networks").delete().eq("id", id);
    assertNoError(error, "NetworkRepository.delete");
  }

  async list(
    params: PaginationParams = {}
  ): Promise<PaginatedResponse<Network>> {
    const { page = 1, limit = 50 } = params;
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error, count } = await this.db
      .from("networks")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);
    assertNoError(error, "NetworkRepository.list");

    const networks = (data ?? []).map(rowToNetwork);
    const total    = count ?? networks.length;

    return { data: networks, total, page, limit, hasNextPage: page * limit < total };
  }

  /** Add `userId` to a network's shared_user_ids list. */
  async shareWithUser(networkId: string, userId: string): Promise<void> {
    const { error } = await this.db.rpc("array_append_unique", {
      table_name: "networks",
      column_name: "shared_user_ids",
      row_id: networkId,
      value: userId,
    });
    // Fallback: read-modify-write if RPC not available
    if (error) {
      const { data: row, error: readErr } = await this.db
        .from("networks").select("shared_user_ids").eq("id", networkId).single();
      assertNoError(readErr, "NetworkRepository.shareWithUser.read");
      const existing: string[] = row.shared_user_ids ?? [];
      if (!existing.includes(userId)) {
        const { error: updateErr } = await this.db
          .from("networks")
          .update({ shared_user_ids: [...existing, userId] })
          .eq("id", networkId);
        assertNoError(updateErr, "NetworkRepository.shareWithUser.update");
      }
    }
  }

  // ── Connections ────────────────────────────────────────────────────────────

  /** Insert a new connection edge. */
  async createConnection(connection: Connection): Promise<Connection> {
    const insert = connectionToInsert(connection);
    const { data, error } = await this.db
      .from("connections")
      .insert(insert)
      .select()
      .single();
    assertNoError(error, "NetworkRepository.createConnection");
    return rowToConnection(data);
  }

  /** Fetch a connection by ID. Returns null if not found. */
  async readConnection(id: string): Promise<Connection | null> {
    const { data, error } = await this.db
      .from("connections")
      .select()
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "NetworkRepository.readConnection");
    return data ? rowToConnection(data) : null;
  }

  /** Alias for readConnection — throws if not found. */
  async findById(id: string): Promise<Connection> {
    const conn = await this.readConnection(id);
    if (!conn) throw new SupabaseNotFoundError("Connection", id);
    return conn;
  }

  async updateConnection(id: string, patch: Partial<Connection>): Promise<Connection> {
    const { data, error } = await this.db
      .from("connections")
      .update({
        ...(patch.type      && { connection_type: patch.type as ConnectionTypeDB }),
        ...(patch.condition !== undefined && {
          routing_rules: patch.condition ? { condition: patch.condition } : null,
        }),
      })
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "NetworkRepository.updateConnection");
    return rowToConnection(data);
  }

  /** Remove a connection from network. */
  async removeConnectionFromNetwork(id: string): Promise<void> {
    const { error } = await this.db.from("connections").delete().eq("id", id);
    assertNoError(error, "NetworkRepository.removeConnectionFromNetwork");
  }

  /** Alias for removeConnectionFromNetwork */
  async delete(id: string): Promise<void> {
    return this.removeConnectionFromNetwork(id);
  }

  /** Fetch all connections for a network. */
  async list(networkId: string): Promise<Connection[]> {
    const { data, error } = await this.db
      .from("connections")
      .select()
      .eq("network_id", networkId)
      .order("created_at", { ascending: true });
    assertNoError(error, "NetworkRepository.list(connections)");
    return (data ?? []).map(rowToConnection);
  }
}
