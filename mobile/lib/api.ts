/**
 * Ykay College — mobile API client.
 *
 * Single-tenant client for the Ykay College portal. Talks to the SAME backend
 * as the web app. Uses expo-secure-store for the JWT session cookie
 * (equivalent to the browser's httpOnly cookie).
 */
import * as SecureStore from "expo-secure-store";

/** Point this at the deployed Ykay College backend (or localhost:3000 for dev). */
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const SESSION_KEY = "ykay_session";

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export interface SessionUser {
  id: string;
  schoolId: string;
  role: string;
  name: string;
  email: string;
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Cookie: `ykay_session=${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

// ── Auth ──────────────────────────────────────────────────

export async function login(
  email: string,
  password: string,
): Promise<{ user: SessionUser; token: string }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");

  // Extract the session token from Set-Cookie header
  const setCookie = res.headers.get("set-cookie") || "";
  const tokenMatch = setCookie.match(/ykay_session=([^;]+)/);
  const token = tokenMatch?.[1] || "";

  if (token) await setToken(token);
  return { user: data.user, token };
}

export async function logout(): Promise<void> {
  try {
    await api("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore — we're clearing locally anyway
  }
  await clearToken();
}

export async function getMe(): Promise<{ user: SessionUser } | null> {
  const token = await getToken();
  if (!token) return null;
  try {
    return await api<{ user: SessionUser }>("/api/auth/me");
  } catch {
    return null;
  }
}

// ── Student API ───────────────────────────────────────────

export const studentApi = {
  dashboard: () => api("/api/student/dashboard"),
  reportCards: () => api("/api/student/report-cards"),
  attendance: () => api("/api/student/attendance"),
  exams: () => api("/api/student/exams"),
};

// ── Teacher API ───────────────────────────────────────────

export const teacherApi = {
  dashboard: () => api("/api/teacher/dashboard"),
  students: () => api("/api/teacher/students"),
  profile: () => api("/api/teacher/profile"),
};

// ── Parent API ────────────────────────────────────────────

export const parentApi = {
  dashboard: () => api("/api/parent/dashboard"),
  reportCards: () => api("/api/parent/report-cards"),
  fees: () => api("/api/parent/fees"),
  attendance: () => api("/api/parent/attendance"),
};
