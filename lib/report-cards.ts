import { ReportCardStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function getStudentReportCardContext() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return null;

  const studentProfile = await prisma.studentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      studentId: true,
      displayName: true,
      currentClass: { select: { displayName: true } },
      reportCards: {
        orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
        include: {
          subjects: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });

  if (!studentProfile) return null;
  return { user, studentProfile };
}

export async function getParentReportCardContext() {
  const user = await requireRole([UserRole.PARENT]);
  if (!user) return null;

  const parentProfile = await prisma.parentProfile.findFirst({
    where: {
      schoolId: user.schoolId,
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      displayName: true,
      studentLinks: {
        orderBy: [{ isPrimary: "desc" }, { studentProfile: { displayName: "asc" } }],
        select: {
          isPrimary: true,
          relationship: true,
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              displayName: true,
              currentClass: { select: { displayName: true } },
              reportCards: {
                orderBy: [{ generatedAt: "desc" }, { createdAt: "desc" }],
                include: { subjects: { orderBy: { sortOrder: "asc" } } },
              },
            },
          },
        },
      },
    },
  });

  if (!parentProfile) return null;
  return { user, parentProfile };
}

export async function getAdminReportCardContext() {
  const user = await requireRole([UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINATOR]);
  if (!user) return null;
  return { user };
}

export function reportStatusLabel(status: ReportCardStatus) {
  return status === ReportCardStatus.RELEASED ? "Released" : "Draft";
}

export function mapReportCardCard(reportCard: {
  id: string;
  reportNumber: string;
  sessionLabel: string;
  termLabel: string;
  status: ReportCardStatus;
  overallAverage: number;
  overallGrade: string;
  generatedAt: Date;
  releasedAt: Date | null;
}) {
  return {
    id: reportCard.id,
    reportNumber: reportCard.reportNumber,
    sessionLabel: reportCard.sessionLabel,
    termLabel: reportCard.termLabel,
    status: reportCard.status,
    statusLabel: reportStatusLabel(reportCard.status),
    overallAverage: reportCard.overallAverage,
    overallGrade: reportCard.overallGrade,
    generatedAt: reportCard.generatedAt.toISOString(),
    releasedAt: reportCard.releasedAt?.toISOString() || null,
  };
}