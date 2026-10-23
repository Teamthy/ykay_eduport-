import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  enforceRateLimit: vi.fn(),
}));

vi.mock("@/lib/session", () => {
  class IdentityCheckUnavailableError extends Error {
    constructor() {
      super("database unavailable");
      this.name = "IdentityCheckUnavailableError";
    }
  }
  return {
    getSession: mocks.getSession,
    IdentityCheckUnavailableError,
  };
});

vi.mock("@/lib/rate-limit", () => ({ enforceRateLimit: mocks.enforceRateLimit }));

describe("requireCbtUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.enforceRateLimit.mockResolvedValue({ success: true, configurationError: false });
  });

  it("refuses anonymous sessions before rate limiting", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { requireCbtUser, isResponse } = await import("@/lib/cbt-auth");
    const result = await requireCbtUser();

    expect(isResponse(result)).toBe(true);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("refuses authenticated non-student roles", async () => {
    mocks.getSession.mockResolvedValue({ id: "parent_1", role: "PARENT" });
    const { requireCbtUser } = await import("@/lib/cbt-auth");
    const result = await requireCbtUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });

  it("allows a student only after the per-account limiter passes", async () => {
    const student = { id: "student_1", role: "STUDENT", schoolId: "school_1" };
    mocks.getSession.mockResolvedValue(student);
    const { requireCbtUser } = await import("@/lib/cbt-auth");

    await expect(requireCbtUser()).resolves.toEqual(student);
    expect(mocks.enforceRateLimit).toHaveBeenCalledWith("cbt", "student_1");
  });

  it("returns 429 when the per-account limit is exceeded", async () => {
    mocks.getSession.mockResolvedValue({ id: "student_1", role: "STUDENT" });
    mocks.enforceRateLimit.mockResolvedValue({
      success: false,
      retryAfterSeconds: 45,
      configurationError: false,
    });
    const { requireCbtUser } = await import("@/lib/cbt-auth");
    const result = await requireCbtUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(429);
  });

  it("fails closed with 503 when the database cannot verify the session", async () => {
    const { IdentityCheckUnavailableError } = await import("@/lib/session");
    mocks.getSession.mockRejectedValue(new IdentityCheckUnavailableError());
    const { requireCbtUser } = await import("@/lib/cbt-auth");
    const result = await requireCbtUser();

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(503);
    expect(mocks.enforceRateLimit).not.toHaveBeenCalled();
  });
});
