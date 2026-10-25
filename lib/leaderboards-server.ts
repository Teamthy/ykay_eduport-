import { prisma } from "@/lib/prisma";
import {
  buildLeaderboard,
  examTypesForLeaderboard,
  type LeaderboardCategory,
  type LeaderboardScope,
} from "@/lib/leaderboards";

export type LeaderboardView = ReturnType<typeof buildLeaderboard> & {
  category: LeaderboardCategory;
  scope: LeaderboardScope;
  classroom: { id: string; displayName: string; level: string };
  periodLabel: string;
  subjectOptions: Array<{ id: string; name: string }>;
  selectedSubject: { id: string; name: string } | null;
};

export type LeaderboardLoadResult =
  { ok: true; data: LeaderboardView } | { ok: false; status: 403 | 404; error: string };

/**
 * Build one student's view of the released-result leaderboard for their
 * current class. Subject cohorts are limited to active subject enrolments.
 */
export async function loadLeaderboardView(params: {
  schoolId: string;
  classId: string;
  viewerStudentId: string;
  category: LeaderboardCategory;
  scope: LeaderboardScope;
  subjectId?: string | null;
}): Promise<LeaderboardLoadResult> {
  const classroom = await prisma.schoolClass.findFirst({
    where: { id: params.classId, schoolId: params.schoolId, isActive: true },
    select: { id: true, displayName: true, level: true },
  });
  if (!classroom) return { ok: false, status: 404, error: "Current class not found." };

  const [activeStudents, currentTerm, enrolledSubjects] = await Promise.all([
    prisma.studentProfile.findMany({
      where: {
        schoolId: params.schoolId,
        currentClassId: classroom.id,
        isActive: true,
      },
      select: { id: true },
    }),
    prisma.term.findFirst({
      where: { schoolId: params.schoolId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, session: { select: { label: true } } },
    }),
    prisma.studentSubject.findMany({
      where: {
        schoolId: params.schoolId,
        studentProfileId: params.viewerStudentId,
        isActive: true,
        subject: { isActive: true, level: classroom.level },
      },
      orderBy: { subject: { name: "asc" } },
      select: { subject: { select: { id: true, name: true } } },
    }),
  ]);

  const subjectOptions = enrolledSubjects.map((row) => row.subject);
  let selectedSubject: { id: string; name: string } | null = null;
  let cohortIds = activeStudents.map((student) => student.id);

  if (params.scope === "SUBJECT") {
    selectedSubject = subjectOptions.find((subject) => subject.id === params.subjectId) ?? null;
    if (!selectedSubject && !params.subjectId) selectedSubject = subjectOptions[0] ?? null;
    if (!selectedSubject) {
      return {
        ok: false,
        status: params.subjectId ? 404 : 403,
        error: params.subjectId
          ? "That subject is not available to this student in the current class."
          : "No active subject enrolments are available for a subject leaderboard.",
      };
    }

    const enrolments = await prisma.studentSubject.findMany({
      where: {
        schoolId: params.schoolId,
        subjectId: selectedSubject.id,
        isActive: true,
        studentProfileId: { in: cohortIds },
      },
      select: { studentProfileId: true },
    });
    cohortIds = enrolments.map((row) => row.studentProfileId);
    if (!cohortIds.includes(params.viewerStudentId)) {
      return {
        ok: false,
        status: 403,
        error: "This student is not enrolled in the selected subject.",
      };
    }
  }

  const exams = cohortIds.length
    ? await prisma.exam.findMany({
        where: {
          schoolId: params.schoolId,
          classId: classroom.id,
          status: "CLOSED",
          resultsReleased: true,
          examType: { in: examTypesForLeaderboard(params.category) },
          ...(currentTerm ? { termId: currentTerm.id } : {}),
          ...(selectedSubject
            ? {
                OR: [
                  { subjectId: selectedSubject.id },
                  {
                    subjectId: null,
                    subjectName: { equals: selectedSubject.name, mode: "insensitive" },
                  },
                ],
              }
            : {}),
        },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 500,
        select: {
          id: true,
          questions: { select: { marks: true } },
          attempts: {
            where: {
              status: "GRADED",
              studentProfileId: { in: cohortIds },
            },
            select: {
              studentProfileId: true,
              totalScore: true,
              attemptNumber: true,
              submittedAt: true,
            },
          },
        },
      })
    : [];

  const standings = buildLeaderboard({
    exams,
    eligibleStudentIds: cohortIds,
    viewerStudentId: params.viewerStudentId,
  });

  return {
    ok: true,
    data: {
      ...standings,
      category: params.category,
      scope: params.scope,
      classroom,
      periodLabel: currentTerm
        ? `${currentTerm.session.label} · ${currentTerm.label}`
        : "All released results for the current class",
      subjectOptions,
      selectedSubject,
    },
  };
}
