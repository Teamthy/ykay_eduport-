import bcrypt from "bcryptjs";
import crypto from "crypto";
import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireRole([UserRole.SUPER_ADMIN]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const search = request.nextUrl.searchParams.get("q")?.trim().toLowerCase() || "";
  const roleParam = request.nextUrl.searchParams.get("role") || "";
  const roleFilter = Object.values(UserRole).includes(roleParam as UserRole) ? (roleParam as UserRole) : null;

  const users = await prisma.user.findMany({
    where: {
      ...(search
        ? { OR: [{ email: { contains: search } }, { name: { contains: search, mode: "insensitive" } }] }
        : {}),
      ...(roleFilter ? { role: roleFilter } : {}),
    },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    take: 100,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isSuspended: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    users: users.map((entry) => ({
      ...entry,
      lastLoginAt: entry.lastLoginAt?.toISOString() || null,
      createdAt: entry.createdAt.toISOString(),
    })),
  });
}

const actionSchema = z.object({
  userId: z.string().trim().min(1),
  action: z.enum(["SUSPEND", "UNSUSPEND", "RESET_PASSWORD", "PROMOTE_ADMIN", "DEMOTE_TEACHER"]),
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

  const target = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === UserRole.SUPER_ADMIN && target.id !== superAdmin.id) {
    return NextResponse.json({ error: "Super admin accounts cannot be modified here." }, { status: 403 });
  }
  if (target.id === superAdmin.id && (payload.action === "SUSPEND" || payload.action === "DEMOTE_TEACHER")) {
    return NextResponse.json({ error: "You cannot suspend or demote your own account." }, { status: 409 });
  }

  let message = "";
  let temporaryPassword: string | null = null;

  switch (payload.action) {
    case "SUSPEND":
      await prisma.user.update({ where: { id: target.id }, data: { isSuspended: true } });
      message = `${target.name} suspended. They can no longer sign in.`;
      break;
    case "UNSUSPEND":
      await prisma.user.update({ where: { id: target.id }, data: { isSuspended: false, isActive: true } });
      message = `${target.name} re-activated.`;
      break;
    case "RESET_PASSWORD": {
      temporaryPassword = `Ykay-${crypto.randomBytes(6).toString("base64url")}`;
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
      message = `Temporary password issued for ${target.name}. Share it securely — it is shown only once.`;
      break;
    }
    case "PROMOTE_ADMIN":
      await prisma.user.update({ where: { id: target.id }, data: { role: UserRole.ADMIN } });
      message = `${target.name} promoted to ADMIN.`;
      break;
    case "DEMOTE_TEACHER":
      await prisma.user.update({ where: { id: target.id }, data: { role: UserRole.TEACHER } });
      message = `${target.name} set to TEACHER role.`;
      break;
  }

  await prisma.auditLog.create({
    data: {
      schoolId: target.schoolId,
      actorUserId: superAdmin.id,
      action: `SUPER_ADMIN_${payload.action}`,
      entityType: "User",
      entityId: target.id,
      metadata: { targetEmail: target.email },
      ipAddress: getClientIp(request),
    },
  });

  return NextResponse.json({ ok: true, message, temporaryPassword });
}
