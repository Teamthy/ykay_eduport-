import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

/**
 * Browser sign-out contract.
 *
 * Sign-out is now a navigation to `/api/auth/logout`, which revokes the
 * session, clears the cookie and answers with a 303 to the right sign-in page —
 * all in one response. Asserting on a request event alone proved too little:
 * the old flow could fire a request, fail to parse the reply and leave the
 * browser signed in. So this checks the three things a user would notice:
 *
 *   1. the click actually leaves the portal and lands on a sign-in page,
 *   2. the cookie is gone from the browser,
 *   3. replaying the old token is refused by the server.
 *
 * Runs only against the disposable PostgreSQL instance in CI.
 */
test.describe("authenticated sign-out", () => {
  test("the browser leaves the portal, the cookie is cleared, and the old token is revoked", async ({
    page,
    context,
    request,
  }) => {
    const cookieHeader = await apiLogin(request, "superadmin", {
      // Keep this role's one-time CI login separate from the suite's shared
      // test IP budget; this RFC 5737 address is reserved for documentation.
      forwardedFor: "198.51.100.98",
    });
    const token = cookieHeader.replace(/^ykay_session=/, "");
    await context.addCookies([
      {
        name: "ykay_session",
        value: token,
        domain: "127.0.0.1",
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);

    const pageResponse = await page.goto("/super-admin", { waitUntil: "domcontentloaded" });
    expect(pageResponse?.status()).toBeLessThan(400);

    // The portal legitimately offers two sign-out controls: the sidebar footer
    // and the topbar action. Both carry the accessible name "Sign out", so an
    // unscoped role query is ambiguous by design — target the topbar one.
    const signOut = page.locator('button[title="Sign out"]');
    await expect(signOut).toBeVisible();

    await signOut.click();
    await page.getByRole("button", { name: "Yes, sign me out" }).click();

    // 1. The browser leaves the portal behind and lands on a sign-in page.
    await page.waitForURL(/\/(login|it-portal\/auth)(\?.*)?$/, { timeout: 20_000 });
    expect(new URL(page.url()).pathname).toBe("/login");

    // 2. The cookie is gone.
    const remainingCookies = await context.cookies();
    expect(
      remainingCookies.some((cookie) => cookie.name === "ykay_session" && cookie.value === token),
    ).toBe(false);

    // 3. The server refuses the old token, so a stolen copy is worthless.
    const replayMe = await request.get("/api/auth/me", {
      headers: { cookie: `ykay_session=${token}` },
    });
    expect(replayMe.status()).toBe(401);

    // And the protected page is unreachable with it.
    await page.goto("/super-admin", { waitUntil: "domcontentloaded" });
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("the API transport clears the cookie and reports the same contract", async ({ request }) => {
    const cookieHeader = await apiLogin(request, "teacher", {
      forwardedFor: "198.51.100.97",
    });
    const token = cookieHeader.replace(/^ykay_session=/, "");

    const response = await request.post("/api/auth/logout", {
      headers: { cookie: `ykay_session=${token}` },
    });

    // 200, not 503: the browser is signed out even when wider revocation cannot
    // be confirmed, and `revoked` carries that weaker truth.
    expect(response.status()).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
    expect(response.headers()["set-cookie"] ?? "").toContain("ykay_session=");
  });
});
