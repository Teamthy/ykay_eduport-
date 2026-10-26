import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { CBT_SESSION_TTL_SECONDS, signCbtDraw } from "@/lib/cbt-draw";
import { shuffled } from "@/lib/cbt";
import { REVIEWED_QUESTION_FILTER } from "@/lib/cbt-review";

export const dynamic = "force-dynamic";

const startSchema = z.object({
  classLevel: z.enum(["jss1", "jss2", "jss3", "ss1", "ss2", "ss3"]),
  practiceMode: z.enum(["topic", "subject", "mixed"]),
  term: z.enum(["all", "first", "second", "third"]).default("all"),
  subjectSlugs: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  topic: z.string().trim().max(120).nullable().optional(),
  questionCount: z.number().int().min(1).max(60),
  durationMinutes: z.number().int().min(0).max(120).default(0),
});

type SafeQuestionRow = {
  id: string;
  subjectId: string;
  topic: string;
  difficulty: number;
  stem: string;
  options: unknown;
  subject: { name: string };
};

function publicQuestion(question: SafeQuestionRow) {
  return {
    id: question.id,
    subjectName: question.subject.name,
    topic: question.topic,
    difficulty: question.difficulty,
    stem: question.stem,
    options: question.options as string[],
  };
}

export async function POST(request: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const parsed = startSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Choose a class, mode, subject or subjects, up to 60 questions, and a valid timer.",
      },
      { status: 400 },
    );
  }
  const input = parsed.data;
  const subjectSlugs = [...new Set(input.subjectSlugs)];
  const topic = input.topic?.trim() || null;
  if (subjectSlugs.length !== input.subjectSlugs.length) {
    return NextResponse.json({ error: "Each subject may be selected only once." }, { status: 400 });
  }
  if (input.practiceMode === "topic" && (subjectSlugs.length !== 1 || !topic)) {
    return NextResponse.json(
      { error: "Topic-focused practice needs one subject and one topic." },
      { status: 400 },
    );
  }
  if (input.practiceMode === "subject" && (subjectSlugs.length !== 1 || topic)) {
    return NextResponse.json(
      { error: "Subject-focused practice needs one subject and no topic filter." },
      { status: 400 },
    );
  }
  if (input.practiceMode === "mixed" && topic) {
    return NextResponse.json(
      { error: "Mixed practice draws from all topics in the selected subjects." },
      { status: 400 },
    );
  }

  const [student, subjects] = await Promise.all([
    prisma.studentProfile.findFirst({
      where: { schoolId: user.schoolId, userId: user.id, isActive: true },
      select: { id: true },
    }),
    prisma.cbtSubject.findMany({
      where: {
        slug: { in: subjectSlugs },
        classLevel: input.classLevel,
        questions: {
          some: {
            ...REVIEWED_QUESTION_FILTER,
            ...(input.term !== "all" ? { term: input.term } : {}),
          },
        },
      },
      select: { id: true, slug: true, name: true },
    }),
  ]);
  if (!student) {
    return NextResponse.json(
      { error: "An active student profile is required to start personal practice." },
      { status: 404 },
    );
  }
  if (subjects.length !== subjectSlugs.length) {
    return NextResponse.json(
      { error: "One or more subjects are not available for the selected class." },
      { status: 400 },
    );
  }

  const subjectIds = subjects.map((subject) => subject.id);
  const candidates = await prisma.cbtQuestion.findMany({
    where: {
      subjectId: { in: subjectIds },
      ...REVIEWED_QUESTION_FILTER,
      ...(topic ? { topic } : {}),
      ...(input.term !== "all" ? { term: input.term } : {}),
    },
    select: { id: true, subjectId: true },
  });
  if (!candidates.length) {
    return NextResponse.json(
      { error: "No reviewed questions match these choices yet." },
      { status: 409 },
    );
  }

  const drawnIds = shuffled(candidates)
    .slice(0, input.questionCount)
    .map((row) => row.id);
  const questions = (await prisma.cbtQuestion.findMany({
    where: {
      id: { in: drawnIds },
      subjectId: { in: subjectIds },
      ...REVIEWED_QUESTION_FILTER,
      ...(input.term !== "all" ? { term: input.term } : {}),
    },
    select: {
      id: true,
      subjectId: true,
      topic: true,
      difficulty: true,
      stem: true,
      options: true,
      subject: { select: { name: true } },
    },
  })) as SafeQuestionRow[];
  const byId = new Map(questions.map((question) => [question.id, question]));
  const orderedQuestions = drawnIds.flatMap((id) => {
    const question = byId.get(id);
    return question ? [question] : [];
  });
  if (!orderedQuestions.length) {
    return NextResponse.json({ error: "No reviewed questions could be loaded." }, { status: 409 });
  }
  const questionIds = orderedQuestions.map((question) => question.id);

  const drawToken = signCbtDraw({
    userId: user.id,
    subjectIds,
    questionIds,
    ttlSeconds: CBT_SESSION_TTL_SECONDS,
  });
  const isTimed = input.durationMinutes > 0;
  const deadlineAt = isTimed ? new Date(Date.now() + input.durationMinutes * 60_000) : null;
  const expiresAt = new Date(Date.now() + CBT_SESSION_TTL_SECONDS * 1000);
  const attempt = await prisma.cbtAttempt.create({
    data: {
      subjectId: subjectIds[0],
      mode: "practice",
      total: orderedQuestions.length,
      correct: 0,
      skipped: orderedQuestions.length,
      scorePct: 0,
      durationSeconds: 0,
      studentName: user.name.slice(0, 80),
      studentEmail: user.email.slice(0, 120),
      answers: [],
      userId: user.id,
      schoolId: user.schoolId,
      studentProfileId: student.id,
      classLevel: input.classLevel,
      practiceMode: input.practiceMode,
      topic,
      term: input.term === "all" ? null : input.term,
      subjectIds,
      questionIds,
      drawToken,
      status: "IN_PROGRESS",
      isTimed,
      deadlineAt,
      expiresAt,
    },
    select: { id: true, createdAt: true },
  });

  return NextResponse.json(
    {
      sessionId: attempt.id,
      classLevel: input.classLevel,
      practiceMode: input.practiceMode,
      subjects: subjects.map(({ id, slug, name }) => ({ id, slug, name })),
      topic,
      term: input.term,
      questionCount: orderedQuestions.length,
      requestedQuestionCount: input.questionCount,
      isTimed,
      deadlineAt: deadlineAt?.toISOString() ?? null,
      expiresAt: expiresAt.toISOString(),
      secondsLeft: deadlineAt
        ? Math.max(0, Math.floor((deadlineAt.getTime() - Date.now()) / 1000))
        : null,
      questions: orderedQuestions.map(publicQuestion),
    },
    { status: 201 },
  );
}

