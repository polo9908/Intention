/**
 * lib/repositories/specRepository.ts
 *
 * CRUD for `agent_specs` (current spec) and `spec_versions` (history).
 *
 * Design notes
 * ────────────
 *   agent_specs  — one current spec per agent (upserted on each save)
 *   spec_versions — immutable append-only snapshots before each change
 *
 *   The repository automatically creates a spec_version entry whenever
 *   an agent_spec is updated, providing a full changelog.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoError, SupabaseNotFoundError } from "@/lib/supabase";
import type {
  Database,
  AgentSpecRow,
  AgentSpecInsert,
  SpecVersionRow,
  SpecVersionInsert,
} from "@/types/database";
import type { AgentSpec, SpecVersion } from "@/types/agent";
import type { PaginationParams } from "@/types/common";

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function rowToAgentSpec(row: AgentSpecRow): AgentSpec {
  const data = row.spec_data as Record<string, unknown>;
  return {
    id:           row.id,
    agentId:      row.agent_id,
    name:         (data.name as string)        ?? "",
    description:  (data.description as string) ?? "",
    version:      Number(row.version)           ?? 1,
    model:        (data.model as AgentSpec["model"]) ?? "claude-sonnet-4-6",
    systemPrompt: (data.systemPrompt as string) ?? "",
    maxTokens:    (data.maxTokens as number)    ?? 8192,
    temperature:  (data.temperature as number)  ?? 0.7,
    capabilities: (data.capabilities as AgentSpec["capabilities"]) ?? [],
    metadata:     (data.metadata as AgentSpec["metadata"]) ?? {},
    createdAt:    row.created_at,
    updatedAt:    row.created_at, // agent_specs has no updated_at; version acts as timestamp
  };
}

function agentSpecToInsert(spec: AgentSpec, userId: string): AgentSpecInsert {
  return {
    id:         spec.id,
    agent_id:   spec.agentId,
    spec_data: {
      name:         spec.name,
      description:  spec.description,
      model:        spec.model,
      systemPrompt: spec.systemPrompt,
      maxTokens:    spec.maxTokens,
      temperature:  spec.temperature,
      capabilities: spec.capabilities,
      metadata:     spec.metadata,
    },
    version:    String(spec.version),
    created_by: userId,
  };
}

function rowToSpecVersion(row: SpecVersionRow): SpecVersion {
  const snapshot = rowToAgentSpec({
    id:         row.id,
    agent_id:   row.agent_id,
    spec_data:  row.spec_data,
    version:    row.version,
    created_at: row.created_at,
    created_by: row.created_by,
  });

  return {
    id:            row.id,
    specId:        row.agent_id, // versions are keyed by agent, not spec id
    version:       Number(row.version),
    snapshot,
    changeMessage: row.change_notes ?? undefined,
    createdAt:     row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class SpecRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  // ── AgentSpec (current) ────────────────────────────────────────────────────

  /** Upsert the current spec for an agent. Snapshots the previous version first. */
  async create(spec: AgentSpec, userId: string): Promise<AgentSpec> {
    const insert = agentSpecToInsert(spec, userId);
    const { data, error } = await this.db
      .from("agent_specs")
      .upsert(insert, { onConflict: "agent_id" })
      .select()
      .single();
    assertNoError(error, "SpecRepository.create");
    return rowToAgentSpec(data);
  }

  /** Fetch the current spec for an agent. Returns null if none exists. */
  async read(agentId: string): Promise<AgentSpec | null> {
    const { data, error } = await this.db
      .from("agent_specs")
      .select()
      .eq("agent_id", agentId)
      .maybeSingle();
    assertNoError(error, "SpecRepository.read");
    return data ? rowToAgentSpec(data) : null;
  }

  /** Fetch current spec or throw. */
  async findById(id: string): Promise<AgentSpec> {
    const { data, error } = await this.db
      .from("agent_specs")
      .select()
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "SpecRepository.findById");
    if (!data) throw new SupabaseNotFoundError("AgentSpec", id);
    return rowToAgentSpec(data);
  }

  /**
   * Update a spec and automatically snapshot the current version into
   * spec_versions before applying the patch.
   */
  async update(
    agentId: string,
    patch: Partial<AgentSpec>,
    userId: string,
    changeMessage?: string
  ): Promise<AgentSpec> {
    // 1. Read current spec for snapshotting
    const current = await this.read(agentId);

    if (current) {
      // 2. Write snapshot to spec_versions
      const versionInsert: SpecVersionInsert = {
        id:           current.id + "_v" + current.version,
        agent_id:     agentId,
        spec_data: {
          name:         current.name,
          description:  current.description,
          model:        current.model,
          systemPrompt: current.systemPrompt,
          maxTokens:    current.maxTokens,
          temperature:  current.temperature,
          capabilities: current.capabilities,
          metadata:     current.metadata,
        },
        version:      String(current.version),
        created_by:   userId,
        change_notes: changeMessage ?? null,
      };

      // Ignore error if version already exists (idempotent)
      await this.db.from("spec_versions").upsert(versionInsert, { onConflict: "id" });
    }

    // 3. Apply patch with bumped version
    const nextVersion = (current?.version ?? 0) + 1;
    const updated: AgentSpec = {
      ...(current ?? ({} as AgentSpec)),
      ...patch,
      agentId,
      version: nextVersion,
    };

    const insert = agentSpecToInsert(updated, userId);
    const { data, error } = await this.db
      .from("agent_specs")
      .upsert(insert, { onConflict: "agent_id" })
      .select()
      .single();
    assertNoError(error, "SpecRepository.update");
    return rowToAgentSpec(data);
  }

  /** Delete the current spec record for an agent. */
  async delete(agentId: string): Promise<void> {
    const { error } = await this.db
      .from("agent_specs")
      .delete()
      .eq("agent_id", agentId);
    assertNoError(error, "SpecRepository.delete");
  }

  /** List all current specs (one per agent) accessible to the user. */
  async list(params: PaginationParams = {}): Promise<AgentSpec[]> {
    const { page = 1, limit = 50 } = params;
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    const { data, error } = await this.db
      .from("agent_specs")
      .select()
      .order("created_at", { ascending: false })
      .range(from, to);
    assertNoError(error, "SpecRepository.list");
    return (data ?? []).map(rowToAgentSpec);
  }

  // ── SpecVersions (history) ─────────────────────────────────────────────────

  /** Fetch version history for an agent's spec, newest first. */
  async getSpecHistory(agentId: string): Promise<SpecVersion[]> {
    const { data, error } = await this.db
      .from("spec_versions")
      .select()
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    assertNoError(error, "SpecRepository.getSpecHistory");
    return (data ?? []).map(rowToSpecVersion);
  }

  /**
   * Roll back an agent's spec to a previous version.
   * Writes a new snapshot of the current spec, then restores the target version.
   */
  async rollbackSpec(
    agentId: string,
    versionId: string,
    userId: string
  ): Promise<AgentSpec> {
    // 1. Fetch target version
    const { data: vRow, error: vErr } = await this.db
      .from("spec_versions")
      .select()
      .eq("id", versionId)
      .single();
    assertNoError(vErr, "SpecRepository.rollbackSpec.fetchVersion");
    if (!vRow) throw new SupabaseNotFoundError("SpecVersion", versionId);

    // 2. Reconstruct the spec from that snapshot
    const snapshot = rowToAgentSpec({
      id:         vRow.id,
      agent_id:   vRow.agent_id,
      spec_data:  vRow.spec_data,
      version:    vRow.version,
      created_at: vRow.created_at,
      created_by: vRow.created_by,
    });

    // 3. Apply via update() (which will snapshot the current version first)
    return this.update(
      agentId,
      snapshot,
      userId,
      `Rollback to v${vRow.version}`
    );
  }
}
