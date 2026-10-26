import { ExamAttemptStatus, ExamStatus, GradebookStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getExamTeacherContext, parseBulkQuestions, examStatusLabel } from "@/lib/exams";
import { createExamSnapshot } from "@/lib/exam-snapshots";
import { NoCurrentTermError, requireCurrentLabels } from "@/lib/academic-session";
import { prisma } from "@/lib/prisma";
import {
  gradebookFieldForComponent,
  isGradebookComponent,
  mergeExamScoreIntoGradebook,
  restoreGradebookComponent,
  type GradebookComponent,
} from "@/lib/exam-gradebook-sync";
import { getClientIp } from "@/lib/requests";
import {
  completeReservedIdempotency,
  idempotencyRequestHash,
  releaseReservedIdempotency,
  reserveIdempotency,
  requestMethodForIdempotency,
  requestPathForIdempotency,
} from "@/lib/idempotency";

export const dynamic = "force-dynamic";

class GradebookNotOpenError extends Error {}
class GradebookSyncConflictError extends Error {}
class ExamReleaseConflictError extends Error {}

export async function GET() {
  const context = await getExamTeacherContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await prisma.exam.findMany({
    where: { schoolId: context.user.schoolId, teacherProfileId: context.teacherProfile.id },
    orderBy: { createdAt: "desc" },
    include: {
      classroom: { select: { displayName: true, level: true } },
      questions: { where: { archivedAt: null }, select: { id: true, marks: true, type: true } },
      attempts: { select: { id: true, status: true } },
      subject: { select: { id: true, name: true } },
      term: { select: { id: true, label: true, session: { select: { label: true } } } },
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
      practiceCategory: exam.practiceCategory,
      gradebookComponent: exam.gradebookComponent,
      term: exam.term
        ? { id: exam.term.id, label: exam.term.label, sessionLabel: exam.term.session.label }
        : null,
      durationMinutes: exam.durationMinutes,
      totalMarks: exam.questions.reduce((sum, question) => sum + question.marks, 0),
      passMark: exam.passMark,
      questionCount: exam.questions.length,
      status: exam.status,
      statusLabel: examStatusLabel(exam.status),
      resultsReleased: exam.resultsReleased,
      attemptCount: exam.attempts.length,
      submittedCount: exam.attempts.filter((attempt) => attempt.status !== "IN_PROGRESS").length,
      gradedCount: exam.attempts.filter((attempt) => attempt.status === ExamAttemptStatus.GRADED)
        .length,
      pendingGradeCount: exam.attempts.filter(
        (attempt) => attempt.status === ExamAttemptStatus.SUBMITTED,
      ).length,
      inProgressCount: exam.attempts.filter(
        (attempt) => attempt.status === ExamAttemptStatus.IN_PROGRESS,
      ).length,
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
  practiceCategory: z.enum(["WAEC", "JAMB", "JUNIOR_WAEC", "OTHER"]).nullable().optional(),
  gradebookComponent: z.enum(["CA1", "CA2", "MIDTERM", "ASSIGNMENT", "EXAM"]).nullable().optional(),
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

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
  if (!idempotencyKey || idempotencyKey.length > 200) {
    return NextResponse.json(
      { error: "A valid Idempotency-Key header is required." },
      { status: 400 },
    );
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

  // Assessment records must be tied to a school-configured term. Never stamp
  // a date-based guess onto a result that will outlive the current session.
  let currentTerm: Awaited<ReturnType<typeof requireCurrentLabels>>;
  try {
    currentTerm = await requireCurrentLabels(context.user.schoolId);
  } catch (termError) {
    if (termError instanceof NoCurrentTermError) {
      return NextResponse.json({ error: termError.message }, { status: 409 });
    }
    throw termError;
  }

  const defaultComponent: Record<string, string> = {
    CA: "CA1",
    MIDTERM: "MIDTERM",
    EXAM: "EXAM",
  };
  const gradebookComponent =
    payload.examType === "PRACTICE"
      ? null
      : payload.gradebookComponent === undefined
        ? (defaultComponent[payload.examType] ?? null)
        : payload.gradebookComponent;

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

  const scope = "TEACHER_EXAM_CREATE";
  const reservation = await reserveIdempotency({
    schoolId: context.user.schoolId,
    scope,
    key: idempotencyKey,
    requestHash: idempotencyRequestHash({
      method: requestMethodForIdempotency(request),
      path: requestPathForIdempotency(request, "/api/teacher/exams"),
      actorId: context.user.id,
      scope,
      body: payload,
    }),
  });
  if (reservation.outcome === "replay")
    return NextResponse.json(reservation.body, { status: reservation.status });
  if (reservation.outcome === "conflict")
    return NextResponse.json(reservation.body, { status: reservation.status });
  if (reservation.outcome === "in-progress") {
    return NextResponse.json(reservation.body, {
      status: reservation.status,
      headers: { "Retry-After": String(reservation.retryAfterSeconds) },
    });
  }

  const responseBody = {
    ok: true,
    examId: "",
    message: `Exam created with ${parsed.questions.length} question(s). Publish it when you are ready.`,
  };
  try {
    const exam = await prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          schoolId: context.user.schoolId,
          classId: assignment.classroom.id,
          teacherProfileId: context.teacherProfile.id,
          termId: currentTerm.termId,
          subjectName: assignment.subjectName,
          title: payload.title,
          examType: payload.examType,
          practiceCategory:
            payload.examType === "PRACTICE" ? (payload.practiceCategory ?? "OTHER") : null,
          gradebookComponent,
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
      await tx.auditLog.create({
        data: {
          schoolId: context.user.schoolId,
          actorUserId: context.user.id,
          action: "EXAM_CREATED",
          entityType: "Exam",
          entityId: created.id,
          metadata: {
            title: created.title,
            subject: created.subjectName,
            questions: parsed.questions.length,
            termId: created.termId,
            practiceCategory: created.practiceCategory,
            gradebookComponent: created.gradebookComponent,
          },
          ipAddress: getClientIp(request),
        },
      });
      const body = { ...responseBody, examId: created.id };
      await completeReservedIdempotency(tx, {
        schoolId: context.user.schoolId,
        scope,
        key: idempotencyKey,
        lockedUntil: reservation.lockedUntil,
        response: body,
        statusCode: 201,
      });
      return created;
    });
    return NextResponse.json({ ...responseBody, examId: exam.id }, { status: 201 });
  } catch (error) {
    await releaseReservedIdempotency({
      schoolId: context.user.schoolId,
      scope,
      key: idempotencyKey,
      lockedUntil: reservation.lockedUntil,
    });
    throw error;
  }
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
    // Editing the exam's own settings after creation. Everything above acts
    // on state or questions; none of it could change the date, duration,
    // marks or theory allowance, so an exam was frozen the moment it was
    // created and /teacher/test-courses had nowhere to save to.
    "UPDATE_SETTINGS",
  ]),
  bulkQuestions: z.string().trim().max(100_000).optional(),
  studentProfileId: z.string().trim().min(1).optional(),
  // UPDATE_SETTINGS payload. Every field optional: a partial save must change
  // only what was sent, never blank an untouched field.
  durationMinutes: z.number().int().min(5).max(240).optional(),
  theoryMinutes: z.number().int().min(0).max(240).optional(),
  passMark: z.number().int().min(0).max(100).optional(),
  totalMarks: z.number().int().min(0).max(1000).optional(),
  scheduledFor: z.string().datetime().nullable().optional(),
  availableUntil: z.string().datetime().nullable().optional(),
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
    where: {
      id: payload.examId,
      schoolId: context.user.schoolId,
      teacherProfileId: context.teacherProfile.id,
    },
    include: {
      snapshots: { orderBy: { revision: "desc" }, take: 1 },
      questions: {
        where: { archivedAt: null },
        select: { id: true, marks: true, sortOrder: true },
      },
    },
  });
  if (!exam) return NextResponse.json({ error: "Exam not found." }, { status: 404 });

  if (payload.action === "ADD_QUESTIONS") {
    const parsed = parseBulkQuestions(payload.bulkQuestions || "");
    if (!parsed.questions.length) {
      return NextResponse.json(
        { error: parsed.errors[0] || "No valid questions found in the pasted text." },
        { status: 400 },
      );
    }
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim();
    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json(
        { error: "A valid Idempotency-Key header is required." },
        { status: 400 },
      );
    }
    const scope = `TEACHER_EXAM_ADD_QUESTIONS:${exam.id}`;
    const reservation = await reserveIdempotency({
      schoolId: context.user.schoolId,
      scope,
      key: idempotencyKey,
      requestHash: idempotencyRequestHash({
        method: requestMethodForIdempotency(request),
        path: requestPathForIdempotency(request, "/api/teacher/exams"),
        actorId: context.user.id,
        scope,
        body: payload,
      }),
    });
    if (reservation.outcome === "replay")
      return NextResponse.json(reservation.body, { status: reservation.status });
    if (reservation.outcome === "conflict")
      return NextResponse.json(reservation.body, { status: reservation.status });
    if (reservation.outcome === "in-progress") {
      return NextResponse.json(reservation.body, {
        status: reservation.status,
        headers: { "Retry-After": String(reservation.retryAfterSeconds) },
      });
    }
    if (exam.status !== ExamStatus.DRAFT) {
      await releaseReservedIdempotency({
        schoolId: context.user.schoolId,
        scope,
        key: idempotencyKey,
        lockedUntil: reservation.lockedUntil,
      });
      return NextResponse.json(
        { error: "Questions can only be added while the exam is a draft." },
        { status: 409 },
      );
    }
    const startOrder = exam.questions.length;
    const response = { ok: true, message: `${parsed.questions.length} question(s) added.` };
    try {
      await prisma.$transaction(async (tx) => {
        const draftClaim = await tx.exam.updateMany({
          where: {
            id: exam.id,
            schoolId: context.user.schoolId,
            teacherProfileId: context.teacherProfile.id,
            status: ExamStatus.DRAFT,
            updatedAt: exam.updatedAt,
          },
          data: { updatedAt: new Date() },
        });
        if (draftClaim.count !== 1) throw new Error("EXAM_NO_LONGER_DRAFT");
        await tx.examQuestion.createMany({
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
        });
        await tx.exam.update({
          where: { id: exam.id },
          data: {
            totalMarks:
              exam.questions.reduce((sum, question) => sum + question.marks, 0) +
              parsed.questions.reduce((sum, question) => sum + question.marks, 0),
          },
        });
        await completeReservedIdempotency(tx, {
          schoolId: context.user.schoolId,
          scope,
          key: idempotencyKey,
          lockedUntil: reservation.lockedUntil,
          response,
          statusCode: 200,
        });
      });
    } catch (error) {
      await releaseReservedIdempotency({
        schoolId: context.user.schoolId,
        scope,
        key: idempotencyKey,
        lockedUntil: reservation.lockedUntil,
      });
      if (error instanceof Error && error.message === "EXAM_NO_LONGER_DRAFT") {
        return NextResponse.json(
          { error: "Assessment state changed. Reload before adding questions." },
          { status: 409 },
        );
      }
      throw error;
    }
    return NextResponse.json(response);
  }

  if (payload.action === "UPDATE_SETTINGS") {
    if (exam.status !== ExamStatus.DRAFT) {
      return NextResponse.json(
        { error: "Published assessment settings are frozen. Create a new draft revision instead." },
        { status: 409 },
      );
    }
    if (exam.resultsReleased) {
      return NextResponse.json(
        { error: "Hide released results before changing assessment settings." },
        { status: 409 },
      );
    }

    // Resolve the window against what is being saved, falling back to what is
    // already stored — otherwise editing only the close time could produce a
    // window that closes before an unchanged opening time.
    const opensAt =
      payload.scheduledFor === undefined
        ? exam.scheduledFor
        : payload.scheduledFor === null
          ? null
          : new Date(payload.scheduledFor);
    const closesAt =
      payload.availableUntil === undefined
        ? exam.availableUntil
        : payload.availableUntil === null
          ? null
          : new Date(payload.availableUntil);

    if (opensAt && closesAt && closesAt <= opensAt) {
      return NextResponse.json(
        { error: "The closing time must be after the opening time." },
        { status: 400 },
      );
    }

    // Duration is the student's clock. An attempt's deadlineAt is computed
    // when it starts and never recalculated, so changing the duration while
    // someone is sitting the paper would not extend them — it would just
    // disagree with what they were given. Refuse instead.
    if (payload.durationMinutes !== undefined && payload.durationMinutes !== exam.durationMinutes) {
      const live = await prisma.examAttempt.count({
        where: { examId: exam.id, status: ExamAttemptStatus.IN_PROGRESS },
      });
      if (live > 0) {
        return NextResponse.json(
          {
            error: `${live} student(s) are sitting this paper right now. Wait until they submit before changing the duration.`,
            code: "ATTEMPTS_IN_PROGRESS",
          },
          { status: 409 },
        );
      }
    }

    const data: Prisma.ExamUpdateManyMutationInput = {};
    if (payload.durationMinutes !== undefined) data.durationMinutes = payload.durationMinutes;
    if (payload.theoryMinutes !== undefined) data.theoryMinutes = payload.theoryMinutes;
    if (payload.passMark !== undefined) data.passMark = payload.passMark;
    if (payload.totalMarks !== undefined) data.totalMarks = payload.totalMarks;
    if (payload.scheduledFor !== undefined) data.scheduledFor = opensAt;
    if (payload.availableUntil !== undefined) data.availableUntil = closesAt;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const settingsUpdate = await prisma.exam.updateMany({
      where: {
        id: exam.id,
        schoolId: context.user.schoolId,
        teacherProfileId: context.teacherProfile.id,
        resultsReleased: false,
        status: ExamStatus.DRAFT,
        updatedAt: exam.updatedAt,
      },
      data,
    });
    if (settingsUpdate.count !== 1) {
      return NextResponse.json(
        { error: "Assessment settings changed or results were released. Reload and try again." },
        { status: 409 },
      );
    }
    await prisma.auditLog.create({
      data: {
        schoolId: context.user.schoolId,
        actorUserId: context.user.id,
        action: "EXAM_SETTINGS_UPDATED",
        entityType: "Exam",
        entityId: exam.id,
        metadata: data as unknown as Prisma.InputJsonValue,
        ipAddress: getClientIp(request),
      },
    });

    return NextResponse.json({ ok: true, message: "Exam settings saved." });
  }

  if (payload.action === "PUBLISH") {
    if (exam.status !== ExamStatus.DRAFT || exam.resultsReleased) {
      return NextResponse.json(
        { error: "Only an unreleased draft assessment can be published." },
        { status: 409 },
      );
    }
    if (!exam.questions.length) {
      return NextResponse.json(
        { error: "Add at least one question before publishing." },
        { status: 409 },
      );
    }
    const publish = await prisma.$transaction(async (tx) => {
      const claimed = await tx.exam.updateMany({
        where: {
          id: exam.id,
          schoolId: context.user.schoolId,
          teacherProfileId: context.teacherProfile.id,
          status: ExamStatus.DRAFT,
          resultsReleased: false,
          updatedAt: exam.updatedAt,
        },
        data: { status: ExamStatus.PUBLISHED },
      });
      if (claimed.count !== 1) return false;
      await createExamSnapshot(tx, exam.id);
      return true;
    });
    if (!publish) {
      return NextResponse.json(
        { error: "Assessment state changed. Reload before publishing." },
        { status: 409 },
      );
    }
    return NextResponse.json({
      ok: true,
      message: "Exam published. Students in the class can now take it.",
    });
  }

  if (payload.action === "CLOSE") {
    if (exam.status === ExamStatus.CLOSED) {
      return NextResponse.json({ ok: true, message: "Exam is already closed." });
    }
    if (exam.status !== ExamStatus.PUBLISHED) {
      return NextResponse.json(
        { error: "Only a published assessment can be closed." },
        { status: 409 },
      );
    }
    const close = await prisma.exam.updateMany({
      where: {
        id: exam.id,
        schoolId: context.user.schoolId,
        teacherProfileId: context.teacherProfile.id,
        status: ExamStatus.PUBLISHED,
        updatedAt: exam.updatedAt,
      },
      data: { status: ExamStatus.CLOSED },
    });
    if (close.count !== 1) {
      const current = await prisma.exam.findFirst({
        where: {
          id: exam.id,
          schoolId: context.user.schoolId,
          teacherProfileId: context.teacherProfile.id,
        },
        select: { status: true },
      });
      if (current?.status === ExamStatus.CLOSED) {
        return NextResponse.json({ ok: true, message: "Exam is already closed." });
      }
      return NextResponse.json(
        { error: "Assessment state changed. Reload before closing." },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, message: "Exam closed. No new attempts can start." });
  }

  if (payload.action === "RELEASE_RESULTS" || payload.action === "UNRELEASE_RESULTS") {
    const release = payload.action === "RELEASE_RESULTS";
    if (!release) {
      if (!exam.resultsReleased) {
        return NextResponse.json({ ok: true, message: "Results are already hidden." });
      }

      let restoredComponents = 0;
      try {
        await prisma.$transaction(async (tx) => {
          const syncs = await tx.examGradebookSync.findMany({
            where: { examId: exam.id, isActive: true },
            include: {
              gradebookEntry: { include: { gradebook: { select: { status: true } } } },
            },
          });

          for (const sync of syncs) {
            if (!isGradebookComponent(sync.component)) throw new GradebookSyncConflictError();
            if (sync.gradebookEntry.gradebook.status !== GradebookStatus.OPEN) {
              throw new GradebookNotOpenError();
            }

            const componentField = gradebookFieldForComponent(sync.component);
            const entry = sync.gradebookEntry;
            if (entry[componentField] !== sync.syncedValue) {
              throw new GradebookSyncConflictError();
            }
            const restored = restoreGradebookComponent(
              {
                ca1: entry.ca1,
                ca2: entry.ca2,
                midterm: entry.midterm,
                assignment: entry.assignment,
                exam: entry.exam,
              },
              sync.previousValue,
              sync.component,
            );
            await tx.gradebookEntry.update({
              where: { id: entry.id },
              data: {
                [componentField]: restored[componentField],
                total: restored.total,
                grade: restored.grade,
              },
            });
            await tx.examGradebookSync.update({
              where: { id: sync.id },
              data: { isActive: false },
            });
          }

          await tx.exam.update({ where: { id: exam.id }, data: { resultsReleased: false } });
          await tx.auditLog.create({
            data: {
              schoolId: context.user.schoolId,
              actorUserId: context.user.id,
              action: "EXAM_RESULTS_HIDDEN",
              entityType: "Exam",
              entityId: exam.id,
              metadata: { restoredGradebookComponents: syncs.length },
              ipAddress: getClientIp(request),
            },
          });
          restoredComponents = syncs.length;
        });
      } catch (hideError) {
        if (hideError instanceof GradebookNotOpenError) {
          return NextResponse.json(
            {
              error:
                "Results cannot be hidden after the cumulative gradebook has been submitted or locked.",
            },
            { status: 409 },
          );
        }
        if (hideError instanceof GradebookSyncConflictError) {
          return NextResponse.json(
            {
              error:
                "A gradebook component changed after sync. Resolve the gradebook conflict before hiding results.",
            },
            { status: 409 },
          );
        }
        throw hideError;
      }

      return NextResponse.json({
        ok: true,
        message: restoredComponents
          ? `Results hidden and ${restoredComponents} gradebook component(s) safely restored.`
          : "Results hidden from students.",
      });
    }

    if (exam.resultsReleased) {
      return NextResponse.json({ ok: true, message: "Results are already released." });
    }
    if (exam.status !== ExamStatus.CLOSED) {
      return NextResponse.json(
        { error: "Close the assessment before releasing its results." },
        { status: 409 },
      );
    }

    const attempts = await prisma.examAttempt.findMany({
      where: { examId: exam.id },
      orderBy: [{ attemptNumber: "desc" }, { submittedAt: "desc" }],
      select: {
        id: true,
        studentProfileId: true,
        attemptNumber: true,
        status: true,
        totalScore: true,
        snapshot: { select: { totalMarks: true } },
        studentProfile: { select: { schoolId: true } },
      },
    });
    if (!attempts.length) {
      return NextResponse.json(
        { error: "There are no completed attempts to release yet." },
        { status: 409 },
      );
    }
    if (attempts.some((attempt) => attempt.status !== ExamAttemptStatus.GRADED)) {
      return NextResponse.json(
        {
          error:
            "Finish all in-progress attempts and grade pending essays before releasing results.",
        },
        { status: 409 },
      );
    }
    if (attempts.some((attempt) => attempt.studentProfile.schoolId !== context.user.schoolId)) {
      return NextResponse.json(
        { error: "An attempt is linked to a different school." },
        { status: 409 },
      );
    }

    const totalMarks = exam.snapshots[0]?.totalMarks ?? 0;
    if (
      totalMarks <= 0 ||
      attempts.some(
        (attempt) => attempt.totalScore < 0 || attempt.totalScore > attempt.snapshot.totalMarks,
      )
    ) {
      return NextResponse.json(
        { error: "Stored assessment marks are invalid. Contact an administrator." },
        { status: 409 },
      );
    }

    let term: { label: string; session: { label: string } } | null = null;
    let gradebookComponent: GradebookComponent | null = null;
    if (exam.gradebookComponent) {
      if (!isGradebookComponent(exam.gradebookComponent) || !exam.termId) {
        return NextResponse.json(
          { error: "This assessment has an invalid cumulative gradebook configuration." },
          { status: 409 },
        );
      }
      term = await prisma.term.findFirst({
        where: { id: exam.termId, schoolId: context.user.schoolId },
        select: { label: true, session: { select: { label: true } } },
      });
      if (!term) {
        return NextResponse.json(
          { error: "The assessment's configured term/session no longer exists." },
          { status: 409 },
        );
      }
      gradebookComponent = exam.gradebookComponent;
    }

    let syncedStudents = 0;
    try {
      await prisma.$transaction(async (tx) => {
        // Claim the release state before reading attempts. The conditional row
        // update serializes this transaction with essay grading, which uses the
        // same exam row as its release guard. Any later failure rolls the claim
        // back together with the gradebook writes.
        const releaseClaim = await tx.exam.updateMany({
          where: {
            id: exam.id,
            schoolId: context.user.schoolId,
            teacherProfileId: context.teacherProfile.id,
            status: ExamStatus.CLOSED,
            resultsReleased: false,
            updatedAt: exam.updatedAt,
          },
          data: { resultsReleased: true },
        });
        if (releaseClaim.count !== 1) throw new ExamReleaseConflictError();

        const currentAttempts = await tx.examAttempt.findMany({
          where: { examId: exam.id },
          orderBy: [{ attemptNumber: "desc" }, { submittedAt: "desc" }],
          select: {
            id: true,
            studentProfileId: true,
            attemptNumber: true,
            status: true,
            totalScore: true,
            snapshot: { select: { totalMarks: true } },
            studentProfile: { select: { schoolId: true } },
          },
        });
        if (
          !currentAttempts.length ||
          currentAttempts.some((attempt) => attempt.status !== ExamAttemptStatus.GRADED) ||
          currentAttempts.some(
            (attempt) => attempt.studentProfile.schoolId !== context.user.schoolId,
          ) ||
          currentAttempts.some(
            (attempt) => attempt.totalScore < 0 || attempt.totalScore > attempt.snapshot.totalMarks,
          )
        ) {
          throw new ExamReleaseConflictError();
        }

        const latestAttemptByStudent = new Map<string, (typeof currentAttempts)[number]>();
        for (const attempt of currentAttempts) {
          if (!latestAttemptByStudent.has(attempt.studentProfileId)) {
            latestAttemptByStudent.set(attempt.studentProfileId, attempt);
          }
        }
        syncedStudents = latestAttemptByStudent.size;

        if (gradebookComponent && term) {
          const gradebook = await tx.subjectGradebook.upsert({
            where: {
              classId_subjectName_sessionLabel_termLabel: {
                classId: exam.classId,
                subjectName: exam.subjectName,
                sessionLabel: term.session.label,
                termLabel: term.label,
              },
            },
            update: {},
            create: {
              schoolId: context.user.schoolId,
              classId: exam.classId,
              teacherProfileId: exam.teacherProfileId,
              subjectName: exam.subjectName,
              sessionLabel: term.session.label,
              termLabel: term.label,
              status: GradebookStatus.OPEN,
            },
          });
          if (gradebook.status !== GradebookStatus.OPEN) throw new GradebookNotOpenError();

          const componentField = gradebookFieldForComponent(gradebookComponent);
          for (const attempt of latestAttemptByStudent.values()) {
            const key = {
              gradebookId_studentProfileId: {
                gradebookId: gradebook.id,
                studentProfileId: attempt.studentProfileId,
              },
            };
            const syncKey = {
              examId_studentProfileId: {
                examId: exam.id,
                studentProfileId: attempt.studentProfileId,
              },
            };
            const existingSync = await tx.examGradebookSync.findUnique({ where: syncKey });
            if (existingSync?.isActive) throw new GradebookSyncConflictError();

            const existing = await tx.gradebookEntry.findUnique({ where: key });
            const currentValue = existing?.[componentField] ?? 0;
            if (existingSync && currentValue !== existingSync.previousValue) {
              throw new GradebookSyncConflictError();
            }
            const previousValue = existingSync?.previousValue ?? currentValue;
            const totals = mergeExamScoreIntoGradebook(
              {
                ca1: existing?.ca1 ?? 0,
                ca2: existing?.ca2 ?? 0,
                midterm: existing?.midterm ?? 0,
                assignment: existing?.assignment ?? 0,
                exam: existing?.exam ?? 0,
              },
              attempt.totalScore,
              attempt.snapshot.totalMarks,
              gradebookComponent,
            );
            const entry = await tx.gradebookEntry.upsert({
              where: key,
              update: {
                [componentField]: totals[componentField],
                total: totals.total,
                grade: totals.grade,
              },
              create: {
                gradebookId: gradebook.id,
                studentProfileId: attempt.studentProfileId,
                ...totals,
              },
            });
            await tx.examGradebookSync.upsert({
              where: syncKey,
              update: {
                gradebookEntryId: entry.id,
                component: gradebookComponent,
                previousValue,
                syncedValue: totals[componentField],
                isActive: true,
              },
              create: {
                schoolId: context.user.schoolId,
                examId: exam.id,
                studentProfileId: attempt.studentProfileId,
                gradebookEntryId: entry.id,
                component: gradebookComponent,
                previousValue,
                syncedValue: totals[componentField],
                isActive: true,
              },
            });
          }
        }

        await tx.auditLog.create({
          data: {
            schoolId: context.user.schoolId,
            actorUserId: context.user.id,
            action: "EXAM_RESULTS_RELEASED",
            entityType: "Exam",
            entityId: exam.id,
            metadata: {
              gradebookComponent,
              syncedStudents: gradebookComponent ? syncedStudents : 0,
              termId: exam.termId,
            },
            ipAddress: getClientIp(request),
          },
        });
      });
    } catch (releaseError) {
      if (releaseError instanceof ExamReleaseConflictError) {
        return NextResponse.json(
          {
            error:
              "Assessment state changed while results were being released. Refresh the results and try again.",
          },
          { status: 409 },
        );
      }
      if (releaseError instanceof GradebookNotOpenError) {
        return NextResponse.json(
          {
            error:
              "The cumulative gradebook is submitted or locked; results were not released or synced.",
          },
          { status: 409 },
        );
      }
      if (releaseError instanceof GradebookSyncConflictError) {
        return NextResponse.json(
          {
            error:
              "A gradebook component changed after a prior sync. Resolve the gradebook conflict before releasing results.",
          },
          { status: 409 },
        );
      }
      throw releaseError;
    }

    return NextResponse.json({
      ok: true,
      message: gradebookComponent
        ? `Results released and synced to ${gradebookComponent} in the configured term gradebook.`
        : "Results released to students.",
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
