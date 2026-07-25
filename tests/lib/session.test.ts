import { describe, it, expect, vi, beforeEach } from "vitest";

// Set AUTH_SECRET before importing session module
process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";

describe("signSession and verifySession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs and verifies a session round-trip", async () => {
    const { signSession, verifySession } = await import("@/lib/session");

    const token = await signSession({
      id: "user_123",
      schoolId: "school_1",
      role: "TEACHER" as any,
      name: "Grace Okonkwo",
      email: "grace@school.com",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT format

    const user = await verifySession(token);
    expect(user).not.toBeNull();
    expect(user!.id).toBe("user_123");
    expect(user!.email).toBe("grace@school.com");
    expect(user!.role).toBe("TEACHER");
    expect(user!.name).toBe("Grace Okonkwo");
  });

  it("includes mustChangePassword flag", async () => {
    const { signSession, verifySession } = await import("@/lib/session");

    const token = await signSession({
      id: "user_456",
      schoolId: "school_1",
      role: "PARENT" as any,
      name: "Parent User",
      email: "parent@school.com",
      mustChangePassword: true,
    });

    const user = await verifySession(token);
    expect(user!.mustChangePassword).toBe(true);
  });

  it("includes impersonatedBy claim", async () => {
    const { signSession } = await import("@/lib/session");
    const { jwtVerify } = await import("jose");

    const token = await signSession({
      id: "target_user",
      schoolId: "school_1",
      role: "STUDENT" as any,
      name: "Student",
      email: "student@school.com",
      impersonatedBy: "super_admin_1",
    });

    // Decode the raw JWT to verify the claim
    const encoder = new TextEncoder();
    const { payload } = await jwtVerify(token, encoder.encode(process.env.AUTH_SECRET));
    expect(payload.impersonatedBy).toBe("super_admin_1");
  });

  it("returns null for invalid tokens", async () => {
    const { verifySession } = await import("@/lib/session");

    const user = await verifySession("invalid.token.here");
    expect(user).toBeNull();
  });

  it("returns null for expired tokens", async () => {
    const { SignJWT } = await import("jose");
    const { verifySession } = await import("@/lib/session");
    const encoder = new TextEncoder();

    const token = await new SignJWT({
      schoolId: "school_1",
      role: "TEACHER",
      name: "Test",
      email: "test@test.com",
      mustChangePassword: false,
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 100000)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 1)
      .sign(encoder.encode(process.env.AUTH_SECRET!));

    const user = await verifySession(token);
    expect(user).toBeNull();
  });
});

describe("requireRole", () => {
  it("returns null when no session exists", async () => {
    const { requireRole } = await import("@/lib/session");
    const result = await requireRole(["ADMIN" as any]);
    expect(result).toBeNull();
  });
});

describe("sessionCookie", () => {
  it("returns a cookie config with httpOnly", async () => {
    const { sessionCookie } = await import("@/lib/session");
    const cookie = sessionCookie("test-token");
    expect(cookie.name).toBe("ykay_session");
    expect(cookie.value).toBe("test-token");
    expect(cookie.options.httpOnly).toBe(true);
    expect(cookie.options.path).toBe("/");
  });
});
