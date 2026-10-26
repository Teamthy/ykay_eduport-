import { Prisma, type ExamSnapshot } from "@prisma/client";

/** Snapshot the current draft once it is transitioned to published, within the same transaction. */
export async function createExamSnapshot(
  tx: Prisma.TransactionClient,
  examId: string,
): Promise<ExamSnapshot> {
  const exam = await tx.exam.findUnique({
    where: { id: examId },
    include: {
      questions: {
        where: { archivedAt: null },
        orderBy: { sortOrder: "asc" },
        include: { versions: { orderBy: { version: "desc" }, take: 1 } },
      },
      snapshots: { select: { revision: true }, orderBy: { revision: "desc" }, take: 1 },
    },
  });
  if (!exam) throw new Error("EXAM_NOT_FOUND");
  if (!exam.questions.length) throw new Error("EXAM_HAS_NO_QUESTIONS");
  if (exam.questions.some((question) => question.versions.length !== 1)) {
    throw new Error("QUESTION_VERSION_MISSING");
  }

  return tx.examSnapshot.create({
    data: {
      schoolId: exam.schoolId,
      examId,
      revision: (exam.snapshots[0]?.revision ?? 0) + 1,
      title: exam.title,
      subjectName: exam.subjectName,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      theoryMinutes: exam.theoryMinutes ?? 0,
      passMark: exam.passMark,
      totalMarks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
      shuffleQuestions: exam.shuffleQuestions,
      scheduledFor: exam.scheduledFor,
      availableUntil: exam.availableUntil,
      questions: {
        create: exam.questions.map((question) => ({
          schoolId: exam.schoolId,
          questionId: question.id,
          questionVersionId: question.versions[0].id,
          sortOrder: question.sortOrder,
        })),
      },
    },
  });
}

export type SnapshotWithQuestions = Prisma.ExamSnapshotGetPayload<{
  include: { questions: { include: { questionVersion: true } } };
}>;
