-- =============================================================================
-- Migration 001 — Initial schema
-- ContextLayer: agents, networks, connections, specs, audit log
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- fuzzy text search on names

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

CREATE TYPE agent_status   AS ENUM ('active', 'inactive', 'testing');
CREATE TYPE connection_type AS ENUM (
  'sequential',
  'parallel',
  'escalation',
  'conditional',
  'feedback'
);
CREATE TYPE audit_action   AS ENUM ('create', 'update', 'delete', 'deploy');

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at column
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Table: agents
-- ---------------------------------------------------------------------------

CREATE TABLE agents (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  description TEXT        NOT NULL DEFAULT '',
  -- AgentConfig + role serialised as JSONB (avoids extra FK for inline config)
  spec        JSONB       NOT NULL DEFAULT '{}',
  version     TEXT        NOT NULL DEFAULT '1',
  status      agent_status NOT NULL DEFAULT 'inactive',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: agent_specs
-- Core spec record — one current spec per agent
-- ---------------------------------------------------------------------------

CREATE TABLE agent_specs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  spec_data   JSONB       NOT NULL DEFAULT '{}',
  version     TEXT        NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID        NOT NULL REFERENCES auth.users(id)
);

-- ---------------------------------------------------------------------------
-- Table: networks
-- ---------------------------------------------------------------------------

CREATE TABLE networks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 255),
  description     TEXT        NOT NULL DEFAULT '',
  -- Denormalised list of agent UUIDs for fast reads; connections table is canonical
  agents          UUID[]      NOT NULL DEFAULT '{}',
  -- Additional users who can access this network (team sharing)
  shared_user_ids UUID[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER networks_updated_at
  BEFORE UPDATE ON networks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Table: connections
-- ---------------------------------------------------------------------------

CREATE TABLE connections (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  network_id       UUID            NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
  source_agent_id  UUID            NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  target_agent_id  UUID            NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  connection_type  connection_type NOT NULL DEFAULT 'sequential',
  -- Optional routing rules / conditional expressions
  routing_rules    JSONB,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  -- Prevent duplicate edges in the same network
  CONSTRAINT connections_unique_edge UNIQUE (network_id, source_agent_id, target_agent_id)
);

-- ---------------------------------------------------------------------------
-- Table: spec_versions
-- Immutable history of spec changes — never updated, only inserted
-- ---------------------------------------------------------------------------

CREATE TABLE spec_versions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     UUID        NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  spec_data    JSONB       NOT NULL,
  version      TEXT        NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID        NOT NULL REFERENCES auth.users(id),
  change_notes TEXT
);

-- ---------------------------------------------------------------------------
-- Table: audit_log
-- Append-only event log — rows are never updated or deleted
-- ---------------------------------------------------------------------------

CREATE TABLE audit_log (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id   UUID         NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action     audit_action NOT NULL,
  before     JSONB,
  after      JSONB,
  user_id    UUID         NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Prevent accidental updates / deletes on audit_log
CREATE RULE audit_log_no_update AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE audit_log_no_delete AS ON DELETE TO audit_log DO INSTEAD NOTHING;
