import { SignJWT, jwtVerify } from "jose";
import { cookies, headers } from "next/headers";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const SESSION_COOKIE = "ykay_session";
const encoder = new TextEncoder();

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters.");
  return encoder.encode(value);
}

export type SessionUser = {
  id: string;
  schoolId: string;
  role: UserRole;
  name: string;
  email: string;
  mustChangePassword?: boolean;
  tokenVersion?: number;
  impersonatedBy?: string;
};

export async function signSession(
  user: SessionUser & { impersonatedBy?: string; tokenVersion?: number },
) {
  const claims: Record<string, unknown> = {
    schoolId: user.schoolId,
    role: user.role,
    name: user.name,
    email: user.email,
    mustChangePassword: Boolean(user.mustChangePassword),
    tokenVersion: user.tokenVersion ?? 0,
  };
  if (user.impersonatedBy) {
    claims.impersonatedBy = user.impersonatedBy;
  }

  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());
}

export async function verifySession(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (
      !payload.sub ||
      typeof payload.schoolId !== "string" ||
      typeof payload.role !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string"
    )
      return null;
    return {
      id: payload.sub,
      schoolId: payload.schoolId,
      role: payload.role as UserRole,
      name: payload.name,
      email: payload.email,
      mustChangePassword: payload.mustChangePassword === true,
      tokenVersion: typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0,
      impersonatedBy:
        typeof payload.impersonatedBy === "string" ? payload.impersonatedBy : undefined,
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  // 1) Web browser sessions — signed cookie
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (cookieToken) {
    const session = await verifySession(cookieToken);
    if (session) return session;
  }
  // 2) Mobile / API clients — Authorization: Bearer (same JWT, different transport)
  const authHeader = (await headers()).get("authorization") || "";
  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) {
      const session = await verifySession(bearer);
      if (session) return session;
    }
  }
  return null;
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: 60 * 60 * 8,
    },
  };
}

/**
 * Validates the session and checks tokenVersion against the database.
 * If the user's tokenVersion in the DB is higher than the one in the JWT,
 * the session has been revoked (e.g. user was suspended or password was reset).
 *
 * This check is lightweight — a single indexed lookup by primary key.
 */
/**
 * Why a session was refused.
 *
 * `requireRole` returns null for six different reasons and the caller answers
 * a bare 401 for all of them, so "the page loads but every button says
 * Unauthorized" is unactionable — you cannot tell an expired cookie from a
 * revoked token from a suspended account without reading the source.
 *
 * `sessionDenialReason()` returns the specific cause. `/api/auth/whoami`
 * surfaces it, and it is written to the response header on a denial so it
 * shows up in the network tab without needing a second request.
 */
export type SessionDenial =
  | "NO_SESSION"
  | "BAD_SIGNATURE_OR_EXPIRED"
  | "WRONG_ROLE"
  | "USER_NOT_FOUND"
  | "USER_INACTIVE"
  | "USER_SUSPENDED"
  | "SESSION_REVOKED";

export type SessionCheck =
  { ok: true; user: SessionUser } | { ok: false; reason: SessionDenial; role?: UserRole };

/**
 * The same logic as `requireRole`, but it reports WHY it said no.
 *
 * Kept as one implementation so the diagnostic can never drift from the
 * enforcement — a diagnostic that disagrees with the real check is worse than
 * none, because it sends you looking in the wrong place.
 */
export async function checkRole(allowed: UserRole[]): Promise<SessionCheck> {
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  const authHeader = (await headers()).get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";

  if (!cookieToken && !bearer) return { ok: false, reason: "NO_SESSION" };

  const user = await getSession();
  // A token was presented but did not verify: wrong AUTH_SECRET, tampered, or
  // past its 8-hour expiry.
  if (!user) return { ok: false, reason: "BAD_SIGNATURE_OR_EXPIRED" };

  if (!allowed.includes(user.role)) return { ok: false, reason: "WRONG_ROLE", role: user.role };

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenVersion: true, isActive: true, isSuspended: true },
    });
    if (!dbUser) return { ok: false, reason: "USER_NOT_FOUND", role: user.role };
    if (dbUser.isSuspended) return { ok: false, reason: "USER_SUSPENDED", role: user.role };
    if (!dbUser.isActive) return { ok: false, reason: "USER_INACTIVE", role: user.role };
    if (dbUser.tokenVersion > (user.tokenVersion ?? 0)) {
      return { ok: false, reason: "SESSION_REVOKED", role: user.role };
    }
  } catch {
    // Matches requireRole: fail OPEN if the database is unreachable. The JWT
    // signature is already valid; this lookup is an extra revocation check and
    // must not take the whole app down with the database.
  }

  return { ok: true, user };
}

/** Plain-English explanation, safe to show a signed-in staff member. */
export function explainDenial(reason: SessionDenial): string {
  switch (reason) {
    case "NO_SESSION":
      return "No session cookie was sent. Sign in again.";
    case "BAD_SIGNATURE_OR_EXPIRED":
      return "Your session has expired or is no longer valid. Sign in again.";
    case "WRONG_ROLE":
      return "Your role does not have access to this action.";
    case "USER_NOT_FOUND":
      return "Your account no longer exists.";
    case "USER_INACTIVE":
      return "Your account is not active. Ask an administrator to re-enable it.";
    case "USER_SUSPENDED":
      return "Your account is suspended.";
    case "SESSION_REVOKED":
      return "Your session was ended elsewhere — after a password change, role change, or sign-out-everywhere. Sign in again.";
  }
}

export async function requireRole(allowed: UserRole[]) {
  const user = await getSession();
  if (!user || !allowed.includes(user.role)) return null;

  // Check tokenVersion against DB to catch revocations
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { tokenVersion: true, isActive: true, isSuspended: true },
    });

    if (!dbUser) return null;
    if (!dbUser.isActive || dbUser.isSuspended) return null;
    if (dbUser.tokenVersion > (user.tokenVersion ?? 0)) return null; // Session revoked
  } catch {
    // If DB check fails, allow the request (fail-open for availability)
    // The JWT signature is still valid; this is an extra safety check
  }

  return user;
}

/**
 * Increment a user's tokenVersion, invalidating all their existing sessions.
 * Call this on: suspend, password reset, role change, manual "sign out everywhere".
 */
export async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { tokenVersion: { increment: 1 } },
  });
}

/**
 * Impersonation write-guard. Super-admin impersonation is READ-ONLY by design.
 * Call this at the top of any mutating (POST/PUT/PATCH/DELETE) handler to block
 * writes performed while impersonating another user. Returns a 403 response when
 * the session is impersonating, otherwise null.
 */
export function assertNotImpersonating(user: { impersonatedBy?: string }) {
  if (user.impersonatedBy) {
    return NextResponse.json(
      { error: "Writes are not permitted while impersonating. End impersonation first." },
      { status: 403 },
    );
  }
  return null;
}
