import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  enforceRateLimit: vi.fn(),
  checkRateLimit: vi.fn(),
  recordSecurityEvent: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: routeMocks.enforceRateLimit,
  checkRateLimit: routeMocks.checkRateLimit,
}));

vi.mock("@/lib/forensics", () => ({
  recordSecurityEvent: routeMocks.recordSecurityEvent,
  getUserAgent: vi.fn(() => "test-agent"),
}));

vi.mock("@/lib/session", () => ({
  sessionCookie: vi.fn(),
  signSession: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  resolveTenantFromHost: vi.fn(),
}));

function postLogin() {
  return new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "user@example.test", password: "password" }),
  });
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  routeMocks.enforceRateLimit.mockResolvedValue({
    success: true,
    retryAfterSeconds: 0,
    configurationError: false,
  });
  routeMocks.checkRateLimit.mockResolvedValue({
    success: true,
    retryAfterSeconds: 0,
    configurationError: false,
  });
});

describe("POST /api/auth/login — rate-limit failures", () => {
  it("returns 503 when the IP limiter is unconfigured, without recording a failed login", async () => {
    routeMocks.enforceRateLimit.mockResolvedValueOnce({
      success: false,
      retryAfterSeconds: 900,
      configurationError: true,
    });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(postLogin());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(await response.json()).toMatchObject({
      error: "Sign-in is temporarily unavailable. Please try again shortly.",
    });
    expect(routeMocks.checkRateLimit).not.toHaveBeenCalled();
    expect(routeMocks.recordSecurityEvent).not.toHaveBeenCalled();
  });

  it("still returns 429 and records a security event when the IP budget is actually exceeded", async () => {
    routeMocks.enforceRateLimit.mockResolvedValueOnce({
      success: false,
      retryAfterSeconds: 60,
      configurationError: false,
    });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(postLogin());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(routeMocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({ reason: "Rate limited — too many login attempts from this IP." }),
    );
  });

  it("returns 503 when the per-email limiter is unconfigured", async () => {
    routeMocks.checkRateLimit.mockResolvedValueOnce({
      success: false,
      retryAfterSeconds: 900,
      configurationError: true,
    });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(postLogin());

    expect(response.status).toBe(503);
    expect(response.headers.get("Retry-After")).toBe("900");
    expect(routeMocks.checkRateLimit).toHaveBeenCalledWith("loginStrict", "user@example.test");
    expect(routeMocks.recordSecurityEvent).not.toHaveBeenCalled();
  });

  it("still returns 429 and records a security event when the per-email budget is exceeded", async () => {
    routeMocks.checkRateLimit.mockResolvedValueOnce({
      success: false,
      retryAfterSeconds: 120,
      configurationError: false,
    });
    const { POST } = await import("@/app/api/auth/login/route");

    const response = await POST(postLogin());

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("120");
    expect(routeMocks.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userEmail: "user@example.test",
        reason: "Rate limited — too many failed attempts for this email.",
      }),
    );
  });
});
