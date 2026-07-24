import { AlertDeliveryStatus, ApplicationStatus, FeePaymentStatus, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { readSystemFlags } from "@/lib/system-flags";

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
    applicationsByStatus,
    itEnrollments,
    examAttempts,
    reportCards,
    students,
    classes,
    teachers,
    recentErrors,
    latestLogins,
    feePayments,
    feeInvoices,
    expenses,
    pendingTransfers,
    staffInToday,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["role"], _count: true }),
    prisma.user.count({ where: { isActive: true, isSuspended: false } }),
    prisma.user.count({ where: { isSuspended: true } }),
    prisma.auditLog.count({ where: { action: "USER_SIGNED_IN", createdAt: { gte: dayAgo } } }),
    prisma.auditLog.count({ where: { action: "USER_SIGNED_IN", createdAt: { gte: weekAgo } } }),
    prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
    prisma.notificationJob.count({ where: { status: AlertDeliveryStatus.FAILED } }),
    prisma.notificationJob.count({ where: { status: AlertDeliveryStatus.PENDING } }),
    prisma.admissionApplication.count({ where: { status: { not: ApplicationStatus.DRAFT } } }),
    prisma.admissionApplication.groupBy({ by: ["status"], _count: true }),
    prisma.itEnrollment.count(),
    prisma.examAttempt.count(),
    prisma.reportCard.count(),
    prisma.studentProfile.count({ where: { isActive: true } }),
    prisma.schoolClass.count({ where: { isActive: true } }),
    prisma.teacherProfile.count({ where: { isActive: true } }),
    prisma.notificationJob.findMany({
      where: { status: AlertDeliveryStatus.FAILED },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        channel: true,
        subject: true,
        lastError: true,
        attempts: true,
        updatedAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: { action: "USER_SIGNED_IN" },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { actor: { select: { name: true, email: true, role: true } } },
    }),
    prisma.feePayment.findMany({
      where: { status: FeePaymentStatus.COMPLETED },
      select: { amount: true, paidAt: true },
    }),
    prisma.feeInvoice.findMany({
      select: { totalAmount: true, amountPaid: true, balanceDue: true },
    }),
    prisma.expense
      .findMany({ select: { amount: true } })
      .catch(() => [] as Array<{ amount: number }>),
    prisma.feePaymentAttempt
      .count({ where: { status: "PENDING", provider: "BANK_TRANSFER" } })
      .catch(() => 0),
    prisma.staffAttendanceEvent
      .groupBy({
        by: ["teacherProfileId"],
        where: {
          eventType: "CHECK_IN",
          scannedAt: { gte: new Date(new Date().toDateString()) },
        },
      })
      .then((rows) => rows.length)
      .catch(() => 0),
  ]);

  const incomeTotal = feePayments.reduce((s, p) => s + p.amount, 0);
  const incomeToday = feePayments
    .filter((p) => p.paidAt >= dayAgo)
    .reduce((s, p) => s + p.amount, 0);
  const incomeWeek = feePayments
    .filter((p) => p.paidAt >= weekAgo)
    .reduce((s, p) => s + p.amount, 0);
  const expenseTotal = (expenses as Array<{ amount: number }>).reduce((s, e) => s + e.amount, 0);
  const billed = feeInvoices.reduce((s, i) => s + i.totalAmount, 0);
  const collected = feeInvoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = feeInvoices.reduce((s, i) => s + i.balanceDue, 0);
  const flags = readSystemFlags();

  return NextResponse.json({
    platform: {
      usersByRole: usersByRole.map((row) => ({ role: row.role, count: row._count })),
      activeUsers,
      suspendedUsers,
      loginsToday,
      loginsWeek,
      auditEventsToday: auditToday,
      applications,
      applicationsByStatus: applicationsByStatus.map((row) => ({
        status: row.status,
        count: row._count,
      })),
      itEnrollments,
      examAttempts,
      reportCards,
      students,
      classes,
      teachers,
      staffCheckedInToday: staffInToday,
    },
    finance: {
      incomeTotal,
      incomeToday,
      incomeWeek,
      expenseTotal,
      netPosition: incomeTotal - expenseTotal,
      billed,
      collected,
      outstanding,
      collectionRate: billed ? Math.round((collected / billed) * 100) : 0,
      pendingBankTransfers: pendingTransfers,
    },
    health: {
      failedNotifications,
      pendingNotifications,
      maintenanceMode: flags.maintenanceMode,
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
