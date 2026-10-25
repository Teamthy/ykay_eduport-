import { expect, test } from "@playwright/test";
import { apiLogin } from "./helpers";

/**
 * Browser-to-backend sign-out contract.
 *
 * A request event alone is not enough: the response must confirm revocation,
 * the browser must clear its cookie, and replaying the old cookie must fail.
 * This runs only against the disposable PostgreSQL instance in CI.
 */
test.describe("authenticated sign-out", () => {
  test("the browser reaches the logout API and the old session is revoked", async ({
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

    const logoutRequestPromise = page.waitForRequest(
      (candidate) => candidate.url().includes("/api/auth/logout") && candidate.method() === "POST",
    );
    // Read the body inside the predicate: the page navigates to /login as soon
    // as the call resolves, and Playwright cannot fetch the body of a response
    // the page has already navigated away from.
    let logoutBody: unknown = null;
    const logoutResponsePromise = page.waitForResponse(async (candidate) => {
      if (!candidate.url().includes("/api/auth/logout")) return false;
      if (candidate.request().method() !== "POST") return false;
      logoutBody = await candidate.json().catch(() => null);
      return true;
    });

    await signOut.click();
    await page.getByRole("button", { name: "Yes, sign me out" }).click();

    const [logoutRequest, logoutResponse] = await Promise.all([
      logoutRequestPromise,
      logoutResponsePromise,
    ]);
    expect(logoutRequest.method()).toBe("POST");
    expect(logoutResponse.status()).toBe(200);
    expect(logoutBody).toMatchObject({ ok: true });

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    const remainingCookies = await context.cookies();
    expect(
      remainingCookies.some((cookie) => cookie.name === "ykay_session" && cookie.value === token),
    ).toBe(false);

    const replay = await request.get("/api/auth/me", {
      headers: { cookie: cookieHeader },
    });
    expect(replay.status(), "the API accepted a token after successful sign-out").toBe(401);
  });
});
