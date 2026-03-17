/**
 * lib/repositories/index.ts
 *
 * Central export and factory functions for all repositories.
 *
 * Usage — server side (API routes, server actions)
 * ─────────────────────────────────────────────────
 *   import { createServerRepositories } from '@/lib/repositories';
 *   const { agents, networks, specs, audit } = createServerRepositories();
 *   const agent = await agents.findById(id);
 *
 * Usage — client side (hooks, client components)
 * ───────────────────────────────────────────────
 *   import { createClientRepositories } from '@/lib/repositories';
 *   const { agents } = createClientRepositories();
 *   const list = await agents.list();
 */

export { AgentRepository }   from "./agentRepository";
export { NetworkRepository }  from "./networkRepository";
export { SpecRepository }     from "./specRepository";
export { AuditRepository }    from "./auditRepository";

export type { LogOptions, AuditEntry, AuditListOptions } from "./auditRepository";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient, getServerClient } from "@/lib/supabase";
import { AgentRepository }  from "./agentRepository";
import { NetworkRepository } from "./networkRepository";
import { SpecRepository }    from "./specRepository";
import { AuditRepository }   from "./auditRepository";
import type { Database } from "@/types/database";

// ---------------------------------------------------------------------------
// Repository bundle type
// ---------------------------------------------------------------------------

export interface Repositories {
  agents:   AgentRepository;
  networks: NetworkRepository;
  specs:    SpecRepository;
  audit:    AuditRepository;
}

// ---------------------------------------------------------------------------
// Factory — pass any SupabaseClient
// ---------------------------------------------------------------------------

export function createRepositories(client: SupabaseClient<Database>): Repositories {
  return {
    agents:   new AgentRepository(client),
    networks: new NetworkRepository(client),
    specs:    new SpecRepository(client),
    audit:    new AuditRepository(client),
  };
}

// ---------------------------------------------------------------------------
// Server-side factory (service-role key, bypasses RLS)
// ---------------------------------------------------------------------------

export function createServerRepositories(): Repositories {
  return createRepositories(getServerClient());
}

// ---------------------------------------------------------------------------
// Client-side factory (anon key, subject to RLS)
// ---------------------------------------------------------------------------

export function createClientRepositories(): Repositories {
  return createRepositories(getBrowserClient());
}
