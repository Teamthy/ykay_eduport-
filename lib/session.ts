import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { UserRole } from "@prisma/client";

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
};

export async function signSession(user: SessionUser & { impersonatedBy?: string }) {
  const claims: Record<string, unknown> = {
    schoolId: user.schoolId,
    role: user.role,
    name: user.name,
    email: user.email,
    mustChangePassword: Boolean(user.mustChangePassword),
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
    };
  } catch {
    return null;
  }
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
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

export async function requireRole(allowed: UserRole[]) {
  const user = await getSession();
  if (!user || !allowed.includes(user.role)) return null;
  return user;
}
