import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await requireRole([UserRole.SUPER_ADMIN]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = request.nextUrl.searchParams;
  const action = params.get("action")?.trim() || "";
  const actorEmail = params.get("actor")?.trim().toLowerCase() || "";
  const entityType = params.get("entityType")?.trim() || "";
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const pageSize = 50;

  const where = {
    ...(action ? { action: { contains: action.toUpperCase() } } : {}),
    ...(entityType ? { entityType: { contains: entityType, mode: "insensitive" as const } } : {}),
    ...(actorEmail ? { actor: { email: { contains: actorEmail } } } : {}),
  };

  const [total, logs, actionCounts] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
    prisma.auditLog.groupBy({
      by: ["action"],
      _count: true,
      orderBy: { _count: { action: "desc" } },
      take: 12,
    }),
  ]);

  return NextResponse.json({
    total,
    page,
    pageSize,
    pages: Math.max(1, Math.ceil(total / pageSize)),
    topActions: actionCounts.map((row) => ({ action: row.action, count: row._count })),
    logs: logs.map((entry) => ({
      id: entry.id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      actorName: entry.actor?.name || "System",
      actorEmail: entry.actor?.email || null,
      actorRole: entry.actor?.role || null,
      ipAddress: entry.ipAddress,
      metadata: entry.metadata,
      at: entry.createdAt.toISOString(),
    })),
  });
}
