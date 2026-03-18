-- =============================================================================
-- Migration 002 — Row Level Security policies
-- =============================================================================
-- Principle: every user sees only their own data. Networks can be shared
-- explicitly via the shared_user_ids column.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enable RLS on all tables
-- ---------------------------------------------------------------------------

ALTER TABLE agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_specs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks      ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spec_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------

-- SELECT: own agents only
CREATE POLICY "agents: owner can select"
  ON agents FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: authenticated users, must set user_id = own uid
CREATE POLICY "agents: owner can insert"
  ON agents FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: own agents only
CREATE POLICY "agents: owner can update"
  ON agents FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: own agents only
CREATE POLICY "agents: owner can delete"
  ON agents FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- agent_specs
-- Access is derived from the parent agent's ownership
-- ---------------------------------------------------------------------------

CREATE POLICY "agent_specs: owner can select"
  ON agent_specs FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_specs: owner can insert"
  ON agent_specs FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_specs: owner can update"
  ON agent_specs FOR UPDATE
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "agent_specs: owner can delete"
  ON agent_specs FOR DELETE
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- networks
-- Owners have full access; shared users get read access
-- ---------------------------------------------------------------------------

-- SELECT: own networks + shared networks
CREATE POLICY "networks: owner can select"
  ON networks FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.uid() = ANY(shared_user_ids)
  );

CREATE POLICY "networks: owner can insert"
  ON networks FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: owners only (shared users are read-only)
CREATE POLICY "networks: owner can update"
  ON networks FOR UPDATE
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "networks: owner can delete"
  ON networks FOR DELETE
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- connections
-- Access derived from the parent network
-- ---------------------------------------------------------------------------

-- Shared helper: returns TRUE if auth.uid() may access the given network
CREATE OR REPLACE FUNCTION can_access_network(nid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM networks
    WHERE id = nid
      AND (user_id = auth.uid() OR auth.uid() = ANY(shared_user_ids))
  );
$$;

CREATE POLICY "connections: network member can select"
  ON connections FOR SELECT
  USING (can_access_network(network_id));

-- Only network owners may mutate connections
CREATE OR REPLACE FUNCTION owns_network(nid UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM networks WHERE id = nid AND user_id = auth.uid()
  );
$$;

CREATE POLICY "connections: network owner can insert"
  ON connections FOR INSERT
  WITH CHECK (owns_network(network_id));

CREATE POLICY "connections: network owner can update"
  ON connections FOR UPDATE
  USING (owns_network(network_id));

CREATE POLICY "connections: network owner can delete"
  ON connections FOR DELETE
  USING (owns_network(network_id));

-- ---------------------------------------------------------------------------
-- spec_versions  (append-only — no UPDATE/DELETE policies)
-- ---------------------------------------------------------------------------

CREATE POLICY "spec_versions: owner can select"
  ON spec_versions FOR SELECT
  USING (
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "spec_versions: owner can insert"
  ON spec_versions FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- audit_log  (append-only — no UPDATE/DELETE policies)
-- ---------------------------------------------------------------------------

CREATE POLICY "audit_log: owner can select"
  ON audit_log FOR SELECT
  USING (
    user_id = auth.uid()
    OR agent_id IN (
      SELECT id FROM agents WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "audit_log: owner can insert"
  ON audit_log FOR INSERT
  WITH CHECK (user_id = auth.uid());
