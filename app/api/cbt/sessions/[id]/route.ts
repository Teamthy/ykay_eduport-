import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { verifyCbtDraw } from "@/lib/cbt-draw";
import { gradeAttempt, type PublicQuestion } from "@/lib/cbt";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";

export const dynamic = "force-dynamic";

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("CHECK"),
    questionId: z.string().trim().min(1).max(120),
    selectedIndex: z.number().int().min(0).max(3),
  }),
  z.object({ action: z.literal("SUBMIT") }),
]);

type SafeQuestionRow = {
  id: string;
  subjectId: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: unknown;
  correctIndex: number;
  explanation: string;
  subject: { name: string };
};

type StoredAnswer = {
  questionId: string;
  selectedIndex: number;
  isCorrect: boolean;
  correctIndex: number;
  explanation: string;
};

function parseStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : [];
}

function publicQuestion(question: SafeQuestionRow): PublicQuestion & { subjectName: string } {
  return {
    id: question.id,
    subjectName: question.subject.name,
    topic: question.topic,
    difficulty: question.difficulty,
    stem: question.stem,
    options: question.options as string[],
  };
}

function sessionAnswer(answer: StoredAnswer) {
  return {
    questionId: answer.questionId,
    selectedIndex: answer.selectedIndex,
    check: {
      correct: answer.isCorrect,
      correctIndex: answer.correctIndex,
      explanation: answer.explanation,
    },
  };
}

function reviewFor(questions: SafeQuestionRow[], answers: StoredAnswer[]) {
  const byQuestion = new Map(answers.map((answer) => [answer.questionId, answer]));
  return questions.map((question) => {
    const answer = byQuestion.get(question.id);
    return {
      questionId: question.id,
      subjectName: question.subject.name,
      topic: question.topic,
      stem: question.stem,
      options: question.options as string[],
      correctIndex: question.correctIndex,
      selectedIndex: answer?.selectedIndex ?? null,
      explanation: question.explanation,
    };
  });
}

function resultFor(questions: SafeQuestionRow[], answers: StoredAnswer[]) {
  return gradeAttempt(
    questions.map((question) => ({
      id: question.id,
      topic: question.topic,
      correctIndex: question.correctIndex,
    })),
    questions.map((question) => {
      const answer = answers.find((row) => row.questionId === question.id);
      return { questionId: question.id, selectedIndex: answer?.selectedIndex ?? null };
    }),
  );
}

async function completeAttempt(params: {
  attempt: {
    id: string;
    userId: string | null;
    schoolId: string | null;
    status: string;
    isTimed: boolean;
    deadlineAt: Date | null;
    createdAt: Date;
    durationSeconds: number;
  };
  questions: SafeQuestionRow[];
  answers: StoredAnswer[];
}) {
  const result = resultFor(params.questions, params.answers);
  const now = new Date();
  const elapsedSeconds = Math.max(
    0,
    Math.floor((now.getTime() - params.attempt.createdAt.getTime()) / 1000),
  );
  const maximumSeconds =
    params.attempt.isTimed && params.attempt.deadlineAt
      ? Math.max(
          0,
          Math.floor(
            (params.attempt.deadlineAt.getTime() - params.attempt.createdAt.getTime()) / 1000,
          ),
        )
      : elapsedSeconds;
  const durationSeconds =
    params.attempt.status === "COMPLETED"
      ? params.attempt.durationSeconds
      : Math.min(elapsedSeconds, maximumSeconds);

  if (params.attempt.status === "IN_PROGRESS") {
    await prisma.cbtAttempt.updateMany({
      where: {
        id: params.attempt.id,
        userId: params.attempt.userId,
        schoolId: params.attempt.schoolId,
        status: "IN_PROGRESS",
      },
      data: {
        status: "COMPLETED",
        completedAt: now,
        correct: result.correct,
        skipped: result.skipped,
        scorePct: result.scorePct,
        durationSeconds,
        answers: params.questions.map((question) => {
          const answer = params.answers.find((row) => row.questionId === question.id);
          return { questionId: question.id, selectedIndex: answer?.selectedIndex ?? null };
        }),
      },
    });
  }

  return { result, review: reviewFor(params.questions, params.answers), durationSeconds };
}

async function loadQuestions(questionIds: string[], subjectIds: string[]) {
  if (!questionIds.length || !subjectIds.length) return [] as SafeQuestionRow[];
  const rows = (await prisma.cbtQuestion.findMany({
    where: {
      id: { in: questionIds },
      subjectId: { in: subjectIds },
      ...REVIEWED_QUESTION_FILTER,
    },
    select: {
      id: true,
      subjectId: true,
      topic: true,
      difficulty: true,
      stem: true,
      options: true,
      correctIndex: true,
      explanation: true,
      subject: { select: { name: true } },
    },
  })) as SafeQuestionRow[];
  const byId = new Map(rows.map((question) => [question.id, question]));
  return questionIds.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  });
}

