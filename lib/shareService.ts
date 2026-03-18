/**
 * shareService.ts — Generate and manage shareable read-only links for specs.
 *
 * Architecture (Phase 1 — frontend only):
 *   Shared specs are serialised to Base64-URL and appended as a hash fragment
 *   (#share=<payload>) so no server round-trip is needed.  The payload is NOT
 *   a real secret; sharing is "by obscurity" until the Supabase backend
 *   integration in Phase 2.
 *
 * Phase 2 will replace `generateShareLink` with a Supabase RPC call that
 *   creates a `shared_specs` row and returns a short token, and `revokeShare`
 *   will soft-delete the row.
 */

import type { AgentSpec } from "@/types";
import { generateId }     from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SharePermission = "view" | "clone";

export interface ShareOptions {
  /** What the recipient can do with the spec (default "view") */
  permission?: SharePermission;
  /** ISO 8601 expiry; null = never expires */
  expiresAt?: string | null;
  /** Human-readable note attached to the share */
  note?: string;
}

export interface ShareRecord {
  /** Random share id, also the token embedded in the link */
  id: string;
  specId: string;
  specName: string;
  specVersion: number;
  permission: SharePermission;
  /** URL that can be sent to the recipient */
  shareUrl: string;
  createdAt: string;
  expiresAt: string | null;
  note: string | null;
  /** Whether the share has been revoked */
  revoked: boolean;
}

export interface SharePayload {
  /** Share record id */
  sid: string;
  /** Partial spec snapshot (no sensitive ids) */
  spec: Pick<AgentSpec, "name" | "description" | "version" | "model" | "systemPrompt" | "maxTokens" | "temperature" | "capabilities">;
  perm: SharePermission;
  exp: string | null;
}

// ---------------------------------------------------------------------------
// Local storage key
// ---------------------------------------------------------------------------

const STORAGE_KEY = "cl:shares";

function loadShares(): ShareRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]") as ShareRecord[];
  } catch {
    return [];
  }
}

function saveShares(records: ShareRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

// ---------------------------------------------------------------------------
// URL helpers
// ---------------------------------------------------------------------------

function encodePayload(payload: SharePayload): string {
  const json  = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  // btoa requires a binary string — convert Uint8Array manually
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodePayload(encoded: string): SharePayload | null {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base64);
    const bytes  = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const json   = new TextDecoder().decode(bytes);
    return JSON.parse(json) as SharePayload;
  } catch {
    return null;
  }
}

function buildShareUrl(shareId: string, encoded: string): string {
  if (typeof window === "undefined") {
    return `https://contextlayer.dev/share/${shareId}#payload=${encoded}`;
  }
  const base = `${window.location.origin}/share/${shareId}`;
  return `${base}#payload=${encoded}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a shareable link for a spec and store it in localStorage.
 * Returns the full ShareRecord including the URL.
 */
export function generateShareLink(
  spec: AgentSpec,
  options: ShareOptions = {},
): ShareRecord {
  const shareId    = generateId("sh");
  const permission = options.permission ?? "view";
  const expiresAt  = options.expiresAt  ?? null;
  const now        = new Date().toISOString();

  const payload: SharePayload = {
    sid:  shareId,
    spec: {
      name:         spec.name,
      description:  spec.description,
      version:      spec.version,
      model:        spec.model,
      systemPrompt: spec.systemPrompt,
      maxTokens:    spec.maxTokens,
      temperature:  spec.temperature,
      capabilities: spec.capabilities,
    },
    perm: permission,
    exp:  expiresAt,
  };

  const encoded  = encodePayload(payload);
  const shareUrl = buildShareUrl(shareId, encoded);

  const record: ShareRecord = {
    id:           shareId,
    specId:       spec.id,
    specName:     spec.name,
    specVersion:  spec.version,
    permission,
    shareUrl,
    createdAt:    now,
    expiresAt,
    note:         options.note ?? null,
    revoked:      false,
  };

  const existing = loadShares();
  saveShares([...existing, record]);

  return record;
}

/**
 * List all share records for a given specId (non-revoked by default).
 */
export function listShares(
  specId: string,
  includeRevoked = false,
): ShareRecord[] {
  return loadShares().filter(
    (r) => r.specId === specId && (includeRevoked || !r.revoked),
  );
}

/**
 * Revoke a share by id — marks it revoked in localStorage.
 * In Phase 2, this will also call the Supabase RPC.
 */
export function revokeShare(shareId: string): void {
  const records = loadShares().map((r) =>
    r.id === shareId ? { ...r, revoked: true } : r,
  );
  saveShares(records);
}

/**
 * Check if a share is still valid (not revoked, not expired).
 */
export function isShareValid(record: ShareRecord): boolean {
  if (record.revoked) return false;
  if (record.expiresAt && new Date(record.expiresAt) < new Date()) return false;
  return true;
}

/**
 * Parse a share payload from a URL hash fragment.
 * Returns null if the payload is missing or malformed.
 */
export function parseSharePayload(hash: string): SharePayload | null {
  const match = hash.match(/[#&]payload=([^&]+)/);
  if (!match) return null;
  return decodePayload(match[1]);
}

/**
 * Copy a share URL to the clipboard.
 * Returns true if successful.
 */
export async function copyShareUrl(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
