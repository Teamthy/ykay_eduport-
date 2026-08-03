import { ExamStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getExamTeacherContext, parseBulkQuestions, examStatusLabel } from "@/lib/exams";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/lib/requests";

export const dynamic = "force-dynamic";

export async function GET() {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await prisma.exam.findMany({
    where: { teacherProfileId: context.teacherProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      classroom: { select: { displayName: true, level: true } },
      questions: { select: { id: true, marks: true, type: true } },
      attempts: { select: { id: true, status: true } },
      subject: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    teacher: { displayName: context.teacherProfile.displayName },
    assignments: context.teacherProfile.subjectAssignments.map((assignment) => ({
      id: assignment.id,
      subjectName: assignment.subjectName,
      className: assignment.classroom.displayName,
      classId: assignment.classroom.id,
    })),
    exams: exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      subjectName: exam.subjectName,
      className: exam.classroom.displayName,
      examType: exam.examType,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
      passMark: exam.passMark,
      questionCount: exam.questions.length,
      status: exam.status,
      statusLabel: examStatusLabel(exam.status),
      resultsReleased: exam.resultsReleased,
      attemptCount: exam.attempts.length,
      submittedCount: exam.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").length,
      inProgressCount: exam.attempts.filter((attempt) => attempt.status === "IN_PROGRESS").length,
      createdAt: exam.createdAt.toISOString(),
      // Scheduling, so the management centre can show what is coming up.
      scheduledFor: exam.scheduledFor?.toISOString() || null,
      availableUntil: exam.availableUntil?.toISOString() || null,
      theoryMinutes: exam.theoryMinutes ?? 0,
      subjectId: exam.subjectId,
      subjectLabel: exam.subject?.name ?? exam.subjectName,
      // Essays need a human, so an exam containing them can never be fully
      // auto-graded. Surfacing it here stops a teacher waiting for results
      // that will not appear on their own.
      essayCount: exam.questions.filter((question) => question.type === "ESSAY").length,
      // The two things that most often go wrong: publishing an exam with no
      // questions, or scheduling one and forgetting to publish it.
      readiness:
        exam.questions.length === 0
          ? "NO_QUESTIONS"
          : exam.status === "DRAFT"
            ? "UNPUBLISHED"
            : "READY",
    })),
  });
}

const createSchema = z.object({
  assignmentId: z.string().trim().min(1),
  title: z.string().trim().min(3).max(160),
  examType: z.enum(["CA", "MIDTERM", "EXAM", "PRACTICE"]),
  durationMinutes: z.number().int().min(5).max(240),
  passMark: z.number().int().min(0).max(100),
  instructions: z.string().trim().max(2000).optional(),
  shuffleQuestions: z.boolean().optional(),
  bulkQuestions: z.string().trim().max(100_000).optional(),
  // The sitting window. Added to the schema in drop 24 but never accepted
  // here, so a teacher could not actually set an exam date — the student list
  // had a "when" column with nothing to put in it.
  scheduledFor: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
  theoryMinutes: z.number().int().min(0).max(240).optional(),
  /// Links the exam to a catalogued Subject, which is what limits it to the
  /// students who actually take that subject.
  subjectId: z.string().trim().min(1).nullable().optional(),
});

