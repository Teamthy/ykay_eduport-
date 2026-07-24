import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { sessionCookie, signSession } from "@/lib/session";
import { recordSecurityEvent, getUserAgent } from "@/lib/forensics";

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const ua = getUserAgent(request);

  try {
    const { email, password } = schema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email } });

    // ── Account not found ─────────────────────────────────────
    if (!user) {
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

    // ── Wrong password ────────────────────────────────────────
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
