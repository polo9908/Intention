/**
 * lib/repositories/auditRepository.ts
 *
 * Append-only audit log for agent lifecycle events.
 * Rows are never updated or deleted (enforced by DB rules + no UPDATE policy).
 *
 * Typical usage
 * ─────────────
 *   await auditRepo.log({
 *     agentId: agent.id,
 *     action: 'update',
 *     before: previousAgent,
 *     after: updatedAgent,
 *     userId,
 *   });
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { assertNoError } from "@/lib/supabase";
import type { Database, AuditLogRow, AuditLogInsert, AuditActionDB } from "@/types/database";
import type { Agent } from "@/types/agent";
import type { PaginationParams, PaginatedResponse } from "@/types/common";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  agentId: string;
  action: AuditActionDB;
  before: unknown | null;
  after: unknown | null;
  userId: string;
  createdAt: string;
}

export interface LogOptions {
  agentId: string;
  action: AuditActionDB;
  before?: Agent | Record<string, unknown> | null;
  after?: Agent | Record<string, unknown> | null;
  userId: string;
}

export interface AuditListOptions extends PaginationParams {
  agentId?: string;
  userId?: string;
  action?: AuditActionDB;
  /** ISO timestamp — only return entries after this point */
  since?: string;
}

// ---------------------------------------------------------------------------
// Mappers
// ---------------------------------------------------------------------------

function rowToEntry(row: AuditLogRow): AuditEntry {
  return {
    id:        row.id,
    agentId:   row.agent_id,
    action:    row.action,
    before:    row.before,
    after:     row.after,
    userId:    row.user_id,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export class AuditRepository {
  constructor(private readonly db: SupabaseClient<Database>) {}

  /** Append a new audit entry. */
  async create(options: LogOptions): Promise<AuditEntry> {
    return this.log(options);
  }

  /**
   * Alias for create() with a more descriptive name.
   * Calling code can use either `log()` or `create()`.
   */
  async log(options: LogOptions): Promise<AuditEntry> {
    const insert: AuditLogInsert = {
      agent_id: options.agentId,
      action:   options.action,
      before:   (options.before ?? null) as AuditLogInsert["before"],
      after:    (options.after  ?? null) as AuditLogInsert["after"],
      user_id:  options.userId,
    };

    const { data, error } = await this.db
      .from("audit_log")
      .insert(insert)
      .select()
      .single();
    assertNoError(error, "AuditRepository.log");
    return rowToEntry(data);
  }

  /** Fetch a single audit entry by ID. Returns null if not found. */
  async read(id: string): Promise<AuditEntry | null> {
    const { data, error } = await this.db
      .from("audit_log")
      .select()
      .eq("id", id)
      .maybeSingle();
    assertNoError(error, "AuditRepository.read");
    return data ? rowToEntry(data) : null;
  }

  /** Alias for read() — returns null if not found. */
  async findById(id: string): Promise<AuditEntry | null> {
    return this.read(id);
  }

  /**
   * update() and delete() are intentionally not implemented.
   * Audit logs are immutable — the DB rules will reject any attempt.
   */
  update(): never {
    throw new Error("AuditRepository: audit entries are immutable and cannot be updated.");
  }

  delete(): never {
    throw new Error("AuditRepository: audit entries are immutable and cannot be deleted.");
  }

  /** Query the audit log with filters and pagination. */
  async list(options: AuditListOptions = {}): Promise<PaginatedResponse<AuditEntry>> {
    const { page = 1, limit = 50, agentId, userId, action, since } = options;
    const from = (page - 1) * limit;
    const to   = from + limit - 1;

    let query = this.db
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (agentId) query = query.eq("agent_id", agentId);
    if (userId)  query = query.eq("user_id",  userId);
    if (action)  query = query.eq("action",   action);
    if (since)   query = query.gte("created_at", since);

    const { data, error, count } = await query;
    assertNoError(error, "AuditRepository.list");

    const entries = (data ?? []).map(rowToEntry);
    const total   = count ?? entries.length;

    return { data: entries, total, page, limit, hasNextPage: page * limit < total };
  }

  /** Fetch the full audit trail for a single agent, newest first. */
  async getAgentHistory(agentId: string): Promise<AuditEntry[]> {
    const { data, error } = await this.db
      .from("audit_log")
      .select()
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false });
    assertNoError(error, "AuditRepository.getAgentHistory");
    return (data ?? []).map(rowToEntry);
  }

  /** Count actions of a given type for an agent (e.g. deploy count). */
  async countActions(agentId: string, action: AuditActionDB): Promise<number> {
    const { count, error } = await this.db
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("agent_id", agentId)
      .eq("action", action);
    assertNoError(error, "AuditRepository.countActions");
    return count ?? 0;
  }
}
