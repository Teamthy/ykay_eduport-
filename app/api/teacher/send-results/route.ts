import { ExamAttemptStatus, ExamStatus, NotificationKind, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getExamTeacherContext } from "@/lib/exams";
import { waecGrade } from "@/lib/gradebook";
import { createInAppNotificationOnce } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";
import { enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const sendSchema = z.object({
  examId: z.string().trim().min(1),
  studentProfileIds: z
    .array(z.string().trim().min(1))
    .min(1)
    .max(300)
    .refine((ids) => new Set(ids).size === ids.length, "Student list must not contain duplicates."),
});

function assignedExamScope(
  context: NonNullable<Awaited<ReturnType<typeof getExamTeacherContext>>>,
) {
  return context.teacherProfile.subjectAssignments.map((assignment) => ({
    classId: assignment.classroom.id,
    subjectName: assignment.subjectName,
  }));
}

function releasedExamWhere(
  schoolId: string,
  scope: ReturnType<typeof assignedExamScope>,
  examId?: string,
) {
  return {
    ...(examId ? { id: examId } : {}),
    schoolId,
    status: ExamStatus.CLOSED,
    resultsReleased: true,
    examType: { not: "PRACTICE" },
    OR: scope,
  };
}

function totalMarksFor(exam: { snapshots: Array<{ totalMarks: number }> }) {
  return exam.snapshots[0]?.totalMarks ?? 0;
}

/**
 * Return only closed, released exams in this teacher's assigned subject/class
 * pairs. Scores and totals are computed from graded server-side attempts and
 * persisted question marks; the browser never supplies result values.
 */
export async function GET() {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const scope = assignedExamScope(context);
  if (!scope.length) return NextResponse.json({ exams: [] });

  const exams = await prisma.exam.findMany({
    where: releasedExamWhere(context.user.schoolId, scope),
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      classroom: { select: { displayName: true } },
      term: { select: { label: true, session: { select: { label: true } } } },
      snapshots: { orderBy: { revision: "desc" }, take: 1, select: { totalMarks: true } },
      attempts: {
        where: { status: ExamAttemptStatus.GRADED },
        orderBy: [{ submittedAt: "desc" }, { attemptNumber: "desc" }],
        take: 1000,
        include: {
          snapshot: { select: { totalMarks: true } },
          studentProfile: { select: { id: true, studentId: true, displayName: true } },
        },
      },
    },
  });

  const available = exams.flatMap((exam) => {
    const totalMarks = totalMarksFor(exam);
    if (totalMarks <= 0) return [];

    const seenStudents = new Set<string>();
    const students = exam.attempts.flatMap((attempt) => {
      const studentId = attempt.studentProfile.id;
      if (seenStudents.has(studentId)) return [];
      seenStudents.add(studentId);
      const attemptTotal = attempt.snapshot.totalMarks;
      if (attemptTotal <= 0 || attempt.totalScore < 0 || attempt.totalScore > attemptTotal)
        return [];

      const percent = Math.round((attempt.totalScore / attemptTotal) * 100);
      return [
        {
          profileId: studentId,
          studentId: attempt.studentProfile.studentId,
          studentName: attempt.studentProfile.displayName,
          score: attempt.totalScore,
          total: attemptTotal,
          percent,
          grade: waecGrade(percent),
          attemptNumber: attempt.attemptNumber,
          submittedAt: attempt.submittedAt?.toISOString() ?? null,
        },
      ];
    });
    if (!students.length) return [];

    return [
      {
        id: exam.id,
        title: exam.title,
        subjectName: exam.subjectName,
        examType: exam.examType,
        className: exam.classroom.displayName,
        termLabel: exam.term?.label ?? "Legacy term",
        sessionLabel: exam.term?.session.label ?? "",
        totalMarks,
        students,
      },
    ];
  });

  return NextResponse.json({ exams: available });
}

