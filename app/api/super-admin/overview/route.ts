import { AlertDeliveryStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireRole([UserRole.SUPER_ADMIN]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersByRole,
    activeUsers,
    suspendedUsers,
    loginsToday,
    loginsWeek,
    auditToday,
    failedNotifications,
    pendingNotifications,
    applications,
    itEnrollments,
    examAttempts,
    reportCards,
    recentErrors,
    latestLogins,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.count({ where: { isActive: true, isSuspended: false } }),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.auditLog.count({ where: { action: "USER_SIGNED_IN", createdAt: { gte: dayAgo } } }),
    prisma.auditLog.count({ where: { action: "USER_SIGNED_IN", createdAt: { gte: weekAgo } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.notificationJob.count({ where: { status: AlertDeliveryStatus.FAILED } }),
    prisma.notificationJob.count({ where: { status: AlertDeliveryStatus.PENDING } }),
    prisma.admissionApplication.count(),
    prisma.itEnrollment.count(),
    prisma.examAttempt.count(),
    prisma.reportCard.count(),
    prisma.notificationJob.findMany({
      where: { status: AlertDeliveryStatus.FAILED },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, channel: true, subject: true, lastError: true, attempts: true, updatedAt: true },
    }),
    prisma.auditLog.findMany({
      where: { action: "USER_SIGNED_IN" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
  ]);

  return NextResponse.json({
    platform: {
      usersByRole: usersByRole.map((row) => ({ role: row.role, count: row._count })),
      activeUsers,
      suspendedUsers,
      loginsToday,
      loginsWeek,
      auditEventsToday: auditToday,
      applications,
      itEnrollments,
      examAttempts,
      reportCards,
    },
    health: {
      failedNotifications,
      pendingNotifications,
      recentFailures: recentErrors.map((job) => ({
        id: job.id,
        channel: job.channel,
        subject: job.subject,
        lastError: job.lastError,
        attempts: job.attempts,
        at: job.updatedAt.toISOString(),
      })),
    },
    latestLogins: latestLogins.map((entry) => ({
      name: entry.actor?.name || "Unknown",
      email: entry.actor?.email || "—",
      role: entry.actor?.role || "—",
      ip: entry.ipAddress,
      at: entry.createdAt.toISOString(),
    })),
  });
}
