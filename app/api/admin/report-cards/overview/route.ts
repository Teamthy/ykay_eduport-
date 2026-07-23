import { ReportCardStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { requireRole } from "@/lib/session";

const allowedRoles = [UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR];
const updateSchema = z.object({
  reportCardId: z.string().trim().min(1),
  status: z.nativeEnum(ReportCardStatus),
});

export async function GET() {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reports = await prisma.reportCard.findMany({
    where: { schoolId: user.schoolId },
    orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
    include: {
      studentProfile: { include: { currentClass: true } },
      subjects: { orderBy: { sortOrder: "asc" } },
    },
  });

  return NextResponse.json({
    summary: {
      totalReports: reports.length,
      releasedReports: reports.filter((report) => report.status === ReportCardStatus.RELEASED).length,
      draftReports: reports.filter((report) => report.status === ReportCardStatus.DRAFT).length,
      averageScore: reports.length
        ? Math.round(reports.reduce((sum, report) => sum + report.overallAverage, 0) / reports.length)
        : 0,
    },
    reports: reports.map((report) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      sessionLabel: report.sessionLabel,
      termLabel: report.termLabel,
      classNameSnapshot: report.classNameSnapshot,
      status: report.status,
      overallTotal: report.overallTotal,
      overallAverage: report.overallAverage,
      overallGrade: report.overallGrade,
      classPosition: report.classPosition,
      attendancePresent: report.attendancePresent,
      attendanceTotal: report.attendanceTotal,
      classTeacherRemark: report.classTeacherRemark,
      directorRemark: report.directorRemark,
      nextResumption: report.nextResumption,
      feeBalance: report.feeBalance,
      generatedAt: report.generatedAt.toISOString(),
      releasedAt: report.releasedAt?.toISOString() || null,
      student: {
        studentId: report.studentProfile.studentId,
        displayName: report.studentProfile.displayName,
        className: report.studentProfile.currentClass.displayName,
      },
      subjects: report.subjects,
    })),
  });
}

export async function PATCH(request: NextRequest) {
  const user = await requireRole(allowedRoles);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const payload = updateSchema.parse(await request.json());
    const ipAddress = getClientIp(request);
    const updated = await prisma.$transaction(async (tx) => {
      const report = await tx.reportCard.update({
        where: { id: payload.reportCardId },
        data: {
          status: payload.status,
          releasedAt: payload.status === ReportCardStatus.RELEASED ? new Date() : null,
        },
        include: {
          studentProfile: { include: { currentClass: true } },
          subjects: { orderBy: { sortOrder: "asc" } },
        },
      });

      await tx.auditLog.create({
        data: {
          schoolId: user.schoolId,
          actorUserId: user.id,
          action: payload.status === ReportCardStatus.RELEASED ? "REPORT_CARD_RELEASED" : "REPORT_CARD_REVERTED_TO_DRAFT",
          entityType: "ReportCard",
          entityId: report.id,
          ipAddress,
          metadata: {
            reportNumber: report.reportNumber,
            studentId: report.studentProfile.studentId,
          },
        },
      });

      return report;
    });

    return NextResponse.json({
      report: {
        id: updated.id,
        reportNumber: updated.reportNumber,
        sessionLabel: updated.sessionLabel,
        termLabel: updated.termLabel,
        classNameSnapshot: updated.classNameSnapshot,
        status: updated.status,
        overallTotal: updated.overallTotal,
        overallAverage: updated.overallAverage,
        overallGrade: updated.overallGrade,
        classPosition: updated.classPosition,
        attendancePresent: updated.attendancePresent,
        attendanceTotal: updated.attendanceTotal,
        classTeacherRemark: updated.classTeacherRemark,
        directorRemark: updated.directorRemark,
        nextResumption: updated.nextResumption,
        feeBalance: updated.feeBalance,
        generatedAt: updated.generatedAt.toISOString(),
        releasedAt: updated.releasedAt?.toISOString() || null,
        student: {
          studentId: updated.studentProfile.studentId,
          displayName: updated.studentProfile.displayName,
          className: updated.studentProfile.currentClass.displayName,
        },
        subjects: updated.subjects,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to update report card status." }, { status: 400 });
  }
}