async function loadAttempt(id: string, userId: string, schoolId: string) {
  return prisma.cbtAttempt.findFirst({
    where: { id, userId, schoolId },
    select: {
      id: true,
      subjectId: true,
      userId: true,
      schoolId: true,
      studentProfileId: true,
      classLevel: true,
      practiceMode: true,
      topic: true,
      term: true,
      week: true,
      subjectIds: true,
      questionIds: true,
      drawToken: true,
      status: true,
      isTimed: true,
      deadlineAt: true,
      expiresAt: true,
      completedAt: true,
      createdAt: true,
      correct: true,
      skipped: true,
      scorePct: true,
      durationSeconds: true,
    },
  });
}

function verifyAttemptDraw(
  attempt: {
    drawToken: string | null;
    questionIds: unknown;
    subjectIds: unknown;
    status: string;
  },
  userId: string,
) {
  // Completed results remain readable by their owner indefinitely; an active
  // untimed set must resume before its persisted 30-day expiry.
  const draw = verifyCbtDraw(
    attempt.drawToken,
    userId,
    attempt.status === "COMPLETED" ? 0 : undefined,
  );
  const questionIds = parseStringArray(attempt.questionIds);
  const subjectIds = parseStringArray(attempt.subjectIds);
  if (
    !draw ||
    questionIds.length === 0 ||
    subjectIds.length === 0 ||
    draw.questionIds.length !== questionIds.length ||
    draw.questionIds.some((id, index) => id !== questionIds[index]) ||
    draw.subjectIds.length !== subjectIds.length ||
    draw.subjectIds.some((id, index) => id !== subjectIds[index])
  ) {
    return null;
  }
  return { draw, questionIds, subjectIds };
}

async function loadAnswers(attemptId: string): Promise<StoredAnswer[]> {
  return prisma.cbtPracticeAnswer.findMany({
    where: { attemptId },
    orderBy: { createdAt: "asc" },
    select: {
      questionId: true,
      selectedIndex: true,
      isCorrect: true,
      correctIndex: true,
      explanation: true,
    },
  });
}

