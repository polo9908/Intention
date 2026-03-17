/**
 * lib/repositories/agentRepository.ts
 *
 * CRUD operations for the `agents` table.
 *
 * Mapping notes
 * ─────────────
 *   DB  agents.status  → lifecycle state  (active | inactive | testing)
 *   App Agent.status   → runtime state    (idle | running | paused | completed | error)
 *   The DB stores lifecycle; runtime state lives only in Zustand / IDB.
 *   On read, DB status is mapped to "idle" (safe default) unless the agent
 *   is marked "testing" → mapped to "running" for visual feedback.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoError, SupabaseNotFoundError } from "@/lib/supabase";
import type { Database, AgentRow, AgentInsert, AgentUpdate } from "@/types/database";
import type { Agent, AgentConfig, AgentRole } from "@/types/agent";
import type { PaginationParams, PaginatedResponse } from "@/types/common";

export type { AgentInsert, AgentUpdate };

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function rowToAgent(row: AgentRow): Agent {
  const specJson = row.spec as Record<string, unknown>;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    role: (specJson.role as AgentRole) ?? "worker",
    status: row.status === "testing" ? "running" : "idle",
    config: (specJson.config as AgentConfig) ?? {
      model: "claude-sonnet-4-6",
      systemPrompt: "",
      capabilities: [],
    },
    metadata: (specJson.metadata as Record<string, string | number | boolean | null>) ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function agentToInsert(agent: Agent, userId: string): AgentInsert {
  return {
    id: agent.id,
    user_id: userId,
    name: agent.name,
    description: agent.description,
    spec: {
      role: agent.role,
      config: agent.config,
      metadata: agent.metadata,
    },
    version: "1",
    status: agentStatusToDb(agent),
    deployed_at: null,
  };
}

function agentStatusToDb(agent: Agent): AgentRow["status"] {
  if (agent.status === "running") return "active";
  return "inactive";
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class AgentRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  /** Insert a new agent row. */
  async create(agent: Agent, userId: string): Promise<Agent> {
    const insert = agentToInsert(agent, userId);
    const { data, error } = await this.db
      .from("agents")
      .insert(insert)
      .select()
      .single();
    assertNoError(error, "AgentRepository.create");
    return rowToAgent(data);
  }

  /** Fetch a single agent by ID. Returns null if not found. */
  async read(id: string): Promise<Agent | null> {
    const { data, error } = await this.db
      .from("agents")
      .select()
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "AgentRepository.read");
    return data ? rowToAgent(data) : null;
  }

  /** Same as read() but throws SupabaseNotFoundError when missing. */
  async findById(id: string): Promise<Agent> {
    const agent = await this.read(id);
    if (!agent) throw new SupabaseNotFoundError("Agent", id);
    return agent;
  }

  /** Update an agent. Merges spec JSONB with the provided patch. */
  async update(id: string, patch: Partial<Agent>): Promise<Agent> {
    // Build the spec JSONB update if config / role / metadata changed
    const specPatch: Record<string, unknown> = {};
    if (patch.role)     specPatch.role     = patch.role;
    if (patch.config)   specPatch.config   = patch.config;
    if (patch.metadata) specPatch.metadata = patch.metadata;

    const update: AgentUpdate = {
      ...(patch.name        && { name: patch.name }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(Object.keys(specPatch).length > 0 && { spec: specPatch as AgentUpdate["spec"] }),
    };

    const { data, error } = await this.db
      .from("agents")
      .update(update)
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "AgentRepository.update");
    return rowToAgent(data);
  }

  /** Hard-delete an agent (cascades to agent_specs, spec_versions, audit_log). */
  async delete(id: string): Promise<void> {
    const { error } = await this.db.from("agents").delete().eq("id", id);
    assertNoError(error, "AgentRepository.delete");
  }

  /** List all agents for the current user with optional pagination. */
  async list(
    params: PaginationParams & { status?: AgentRow["status"] } = {}
  ): Promise<PaginatedResponse<Agent>> {
    const { page = 1, limit = 50, status } = params;
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    let query = this.db
      .from("agents")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (status) query = query.eq("status", status);

    const { data, error, count } = await query;
    assertNoError(error, "AgentRepository.list");

    const agents = (data ?? []).map(rowToAgent);
    const total  = count ?? agents.length;

    return {
      data: agents,
      total,
      page,
      limit,
      hasNextPage: page * limit < total,
    };
  }

  /** Mark an agent as deployed (sets status=active, deployed_at=now). */
  async markDeployed(id: string): Promise<Agent> {
    const { data, error } = await this.db
      .from("agents")
      .update({ status: "active", deployed_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    assertNoError(error, "AgentRepository.markDeployed");
    return rowToAgent(data);
  }

  /** Search agents by name using trigram similarity. */
  async search(query: string, limit = 20): Promise<Agent[]> {
    const { data, error } = await this.db
      .from("agents")
      .select()
      .ilike("name", `%${query}%`)
      .limit(limit);
    assertNoError(error, "AgentRepository.search");
    return (data ?? []).map(rowToAgent);
  }
}
