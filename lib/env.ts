/**
 * Type-safe environment variable access.
 * Import this instead of process.env directly.
 */

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. Check your .env.local file.`
    );
  }
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

// ---------------------------------------------------------------------------
// Server-side env (never expose to client)
// ---------------------------------------------------------------------------

export const serverEnv = {
  get ANTHROPIC_API_KEY() {
    return requireEnv("ANTHROPIC_API_KEY");
  },
  get ANTHROPIC_MODEL() {
    return optionalEnv("ANTHROPIC_MODEL", "claude-sonnet-4-6");
  },
  get ANTHROPIC_MAX_TOKENS() {
    return Number(optionalEnv("ANTHROPIC_MAX_TOKENS", "8192"));
  },
} as const;

// ---------------------------------------------------------------------------
// Client-side env (NEXT_PUBLIC_ prefix required)
// ---------------------------------------------------------------------------

export const clientEnv = {
  APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? "ContextLayer",
} as const;