export async function POST(request: NextRequest) {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = await enforceRateLimit("sendResults", context.user.id);
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many result broadcasts. Please wait before sending again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof sendSchema>;
  try {
    input = sendSchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Select a released assessment and at least one eligible student." },
      { status: 400 },
    );
  }

  const scope = assignedExamScope(context);
  if (!scope.length) {
    return NextResponse.json(
      { error: "You are not assigned to any subject or class." },
      { status: 403 },
    );
  }

  const exam = await prisma.exam.findFirst({
    where: releasedExamWhere(context.user.schoolId, scope, input.examId),
    include: {
      classroom: { select: { displayName: true } },
      term: { select: { label: true, session: { select: { label: true } } } },
      snapshots: { orderBy: { revision: "desc" }, take: 1, select: { totalMarks: true } },
      attempts: {
        where: {
          status: ExamAttemptStatus.GRADED,
          studentProfileId: { in: input.studentProfileIds },
        },
        orderBy: [{ submittedAt: "desc" }, { attemptNumber: "desc" }],
        include: {
          snapshot: { select: { totalMarks: true } },
          studentProfile: {
            select: {
              id: true,
              studentId: true,
              displayName: true,
              userId: true,
              parentLinks: {
                include: {
                  parentProfile: {
                    select: { id: true, schoolId: true, userId: true, isActive: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!exam) {
    return NextResponse.json(
      { error: "Released results are not available for that assessment." },
      { status: 404 },
    );
  }

  const totalMarks = totalMarksFor(exam);
  if (totalMarks <= 0) {
    return NextResponse.json(
      { error: "This assessment has no valid question marks." },
      { status: 409 },
    );
  }

  // A student can have a permitted retake. Select the latest fully graded
  // attempt once, using server ordering, and never accept a score from input.
  const latestAttemptByStudent = new Map<string, (typeof exam.attempts)[number]>();
  for (const attempt of exam.attempts) {
    if (!latestAttemptByStudent.has(attempt.studentProfile.id)) {
      latestAttemptByStudent.set(attempt.studentProfile.id, attempt);
    }
  }
  if (input.studentProfileIds.some((id) => !latestAttemptByStudent.has(id))) {
    return NextResponse.json(
      { error: "One or more selected students no longer have a releasable graded result." },
      { status: 409 },
    );
  }

  const selectedAttempts = input.studentProfileIds.map((id) => latestAttemptByStudent.get(id)!);
  if (
    selectedAttempts.some(
      (attempt) => attempt.totalScore < 0 || attempt.totalScore > attempt.snapshot.totalMarks,
    )
  ) {
    return NextResponse.json(
      { error: "A stored result is outside this assessment's marks. Contact an administrator." },
      { status: 409 },
    );
  }

  const linkedParentIds = selectedAttempts.flatMap((attempt) =>
    attempt.studentProfile.parentLinks
      .filter(
        (link) =>
          link.parentProfile.schoolId === context.user.schoolId && link.parentProfile.isActive,
      )
      .map((link) => link.parentProfile.userId),
  );
  const possibleUserIds = [
    ...selectedAttempts
      .map((attempt) => attempt.studentProfile.userId)
      .filter((id): id is string => Boolean(id)),
    ...linkedParentIds,
  ];
  const activeUsers = possibleUserIds.length
    ? await prisma.user.findMany({
        where: {
          id: { in: [...new Set(possibleUserIds)] },
          schoolId: context.user.schoolId,
          isActive: true,
          isSuspended: false,
          role: { in: [UserRole.PARENT, UserRole.STUDENT] },
        },
        select: { id: true, role: true },
      })
    : [];
  const activeUserIds = new Set(activeUsers.map((user) => user.id));
  const usersById = new Map(activeUsers.map((user) => [user.id, user]));

  let notificationCount = 0;
  let withoutParent = 0;
  let withoutPortalAccount = 0;
  const resultLabel = `${exam.subjectName} — ${exam.title}`;

  for (const attempt of selectedAttempts) {
    const student = attempt.studentProfile;
    const parentIds = new Set(
      student.parentLinks
        .filter(
          (link) =>
            link.parentProfile.schoolId === context.user.schoolId && link.parentProfile.isActive,
        )
        .map((link) => link.parentProfile.userId)
        .filter((id) => activeUserIds.has(id) && usersById.get(id)?.role === UserRole.PARENT),
    );
    if (!parentIds.size) withoutParent += 1;

    const recipients = new Set(parentIds);
    if (
      student.userId &&
      activeUserIds.has(student.userId) &&
      usersById.get(student.userId)?.role === UserRole.STUDENT
    ) {
      recipients.add(student.userId);
    }
    if (!recipients.size) withoutPortalAccount += 1;

    const percent = Math.round((attempt.totalScore / attempt.snapshot.totalMarks) * 100);
    const body = `${student.displayName} scored ${attempt.totalScore}/${attempt.snapshot.totalMarks} (${percent}%) in ${resultLabel}${exam.term ? `, ${exam.term.session.label} ${exam.term.label}` : ""}.`;
    for (const userId of recipients) {
      const isParent = usersById.get(userId)?.role === UserRole.PARENT;
      const link = isParent
        ? `/parent/exam-results?studentId=${encodeURIComponent(student.id)}`
        : exam.examType === "CA"
          ? "/student/ca-tests"
          : "/student/exams";
      const created = await createInAppNotificationOnce({
        id: `exam-result-${attempt.id}-${userId}`,
        schoolId: context.user.schoolId,
        userId,
        kind: NotificationKind.REPORT_RELEASED,
        title: "Assessment result released",
        body,
        link,
      });
      if (created.created) notificationCount += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      schoolId: context.user.schoolId,
      actorUserId: context.user.id,
      action: "RESULTS_SENT_TO_PARENTS",
      entityType: "Exam",
      entityId: exam.id,
      metadata: {
        subject: exam.subjectName,
        assessment: exam.title,
        students: selectedAttempts.length,
        notifications: notificationCount,
        withoutParent,
        withoutPortalAccount,
      },
      ipAddress: getClientIp(request),
    },
  });

  return NextResponse.json({
    ok: true,
    sent: selectedAttempts.length,
    notifications: notificationCount,
    withoutParent,
    withoutPortalAccount,
    message:
      notificationCount > 0
        ? `Portal result notifications created for ${selectedAttempts.length} student(s).`
        : "These results were already announced to the selected accounts.",
  });
}
