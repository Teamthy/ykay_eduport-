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
