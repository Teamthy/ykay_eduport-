import { ExamAttemptStatus, ExamStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { finalizeAttempt, getStudentExamContext } from "@/lib/exams";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OptionShape = { key: string; text: string };

/** Deterministic per-attempt shuffle so a refresh keeps the same order. */
function shuffled<T>(items: T[], seed: string): T[] {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const array = [...items];
  for (let index = array.length - 1; index > 0; index -= 1) {
    hash = (hash * 1103515245 + 12345) >>> 0;
    const swap = hash % (index + 1);
    [array[index], array[swap]] = [array[swap], array[index]];
  }
  return array;
}

/**
 * Load a PRACTICE exam that belongs to the student's own class and school.
 *
 * The examType check is the security boundary for this whole route group: it
 * stops a student pointing the practice endpoints at a real CA or end-of-term exam to
 * get unlimited attempts with no fee lock.
 */
async function loadPracticeExam(
  examId: string,
  schoolId: string,
  currentClassId: string,
  studentProfileId: string,
) {
  return prisma.exam.findFirst({
    where: {
      id: examId,
      schoolId,
      examType: "PRACTICE",
      OR: [{ classId: currentClassId }, { attempts: { some: { studentProfileId } } }],
    },
  });
}

/**
 * POST — start, or resume, a practice attempt.
 *
 * Differs from the graded runner (/api/student/exams/[id]/attempt) in two ways,
 * both intentional:
 *   • no fee lock — revision must not be paywalled;
 *   • unlimited attempts — no ExamRetake grant needed.
 */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const studentContext = await getStudentExamContext();
  if (!studentContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const exam = await loadPracticeExam(
    id,
    studentContext.user.schoolId,
    studentContext.studentProfile.currentClassId,
    studentContext.studentProfile.id,
  );
  if (!exam) {
    return NextResponse.json({ error: "Practice exam not found for your class." }, { status: 404 });
  }
  const existing = await prisma.examAttempt.findFirst({
    where: { examId: exam.id, studentProfileId: studentContext.studentProfile.id },
    orderBy: { attemptNumber: "desc" },
    include: { snapshot: { include: { questions: { include: { questionVersion: true } } } } },
  });

  const activeSnapshot =
    (existing?.status === ExamAttemptStatus.IN_PROGRESS ? existing.snapshot : null) ??
    (await prisma.examSnapshot.findFirst({
      where: { examId: exam.id },
      orderBy: { revision: "desc" },
      include: { questions: { orderBy: { sortOrder: "asc" }, include: { questionVersion: true } } },
    }));
  if (!activeSnapshot || !activeSnapshot.questions.length) {
    return NextResponse.json(
      { error: "This practice set has no published snapshot." },
      { status: 503 },
    );
  }
  let attempt = existing;

  if (
    exam.classId !== studentContext.studentProfile.currentClassId &&
    (!existing || existing.status !== ExamAttemptStatus.IN_PROGRESS)
  ) {
    return NextResponse.json(
      {
        error:
          "Previous-class practice history is read-only; only an in-progress attempt can be resumed.",
      },
      { status: 409 },
    );
  }

  if (existing && existing.status === ExamAttemptStatus.IN_PROGRESS) {
    // Resume — unless the clock already ran out, in which case submit it.
    if (existing.deadlineAt.getTime() < Date.now()) {
      await finalizeAttempt(existing.id);
      return NextResponse.json(
        { error: "Time elapsed. That attempt was submitted — start a fresh one." },
        { status: 409 },
      );
    }
  } else {
    if (exam.status !== ExamStatus.PUBLISHED) {
      return NextResponse.json({ error: "This practice set is closed." }, { status: 409 });
    }

    // Unlimited retakes: just increment the attempt number.
    attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        snapshotId: activeSnapshot.id,
        studentProfileId: studentContext.studentProfile.id,
        attemptNumber: (existing?.attemptNumber || 0) + 1,
        deadlineAt: new Date(Date.now() + activeSnapshot.durationMinutes * 60_000),
      },
    });
  }

  if (!attempt) {
    return NextResponse.json({ error: "Unable to start the attempt." }, { status: 500 });
  }

  const savedAnswers = await prisma.examAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, response: true },
  });
  const responses = Object.fromEntries(
    savedAnswers.map((answer) => [answer.questionId, answer.response]),
  );

  const attemptSnapshot =
    attempt.snapshotId === activeSnapshot.id
      ? activeSnapshot
      : await prisma.examSnapshot.findUnique({
          where: { id: attempt.snapshotId },
          include: {
            questions: { orderBy: { sortOrder: "asc" }, include: { questionVersion: true } },
          },
        });
  if (!attemptSnapshot)
    return NextResponse.json({ error: "Attempt snapshot unavailable." }, { status: 503 });
  const ordered = attemptSnapshot.shuffleQuestions
    ? shuffled(attemptSnapshot.questions, attempt.id)
    : attemptSnapshot.questions;

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      attemptNumber: attempt.attemptNumber,
      deadlineAt: attempt.deadlineAt.toISOString(),
      secondsLeft: Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000)),
      lastClientSequence: attempt.lastClientSequence,
    },
    exam: {
      id: exam.id,
      title: attemptSnapshot.title,
      subjectName: attemptSnapshot.subjectName,
      instructions: attemptSnapshot.instructions,
      durationMinutes: attemptSnapshot.durationMinutes,
      totalMarks: attemptSnapshot.totalMarks,
    },
    questions: ordered.map((question) => ({
      id: question.questionId,
      type: question.questionVersion.type,
      questionText: question.questionVersion.questionText,
      marks: question.questionVersion.marks,
      options: (question.questionVersion.options as OptionShape[] | null) || null,
      savedResponse: responses[question.questionId] ?? null,
    })),
  });
}

