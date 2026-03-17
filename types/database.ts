/**
 * types/database.ts
 *
 * Raw Supabase / PostgreSQL row types and the typed Database schema used
 * when constructing SupabaseClient<Database>.
 *
 * Naming conventions
 * ──────────────────
 *   *Row    – exact shape returned by SELECT (all columns, snake_case)
 *   *Insert – required fields for INSERT (id, timestamps optional — DB defaults)
 *   *Update – all fields optional for PATCH / UPDATE
 */

// ---------------------------------------------------------------------------
// JSON scalar
// ---------------------------------------------------------------------------

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

// ---------------------------------------------------------------------------
// DB Enums
// ---------------------------------------------------------------------------

/** Lifecycle / deployment state stored in agents.status */
export type AgentStatusDB = "active" | "inactive" | "testing";

/**
 * Wire type for connections.connection_type.
 * Extends the original spec (escalation|parallel|sequential) with the two
 * additional types used by the app (conditional|feedback).
 */
export type ConnectionTypeDB =
  | "sequential"
  | "parallel"
  | "escalation"
  | "conditional"
  | "feedback";

/** Actions recorded in audit_log.action */
export type AuditActionDB = "create" | "update" | "delete" | "deploy";

// ---------------------------------------------------------------------------
// Row types (SELECT)
// ---------------------------------------------------------------------------

export interface AgentRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  /** AgentConfig + extra runtime fields serialised as JSONB */
  spec: Json;
  version: string;
  status: AgentStatusDB;
  created_at: string;
  updated_at: string;
  deployed_at: string | null;
}

export interface AgentSpecRow {
  id: string;
  agent_id: string;
  /** Full AgentSpec object serialised as JSONB */
  spec_data: Json;
  version: string;
  created_at: string;
  created_by: string;
}

export interface NetworkRow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  /** Array of agent UUIDs participating in this network */
  agents: string[];
  /**
   * Users (besides owner) who can read/write this network.
   * Supports the "team members can access shared networks" RLS policy.
   */
  shared_user_ids: string[];
  created_at: string;
  updated_at: string;
}

export interface ConnectionRow {
  id: string;
  network_id: string;
  source_agent_id: string;
  target_agent_id: string;
  connection_type: ConnectionTypeDB;
  /** Optional routing rules / condition expressions stored as JSONB */
  routing_rules: Json | null;
  created_at: string;
}

export interface SpecVersionRow {
  id: string;
  agent_id: string;
  /** Full AgentSpec snapshot serialised as JSONB */
  spec_data: Json;
  version: string;
  created_at: string;
  created_by: string;
  change_notes: string | null;
}

export interface AuditLogRow {
  id: string;
  agent_id: string;
  action: AuditActionDB;
  /** State before the action (null for create) */
  before: Json | null;
  /** State after the action (null for delete) */
  after: Json | null;
  user_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Insert types (required fields only, DB handles defaults)
// ---------------------------------------------------------------------------

export type AgentInsert = Omit<AgentRow, "created_at" | "updated_at" | "deployed_at"> & {
  created_at?: string;
  updated_at?: string;
  deployed_at?: string | null;
};

export type AgentSpecInsert = Omit<AgentSpecRow, "created_at"> & {
  created_at?: string;
};

export type NetworkInsert = Omit<NetworkRow, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

export type ConnectionInsert = Omit<ConnectionRow, "created_at"> & {
  created_at?: string;
};

export type SpecVersionInsert = Omit<SpecVersionRow, "created_at"> & {
  created_at?: string;
};

export type AuditLogInsert = Omit<AuditLogRow, "created_at"> & {
  created_at?: string;
};

// ---------------------------------------------------------------------------
// Update types (all optional except id is not sent)
// ---------------------------------------------------------------------------

export type AgentUpdate = Partial<Omit<AgentRow, "id" | "created_at" | "user_id">>;
export type NetworkUpdate = Partial<Omit<NetworkRow, "id" | "created_at" | "user_id">>;

// ---------------------------------------------------------------------------
// Supabase Database type — passed as generic to createClient<Database>()
// ---------------------------------------------------------------------------

export interface Database {
  public: {
    Tables: {
      agents: {
        Row: AgentRow;
        Insert: AgentInsert;
        Update: AgentUpdate;
      };
      agent_specs: {
        Row: AgentSpecRow;
        Insert: AgentSpecInsert;
        Update: Partial<Omit<AgentSpecRow, "id" | "created_at">>;
      };
      networks: {
        Row: NetworkRow;
        Insert: NetworkInsert;
        Update: NetworkUpdate;
      };
      connections: {
        Row: ConnectionRow;
        Insert: ConnectionInsert;
        Update: Partial<Omit<ConnectionRow, "id" | "created_at">>;
      };
      spec_versions: {
        Row: SpecVersionRow;
        Insert: SpecVersionInsert;
        Update: never; // versions are immutable
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: never; // audit log is append-only
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      agent_status: AgentStatusDB;
      connection_type: ConnectionTypeDB;
      audit_action: AuditActionDB;
    };
  };
}

// ---------------------------------------------------------------------------
// Convenience re-exports for repository use
// ---------------------------------------------------------------------------

export type Tables = Database["public"]["Tables"];
export type TableName = keyof Tables;
