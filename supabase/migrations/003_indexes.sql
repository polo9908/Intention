-- =============================================================================
-- Migration 003 — Performance indexes
-- =============================================================================

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------

-- Most queries filter by owner
CREATE INDEX idx_agents_user_id     ON agents (user_id);
-- Status-based filtering (active agents, testing agents, etc.)
CREATE INDEX idx_agents_status      ON agents (status);
-- Timeline / "recent agents" queries
CREATE INDEX idx_agents_created_at  ON agents (created_at DESC);
CREATE INDEX idx_agents_updated_at  ON agents (updated_at DESC);
-- Fuzzy name search
CREATE INDEX idx_agents_name_trgm   ON agents USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- agent_specs
-- ---------------------------------------------------------------------------

CREATE INDEX idx_agent_specs_agent_id   ON agent_specs (agent_id);
CREATE INDEX idx_agent_specs_created_by ON agent_specs (created_by);

-- ---------------------------------------------------------------------------
-- networks
-- ---------------------------------------------------------------------------

CREATE INDEX idx_networks_user_id    ON networks (user_id);
CREATE INDEX idx_networks_created_at ON networks (created_at DESC);
-- GIN index for querying the agents UUID array (e.g. WHERE agent_id = ANY(agents))
CREATE INDEX idx_networks_agents_gin ON networks USING gin (agents);
-- GIN index for shared_user_ids lookup
CREATE INDEX idx_networks_shared_gin ON networks USING gin (shared_user_ids);
-- Fuzzy name search
CREATE INDEX idx_networks_name_trgm  ON networks USING gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- connections
-- ---------------------------------------------------------------------------

-- The most common query: all connections for a network
CREATE INDEX idx_connections_network_id       ON connections (network_id);
-- Outbound / inbound edges for an agent
CREATE INDEX idx_connections_source_agent_id  ON connections (source_agent_id);
CREATE INDEX idx_connections_target_agent_id  ON connections (target_agent_id);
-- Filter by connection type
CREATE INDEX idx_connections_type             ON connections (connection_type);

-- ---------------------------------------------------------------------------
-- spec_versions
-- ---------------------------------------------------------------------------

-- History lookup per agent
CREATE INDEX idx_spec_versions_agent_id   ON spec_versions (agent_id);
-- Chronological history
CREATE INDEX idx_spec_versions_created_at ON spec_versions (created_at DESC);

-- ---------------------------------------------------------------------------
-- audit_log
-- ---------------------------------------------------------------------------

-- All events for a specific agent
CREATE INDEX idx_audit_log_agent_id   ON audit_log (agent_id);
-- All events by a specific user
CREATE INDEX idx_audit_log_user_id    ON audit_log (user_id);
-- Filter by action type
CREATE INDEX idx_audit_log_action     ON audit_log (action);
-- Chronological feed
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
