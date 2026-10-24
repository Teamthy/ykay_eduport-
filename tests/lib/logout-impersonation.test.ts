import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  revokeAllSessions: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  SESSION_COOKIE: "ykay_session",
  getSession: mocks.getSession,
  revokeAllSessions: mocks.revokeAllSessions,
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

describe("POST /api/auth/logout during impersonation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("clears only the operator's browser cookie and never revokes the victim's sessions", async () => {
    mocks.getSession.mockResolvedValue({
      id: "victim_user",
      role: "PARENT",
      impersonatedBy: "super_admin_1",
    });
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, impersonationEnded: true });
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("continues to revoke normal-user sessions on logout", async () => {
    mocks.getSession.mockResolvedValue({ id: "student_1", role: "STUDENT" });
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(mocks.revokeAllSessions).toHaveBeenCalledWith("student_1");
  });

  it("reports a failed revocation instead of returning a false success", async () => {
    mocks.getSession.mockResolvedValue({ id: "student_1", role: "STUDENT" });
    mocks.revokeAllSessions.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      impersonationEnded: false,
      error: "Session revocation could not be confirmed.",
    });
    // Current browser still signs out even if a wider revocation needs retry.
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
  });
});
