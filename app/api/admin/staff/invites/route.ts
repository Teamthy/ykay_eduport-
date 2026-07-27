import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { STAFF_ROLES, PEOPLE_ADMIN_ROLES, hashValue, oneTimeSecret } from "@/lib/people";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";
const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email(),
  role: z.enum(STAFF_ROLES),
});
export async function GET() {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const staff = await prisma.user.findMany({
    take: 500,
    where: { schoolId: user.schoolId, role: { in: [...STAFF_ROLES] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      isSuspended: true,
      createdAt: true,
      teacherProfile: { select: { id: true, roleLabel: true } },
    },
    orderBy: { name: "asc" },
  });
  const invites = await prisma.staffInvite.findMany({
    take: 500,
    where: {
      schoolId: user.schoolId,
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, name: true, email: true, role: true, expiresAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ staff, invites });
}
export async function POST(request: NextRequest) {
  const user = await requireRole(PEOPLE_ADMIN_ROLES);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid staff details." }, { status: 400 });
  }
  if (await prisma.user.findFirst({ where: { email: input.email, schoolId: user.schoolId } }))
    return NextResponse.json({ error: "An account already uses this email." }, { status: 409 });
  const token = oneTimeSecret();
  const invite = await prisma.staffInvite.create({
    data: {
      schoolId: user.schoolId,
      name: input.name,
      email: input.email,
      role: input.role,
      tokenHash: hashValue(token),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      createdById: user.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId,
      actorUserId: user.id,
      action: "STAFF_INVITED",
      entityType: "StaffInvite",
      entityId: invite.id,
      ipAddress: getClientIp(request),
      metadata: { email: input.email, role: input.role },
    },
  });
  return NextResponse.json(
    {
      invite: { id: invite.id, email: invite.email, expiresAt: invite.expiresAt },
      activationToken: token,
    },
    { status: 201 },
  );
}
