"use client";

/**
 * Reuse a request key for the same logical write across retries and reloads.
 * The server hashes and validates the full payload; this client fingerprint is
 * only a localStorage lookup key and is not a security boundary.
 */
async function fingerprint(scope: string, body: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(`${scope}\n${JSON.stringify(body)}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function getIdempotencyKey(scope: string, body: unknown): Promise<string> {
  const hash = await fingerprint(scope, body);
  const storageKey = `ykay:idempotency:${hash}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;
  const key = crypto.randomUUID();
  window.localStorage.setItem(storageKey, key);
  return key;
}

export async function clearIdempotencyKey(scope: string, body: unknown): Promise<void> {
  const hash = await fingerprint(scope, body);
  window.localStorage.removeItem(`ykay:idempotency:${hash}`);
}
