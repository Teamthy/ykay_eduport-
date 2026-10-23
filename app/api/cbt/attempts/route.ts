import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { gradeAttempt } from "@/lib/cbt";
import { isResponse, requireCbtUser } from "@/lib/cbt-auth";
import { verifyCbtDraw } from "@/lib/cbt-draw";

const answerSchema = z.object({
  questionId: z.string().trim().min(1).max(120),
  selectedIndex: z.number().int().min(0).max(3).nullable(),
});

const submitSchema = z.object({
  subjectSlug: z.string().trim().min(1).max(80),
  mode: z.enum(["practice", "exam"]).default("practice"),
  durationSeconds: z.number().int().min(0).max(86_400).optional(),
  answers: z.array(answerSchema).min(1).max(100),
  drawToken: z.string().min(20).max(16_000),
});

/**
 * Signed-in: submit a finished practice attempt (SEC-02).
 *
 * Grading happens SERVER-SIDE against the stored questions, and only for
 * questions in the caller's signed draw — an attempt can no longer be
 * assembled from arbitrary enumerated IDs, and the recorded identity comes
 * from the session, never from client-supplied name/email fields.
 */
export async function POST(req: NextRequest) {
  const user = await requireCbtUser();
  if (isResponse(user)) return user;

  const parsed = submitSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid CBT submission." }, { status: 400 });
  }
  const { subjectSlug, mode, answers, drawToken, durationSeconds } = parsed.data;
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  if (answeredIds.size !== answers.length) {
    return NextResponse.json({ error: "A question may be answered only once." }, { status: 400 });
  }

  const subject = await prisma.cbtSubject.findUnique({ where: { slug: subjectSlug } });
  if (!subject) return NextResponse.json({ error: "Subject not found" }, { status: 404 });

  const draw = verifyCbtDraw(drawToken, user.id);
  if (!draw || draw.subjectId !== subject.id) {
    return NextResponse.json(
      { error: "This paper has expired. Start a new practice paper." },
      { status: 403 },
    );
  }
  const drawn = new Set(draw.questionIds);
  if ([...answeredIds].some((questionId) => !drawn.has(questionId))) {
    return NextResponse.json(
      { error: "Some answers are not part of this practice paper." },
      { status: 403 },
    );
  }
  if (
    answeredIds.size !== draw.questionIds.length ||
    draw.questionIds.some((id) => !answeredIds.has(id))
  ) {
    return NextResponse.json(
      { error: "Submit every question in this paper, using null for skipped answers." },
      { status: 400 },
    );
  }

  const questions = await prisma.cbtQuestion.findMany({
    where: { subjectId: subject.id, status: "published", id: { in: [...answeredIds] } },
    select: {
      id: true,
      topic: true,
      correctIndex: true,
      stem: true,
      options: true,
      explanation: true,
    },
  });
  if (questions.length !== draw.questionIds.length) {
    return NextResponse.json(
      { error: "The question bank changed while this paper was open. Start a new paper." },
      { status: 409 },
    );
  }

  const graded = gradeAttempt(
    questions.map((q) => ({ id: q.id, topic: q.topic, correctIndex: q.correctIndex })),
    answers,
  );

  const attempt = await prisma.cbtAttempt.create({
    data: {
      subjectId: subject.id,
      mode,
      total: graded.total,
      correct: graded.correct,
      skipped: graded.skipped,
      scorePct: graded.scorePct,
      durationSeconds: durationSeconds ?? 0,
      studentName: user.name.slice(0, 80),
      studentEmail: user.email.slice(0, 120),
      answers,
    },
  });

  const byId = new Map(answers.map((a) => [a.questionId, a.selectedIndex]));
  return NextResponse.json({
    attemptId: attempt.id,
    result: graded,
    review: questions.map((q) => ({
      questionId: q.id,
      topic: q.topic,
      stem: q.stem,
      options: q.options as string[],
      correctIndex: q.correctIndex,
      selectedIndex: byId.get(q.id) ?? null,
      explanation: q.explanation,
    })),
  });
}
