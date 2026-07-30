/**
 * Shared HTTP primitives — session token storage + API base.
 * Kept separate from api.ts so the offline cache can import these without
 * creating a require cycle (api.ts <-> cache.ts).
 */
import * as SecureStore from "expo-secure-store";

/**
 * Point this at the deployed Ykay College backend.
 * Default is the live Vercel backend so the app works even if the build-time
 * EXPO_PUBLIC_API_URL env var isn't passed. Override locally with
 * EXPO_PUBLIC_API_URL=http://<lan-ip>:3000 for dev against a local server.
 */
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://ykay-eduport2.vercel.app";

const SESSION_KEY = "ykay_session";

export interface SessionUser {
  id: string;
  schoolId: string;
  role: string;
  name: string;
  email: string;
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// ── Auth-expiry handling ────────────────────────────────────────────────
// Any 401 anywhere clears the token and fires a registered handler (e.g. the
// root layout redirects to login), so expired/revoked sessions never leave the
// user stuck on a dead screen.
let authExpiredHandler: (() => void) | null = null;

export function setAuthExpiredHandler(fn: () => void): void {
  authExpiredHandler = fn;
}

export async function notifyAuthExpired(): Promise<void> {
  try {
    await clearToken();
  } catch {
    /* ignore */
  }
  authExpiredHandler?.();
}

/** Build auth headers, attaching the session cookie if a token is stored. */
export async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (token) h["Cookie"] = `ykay_session=${token}`;
  return h;
}
