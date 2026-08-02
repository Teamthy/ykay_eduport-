import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { getClientIp } from "@/lib/requests";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(2000),
  schoolId: z.string().optional(),
  scope: z.enum(["all", "school"]).default("all"),
});

/** POST /api/super-admin/broadcast — push an in-app notification to every active user (or one school). */
export async function POST(request: NextRequest) {
  const user = await requireRole(["SUPER_ADMIN"]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof schema>;
  try { input = schema.parse(await request.json()); } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const where = {
    isActive: true,
    ...(input.scope === "school" && input.schoolId ? { schoolId: input.schoolId } : {}),
  };
  const users = await prisma.user.findMany({ where, select: { id: true, schoolId: true } });
  if (!users.length) return NextResponse.json({ error: "No active users found." }, { status: 404 });

  await prisma.userNotification.createMany({
    data: users.map((u) => ({
      schoolId: u.schoolId,
      userId: u.id,
      kind: "BROADCAST",
      title: input.title,
      body: input.body,
    })),
  });

  await prisma.auditLog.create({
    data: {
      schoolId: user.schoolId, actorUserId: user.id,
      action: "BROADCAST_SENT", entityType: "UserNotification", entityId: "bulk",
      ipAddress: getClientIp(request),
      metadata: { title: input.title, count: users.length, scope: input.scope } as never,
    },
  });

  return NextResponse.json({ sent: users.length, message: `Broadcast sent to ${users.length} user(s).` });
}
