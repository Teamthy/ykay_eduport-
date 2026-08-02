import { AlertChannel, NotificationKind, ReportCardStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";
import { createInAppNotification, queueNotificationJob } from "@/lib/notifications";

export const dynamic = "force-dynamic";

const allowedRoles = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR];
const schema = z.object({ classId: z.string().trim().min(1).optional() });

/**
 * POST /api/admin/report-cards/release
 * Release every DRAFT report card at once (optionally scoped to one class).
 * Each released card notifies its parent (email + in-app) and the student.
 */
export async function POST(request: NextRequest) {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const where = {
    schoolId: user.schoolId,
    status: ReportCardStatus.DRAFT,
    ...(payload.classId ? { studentProfile: { currentClassId: payload.classId } } : {}),
  };

  // Fetch card + student details first (needed for per-card notifications).
  const drafts = await prisma.reportCard.findMany({
    where,
    select: {
      id: true,
      reportNumber: true,
      termLabel: true,
      sessionLabel: true,
      overallAverage: true,
      overallGrade: true,
      studentProfile: {
        select: {
          displayName: true,
          guardianName: true,
          guardianEmail: true,
          userId: true,
          parentLinks: {
            where: { isPrimary: true },
            take: 1,
            select: { parentProfile: { select: { userId: true, displayName: true } } },
          },
        },
      },
    },
  });

  if (!drafts.length) {
    return NextResponse.json({ released: 0, message: "No draft report cards to release." });
  }

  const result = await prisma.reportCard.updateMany({
    where: { id: { in: drafts.map((d) => d.id) } },
    data: { status: ReportCardStatus.RELEASED, releasedAt: new Date() },
  });

  // Per-card notifications + one batch audit entry (best-effort — never block the release).
  try {
    for (const d of drafts) {
      const msg = `The ${d.termLabel} (${d.sessionLabel}) report card for ${
        d.studentProfile.displayName || "your child"
      } has been released. Overall: ${d.overallAverage}% (${d.overallGrade}).`;
      // Resolved before queueing so the email can honour the same "Results"
      // preference the push does. Null when the guardian has no account —
      // that address then gets the email regardless, which is right: there is
      // nobody to have expressed a preference.
      const parentUserId = d.studentProfile.parentLinks[0]?.parentProfile?.userId;

      if (d.studentProfile.guardianEmail) {
        await queueNotificationJob({
          schoolId: user.schoolId,
          kind: NotificationKind.REPORT_RELEASED,
          channel: AlertChannel.EMAIL,
          subject: "Report card released — Ykay College",
          body: msg,
          recipientName: d.studentProfile.guardianName,
          recipientEmail: d.studentProfile.guardianEmail,
          recipientUserId: parentUserId ?? null,
          dedupeKey: `report:${d.id}:email`,
          metadata: { reportCardId: d.id, reportNumber: d.reportNumber },
        });
      }
      if (parentUserId) {
        await createInAppNotification({
          schoolId: user.schoolId,
          userId: parentUserId,
          kind: NotificationKind.REPORT_RELEASED,
          title: "Report Card Released",
          body: msg,
          link: "/parent/report-cards",
        });
      }
      if (d.studentProfile.userId) {
        await createInAppNotification({
          schoolId: user.schoolId,
          userId: d.studentProfile.userId,
          kind: NotificationKind.REPORT_RELEASED,
          title: "Your Report Card Is Ready",
          body: `Your ${d.termLabel} report card has been released. Overall: ${d.overallAverage}% (${d.overallGrade}).`,
          link: "/student/report-cards",
        });
      }
    }
    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        actorUserId: user.id,
        action: "REPORT_CARDS_BATCH_RELEASED",
        entityType: "ReportCard",
        entityId: payload.classId || "all",
        ipAddress: getClientIp(request),
        metadata: { count: result.count, classId: payload.classId || null } as never,
      },
    });
  } catch (e) {
    console.warn("Batch release notifications/audit failed", e);
  }

  return NextResponse.json({
    released: result.count,
    message: `${result.count} report card(s) released. Parents and students have been notified.`,
  });
}
