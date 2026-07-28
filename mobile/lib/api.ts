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

type ExamAnswer = { questionId: string; response: string | null };

export const studentApi = {
  dashboard: () => api("/api/student/dashboard"),
  reportCards: () => api("/api/student/report-cards"),
  attendance: () => api("/api/student/attendance"),
  exams: () => api("/api/student/exams"),
  announcements: () => api("/api/student/announcements"),

  /** Start (or resume) an exam attempt — returns attempt + questions. */
  startExam: (examId: string) =>
    api(`/api/student/exams/${examId}/attempt`, { method: "POST" }),

  /** Autosave answers without submitting. */
  saveExam: (examId: string, attemptId: string, answers: ExamAnswer[]) =>
    api(`/api/student/exams/${examId}/attempt`, {
      method: "PATCH",
      body: JSON.stringify({ attemptId, action: "SAVE", answers }),
    }),

  /** Submit the attempt for grading. */
  submitExam: (examId: string, attemptId: string, answers: ExamAnswer[]) =>
    api(`/api/student/exams/${examId}/attempt`, {
      method: "PATCH",
      body: JSON.stringify({ attemptId, action: "SUBMIT", answers }),
    }),
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

  // ── Attendance register ──
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
  }) => api("/api/teacher/attendance/register", { method: "POST", body: JSON.stringify(data) }),

  // ── Gradebook ──
  gradebook: (assignmentId?: string) =>
    api("/api/teacher/gradebook" + (assignmentId ? `?assignmentId=${assignmentId}` : "")),
  saveGradebook: (assignmentId: string, action: "SAVE" | "SUBMIT", scores: any[]) =>
    api("/api/teacher/gradebook", { method: "POST", body: JSON.stringify({ assignmentId, action, scores }) }),
};

// ── Parent API ────────────────────────────────────────────

export const parentApi = {
  dashboard: () => api("/api/parent/dashboard"),
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
  /** Create a Paystack checkout or bank-transfer intent. */
  pay: (
    invoiceId: string,
    method: "PAYSTACK" | "BANK_TRANSFER",
    opts?: { amount?: number; transferReference?: string; transferDate?: string; narration?: string },
  ) =>
    api("/api/parent/fees/payment-intents", {
      method: "POST",
      body: JSON.stringify({ invoiceId, method, ...opts }),
    }),
};
