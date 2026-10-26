import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/session";
import { UserRole, ExamQuestionType, ExamStatus, Prisma } from "@prisma/client";

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

const TEACHING_ROLES = new Set<UserRole>([UserRole.TEACHER, UserRole.HOD]);
function examAccessWhere(user: SessionUser, examId: string) {
  return {
    id: examId,
    schoolId: user.schoolId,
    ...(TEACHING_ROLES.has(user.role) ? { teacherProfile: { userId: user.id } } : {}),
  } as const;
}

/**
 * POST — Bulk upload questions to an exam.
 * Validates ownership and DRAFT status, then creates all questions and
 * recalculates total marks in one transaction.
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

  const exam = await prisma.exam.findFirst({
    where: examAccessWhere(user, input.examId),
    include: {
      questions: { where: { archivedAt: null }, select: { id: true } },
    },
  });

  if (!exam) {
    return NextResponse.json(
      { error: "Exam not found or you don't have access." },
      { status: 404 },
    );
  }
  if (exam.status !== ExamStatus.DRAFT) {
    return NextResponse.json(
      { error: "Questions can only be changed while the exam is still in DRAFT." },
      { status: 409 },
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

  try {
    const result = await prisma.$transaction(async (tx) => {
      const draftClaim = await tx.exam.updateMany({
        where: {
          id: exam.id,
          schoolId: user.schoolId,
          status: ExamStatus.DRAFT,
          updatedAt: exam.updatedAt,
        },
        data: { updatedAt: new Date() },
      });
      if (draftClaim.count !== 1) throw new Error("EXAM_NO_LONGER_DRAFT");
      const created = [];
      for (const data of questionData) {
        created.push(await tx.examQuestion.create({ data }));
      }
      const aggregate = await tx.examQuestion.aggregate({
        where: { examId: input.examId, archivedAt: null },
        _sum: { marks: true },
        _count: { _all: true },
      });
      const totalMarks = aggregate._sum.marks ?? 0;
      await tx.exam.update({
        where: { id: input.examId },
        data: { totalMarks },
      });
      return { created, totalQuestions: aggregate._count._all, totalMarks };
    });

    return NextResponse.json({
      ok: true,
      message: `${result.created.length} questions synced successfully.`,
      created: result.created.length,
      totalQuestions: result.totalQuestions,
      totalMarks: result.totalMarks,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EXAM_NO_LONGER_DRAFT") {
      return NextResponse.json(
        { error: "Assessment state changed. Reload before adding questions." },
        { status: 409 },
      );
    }
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
    where: examAccessWhere(user, examId),
    include: {
      questions: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
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
      archivedAt: null,
      exam: {
        schoolId: user.schoolId,
        ...(TEACHING_ROLES.has(user.role) ? { teacherProfile: { userId: user.id } } : {}),
      },
    },
    include: { exam: { select: { id: true, status: true, updatedAt: true } } },
  });

  if (!question) return NextResponse.json({ error: "Question not found." }, { status: 404 });
  if (question.exam.status !== ExamStatus.DRAFT) {
    return NextResponse.json(
      { error: "Questions can only be deleted while the exam is still in DRAFT." },
      { status: 409 },
    );
  }

  let result: { totalMarks: number; totalQuestions: number };
  try {
    result = await prisma.$transaction(async (tx) => {
      const draftClaim = await tx.exam.updateMany({
        where: {
          id: question.exam.id,
          schoolId: user.schoolId,
          status: ExamStatus.DRAFT,
          updatedAt: question.exam.updatedAt,
        },
        data: { updatedAt: new Date() },
      });
      if (draftClaim.count !== 1) throw new Error("EXAM_NO_LONGER_DRAFT");
      await tx.examQuestion.update({ where: { id: questionId }, data: { archivedAt: new Date() } });
      const aggregate = await tx.examQuestion.aggregate({
        where: { examId: question.exam.id, archivedAt: null },
        _sum: { marks: true },
        _count: { _all: true },
      });
      const totalMarks = aggregate._sum.marks ?? 0;
      await tx.exam.update({ where: { id: question.exam.id }, data: { totalMarks } });
      return { totalMarks, totalQuestions: aggregate._count._all };
    });
  } catch (error) {
    if (error instanceof Error && error.message === "EXAM_NO_LONGER_DRAFT") {
      return NextResponse.json(
        { error: "Assessment state changed. Reload before deleting questions." },
        { status: 409 },
      );
    }
    throw error;
  }

  return NextResponse.json({
    ok: true,
    message: "Question deleted.",
    totalMarks: result.totalMarks,
    totalQuestions: result.totalQuestions,
  });
}
