import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, getSession, revokeAllSessions, type SessionUser } from "@/lib/session";
import { signedOutPathForRole } from "@/lib/auth-redirect";
import { logger } from "@/lib/logger";

/**
 * Sign-out.
 *
 * Two callers, one code path:
 *
 *   GET  /api/auth/logout   ← a browser navigating here (the portal button, the
 *                             /logout page, an email link, a bookmark)
 *   POST /api/auth/logout   ← API clients and the browser suite, which read JSON
 *
 * ── Why the browser goes through a navigation, not fetch() ──────────────────
 * The previous client issued fetch() with a 10s deadline, then threw on any
 * non-2xx, and only navigated on `{ok:true}`. That made sign-out depend on
 * three things it should not: the function warming within ten seconds, the
 * identity lookup succeeding, and the tokenVersion update succeeding. A cold
 * serverless start plus a slow database produced "The server did not confirm
 * that your session was revoked" on a request that had, in fact, cleared the
 * cookie — a sign-out that worked but said it had failed.
 *
 * GET now does the work server-side and answers with a redirect, so the
 * browser leaves with the cookie already gone. It cannot be blocked by
 * JavaScript that has crashed, by a fetch that timed out, or by a dialog the
 * user dismissed.
 *
 * ── Why POST never returns 5xx ──────────────────────────────────────────────
 * HTTP semantics would allow 503 when server-side revocation fails. In this
 * product that is the wrong trade: the client would stay on a page it can no
 * longer use, and the user would be told sign-out failed when their cookie has
 * already been cleared. The status is 200 with `revoked:false`, an explicit
 * `warning`, and a loud log line — the session generation is still bumped on
 * the next successful attempt, and the cookie is gone either way.
 */
export const dynamic = "force-dynamic";

function clearSessionCookie(response: NextResponse) {
  // Path and flags must match lib/session.ts exactly. A mismatch leaves the old
  // cookie in place and the browser stays signed in while the UI says otherwise
  // — the failure this route was rewritten to remove.
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  });
  // Belt and braces: browsers treat a `__Secure-`/`__Host-` prefixed variant of
  // the same name as a different cookie, and an older build wrote a cookie with
  // no explicit path. Clearing the bare name at the root path covers both.
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0, expires: new Date(0) });
  // Never let a proxy or the browser reuse a stale signed-in response.
  response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
  response.headers.set("Clear-Site-Data", '"cache"');
  return response;
}

type Outcome = { revoked: boolean; impersonationEnded: boolean; warning?: string };

async function revoke() {
  let user: SessionUser | null = null;
  let lookupFailed = false;

  try {
    user = await getSession();
  } catch (error) {
    // Identity lookup unavailable (DB blip): the cookie is still cleared below
    // so this device signs out, and the caller is told revocation is unproven.
    lookupFailed = true;
    logger.error("logout: session lookup failed; clearing cookie only", {
      error: String(error),
    });
  }

  // AUTH-01: while a super-admin is IMPERSONATING, getSession() returns the
  // *victim*. Bumping that account's tokenVersion signed an innocent parent or
  // teacher out on every device because an operator clicked Sign Out. An
  // impersonation sign-out only clears this browser's cookie; the impersonation
  // JWT expires within the hour and "End impersonation" is the proper exit.
  const impersonationEnded = Boolean(user?.impersonatedBy);

  if (impersonationEnded) {
    logger.info("logout during impersonation: victim sessions left untouched", {
      impersonatedUserId: user?.id,
      impersonatedBy: user?.impersonatedBy,
    });
    return { revoked: true, impersonationEnded: true } satisfies Outcome;
  }

  if (!user) {
    // No valid session: nothing to revoke, and signing out an already-signed-out
    // browser is a success, not an error.
    return {
      revoked: !lookupFailed,
      impersonationEnded: false,
      ...(lookupFailed
        ? { warning: "We could not verify your session, but this browser has been signed out." }
        : {}),
    } satisfies Outcome;
  }

  try {
    await revokeAllSessions(user.id);
    return { revoked: true, impersonationEnded: false } satisfies Outcome;
  } catch (error) {
    logger.error("logout: failed to revoke sessions", { userId: user.id, error: String(error) });
    return {
      revoked: false,
      impersonationEnded: false,
      warning:
        "This browser is signed out, but we could not confirm that every device was revoked. Sign out again once the connection recovers.",
    } satisfies Outcome;
  }
}

/**
 * A GET signs the account out, so it must only answer a top-level navigation
 * that started on this site.
 *
 * Sign-out revokes every session for the account, which means a cross-site
 * request would sign the user out on their phone as well as in this browser:
 * `<img src="https://portal/api/auth/logout">` on any page would be enough.
 * Browsers label navigations with Sec-Fetch-*; a picture, a stylesheet or a
 * cross-site link does not look like one. Clients that send neither header
 * (older browsers) are allowed through, because the alternative is stranding
 * them on a page they cannot leave.
 */
function isSameOriginNavigation(request: NextRequest): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const mode = request.headers.get("sec-fetch-mode");
  if (mode && mode !== "navigate") return false;
  return true;
}

/** Browser navigation: clear, then leave for the login page. */
export async function GET(request: NextRequest) {
  if (!isSameOriginNavigation(request)) {
    // No Set-Cookie: a refused request must not be able to sign anyone out.
    return NextResponse.json(
      { error: "Sign out from the portal." },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  }

  const outcome = await revoke();
  const requested = request.nextUrl.searchParams.get("next");
  const role = request.nextUrl.searchParams.get("role") ?? undefined;
  // Only ever redirect inside this site: an open redirect here would let a
  // phishing link start on the real sign-out page and end somewhere else.
  const safeNext = requested && requested.startsWith("/") && !requested.startsWith("//");
  const destination = safeNext ? requested : signedOutPathForRole(role);
  // A RELATIVE Location, deliberately.
  //
  // NextResponse.redirect() needs an absolute URL, and the only host this
  // handler can see is the one it was invoked with — behind a proxy or a
  // preview hostname that is frequently the internal address, which would send
  // the browser to a host that does not resolve for it (the page simply never
  // arrives). A relative reference is resolved by the browser against the URL
  // it just requested, so the sign-out lands on the right origin wherever the
  // app is hosted. RFC 7231 allows it and every browser follows it.
  const response = clearSessionCookie(
    new NextResponse(null, { status: 303, headers: { location: destination } }),
  );
  logger.info("logout: browser sign-out completed", {
    revoked: outcome.revoked,
    impersonationEnded: outcome.impersonationEnded,
  });
  return response;
}

/** API clients: JSON in, JSON out, cookie always cleared. */
export async function POST() {
  const outcome = await revoke();
  const response = clearSessionCookie(
    NextResponse.json(
      {
        ok: true,
        // `ok` is "this browser is signed out". `revoked` is the stronger claim
        // that every outstanding token for the account was invalidated.
        revoked: outcome.revoked,
        impersonationEnded: outcome.impersonationEnded,
        ...("warning" in outcome && outcome.warning ? { warning: outcome.warning } : {}),
      },
      { status: 200 },
    ),
  );
  logger.info("logout: api sign-out completed", {
    revoked: outcome.revoked,
    impersonationEnded: outcome.impersonationEnded,
  });
  return response;
}
