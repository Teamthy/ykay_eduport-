import { prisma } from "@/lib/prisma";
import {
  buildLeaderboard,
  buildLeaderboardRankings,
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

  const subjectOptions = enrolledSubjects.map(
    (row: { subject: { id: string; name: string } }) => row.subject,
  );
  let selectedSubject: { id: string; name: string } | null = null;
  let cohortIds = activeStudents.map((student: { id: string }) => student.id);

  if (params.scope === "SUBJECT") {
    selectedSubject =
      subjectOptions.find(
        (subject: { id: string; name: string }) => subject.id === params.subjectId,
      ) ?? null;
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
    cohortIds = enrolments.map((row: { studentProfileId: string }) => row.studentProfileId);
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

export type AdminLeaderboardLearner = {
  id: string;
  studentId: string;
  displayName: string;
  rank: number;
  stars: number;
};

export type AdminLeaderboardView = {
  classroom: { id: string; displayName: string; level: string };
  classOptions: Array<{ id: string; displayName: string; level: string }>;
  periodLabel: string;
  subjectOptions: Array<{ id: string; name: string }>;
  selectedSubject: { id: string; name: string } | null;
  cohortSize: number;
  learners: AdminLeaderboardLearner[];
};

export type AdminLeaderboardLoadResult =
  { ok: true; data: AdminLeaderboardView } | { ok: false; status: 403 | 404; error: string };

/**
 * Build a school-admin view. Every query is tenant scoped, and ranking inputs
 * are restricted to active learners and CLOSED, graded-result releases.
 */
export async function loadAdminLeaderboardView(params: {
  schoolId: string;
  classId?: string | null;
  category: LeaderboardCategory;
  scope: LeaderboardScope;
  subjectId?: string | null;
}): Promise<AdminLeaderboardLoadResult> {
  const classOptions = (await prisma.schoolClass.findMany({
    where: { schoolId: params.schoolId, isActive: true },
    orderBy: [{ displayName: "asc" }, { id: "asc" }],
    select: { id: true, displayName: true, level: true },
  })) as Array<{ id: string; displayName: string; level: string }>;
  const classroom = params.classId
    ? (classOptions.find(
        (candidate: { id: string; displayName: string; level: string }) =>
          candidate.id === params.classId,
      ) ?? null)
    : (classOptions[0] ?? null);
  if (!classroom) {
    return {
      ok: false,
      status: params.classId ? 404 : 403,
      error: params.classId
        ? "That class is not available in this school."
        : "No active classes are available.",
    };
  }

  const [students, currentTerm, subjectOptions] = await Promise.all([
    prisma.studentProfile.findMany({
      where: {
        schoolId: params.schoolId,
        currentClassId: classroom.id,
        isActive: true,
      },
      orderBy: [{ displayName: "asc" }, { id: "asc" }],
      select: { id: true, studentId: true, displayName: true },
    }),
    prisma.term.findFirst({
      where: { schoolId: params.schoolId, isCurrent: true },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: { id: true, label: true, session: { select: { label: true } } },
    }),
    prisma.subject.findMany({
      where: { schoolId: params.schoolId, level: classroom.level, isActive: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  let selectedSubject: { id: string; name: string } | null = null;
  const studentRows = students as Array<{ id: string; studentId: string; displayName: string }>;
  const availableSubjects = subjectOptions as Array<{ id: string; name: string }>;
  let cohortIds = studentRows.map((student) => student.id);
  if (params.scope === "SUBJECT") {
    selectedSubject =
      subjectOptions.find(
        (subject: { id: string; name: string }) => subject.id === params.subjectId,
      ) ?? null;
    if (!selectedSubject && !params.subjectId) selectedSubject = availableSubjects[0] ?? null;
    if (!selectedSubject && params.subjectId) {
      return {
        ok: false,
        status: 404,
        error: "That subject is not active for the selected class level.",
      };
    }
    if (!selectedSubject) {
      return {
        ok: true,
        data: {
          classroom,
          classOptions,
          periodLabel: currentTerm
            ? `${currentTerm.session.label} · ${currentTerm.label}`
            : "All released results for the current class",
          subjectOptions: availableSubjects,
          selectedSubject: null,
          cohortSize: 0,
          learners: [],
        },
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
    cohortIds = enrolments.map((row: { studentProfileId: string }) => row.studentProfileId);
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

  const studentsById = new Map<
    string,
    Pick<AdminLeaderboardLearner, "id" | "studentId" | "displayName">
  >(studentRows.map((student) => [student.id, student]));
  const learners: AdminLeaderboardLearner[] = buildLeaderboardRankings({
    exams,
    eligibleStudentIds: cohortIds,
  }).flatMap((standing) => {
    const student = studentsById.get(standing.studentProfileId);
    return student
      ? [
          {
            id: student.id,
            studentId: student.studentId,
            displayName: student.displayName,
            rank: standing.rank,
            stars: standing.stars,
          },
        ]
      : [];
  });

  return {
    ok: true,
    data: {
      classroom,
      classOptions,
      periodLabel: currentTerm
        ? `${currentTerm.session.label} · ${currentTerm.label}`
        : "All released results for the current class",
      subjectOptions: availableSubjects,
      selectedSubject,
      cohortSize: learners.length,
      learners,
    },
  };
}