export async function GET() {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const attempts = await prisma.cbtAttempt.findMany({
    where: {
      userId: user.id,
      schoolId: user.schoolId,
      mode: "practice",
      status: "IN_PROGRESS",
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
      id: true,
      classLevel: true,
      practiceMode: true,
      topic: true,
      term: true,
      subjectIds: true,
      subjectId: true,
      total: true,
      isTimed: true,
      deadlineAt: true,
      expiresAt: true,
      createdAt: true,
    },
  });
  const subjectIds = [
    ...new Set(
      attempts.flatMap((attempt) =>
        Array.isArray(attempt.subjectIds)
          ? attempt.subjectIds.filter((id): id is string => typeof id === "string")
          : [attempt.subjectId],
      ),
    ),
  ];
  const subjects = subjectIds.length
    ? await prisma.cbtSubject.findMany({
        where: { id: { in: subjectIds } },
        select: { id: true, name: true },
      })
    : [];
  const subjectNames = new Map(subjects.map((subject) => [subject.id, subject.name]));

  return NextResponse.json({
    sessions: attempts.map((attempt) => {
      const ids = Array.isArray(attempt.subjectIds)
        ? attempt.subjectIds.filter((id): id is string => typeof id === "string")
        : [attempt.subjectId];
      return {
        id: attempt.id,
        classLevel: attempt.classLevel,
        practiceMode: attempt.practiceMode,
        topic: attempt.topic,
        term: attempt.term,
        subjectNames: ids.flatMap((id) => {
          const name = subjectNames.get(id);
          return name ? [name] : [];
        }),
        questionCount: attempt.total,
        isTimed: attempt.isTimed,
        secondsLeft: attempt.deadlineAt
          ? Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000))
          : null,
        createdAt: attempt.createdAt.toISOString(),
      };
    }),
  });
}
