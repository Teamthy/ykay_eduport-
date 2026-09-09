import bcrypt from "bcryptjs";
import { createHash, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp, jsonNoStore } from "@/lib/requests";
import { enforceRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { resolveTenantFromHost } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/auth/verify-credentials — federated email+password check.
 *
 * YK-Virtual calls this (with COLLEGE_SSO_SECRET) so a College student can
 * type the same email and password on the Virtual login form. This endpoint
 * never sets a College cookie and never returns a College JWT — claims only.
 */

const requestSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const DUMMY_HASH = "$2a$12$abcdefghijklmnopqrstuvwxABCDEFghijklmnop012345678901234";

function serviceSecretIsValid(presented: string | null): boolean {
  const expected = process.env.COLLEGE_SSO_SECRET;
  if (!expected || expected.length < 32 || !presented) return false;
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const expected = process.env.COLLEGE_SSO_SECRET;
  if (!expected || expected.length < 32) {
    logger.error(
      "verify-credentials called but COLLEGE_SSO_SECRET is unset or under 32 characters",
    );
    return jsonNoStore(
      { error: "Federated login is not configured on this server." },
      { status: 503 },
    );
  }

  if (!serviceSecretIsValid(request.headers.get("x-college-sso-secret"))) {
    return jsonNoStore({ error: "Forbidden" }, { status: 403 });
  }

  const limit = await enforceRateLimit("login", getClientIp(request));
  if (!limit.success) {
    return jsonNoStore(
      { error: limit.configurationError ? "Temporarily unavailable." : "Too many requests." },
      {
        status: limit.configurationError ? 503 : 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  let payload: z.infer<typeof requestSchema>;
  try {
    payload = requestSchema.parse(await request.json());
  } catch {
    return jsonNoStore({ error: "Email and password are required." }, { status: 400 });
  }

  const { tenant } = await resolveTenantFromHost(request.headers.get("host"));
  let user: {
    id: string;
    schoolId: string;
    role: string;
    name: string;
    email: string;
    passwordHash: string;
    isActive: boolean;
    isSuspended: boolean;
    tokenVersion: number;
  } | null = null;
  try {
    user = tenant
      ? await prisma.user.findFirst({
          where: { email: payload.email, schoolId: tenant.id },
          select: {
            id: true,
            schoolId: true,
            role: true,
            name: true,
            email: true,
            passwordHash: true,
            isActive: true,
            isSuspended: true,
            tokenVersion: true,
          },
        })
      : await prisma.user.findFirst({
          where: { email: payload.email },
          select: {
            id: true,
            schoolId: true,
            role: true,
            name: true,
            email: true,
            passwordHash: true,
            isActive: true,
            isSuspended: true,
            tokenVersion: true,
          },
        });
  } catch (error) {
    logger.error("verify-credentials: identity lookup failed", { error: String(error) });
    return jsonNoStore(
      { valid: false, reason: "IDENTITY_UNVERIFIABLE" },
      { status: 503, headers: { "Retry-After": "5" } },
    );
  }

  if (!user) {
    await bcrypt.compare(payload.password, DUMMY_HASH);
    return jsonNoStore({ valid: false, reason: "INVALID_TOKEN" }, { status: 401 });
  }

  const valid = await bcrypt.compare(payload.password, user.passwordHash);
  if (!valid) {
    return jsonNoStore({ valid: false, reason: "INVALID_TOKEN" }, { status: 401 });
  }
  if (user.isSuspended) {
    return jsonNoStore({ valid: false, reason: "USER_SUSPENDED" }, { status: 403 });
  }
  if (!user.isActive) {
    return jsonNoStore({ valid: false, reason: "USER_INACTIVE" }, { status: 403 });
  }

  return jsonNoStore({
    valid: true,
    user: {
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      name: user.name,
      email: user.email,
      tokenVersion: user.tokenVersion,
    },
    issuer: "ykay-college-eduportal",
    issuedAt: new Date().toISOString(),
    nonce: createHash("sha256").update(`${user.id}:${Date.now()}`).digest("hex").slice(0, 16),
  });
}
