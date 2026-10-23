import { describe, expect, it } from "vitest";

process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";

/**
 * AUTH-01 regression: impersonation tokens must expire in the JWT itself
 * after ~1 hour. A short cookie alone left a replayable 30-day Bearer token.
 */
function payloadOf(token: string) {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8")) as {
    iat: number;
    exp: number;
    impersonatedBy?: string;
  };
}

describe("signSession impersonation TTL", () => {
  it("gives impersonated sessions a one-hour expiry", async () => {
    const { signSession } = await import("@/lib/session");
    const token = await signSession({
      id: "victim_1",
      schoolId: "school_1",
      role: "PARENT" as never,
      name: "Parent One",
      email: "parent@example.com",
      impersonatedBy: "super_1",
    });
    const payload = payloadOf(token);
    expect(payload.impersonatedBy).toBe("super_1");
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(59 * 60);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(61 * 60);
  });

  it("keeps normal sessions at the standard 30-day expiry", async () => {
    const { signSession, SESSION_TTL_SECONDS } = await import("@/lib/session");
    const token = await signSession({
      id: "user_1",
      schoolId: "school_1",
      role: "TEACHER" as never,
      name: "Teacher One",
      email: "teacher@example.com",
    });
    const payload = payloadOf(token);
    expect(payload.impersonatedBy).toBeUndefined();
    expect(payload.exp - payload.iat).toBeGreaterThanOrEqual(SESSION_TTL_SECONDS - 120);
    expect(payload.exp - payload.iat).toBeLessThanOrEqual(SESSION_TTL_SECONDS + 120);
  });
});
