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

/**
 * Sign-out has two callers and one contract.
 *
 * The rule these tests exist to protect: whatever happens on the server, the
 * browser that asked to be signed out must end up signed out. The previous
 * implementation answered 503 when the tokenVersion update failed, and the
 * client stayed on the page showing "your session may still be active" — even
 * though the Set-Cookie had already cleared it. That is the reported bug.
 */
describe("logout route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ id: "student_1", role: "STUDENT" });
    mocks.revokeAllSessions.mockResolvedValue(undefined);
  });

  it("clears the session cookie in the same response that confirms sign-out", async () => {
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      revoked: true,
      impersonationEnded: false,
    });
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.revokeAllSessions).toHaveBeenCalledWith("student_1");
  });

  it("still signs this browser out when revocation fails, and says so", async () => {
    mocks.revokeAllSessions.mockRejectedValue(new Error("database unavailable"));
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();
    const body = await response.json();

    // 200, not 503: the cookie is gone, so the browser IS signed out. `revoked`
    // carries the weaker truth — other devices may still hold a valid token.
    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.revoked).toBe(false);
    expect(body.warning).toMatch(/could not confirm/i);
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
  });

  it("signs out cleanly when the identity lookup is unavailable", async () => {
    mocks.getSession.mockRejectedValue(new Error("pool timeout"));
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("treats an already-signed-out browser as a success", async () => {
    mocks.getSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, revoked: true });
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled();
  });

  it("never revokes the impersonated victim's sessions", async () => {
    mocks.getSession.mockResolvedValue({
      id: "victim_user",
      role: "PARENT",
      impersonatedBy: "super_admin_1",
    });
    const { POST } = await import("@/app/api/auth/logout/route");
    const response = await POST();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, impersonationEnded: true });
    expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
    expect(mocks.revokeAllSessions).not.toHaveBeenCalled();
  });

  describe("GET — browser navigation", () => {
    async function callGet(query: string, headers: Record<string, string> = {}) {
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/auth/logout/route");
      return GET(new NextRequest(`http://localhost:3000/api/auth/logout${query}`, { headers }));
    }

    it("answers with a redirect the browser can follow without JavaScript", async () => {
      const response = await callGet("?role=STUDENT");

      expect(response.status).toBe(303);
      // Relative on purpose: the handler only knows the host it was invoked
      // with, which behind a proxy or preview hostname can be an address the
      // browser cannot resolve. The browser resolves this against the URL it
      // just requested, so sign-out lands on the right origin everywhere.
      expect(response.headers.get("location")).toBe("/login?portal=student&signedout=1");
      expect(response.cookies.get("ykay_session")?.maxAge).toBe(0);
    });

    it("routes staff and IT students to their own sign-in pages", async () => {
      expect((await callGet("?role=TEACHER")).headers.get("location")).toBe(
        "/login?portal=staff&signedout=1",
      );
      expect((await callGet("?role=IT_STUDENT")).headers.get("location")).toBe(
        "/it-portal/auth?signedout=1",
      );
      expect((await callGet("")).headers.get("location")).toBe("/login?signedout=1");
    });

    it("refuses to be used as an open redirect", async () => {
      for (const target of ["//evil.example", "https://evil.example", "evil.example"]) {
        const response = await callGet(`?next=${encodeURIComponent(target)}`);
        expect(response.headers.get("location"), target).toBe("/login?signedout=1");
      }
    });

    it("answers a top-level navigation from this site", async () => {
      const response = await callGet("?role=ADMIN", {
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "navigate",
      });
      expect(response.status).toBe(303);
    });

    it("refuses cross-site and non-navigation GETs without clearing the cookie", async () => {
      // <img src="/api/auth/logout"> sends dest=image, mode=no-cors, and a
      // cross-site link sends site=cross-site. Neither may sign anyone out:
      // sign-out revokes every session for the account.
      for (const headers of [
        { "sec-fetch-site": "cross-site", "sec-fetch-mode": "navigate" },
        { "sec-fetch-site": "same-origin", "sec-fetch-mode": "no-cors" },
        { "sec-fetch-site": "same-site", "sec-fetch-mode": "navigate" },
      ]) {
        const response = await callGet("?role=ADMIN", headers);
        expect(response.status, JSON.stringify(headers)).toBe(403);
        expect(response.cookies.get("ykay_session"), JSON.stringify(headers)).toBeUndefined();
      }
      expect(mocks.revokeAllSessions).not.toHaveBeenCalled();
    });

    it("never puts a host in the destination, whatever host invoked it", async () => {
      // The 303 must be origin-agnostic: a proxy hostname, a preview URL or an
      // internal address must not end up in Location.
      const { NextRequest } = await import("next/server");
      const { GET } = await import("@/app/api/auth/logout/route");
      const response = await GET(
        new NextRequest("http://internal-abc123:3000/api/auth/logout?role=ADMIN"),
      );
      expect(response.headers.get("location")).toBe("/login?portal=staff&signedout=1");
      expect(response.headers.get("location")).not.toContain("internal-abc123");
    });

    it("allows a same-site destination", async () => {
      const response = await callGet("?next=%2Flogin%3Fportal%3Dparent");
      expect(response.headers.get("location")).toBe("/login?portal=parent");
    });
  });
});
