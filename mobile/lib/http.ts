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
/**
 * Where the API lives.
 *
 * On NATIVE this must be absolute — there is no page origin to be relative to.
 *
 * On WEB, an explicitly empty EXPO_PUBLIC_API_URL means "use relative URLs",
 * which lets Metro's dev proxy (metro.config.js) forward /api/... to the
 * deployed backend server-side. That is the only way to authenticate from a
 * web preview: the deployed API allows exactly one CORS origin
 * (NEXT_PUBLIC_SITE_URL), so a browser on :8081 has its response blocked
 * before any code runs — the infamous "Failed to fetch".
 *
 * `??` rather than `||` on purpose: `||` would treat the deliberate empty
 * string as "unset" and fall back to the absolute URL, reintroducing CORS.
 */
const CONFIGURED_API_URL = process.env.EXPO_PUBLIC_API_URL;
export const API_BASE =
  CONFIGURED_API_URL !== undefined && CONFIGURED_API_URL !== ""
    ? CONFIGURED_API_URL
    : CONFIGURED_API_URL === "" && typeof window !== "undefined"
      ? "" // web + explicitly blank -> relative, proxied by Metro
      : "https://ykay-eduport2.vercel.app";

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
