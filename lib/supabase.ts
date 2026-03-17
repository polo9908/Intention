/**
 * lib/supabase.ts
 *
 * Supabase client initialisation, authentication helpers, and error handling.
 *
 * Two client variants
 * ───────────────────
 *   getBrowserClient()  — singleton, uses anon key + RLS, safe for client components
 *   getServerClient()   — new instance per call, uses service-role key for
 *                         privileged operations in API routes / server actions
 *
 * Auth helpers
 * ────────────
 *   getSession()        — current session or null
 *   getCurrentUser()    — current user or null
 *   signOut()           — sign out and clear session
 *   onAuthChange()      — subscribe to auth state changes
 *
 * Error handling
 * ──────────────
 *   SupabaseError       — typed wrapper around Supabase/PostgREST errors
 *   assertNoError()     — throws SupabaseError when Supabase returns an error
 */

import { createClient, type SupabaseClient, type User, type Session, type AuthChangeEvent } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

function requirePublicEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new SupabaseConfigError(
      `Missing environment variable: ${key}. Add it to .env.local and redeploy.`
    );
  }
  return value;
}

function getSupabaseUrl(): string {
  return requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
}

function getAnonKey(): string {
  return requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
}

function getServiceRoleKey(): string {
  // Falls back to anon key in environments where service role is unavailable
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? getAnonKey();
}

// ---------------------------------------------------------------------------
// Custom errors
// ---------------------------------------------------------------------------

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

export class SupabaseError extends Error {
  public readonly code: string;
  public readonly details: string | null;
  public readonly hint: string | null;
  public readonly statusCode: number | null;

  constructor(
    message: string,
    options: {
      code?: string;
      details?: string | null;
      hint?: string | null;
      statusCode?: number | null;
    } = {}
  ) {
    super(message);
    this.name = "SupabaseError";
    this.code = options.code ?? "UNKNOWN";
    this.details = options.details ?? null;
    this.hint = options.hint ?? null;
    this.statusCode = options.statusCode ?? null;
  }
}

export class SupabaseAuthError extends SupabaseError {
  constructor(message: string, code?: string) {
    super(message, { code: code ?? "AUTH_ERROR" });
    this.name = "SupabaseAuthError";
  }
}

export class SupabaseNotFoundError extends SupabaseError {
  constructor(entity: string, id: string) {
    super(`${entity} with id "${id}" not found.`, { code: "NOT_FOUND", statusCode: 404 });
    this.name = "SupabaseNotFoundError";
  }
}

// ---------------------------------------------------------------------------
// Error assertion helper
// ---------------------------------------------------------------------------

interface PostgrestError {
  message: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

/**
 * Throws a SupabaseError when `error` is truthy.
 * Call after every Supabase query:
 *   const { data, error } = await db.from(...).select(...)
 *   assertNoError(error);
 */
export function assertNoError(
  error: PostgrestError | null,
  context?: string
): asserts error is null {
  if (!error) return;

  throw new SupabaseError(
    context ? `[${context}] ${error.message}` : error.message,
    {
      code: error.code,
      details: error.details,
      hint: error.hint,
    }
  );
}

// ---------------------------------------------------------------------------
// Browser client (singleton)
// ---------------------------------------------------------------------------

let _browserClient: SupabaseClient<Database> | null = null;

/**
 * Returns a singleton Supabase client for use in browser (client) contexts.
 * Uses the anon key — all operations are subject to Row Level Security.
 */
export function getBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new SupabaseConfigError(
      "getBrowserClient() was called in a server context. Use getServerClient() instead."
    );
  }
  if (!_browserClient) {
    _browserClient = createClient<Database>(getSupabaseUrl(), getAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      db: {
        schema: "public",
      },
      global: {
        headers: {
          "x-application-name": process.env.NEXT_PUBLIC_APP_NAME ?? "ContextLayer",
        },
      },
    });
  }
  return _browserClient;
}

// ---------------------------------------------------------------------------
// Server client (no singleton — one per request)
// ---------------------------------------------------------------------------

/**
 * Creates a fresh Supabase client for server contexts (API routes, server
 * actions). Uses the service-role key to bypass RLS — only use for trusted,
 * authenticated operations.
 */
export function getServerClient(): SupabaseClient<Database> {
  return createClient<Database>(getSupabaseUrl(), getServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    db: {
      schema: "public",
    },
  });
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

/** Returns the current Supabase session or null if not authenticated */
export async function getSession(): Promise<Session | null> {
  const client = getBrowserClient();
  const { data, error } = await client.auth.getSession();
  if (error) throw new SupabaseAuthError(error.message, error.name);
  return data.session;
}

/** Returns the current user or null */
export async function getCurrentUser(): Promise<User | null> {
  const client = getBrowserClient();
  const { data, error } = await client.auth.getUser();
  if (error) {
    // PGRST401 = not authenticated — not an error, just return null
    if (error.name === "AuthSessionMissingError") return null;
    throw new SupabaseAuthError(error.message, error.name);
  }
  return data.user;
}

/**
 * Sign out the current user and clear the local session.
 * Clears the browser-client singleton so it is re-initialised on next use.
 */
export async function signOut(): Promise<void> {
  const client = getBrowserClient();
  const { error } = await client.auth.signOut();
  if (error) throw new SupabaseAuthError(error.message, error.name);
  _browserClient = null;
}

/**
 * Subscribe to auth state changes.
 * Returns an unsubscribe function — call it on cleanup.
 *
 * @example
 *   const unsubscribe = onAuthChange((event, session) => { ... });
 *   return () => unsubscribe();
 */
export function onAuthChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): () => void {
  const client = getBrowserClient();
  const { data } = client.auth.onAuthStateChange(callback);
  return () => data.subscription.unsubscribe();
}

/**
 * Returns the authenticated user's ID, or throws if not authenticated.
 * Convenience wrapper for repository operations that require a user_id.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new SupabaseAuthError("Authentication required.", "NOT_AUTHENTICATED");
  return user.id;
}
