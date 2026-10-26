import { ExamAttemptStatus, ExamQuestionType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/session";
import { gradeObjectiveAnswer } from "@/lib/exam-questions";

export const EXAM_TEACHER_ROLES: UserRole[] = [
  UserRole.TEACHER,
  UserRole.HOD,
  UserRole.ADMIN,
  UserRole.DIRECTOR,
];

export type ExamTeacherContext = {
  user: SessionUser;
  teacherProfile: {
    id: string;
    displayName: string;
    subjectAssignments: Array<{
      id: string;
      subjectName: string;
      classroom: { id: string; displayName: string; level: string };
    }>;
  };
};

export async function getExamTeacherContext(): Promise<ExamTeacherContext | null> {
  const user = await requireRole(EXAM_TEACHER_ROLES);
  if (!user) return null;

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    select: {
      id: true,
      displayName: true,
      classAssignments: {
        where: { isActive: true, subjectName: { not: null } },
        orderBy: [{ classroom: { displayName: "asc" } }],
        select: {
          id: true,
          subjectName: true,
          classroom: { select: { id: true, displayName: true, level: true } },
        },
      },
    },
  });
  if (!teacherProfile) return null;

  return {
    user,
    teacherProfile: {
      id: teacherProfile.id,
      displayName: teacherProfile.displayName,
      subjectAssignments: teacherProfile.classAssignments
        .filter((assignment) => Boolean(assignment.subjectName))
        .map((assignment) => ({
          id: assignment.id,
          subjectName: assignment.subjectName as string,
          classroom: assignment.classroom,
        })),
    },
  };
}

export async function getStudentExamContext() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return null;
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    select: { id: true, displayName: true, studentId: true, currentClassId: true },
  });
  if (!studentProfile) return null;
  return { user, studentProfile };
}

/* ------------------------------------------------------------------
   Pure exam logic lives in lib/exam-questions.ts
   ------------------------------------------------------------------

   Re-exported here so existing server-side imports keep working. Client
   components must import from "@/lib/exam-questions" directly — importing
   this module from the browser drags in next/headers via lib/session and
   fails the build.
*/

export {
  parseBulkQuestions,
  gradeObjectiveAnswer,
  examStatusLabel,
  type ParsedQuestion,
} from "@/lib/exam-questions";

export async function finalizeAttempt(attemptId: string) {
  return prisma.$transaction(async (tx) => {
    // Claim the attempt before reading answers. This serializes finalization with
    // autosaves on the same attempt row, so a response cannot land after grading
    // has read its answer set. Any later grading failure rolls this claim back.
    const claim = await tx.examAttempt.updateMany({
      where: { id: attemptId, status: ExamAttemptStatus.IN_PROGRESS },
      data: { status: ExamAttemptStatus.SUBMITTED, submittedAt: new Date() },
    });
    if (claim.count !== 1) {
      return tx.examAttempt.findUnique({ where: { id: attemptId } });
    }

    const attempt = await tx.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        answers: {
          include: {
            snapshotQuestion: {
              include: {
                questionVersion: {
                  select: { type: true, correctKey: true, correctText: true, marks: true },
                },
              },
            },
          },
        },
        snapshot: {
          include: {
            questions: {
              select: { id: true, questionId: true, questionVersion: { select: { type: true } } },
            },
          },
        },
      },
    });
    if (!attempt) return null;

    // Materialize unanswered items at submit time so zero-response essays remain
    // pending for a teacher and unanswered objective items are explicitly zero.
    const answeredSnapshotQuestionIds = new Set(
      attempt.answers.map((answer) => answer.snapshotQuestionId),
    );
    const unansweredQuestions = attempt.snapshot.questions.filter(
      (question) => !answeredSnapshotQuestionIds.has(question.id),
    );
    const emptyAnswers = await Promise.all(
      unansweredQuestions.map((question) =>
        tx.examAnswer.create({
          data: {
            attemptId: attempt.id,
            questionId: question.questionId,
            snapshotQuestionId: question.id,
            response: null,
          },
          include: {
            snapshotQuestion: {
              include: {
                questionVersion: {
                  select: { type: true, correctKey: true, correctText: true, marks: true },
                },
              },
            },
          },
        }),
      ),
    );
    const answers = [...attempt.answers, ...emptyAnswers];

    let autoScore = 0;
    let hasEssay = false;
    const buckets = new Map<string, { isCorrect: boolean; awardedMarks: number; ids: string[] }>();

    for (const answer of answers) {
      const version = answer.snapshotQuestion.questionVersion;
      if (version.type === ExamQuestionType.ESSAY) {
        hasEssay = true;
        continue;
      }
      const graded = gradeObjectiveAnswer({
        type: version.type,
        correctKey: version.correctKey,
        correctText: version.correctText,
        marks: version.marks,
        response: answer.response,
      });
      const awardedMarks = graded.awardedMarks || 0;
      const isCorrect = graded.isCorrect === true;
      autoScore += awardedMarks;

      const key = `${isCorrect}:${awardedMarks}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.ids.push(answer.id);
      else buckets.set(key, { isCorrect, awardedMarks, ids: [answer.id] });
    }

    // One update per distinct score outcome; all work, including the claim,
    // answer marks, and final score, commits or rolls back together.
    await Promise.all(
      [...buckets.values()].map((bucket) =>
        tx.examAnswer.updateMany({
          where: { id: { in: bucket.ids } },
          data: { isCorrect: bucket.isCorrect, awardedMarks: bucket.awardedMarks },
        }),
      ),
    );
    return tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status: hasEssay ? ExamAttemptStatus.SUBMITTED : ExamAttemptStatus.GRADED,
        autoScore,
        totalScore: autoScore + attempt.essayScore,
      },
    });
  });
}
