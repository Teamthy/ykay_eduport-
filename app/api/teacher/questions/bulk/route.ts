import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { UserRole, ExamQuestionType, Prisma } from "@prisma/client";

import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const schema = z.object({
  examId: z.string().min(1),
  questions: z
    .array(
      z.object({
        type: z.enum(["MCQ", "TRUE_FALSE", "FILL_BLANK", "ESSAY"]),
        questionText: z.string().min(1).max(5000),
        options: z
          .array(
            z.object({
              key: z.string(),
              text: z.string(),
            }),
          )
          .nullable()
          .optional(),
        correctKey: z.string().nullable().optional(),
        correctText: z.string().nullable().optional(),
        marks: z.number().int().min(1).max(20).default(1),
        explanation: z.string().max(2000).optional(),
        topic: z.string().max(200).optional(),
        difficulty: z.string().max(50).optional(),
      }),
    )
    .min(1)
    .max(500),
});

/**
 * POST — Bulk upload questions to an exam.
 * Validates ownership, then creates all questions in a single transaction
 * to ensure atomic sync (all or nothing).
 */
export async function POST(request: NextRequest) {
  const user = await requireRole([
    UserRole.TEACHER,
    UserRole.HOD,
    UserRole.ADMIN,
    UserRole.DIRECTOR,
  ]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let input: z.infer<typeof schema>;
  try {
    input = schema.parse(await request.json());
  } catch (e) {
    const issues =
      e instanceof z.ZodError
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`)
        : ["Invalid request body."];
    return NextResponse.json({ error: "Validation failed.", details: issues }, { status: 400 });
  }

  // Verify exam exists and belongs to this teacher
  const exam = await prisma.exam.findFirst({
    where: {
      id: input.examId,
      schoolId: user.schoolId,
      ...(user.role === UserRole.TEACHER || user.role === UserRole.HOD
        ? { teacherProfile: { userId: user.id } }
        : {}),
    },
    include: {
      questions: { select: { id: true } },
    },
  });

  if (!exam) {
    return NextResponse.json(
      { error: "Exam not found or you don't have access." },
      { status: 404 },
    );
  }

  // Check total question limit (max 500 per exam)
  if (exam.questions.length + input.questions.length > 500) {
    return NextResponse.json(
      {
        error: `Exam already has ${exam.questions.length} questions. Maximum is 500.`,
      },
      { status: 400 },
    );
  }

  // Build question data for Prisma
  const typeMap: Record<string, ExamQuestionType> = {
    MCQ: ExamQuestionType.MCQ,
    TRUE_FALSE: ExamQuestionType.TRUE_FALSE,
    FILL_BLANK: ExamQuestionType.FILL_BLANK,
    ESSAY: ExamQuestionType.ESSAY,
  };

  const questionData = input.questions.map((q, idx): Prisma.ExamQuestionUncheckedCreateInput => ({
    examId: input.examId,
    type: typeMap[q.type],
    questionText: q.questionText,
    options: q.options ? (q.options as Prisma.InputJsonValue) : Prisma.JsonNull,
    correctKey: q.correctKey ?? null,
    correctText: q.correctText ?? null,
    marks: q.marks,
    sortOrder: exam.questions.length + idx + 1,
  }));

  // Atomic transaction — all questions created or none
  try {
    const created = await prisma.$transaction(
      questionData.map((data) => prisma.examQuestion.create({ data })),
    );

    // Recalculate total marks
    const allQuestions = await prisma.examQuestion.findMany({
      where: { examId: input.examId },
      select: { marks: true },
    });
    const totalMarks = allQuestions.reduce((sum, q) => sum + q.marks, 0);

    await prisma.exam.update({
      where: { id: input.examId },
      data: { totalMarks },
    });

    return NextResponse.json({
      ok: true,
      message: `${created.length} questions synced successfully.`,
      created: created.length,
      totalQuestions: allQuestions.length,
      totalMarks,
    });
  } catch (error) {
    logger.error("[bulk-questions] Transaction failed:", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: "Failed to sync questions to database. No questions were saved.",
      },
      { status: 500 },
    );
  }
}

/**
 * GET — List questions for an exam (for preview/editing).
 */
export async function GET(request: NextRequest) {
  const user = await requireRole([
    UserRole.TEACHER,
    UserRole.HOD,
    UserRole.ADMIN,
    UserRole.DIRECTOR,
  ]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const examId = request.nextUrl.searchParams.get("examId");
  if (!examId) return NextResponse.json({ error: "examId required" }, { status: 400 });

  const exam = await prisma.exam.findFirst({
    where: { id: examId, schoolId: user.schoolId },
    include: {
      questions: { orderBy: { sortOrder: "asc" } },
      classroom: { select: { displayName: true } },
    },
  });

  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subjectName,
      className: exam.classroom.displayName,
      totalMarks: exam.totalMarks,
    },
    questions: exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      correctKey: q.correctKey,
      correctText: q.correctText,
      marks: q.marks,
      sortOrder: q.sortOrder,
    })),
  });
}

/**
 * DELETE — Remove a question from an exam.
 */
export async function DELETE(request: NextRequest) {
  const user = await requireRole([
    UserRole.TEACHER,
    UserRole.HOD,
    UserRole.ADMIN,
    UserRole.DIRECTOR,
  ]);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const questionId = request.nextUrl.searchParams.get("questionId");
  if (!questionId) return NextResponse.json({ error: "questionId required" }, { status: 400 });

  const question = await prisma.examQuestion.findFirst({
    where: {
      id: questionId,
      exam: { schoolId: user.schoolId },
    },
  });

  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });

  await prisma.examQuestion.delete({ where: { id: questionId } });

  return NextResponse.json({ ok: true, message: "Question deleted." });
}
