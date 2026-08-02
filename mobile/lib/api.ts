/**
 * Ykay College — mobile API client.
 *
 * Single-tenant client for the Ykay College portal. Talks to the SAME backend
 * as the web app. Offline-aware: reads go through a network-first cache
 * (cachedGet) and offline-safe writes are queued (apiQueued → queuedWrite).
 *
 * Shared HTTP primitives live in lib/http (imported here and by the offline
 * cache) to avoid a require cycle.
 */
import { API_BASE, getToken, setToken, clearToken, authHeaders, notifyAuthExpired, type SessionUser } from "@/lib/http";
import { cachedGet, queuedWrite } from "@/lib/offline/cache";

// Re-export so existing `import { API_BASE, getToken, ... } from "@/lib/api"` keeps working.
export { API_BASE, getToken, setToken, clearToken };
export type { SessionUser };

/**
 * Typed API call.
 *
 * The default is `any`, not `unknown`, on purpose. Screens consume dynamic
 * server shapes (`res?.reports?.[0]?.id`) and with `unknown` the compiler
 * narrows the result to `{}`, producing "Property 'reports' does not exist on
 * type '{}'" on eight screens. Callers that want safety pass an explicit
 * generic — `api<DashboardResponse>("/api/student/dashboard")` — and get full
 * checking; the rest stay ergonomic instead of littered with casts.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function api<T = any>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  // Reads go through the offline read-cache (network-first, cache fallback).
  if (!options.method || options.method === "GET") {
    return cachedGet<T>(path);
  }
  // Mutations (payments, login, exam start) are sent directly — never queued.
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (res.status === 401) void notifyAuthExpired();
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data as T;
}

/** Offline-safe write: queued and replayed automatically when back online. */
export async function apiQueued<T = unknown>(
  path: string,
  method: string,
  body: unknown,
): Promise<T> {
  return queuedWrite<T>(path, method, body);
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

  const setCookie = res.headers.get("set-cookie") || "";
  const tokenMatch = setCookie.match(/ykay_session=([^;]+)/);
  const token = tokenMatch?.[1] || "";

  if (token) await setToken(token);
  return { user: data.user, token };
}

/**
 * Ask the backend to email a reset link.
 *
 * The API always answers with the same generic message so an attacker can't
 * use this to discover which addresses are registered — so there is no
 * "unknown email" error to surface, and we never reveal existence either.
 */
export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE}/api/auth/password-reset/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 429) {
    throw new Error(data.error || "Too many reset requests. Please try again later.");
  }
  return {
    message:
      data.message || "If this email is registered, you will receive a reset link shortly.",
  };
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

type ExamAnswer = { questionId: string; response: string | null };

export const studentApi = {
  dashboard: () => api("/api/student/dashboard"),
  reportCards: () => api("/api/student/report-cards"),
  attendance: () => api("/api/student/attendance"),
  exams: () => api("/api/student/exams"),
  announcements: () => api("/api/student/announcements"),
  teachers: () => api("/api/student/teachers"),

  startExam: (examId: string) => api(`/api/student/exams/${examId}/attempt`, { method: "POST" }),
  saveExam: (examId: string, attemptId: string, answers: ExamAnswer[]) =>
    apiQueued(`/api/student/exams/${examId}/attempt`, "PATCH", { attemptId, action: "SAVE", answers }),
  submitExam: (examId: string, attemptId: string, answers: ExamAnswer[]) =>
    apiQueued(`/api/student/exams/${examId}/attempt`, "PATCH", { attemptId, action: "SUBMIT", answers }),
};

// ── Teacher API ───────────────────────────────────────────

