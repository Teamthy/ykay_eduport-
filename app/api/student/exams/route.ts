import { ExamAttemptStatus, ExamStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { getStudentExamContext } from "@/lib/exams";
import { getStudentFeeLock } from "@/lib/fee-lock";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getStudentExamContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const feeLock = await getStudentFeeLock(context.user.schoolId, context.studentProfile.id);

  const exams = await prisma.exam.findMany({
    where: {
      classId: context.studentProfile.currentClassId,
      status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
    },
    orderBy: { createdAt: "desc" },
    include: {
      teacherProfile: { select: { displayName: true } },
      questions: { select: { id: true, marks: true, type: true } },
      attempts: {
        where: { studentProfileId: context.studentProfile.id },
        orderBy: { attemptNumber: "desc" },
      },
      retakes: { where: { studentProfileId: context.studentProfile.id } },
    },
  });

  return NextResponse.json({
    feeLock,
    student: {
      displayName: context.studentProfile.displayName,
      studentId: context.studentProfile.studentId,
    },
    exams: exams.map((exam) => {
      const latestAttempt = exam.attempts[0] || null;
      const retake = exam.retakes[0] || null;
      const totalMarks = exam.questions.reduce((sum, question) => sum + question.marks, 0);
      const hasUnusedRetake = Boolean(retake && !retake.used);
      const canStart =
        exam.status === ExamStatus.PUBLISHED &&
        (!latestAttempt ||
          (latestAttempt.status !== ExamAttemptStatus.IN_PROGRESS && hasUnusedRetake));
      const canResume = Boolean(latestAttempt && latestAttempt.status === ExamAttemptStatus.IN_PROGRESS);

      return {
        id: exam.id,
        title: exam.title,
        subjectName: exam.subjectName,
        teacherName: exam.teacherProfile.displayName,
        examType: exam.examType,
        durationMinutes: exam.durationMinutes,
        questionCount: exam.questions.length,
        totalMarks,
        passMark: exam.passMark,
        hasEssay: exam.questions.some((question) => question.type === "ESSAY"),
        status: exam.status,
        instructions: exam.instructions,
        canStart: feeLock ? false : canStart,
        canResume: feeLock ? false : canResume,
        feeLocked: Boolean(feeLock),
        attempt: latestAttempt
          ? {
              id: latestAttempt.id,
              status: latestAttempt.status,
              totalScore: latestAttempt.totalScore,
              submittedAt: latestAttempt.submittedAt?.toISOString() || null,
              scoreVisible: exam.resultsReleased && latestAttempt.status === ExamAttemptStatus.GRADED,
              percent:
                exam.resultsReleased && latestAttempt.status === ExamAttemptStatus.GRADED && totalMarks
                  ? Math.round((latestAttempt.totalScore / totalMarks) * 100)
                  : null,
            }
          : null,
      };
    }),
  });
}

