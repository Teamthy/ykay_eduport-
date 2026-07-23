import { ExamAttemptStatus, ExamStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { finalizeAttempt, getStudentExamContext } from "@/lib/exams";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type OptionShape = { key: string; text: string };

function shuffled<T>(items: T[], seed: string): T[] {
  // Deterministic per-attempt shuffle so refreshes keep the same order.
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

/** POST — start (or resume) an attempt. */
export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const studentContext = await getStudentExamContext();
  if (!studentContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const exam = await prisma.exam.findFirst({
    where: { id, classId: studentContext.studentProfile.currentClassId },
    include: { questions: { orderBy: { sortOrder: "asc" } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found for your class." }, { status: 404 });

  const existing = await prisma.examAttempt.findFirst({
    where: { examId: exam.id, studentProfileId: studentContext.studentProfile.id },
    orderBy: { attemptNumber: "desc" },
  });

  let attempt = existing;

  if (existing && existing.status === ExamAttemptStatus.IN_PROGRESS) {
    // Resume — but auto-submit if the deadline has passed.
    if (existing.deadlineAt.getTime() < Date.now()) {
      await finalizeAttempt(existing.id);
      return NextResponse.json({ error: "Time elapsed. Your attempt was submitted automatically." }, { status: 409 });
    }
  } else {
    if (exam.status !== ExamStatus.PUBLISHED) {
      return NextResponse.json({ error: "This exam is not open for new attempts." }, { status: 409 });
    }
    if (existing) {
      const retake = await prisma.examRetake.findUnique({
        where: {
          examId_studentProfileId: {
            examId: exam.id,
            studentProfileId: studentContext.studentProfile.id,
          },
        },
      });
      if (!retake || retake.used) {
        return NextResponse.json(
          { error: "You have already taken this exam. Ask your teacher to enable a retake." },
          { status: 409 }
        );
      }
      await prisma.examRetake.update({ where: { id: retake.id }, data: { used: true } });
    }

    attempt = await prisma.examAttempt.create({
      data: {
        examId: exam.id,
        studentProfileId: studentContext.studentProfile.id,
        attemptNumber: (existing?.attemptNumber || 0) + 1,
        deadlineAt: new Date(Date.now() + exam.durationMinutes * 60_000),
      },
    });
  }

  if (!attempt) return NextResponse.json({ error: "Unable to start the attempt." }, { status: 500 });

  const savedAnswers = await prisma.examAnswer.findMany({
    where: { attemptId: attempt.id },
    select: { questionId: true, response: true },
  });
  const responses = Object.fromEntries(savedAnswers.map((answer) => [answer.questionId, answer.response]));

  const ordered = exam.shuffleQuestions ? shuffled(exam.questions, attempt.id) : exam.questions;

  return NextResponse.json({
    attempt: {
      id: attempt.id,
      deadlineAt: attempt.deadlineAt.toISOString(),
      secondsLeft: Math.max(0, Math.floor((attempt.deadlineAt.getTime() - Date.now()) / 1000)),
    },
    exam: {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subjectName,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
    },
    questions: ordered.map((question) => ({
      id: question.id,
      type: question.type,
      questionText: question.questionText,
      marks: question.marks,
      options: (question.options as OptionShape[] | null) || null,
      savedResponse: responses[question.id] ?? null,
    })),
  });
}

const saveSchema = z.object({
  attemptId: z.string().trim().min(1),
  action: z.enum(["SAVE", "SUBMIT", "TAB_SWITCH"]),
  answers: z
    .array(z.object({ questionId: z.string().trim().min(1), response: z.string().max(10_000).nullable() }))
    .max(300)
    .optional(),
});

/** PATCH — autosave answers, record tab switches, or submit. */
export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const studentContext = await getStudentExamContext();
  if (!studentContext) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  let payload: z.infer<typeof saveSchema>;
  try {
    payload = saveSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const attempt = await prisma.examAttempt.findFirst({
    where: {
      id: payload.attemptId,
      examId: id,
      studentProfileId: studentContext.studentProfile.id,
    },
    include: { exam: { select: { questions: { select: { id: true } } } } },
  });
  if (!attempt) return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
    return NextResponse.json({ error: "This attempt is already submitted." }, { status: 409 });
  }

  if (payload.action === "TAB_SWITCH") {
    await prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { tabSwitches: { increment: 1 } },
    });
    return NextResponse.json({ ok: true });
  }

  const validQuestionIds = new Set(attempt.exam.questions.map((question) => question.id));
  const answers = (payload.answers || []).filter((answer) => validQuestionIds.has(answer.questionId));

  for (const answer of answers) {
    await prisma.examAnswer.upsert({
      where: { attemptId_questionId: { attemptId: attempt.id, questionId: answer.questionId } },
      update: { response: answer.response },
      create: { attemptId: attempt.id, questionId: answer.questionId, response: answer.response },
    });
  }

  const expired = attempt.deadlineAt.getTime() < Date.now();
  if (payload.action === "SUBMIT" || expired) {
    const finalized = await finalizeAttempt(attempt.id);
    return NextResponse.json({
      ok: true,
      submitted: true,
      message: expired
        ? "Time elapsed — your answers were submitted automatically."
        : "Exam submitted successfully.",
      status: finalized?.status,
    });
  }

  return NextResponse.json({ ok: true, submitted: false });
}