export async function POST(request: NextRequest) {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof createSchema>;
  try {
    payload = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid exam details." }, { status: 400 });
  }

  const assignment = context.teacherProfile.subjectAssignments.find(
    (item) => item.id === payload.assignmentId,
  );
  if (!assignment) {
    return NextResponse.json(
      { error: "You are not assigned to this subject and class." },
      { status: 403 },
    );
  }

  // A window that closes before it opens would silently make the exam
  // unsittable — refuse rather than create it.
  const opensAt = payload.scheduledFor ? new Date(payload.scheduledFor) : null;
  const closesAt = payload.availableUntil ? new Date(payload.availableUntil) : null;
  if (opensAt && closesAt && closesAt <= opensAt) {
    return NextResponse.json(
      { error: "The closing time must be after the opening time." },
      { status: 400 },
    );
  }

  // A subject from another school, or another level, must not be attachable.
  if (payload.subjectId) {
    const subject = await prisma.subject.findFirst({
      where: { id: payload.subjectId, schoolId: context.user.schoolId, isActive: true },
      select: { id: true, level: true },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found." }, { status: 404 });
    }
    if (subject.level !== assignment.classroom.level) {
      return NextResponse.json(
        { error: `That subject belongs to ${subject.level}, not ${assignment.classroom.level}.` },
        { status: 400 },
      );
    }
  }

  let parsed: ReturnType<typeof parseBulkQuestions> = { questions: [], errors: [] };
  if (payload.bulkQuestions) {
    parsed = parseBulkQuestions(payload.bulkQuestions);
    if (parsed.errors.length) {
      return NextResponse.json(
        { error: `Question format problems: ${parsed.errors.slice(0, 5).join(" | ")}` },
        { status: 400 },
      );
    }
  }

  const exam = await prisma.exam.create({
    data: {
      schoolId: context.user.schoolId,
      classId: assignment.classroom.id,
      teacherProfileId: context.teacherProfile.id,
      subjectName: assignment.subjectName,
      title: payload.title,
      examType: payload.examType,
      durationMinutes: payload.durationMinutes,
      passMark: payload.passMark,
      instructions: payload.instructions || null,
      shuffleQuestions: payload.shuffleQuestions ?? true,
      scheduledFor: opensAt,
      availableUntil: closesAt,
      theoryMinutes: payload.theoryMinutes ?? 0,
      subjectId: payload.subjectId ?? null,
      totalMarks: parsed.questions.reduce((sum, question) => sum + question.marks, 0),
      questions: {
        create: parsed.questions.map((question, index) => ({
          type: question.type,
          questionText: question.questionText,
          options: question.options
            ? (question.options as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          correctKey: question.correctKey,
          correctText: question.correctText,
          marks: question.marks,
          sortOrder: index + 1,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      schoolId: context.user.schoolId,
      actorUserId: context.user.id,
      action: "EXAM_CREATED",
      entityType: "Exam",
      entityId: exam.id,
      metadata: {
        title: exam.title,
        subject: exam.subjectName,
        questions: parsed.questions.length,
      },
      ipAddress: getClientIp(request),
    },
  });

  return NextResponse.json({
    ok: true,
    examId: exam.id,
    message: `Exam created with ${parsed.questions.length} question(s). Publish it when you are ready.`,
  });
}

const updateSchema = z.object({
  examId: z.string().trim().min(1),
  action: z.enum([
    "PUBLISH",
    "CLOSE",
    "RELEASE_RESULTS",
    "UNRELEASE_RESULTS",
    "ADD_QUESTIONS",
    "GRANT_RETAKE",
  ]),
  bulkQuestions: z.string().trim().max(100_000).optional(),
  studentProfileId: z.string().trim().min(1).optional(),
});

export async function PATCH(request: NextRequest) {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: z.infer<typeof updateSchema>;
  try {
    payload = updateSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const exam = await prisma.exam.findFirst({
    where: { id: payload.examId, teacherProfileId: context.teacherProfile.id },
    include: { questions: { select: { id: true, marks: true, sortOrder: true } } },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  if (payload.action === "ADD_QUESTIONS") {
    if (exam.status !== ExamStatus.DRAFT) {
      return NextResponse.json(
        { error: "Questions can only be added while the exam is a draft." },
        { status: 409 },
      );
    }
    const parsed = parseBulkQuestions(payload.bulkQuestions || "");
    if (!parsed.questions.length) {
      return NextResponse.json(
        { error: parsed.errors[0] || "No valid questions found in the pasted text." },
        { status: 400 },
      );
    }
    const startOrder = exam.questions.length;
    await prisma.$transaction([
      prisma.examQuestion.createMany({
        data: parsed.questions.map((question, index) => ({
          examId: exam.id,
          type: question.type,
          questionText: question.questionText,
          options: question.options
            ? (question.options as unknown as Prisma.InputJsonValue)
            : Prisma.JsonNull,
          correctKey: question.correctKey,
          correctText: question.correctText,
          marks: question.marks,
          sortOrder: startOrder + index + 1,
        })),
      }),
      prisma.exam.update({
        where: { id: exam.id },
        data: {
          totalMarks:
            exam.questions.reduce((sum, question) => sum + question.marks, 0) +
            parsed.questions.reduce((sum, question) => sum + question.marks, 0),
        },
      }),
    ]);
    return NextResponse.json({
      ok: true,
      message: `${parsed.questions.length} question(s) added.`,
    });
  }

  if (payload.action === "PUBLISH") {
    if (!exam.questions.length) {
      return NextResponse.json(
        { error: "Add at least one question before publishing." },
        { status: 409 },
      );
    }
    await prisma.exam.update({ where: { id: exam.id }, data: { status: ExamStatus.PUBLISHED } });
    return NextResponse.json({
      ok: true,
      message: "Exam published. Students in the class can now take it.",
    });
  }

  if (payload.action === "CLOSE") {
    await prisma.exam.update({ where: { id: exam.id }, data: { status: ExamStatus.CLOSED } });
    return NextResponse.json({ ok: true, message: "Exam closed. No new attempts can start." });
  }

  if (payload.action === "RELEASE_RESULTS" || payload.action === "UNRELEASE_RESULTS") {
    const release = payload.action === "RELEASE_RESULTS";
    await prisma.exam.update({ where: { id: exam.id }, data: { resultsReleased: release } });
    await prisma.auditLog.create({
      data: {
        schoolId: context.user.schoolId,
        actorUserId: context.user.id,
        action: release ? "EXAM_RESULTS_RELEASED" : "EXAM_RESULTS_HIDDEN",
        entityType: "Exam",
        entityId: exam.id,
        ipAddress: getClientIp(request),
      },
    });
    return NextResponse.json({
      ok: true,
      message: release ? "Results released to students." : "Results hidden from students.",
    });
  }

  // GRANT_RETAKE
  if (!payload.studentProfileId) {
    return NextResponse.json({ error: "Select a student for the retake." }, { status: 400 });
  }
  const student = await prisma.studentProfile.findFirst({
    where: { id: payload.studentProfileId, currentClassId: exam.classId, isActive: true },
    select: { id: true, displayName: true },
  });
  if (!student)
    return NextResponse.json({ error: "Student not found in this class." }, { status: 404 });

  await prisma.examRetake.upsert({
    where: { examId_studentProfileId: { examId: exam.id, studentProfileId: student.id } },
    update: { used: false, grantedByUserId: context.user.id },
    create: { examId: exam.id, studentProfileId: student.id, grantedByUserId: context.user.id },
  });

  return NextResponse.json({ ok: true, message: `Retake granted to ${student.displayName}.` });
}
