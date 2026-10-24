import { NextResponse } from "next/server";
import { SESSION_COOKIE, getSession, revokeAllSessions, type SessionUser } from "@/lib/session";
import { logger } from "@/lib/logger";

export async function POST() {
  // This log line is deliberately free of session tokens and personal data; it
  // gives production operators a reliable signal that the browser reached the
  // logout handler when diagnosing a reported sign-out failure.
  logger.info("logout: request received");

  // AUD-F2: logout used to only clear the cookie, so a pre-logout JWT stayed
  // valid for up to 30 days — replaying it against /api/auth/me still
  // returned 200. EduPortal sessions are stateless JWTs keyed by
  // (userId, tokenVersion); bumping the version revokes every outstanding
  // token for the account. Trade-off (no server-side session list exists):
  // logout is necessarily "sign out everywhere" for the account — the safe
  // direction for a school portal, and consistent with what suspend /
  // password-change already do via the same helper.
  //
  // AUTH-01 exception: while a super-admin is IMPERSONATING, `user.id` is
  // the *victim's* id. Revoking there signed an innocent parent/teacher out
  // on every device because an operator clicked Sign Out. An impersonation
  // sign-out now only clears this browser's cookie; the impersonation JWT
  // itself expires within the hour (see IMPERSONATION_TTL_JOSE), and the
  // proper exit is "End impersonation" (DELETE /api/super-admin/impersonate),
  // which restores the super-admin session.
  let user: SessionUser | null = null;
  let revocationConfirmed = true;
  try {
    user = await getSession();
  } catch (error) {
    // Identity lookup unavailable (e.g. DB blip): still clear the cookie
    // below so this device signs out instead of trapping the user, but report
    // the incomplete server-side revocation to the caller.
    revocationConfirmed = false;
    logger.error("logout: session lookup failed; clearing cookie only", {
      error: String(error),
    });
  }

  const impersonationEnded = Boolean(user?.impersonatedBy);
  if (user && !impersonationEnded) {
    try {
      await revokeAllSessions(user.id);
    } catch (error) {
      // The cookie is still cleared below so THIS device signs out; a failed
      // revoke must not keep the user signed in locally, but log it loudly and
      // return a non-2xx so the browser does not silently claim sign-out worked.
      revocationConfirmed = false;
      logger.error("logout: failed to revoke sessions", {
        userId: user.id,
        error: String(error),
      });
    }
  } else if (impersonationEnded) {
    logger.info("logout during impersonation: victim sessions left untouched", {
      impersonatedUserId: user?.id,
      impersonatedBy: user?.impersonatedBy,
    });
  }

  const response = NextResponse.json(
    {
      ok: revocationConfirmed,
      impersonationEnded,
      ...(revocationConfirmed ? {} : { error: "Session revocation could not be confirmed." }),
    },
    { status: revocationConfirmed ? 200 : 503 },
  );
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