const saveSchema = z.object({
  attemptId: z.string().trim().min(1),
  action: z.enum(["SAVE", "SUBMIT"]),
  clientSequence: z.number().int().min(1).max(2_147_483_647).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        response: z.string().max(10_000).nullable(),
      }),
    )
    .max(200),
});

/**
 * PATCH — save progress, or submit.
 *
 * On submit the attempt is graded immediately and, unlike a graded exam, the
 * correct answers are returned straight away: instant feedback is the entire
 * point of practice.
 */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const studentContext = await getStudentExamContext();
  if (!studentContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;

  let payload: z.infer<typeof saveSchema>;
  try {
    payload = saveSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const exam = await loadPracticeExam(
    id,
    studentContext.user.schoolId,
    studentContext.studentProfile.currentClassId,
    studentContext.studentProfile.id,
  );
  if (!exam) {
    return NextResponse.json({ error: "Practice exam not found for your class." }, { status: 404 });
  }

  // The attempt must belong to this student AND this exam — never trust the id.
  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: payload.attemptId,
      examId: exam.id,
      studentProfileId: studentContext.studentProfile.id,
    },
    include: { snapshot: { include: { questions: { include: { questionVersion: true } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    return NextResponse.json({ error: "This attempt is already submitted." }, { status: 409 });
  }

  const snapshotQuestionById = new Map(
    attempt.snapshot.questions.map((question) => [question.questionId, question]),
  );
  const validQuestionIds = new Set(snapshotQuestionById.keys());
  const answers = payload.answers.filter((answer) => validQuestionIds.has(answer.questionId));

  const clientSequence = payload.clientSequence ?? attempt.lastClientSequence + 1;
  const saveApplied = await prisma.$transaction(async (tx) => {
    const claim = await tx.examAttempt.updateMany({
      where: {
        id: attempt.id,
        status: ExamAttemptStatus.IN_PROGRESS,
        lastClientSequence: { lt: clientSequence },
      },
      data: { lastClientSequence: clientSequence },
    });
    if (claim.count !== 1) return false;
    await Promise.all(
      answers.map((answer) =>
        tx.examAnswer.upsert({
          where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
          create: {
            attemptId: attempt.id,
            questionId: answer.questionId,
            snapshotQuestionId: snapshotQuestionById.get(answer.questionId)!.id,
            response: answer.response,
          },
          update: { response: answer.response },
        }),
      ),
    );
    return true;
  });
  if (!saveApplied && payload.action === "SAVE") {
    const latest = await prisma.examAttempt.findUnique({
      where: { id: attempt.id },
      select: { lastClientSequence: true },
    });
    return NextResponse.json({
      ok: true,
      staleSaveIgnored: true,
      lastClientSequence: latest?.lastClientSequence ?? attempt.lastClientSequence,
    });
  }
  if (!saveApplied)
    return NextResponse.json(
      { error: "A newer response was saved. Retry submission." },
      { status: 409 },
    );

  if (payload.action === "SAVE") {
    const expired = attempt.deadlineAt.getTime() < Date.now();
    if (expired) {
      const finalized = await finalizeAttempt(attempt.id);
      return NextResponse.json({
        ok: true,
        autoSubmitted: true,
        totalScore: finalized?.totalScore ?? 0,
        lastClientSequence: clientSequence,
      });
    }
    return NextResponse.json({
      ok: true,
      secondsLeft: Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000)),
      lastClientSequence: clientSequence,
    });
  }

  const finalized = await finalizeAttempt(attempt.id);
  const totalMarks = attempt.snapshot.totalMarks;

  // Instant review — correct answers and per-question marks. Safe here because
  // practice sets are revision material, not assessed work.
  const graded = await prisma.examAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, response: true, isCorrect: true, awardedMarks: true },
  });
  const gradedByQuestion = new Map(graded.map((answer) => [answer.questionId, answer]));

  return NextResponse.json({
    ok: true,
    result: {
      totalScore: finalized?.totalScore ?? 0,
      totalMarks,
      percent: totalMarks ? Math.round(((finalized?.totalScore ?? 0) / totalMarks) * 100) : 0,
      passMark: attempt.snapshot.passMark,
      attemptNumber: attempt.attemptNumber,
    },
    review: attempt.snapshot.questions.map((item) => {
      const question = item.questionVersion;
      const answer = gradedByQuestion.get(item.questionId);
      return {
        id: item.questionId,
        questionText: question.questionText,
        type: question.type,
        marks: question.marks,
        options: (question.options as OptionShape[] | null) || null,
        yourResponse: answer?.response ?? null,
        isCorrect: answer?.isCorrect ?? null,
        awardedMarks: answer?.awardedMarks ?? null,
        correctKey: question.correctKey,
        correctText: question.correctText,
      };
    }),
  });
}
