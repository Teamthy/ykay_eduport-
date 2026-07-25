import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { sessionCookie, signSession } from "@/lib/session";
import { recordSecurityEvent, getUserAgent } from "@/lib/forensics";
import { enforceRateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

// Fixed dummy hash for timing-oracle mitigation — always run bcrypt
// even when the account doesn't exist, so response time is constant.
const DUMMY_HASH = "$2a$12$abcdefghijklmnopqrstuvwxABCDEFghijklmnop012345678901234";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ua = getUserAgent(request);

  // ── IP-level rate limit (10 attempts per 15 min) ─────────────
  const ipLimit = await enforceRateLimit("login", ip);
  if (!ipLimit.success) {
    await recordSecurityEvent({
      eventType: "LOGIN_FAILED_BAD_PASSWORD",
      ipAddress: ip,
      userAgent: ua,
      reason: "Rate limited — too many login attempts from this IP.",
    });
    return NextResponse.json(
      { error: "Too many login attempts. Please try again later." },
      { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } },
    );
  }

  try {
    const { email, password } = schema.parse(await request.json());

    // ── Per-email rate limit (3 failures per 15 min) ───────────
    const emailLimit = await enforceRateLimit("loginStrict", email);
    if (!emailLimit.success) {
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED_BAD_PASSWORD",
        userEmail: email,
        ipAddress: ip,
        userAgent: ua,
        reason: "Rate limited — too many failed attempts for this email.",
      });
      return NextResponse.json(
        { error: "Too many failed attempts for this account. Please try again later." },
        { status: 429, headers: { "Retry-After": String(emailLimit.retryAfterSeconds) } },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // ── Timing-oracle mitigation ──────────────────────────────
    // Always run bcrypt compare (real or dummy) so response time
    // is identical whether the account exists or not.
    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH); // dummy compare
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED_ACCOUNT_NOT_FOUND",
        userEmail: email,
        ipAddress: ip,
        userAgent: ua,
        reason: "No account exists for this email.",
      });
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // ── Account suspended ─────────────────────────────────────
    if (user.isSuspended) {
      await bcrypt.compare(password, user.passwordHash); // real compare for timing parity
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED_SUSPENDED",
        schoolId: user.schoolId,
        userEmail: email,
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        reason: "Account is suspended.",
      });
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact the school administration." },
        { status: 403 },
      );
    }

    // ── Account inactive ──────────────────────────────────────
    if (!user.isActive) {
      await bcrypt.compare(password, user.passwordHash);
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED_INACTIVE",
        schoolId: user.schoolId,
        userEmail: email,
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        reason: "Account is deactivated.",
      });
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // ── Password check ────────────────────────────────────────
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      await recordSecurityEvent({
        eventType: "LOGIN_FAILED_BAD_PASSWORD",
        schoolId: user.schoolId,
        userEmail: email,
        userId: user.id,
        ipAddress: ip,
        userAgent: ua,
        reason: "Incorrect password.",
      });
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    // ── Successful login ──────────────────────────────────────
    const token = await signSession({
      id: user.id,
      schoolId: user.schoolId,
      role: user.role,
      name: user.name,
      email: user.email,
      mustChangePassword: user.mustChangePassword,
    });

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorUserId: user.id,
        action: "USER_SIGNED_IN",
        entityType: "User",
        entityId: user.id,
        ipAddress: ip,
      },
    });

    const response = NextResponse.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
    const cookie = sessionCookie(token);
    response.cookies.set(cookie.name, cookie.value, cookie.options);
    return response;
  } catch {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
}