function completedPayload(
  attempt: NonNullable<Awaited<ReturnType<typeof loadAttempt>>>,
  questions: SafeQuestionRow[],
  answers: StoredAnswer[],
  completion: Awaited<ReturnType<typeof completeAttempt>>,
) {
  return {
    session: {
      id: attempt.id,
      status: "COMPLETED",
      classLevel: attempt.classLevel,
      practiceMode: attempt.practiceMode,
      topic: attempt.topic,
      term: attempt.term,
      week: attempt.week,
      isTimed: attempt.isTimed,
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      secondsLeft: 0,
      durationSeconds: completion.durationSeconds,
    },
    questions: questions.map(publicQuestion),
    answers: answers.map(sessionAnswer),
    result: completion.result,
    review: completion.review,
  };
}

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;
  const { id } = await context.params;
  const attempt = await loadAttempt(id, user.id, user.schoolId);
  if (!attempt) return NextResponse.json({ error: "Practice session not found." }, { status: 404 });
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.expiresAt &&
    attempt.expiresAt.getTime() <= Date.now()
  ) {
    await prisma.cbtAttempt.updateMany({
      where: {
        id: attempt.id,
        userId: user.id,
        schoolId: user.schoolId,
        status: "IN_PROGRESS",
      },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This saved set expired after 30 days. Start a fresh set." },
      { status: 410 },
    );
  }

  const verified = verifyAttemptDraw(attempt, user.id);
  if (!verified) {
    return NextResponse.json(
      { error: "This practice session could not be verified." },
      { status: 409 },
    );
  }
  const questions = await loadQuestions(verified.questionIds, verified.subjectIds);
  if (questions.length !== verified.questionIds.length) {
    return NextResponse.json(
      { error: "The reviewed question bank changed; please start a new practice set." },
      { status: 409 },
    );
  }
  const answers = await loadAnswers(attempt.id);

  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.isTimed &&
    attempt.deadlineAt &&
    attempt.deadlineAt.getTime() <= Date.now()
  ) {
    const completion = await completeAttempt({ attempt, questions, answers });
    return NextResponse.json(completedPayload(attempt, questions, answers, completion));
  }

  if (attempt.status === "COMPLETED") {
    const completion = await completeAttempt({ attempt, questions, answers });
    return NextResponse.json(completedPayload(attempt, questions, answers, completion));
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This practice session is no longer active." },
      { status: 409 },
    );
  }

  const secondsLeft =
    attempt.isTimed && attempt.deadlineAt
      ? Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000))
      : null;
  return NextResponse.json({
    session: {
      id: attempt.id,
      status: attempt.status,
      classLevel: attempt.classLevel,
      practiceMode: attempt.practiceMode,
      topic: attempt.topic,
      term: attempt.term,
      week: attempt.week,
      isTimed: attempt.isTimed,
      deadlineAt: attempt.deadlineAt?.toISOString() ?? null,
      secondsLeft,
    },
    questions: questions.map(publicQuestion),
    answers: answers.map(sessionAnswer),
  });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid practice-session action." }, { status: 400 });
  }

  const { id } = await context.params;
  const attempt = await loadAttempt(id, user.id, user.schoolId);
  if (!attempt) return NextResponse.json({ error: "Practice session not found." }, { status: 404 });
  if (
    attempt.status === "IN_PROGRESS" &&
    attempt.expiresAt &&
    attempt.expiresAt.getTime() <= Date.now()
  ) {
    await prisma.cbtAttempt.updateMany({
      where: {
        id: attempt.id,
        userId: user.id,
        schoolId: user.schoolId,
        status: "IN_PROGRESS",
      },
      data: { status: "EXPIRED" },
    });
    return NextResponse.json(
      { error: "This saved set expired after 30 days. Start a fresh set." },
      { status: 410 },
    );
  }
  const verified = verifyAttemptDraw(attempt, user.id);
  if (!verified) {
    return NextResponse.json(
      { error: "This practice session could not be verified." },
      { status: 409 },
    );
  }

  const questions = await loadQuestions(verified.questionIds, verified.subjectIds);
  if (questions.length !== verified.questionIds.length) {
    return NextResponse.json(
      { error: "The question bank changed during this session." },
      { status: 409 },
    );
  }
  const answers = await loadAnswers(attempt.id);

  if (attempt.status === "COMPLETED") {
    const completion = await completeAttempt({ attempt, questions, answers });
    return NextResponse.json(completedPayload(attempt, questions, answers, completion));
  }
  if (attempt.status !== "IN_PROGRESS") {
    return NextResponse.json(
      { error: "This practice session is no longer active." },
      { status: 409 },
    );
  }

  if (attempt.isTimed && attempt.deadlineAt && attempt.deadlineAt.getTime() <= Date.now()) {
    const completion = await completeAttempt({ attempt, questions, answers });
    return NextResponse.json({
      ...completedPayload(attempt, questions, answers, completion),
      autoSubmitted: true,
    });
  }

  if (parsed.data.action === "CHECK") {
    const checkData = parsed.data;
    const question = questions.find((row) => row.id === checkData.questionId);
    if (!question) {
      return NextResponse.json(
        { error: "That question is not in this practice paper." },
        { status: 403 },
      );
    }

    const existing = answers.find((answer) => answer.questionId === question.id);
    if (existing) return NextResponse.json(sessionAnswer(existing));
    const optionCount = Array.isArray(question.options) ? question.options.length : 0;
    if (checkData.selectedIndex >= optionCount) {
      return NextResponse.json({ error: "Choose one of the available options." }, { status: 400 });
    }

    const answer: StoredAnswer = {
      questionId: question.id,
      selectedIndex: checkData.selectedIndex,
      isCorrect: checkData.selectedIndex === question.correctIndex,
      correctIndex: question.correctIndex,
      explanation: question.explanation,
    };
    try {
      await prisma.cbtPracticeAnswer.create({
        data: {
          attemptId: attempt.id,
          questionId: question.id,
          selectedIndex: answer.selectedIndex,
          isCorrect: answer.isCorrect,
          correctIndex: answer.correctIndex,
          explanation: answer.explanation,
        },
      });
    } catch (error) {
      // A concurrent retry may have won the unique (attempt, question) insert.
      const saved = await prisma.cbtPracticeAnswer.findUnique({
        where: { attemptId_questionId: { attemptId: attempt.id, questionId: question.id } },
        select: {
          questionId: true,
          selectedIndex: true,
          isCorrect: true,
          correctIndex: true,
          explanation: true,
        },
      });
      if (!saved) throw error;
      return NextResponse.json(sessionAnswer(saved));
    }
    return NextResponse.json(sessionAnswer(answer));
  }

  const completion = await completeAttempt({ attempt, questions, answers });
  return NextResponse.json(completedPayload(attempt, questions, answers, completion));
}