export const teacherApi = {
  dashboard: () => api("/api/teacher/dashboard"),
  students: () => api("/api/teacher/students"),
  roster: () => api("/api/teacher/class/roster"),
  profile: () => api("/api/teacher/profile"),
  analytics: () => api("/api/teacher/analytics"),
  announcements: () => api("/api/teacher/announcements"),
  messages: () => api("/api/teacher/messages"),

  attendance: (classId?: string, date?: string) => {
    const p = new URLSearchParams();
    if (classId) p.set("classId", classId);
    if (date) p.set("date", date);
    const q = p.toString();
    return api("/api/teacher/attendance/register" + (q ? `?${q}` : ""));
  },
  saveAttendance: (data: {
    classId: string;
    sessionDate: string;
    periodKey?: string;
    notes?: string | null;
    finalize?: boolean;
    entries: { studentProfileId: string; status: string; note?: string | null }[];
  }) => apiQueued("/api/teacher/attendance/register", "POST", data),

  gradebook: (assignmentId?: string) =>
    api("/api/teacher/gradebook" + (assignmentId ? `?assignmentId=${assignmentId}` : "")),
  saveGradebook: (assignmentId: string, action: "SAVE" | "SUBMIT", scores: any[]) =>
    apiQueued("/api/teacher/gradebook", "POST", { assignmentId, action, scores }),
};

// ── Parent API ────────────────────────────────────────────

export const parentApi = {
  dashboard: (studentId?: string) =>
    api("/api/parent/dashboard" + (studentId ? `?studentId=${studentId}` : "")),
  reportCards: (studentId?: string) =>
    api("/api/parent/report-cards" + (studentId ? `?studentId=${studentId}` : "")),
  fees: (studentId?: string) =>
    api("/api/parent/fees" + (studentId ? `?studentId=${studentId}` : "")),
  attendance: (studentId?: string, month?: string) => {
    const p = new URLSearchParams();
    if (studentId) p.set("studentId", studentId);
    if (month) p.set("month", month);
    const q = p.toString();
    return api("/api/parent/attendance" + (q ? `?${q}` : ""));
  },
  events: () => api("/api/parent/events"),
  messages: () => api("/api/parent/messages"),
  pay: (
    invoiceId: string,
    method: "PAYSTACK" | "BANK_TRANSFER",
    opts?: { amount?: number; transferReference?: string; transferDate?: string; narration?: string },
  ) =>
    api("/api/parent/fees/payment-intents", {
      method: "POST",
      // Idempotency key — required by the backend to prevent double-charge on
      // retry/double-tap. Self-contained (Hermes has no crypto.randomUUID).
      headers: {
        "x-idempotency-key":
          Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2),
      },
      body: JSON.stringify({ invoiceId, method, ...opts }),
    }),
};

// ── Admin API ─────────────────────────────────────────────

export const adminApi = {
  dashboard: () => api("/api/admin/dashboard"),
  createStaff: (data: { name: string; email: string; role: string; phone?: string }) =>
    api("/api/admin/staff/direct", { method: "POST", body: JSON.stringify(data) }),
  students: () => api("/api/admin/students"),
  finances: () => api("/api/admin/finances/overview"),
  fees: () => api("/api/admin/fees/overview"),
  sendFeeReminders: () => api("/api/admin/fees/reminders", { method: "POST" }),
  admissions: () => api("/api/admin/admissions"),
  reportCards: () => api("/api/admin/report-cards/overview"),
  generateReports: () => api("/api/admin/report-cards/generate", { method: "POST" }),
  news: () => api("/api/admin/news"),
  postNews: (data: { title: string; excerpt: string; content: string; category: string; isPublished: boolean }) =>
    api("/api/admin/news", { method: "POST", body: JSON.stringify(data) }),
  notifications: (status?: string) =>
    api("/api/admin/notifications" + (status ? `?status=${status}` : "")),
  broadcast: (data: { title: string; body: string; channels: string[]; audience: string }) =>
    api("/api/admin/notifications", { method: "POST", body: JSON.stringify(data) }),
  attendanceCorrections: () => api("/api/admin/attendance/corrections"),
  attendanceAnalytics: () => api("/api/admin/attendance/analytics"),
  classManager: () => api("/api/admin/class-manager"),
};
