import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

const STAFF_ROLES = ["ADMIN", "DIRECTOR", "BURSAR", "COORDINATOR", "HOD", "TEACHER"] as const;

export async function GET(request: NextRequest) {
  const user = await requireRole([UserRole.SUPER_ADMIN]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const roleParam = request.nextUrl.searchParams.get("role") || "";
  const roleFilter = Object.values(UserRole).includes(roleParam as UserRole)
    ? (roleParam as UserRole)
    : null;

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? {
            OR: [
              { email: { contains: search } },
              { name: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 150,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isSuspended: true,
      mustChangePassword: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { refreshTokens: true } },
    },
  });

  return NextResponse.json({
    users: users.map((entry) => ({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      role: entry.role,
      isActive: entry.isActive,
      isSuspended: entry.isSuspended,
      mustChangePassword: entry.mustChangePassword,
      lastLoginAt: entry.lastLoginAt?.toISOString() || null,
      createdAt: entry.createdAt.toISOString(),
      activeSessions: entry._count.refreshTokens,
    })),
  });
}

const actionSchema = z.object({
  userId: z.string().trim().min(1).optional(),
  action: z.enum([
    "SUSPEND",
    "UNSUSPEND",
    "RESET_PASSWORD",
    "PROMOTE_ADMIN",
    "DEMOTE_TEACHER",
    "CREATE_STAFF",
    "SET_ROLE",
    "REVOKE_SESSIONS",
  ]),
  name: z.string().trim().min(2).max(120).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(STAFF_ROLES).optional(),
});

export async function PATCH(request: NextRequest) {
  const superAdmin = await requireRole([UserRole.SUPER_ADMIN]);
  if (!superAdmin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof actionSchema>;
  try {
    payload = actionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  let message = "";
  let temporaryPassword: string | null = null;

  if (payload.action === "CREATE_STAFF") {
    if (!payload.name || !payload.email || !payload.role) {
      return NextResponse.json({ error: "Name, email and role are required." }, { status: 400 });
    }
    const email = payload.email.trim().toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: "An account already uses this email." }, { status: 409 });
    }
    temporaryPassword = `Ykay-${crypto.randomBytes(6).toString("base64url")}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const role = payload.role as UserRole;
    const created = await prisma.user.create({
      data: {
        schoolId: superAdmin.schoolId,
        email,
        name: payload.name,
        role,
        passwordHash,
        mustChangePassword: true,
      },
    });
    if (role === UserRole.TEACHER || role === UserRole.HOD) {
      await prisma.teacherProfile.create({
        data: {
          schoolId: superAdmin.schoolId,
          userId: created.id,
          displayName: payload.name,
          roleLabel: role === UserRole.HOD ? "Head of Department" : "Teacher",
        },
      });
    }
    await prisma.auditLog.create({
      data: {
        schoolId: superAdmin.schoolId,
        actorUserId: superAdmin.id,
        action: "SUPER_ADMIN_CREATE_STAFF",
        entityType: "User",
        entityId: created.id,
        metadata: { email, role },
        ipAddress: getClientIp(request),
      },
    });
    return NextResponse.json({
      ok: true,
      message: `Created ${role} account for ${email}. Temporary password shown once.`,
      temporaryPassword,
      user: { id: created.id, email: created.email, name: created.name, role: created.role },
    });
  }

  if (!payload.userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });
  const target = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === UserRole.SUPER_ADMIN && target.id !== superAdmin.id) {
    return NextResponse.json(
      { error: "Other super admin accounts cannot be modified here." },
      { status: 403 },
    );
  }
  if (
    target.id === superAdmin.id &&
    ["SUSPEND", "DEMOTE_TEACHER", "SET_ROLE"].includes(payload.action)
  ) {
    return NextResponse.json(
      { error: "You cannot suspend or change your own privileged role here." },
      { status: 409 },
    );
  }

  switch (payload.action) {
    case "SUSPEND":
      await prisma.$transaction([
        prisma.user.update({ where: { id: target.id }, data: { isSuspended: true } }),
        prisma.refreshToken.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      message = `${target.name} suspended and sessions revoked.`;
      break;
    case "UNSUSPEND":
      await prisma.user.update({
        where: { id: target.id },
        data: { isSuspended: false, isActive: true },
      });
      message = `${target.name} re-activated.`;
      break;
    case "RESET_PASSWORD": {
      temporaryPassword = `Ykay-${crypto.randomBytes(6).toString("base64url")}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      await prisma.$transaction([
        prisma.user.update({
          where: { id: target.id },
          data: { passwordHash, mustChangePassword: true },
        }),
        prisma.refreshToken.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      message = `Temporary password issued for ${target.name}. Shown once.`;
      break;
    }
    case "PROMOTE_ADMIN":
      await prisma.user.update({ where: { id: target.id }, data: { role: UserRole.ADMIN } });
      message = `${target.name} promoted to ADMIN.`;
      break;
    case "DEMOTE_TEACHER":
      await prisma.user.update({ where: { id: target.id }, data: { role: UserRole.TEACHER } });
      message = `${target.name} set to TEACHER.`;
      break;
    case "SET_ROLE": {
      if (!payload.role) return NextResponse.json({ error: "role is required." }, { status: 400 });
      const role = payload.role as UserRole;
      await prisma.user.update({ where: { id: target.id }, data: { role } });
      if (
        (role === UserRole.TEACHER || role === UserRole.HOD) &&
        !(await prisma.teacherProfile.findUnique({ where: { userId: target.id } }))
      ) {
        await prisma.teacherProfile.create({
          data: {
            schoolId: target.schoolId,
            userId: target.id,
            displayName: target.name,
            roleLabel: role === UserRole.HOD ? "Head of Department" : "Teacher",
          },
        });
      }
      message = `${target.name} role set to ${role}.`;
      break;
    }
    case "REVOKE_SESSIONS":
      await prisma.refreshToken.updateMany({
        where: { userId: target.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      message = `All refresh sessions revoked for ${target.name}.`;
      break;
    default:
      return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  await prisma.auditLog.create({
    data: {
      schoolId: target.schoolId,
      actorUserId: superAdmin.id,
      action: `SUPER_ADMIN_${payload.action}`,
      entityType: "User",
      entityId: target.id,
      metadata: { targetEmail: target.email, role: payload.role || null },
      ipAddress: getClientIp(request),
    },
  });

  return NextResponse.json({ ok: true, message, temporaryPassword });
}
