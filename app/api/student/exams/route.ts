import { ExamAttemptStatus, ExamStatus, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getStudentExamContext } from "@/lib/exams";
import { getStudentFeeLock } from "@/lib/fee-lock";
import { prisma } from "@/lib/prisma";
import { availabilityLabel, examAvailability, studentSubjectIds } from "@/lib/subjects";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const context = await getStudentExamContext();
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const section = request.nextUrl.searchParams.get("section");
    const requestedTermId = request.nextUrl.searchParams.get("termId")?.trim() || "";
    const examTypes =
      section === "take" ? ["EXAM"] : section === "ca" ? ["CA", "MIDTERM"] : undefined;

    const [feeLock, mySubjectIds, terms] = await Promise.all([
      getStudentFeeLock(context.user.schoolId, context.studentProfile.id),
      studentSubjectIds(context.studentProfile.id),
      prisma.term.findMany({
        where: { schoolId: context.user.schoolId },
        orderBy: [{ session: { label: "desc" } }, { index: "asc" }],
        select: {
          id: true,
          label: true,
          index: true,
          isCurrent: true,
          session: { select: { label: true } },
        },
      }),
    ]);

    // Show exams for this class, but only for subjects this student actually
    // takes. An exam with no subjectId is legacy free-text and stays visible to
    // the whole class — removing those silently would hide real exams.
    const takenSubjects = new Set(mySubjectIds);

    const currentClassScope: Prisma.ExamWhereInput = {
      classId: context.studentProfile.currentClassId,
      ...(mySubjectIds.length
        ? { OR: [{ subjectId: null }, { subjectId: { in: mySubjectIds } }] }
        : {}),
    };

    const exams = await prisma.exam.findMany({
      where: {
        schoolId: context.user.schoolId,
        status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
        ...(examTypes ? { examType: { in: examTypes } } : {}),
        ...(requestedTermId ? { termId: requestedTermId } : {}),
        // Current-class papers plus any earlier paper with this student's own
        // attempt. Promotion changes currentClassId, not the identity of the
        // student or the historical result.
        OR: [
          currentClassScope,
          { attempts: { some: { studentProfileId: context.studentProfile.id } } },
        ],
      },
      // Soonest first: a student wants to know what is next, not what was
      // created most recently.
      orderBy: [{ scheduledFor: "asc" }, { createdAt: "desc" }],
      include: {
        teacherProfile: { select: { displayName: true } },
        classroom: { select: { displayName: true } },
        term: { select: { id: true, label: true, session: { select: { label: true } } } },
        snapshots: {
          orderBy: { revision: "desc" },
          take: 1,
          include: {
            questions: { select: { questionVersion: { select: { type: true } } } },
          },
        },
        attempts: {
          where: { studentProfileId: context.studentProfile.id },
          orderBy: { attemptNumber: "desc" },
          include: { snapshot: { select: { totalMarks: true, passMark: true } } },
        },
        retakes: { where: { studentProfileId: context.studentProfile.id } },
      },
    });

    return NextResponse.json({
      feeLock,
      student: {
        displayName: context.studentProfile.displayName,
        studentId: context.studentProfile.studentId,
      },
      currentTermId: terms.find((term) => term.isCurrent)?.id ?? null,
      terms: terms.map((term) => ({
        id: term.id,
        label: term.label,
        sessionLabel: term.session.label,
        index: term.index,
        isCurrent: term.isCurrent,
      })),
      exams: exams.map((exam) => {
        const latestAttempt = exam.attempts[0] || null;
        const retake = exam.retakes[0] || null;
        const snapshot = exam.snapshots[0];
        const totalMarks = snapshot?.totalMarks ?? 0;
        const attemptTotal = latestAttempt?.snapshot.totalMarks ?? totalMarks;
        const hasUnusedRetake = Boolean(retake && !retake.used);
        const hasSubmitted = Boolean(
          latestAttempt && latestAttempt.status !== ExamAttemptStatus.IN_PROGRESS,
        );

        // One definition of "can this be sat right now", shared with the runner.
        const availability = examAvailability({
          scheduledFor: snapshot?.scheduledFor ?? exam.scheduledFor,
          availableUntil: snapshot?.availableUntil ?? exam.availableUntil,
          hasSubmitted: hasSubmitted && !hasUnusedRetake,
        });

        const isCurrentClass = exam.classId === context.studentProfile.currentClassId;
        const scoreVisible =
          exam.status === ExamStatus.CLOSED &&
          exam.resultsReleased &&
          latestAttempt?.status === ExamAttemptStatus.GRADED;
        const canStart =
          isCurrentClass &&
          exam.status === ExamStatus.PUBLISHED &&
          availability === "READY" &&
          (!latestAttempt ||
            (latestAttempt.status !== ExamAttemptStatus.IN_PROGRESS && hasUnusedRetake));
        const canResume = Boolean(
          latestAttempt && latestAttempt.status === ExamAttemptStatus.IN_PROGRESS,
        );

        return {
          id: exam.id,
          title: exam.title,
          subjectName: exam.subjectName,
          teacherName: exam.teacherProfile.displayName,
          className: exam.classroom.displayName,
          examType: exam.examType,
          practiceCategory: exam.practiceCategory,
          term: exam.term
            ? { id: exam.term.id, label: exam.term.label, sessionLabel: exam.term.session.label }
            : null,
          isHistoricalClass: !isCurrentClass,
          durationMinutes: snapshot?.durationMinutes ?? exam.durationMinutes,
          theoryMinutes: snapshot?.theoryMinutes ?? exam.theoryMinutes ?? 0,
          subjectId: exam.subjectId,
          // When to sit it — the whole point of the student exam list.
          scheduledFor: (snapshot?.scheduledFor ?? exam.scheduledFor)?.toISOString() || null,
          availableUntil: (snapshot?.availableUntil ?? exam.availableUntil)?.toISOString() || null,
          availability,
          availabilityLabel: availabilityLabel(availability),
          isElective: exam.subjectId ? takenSubjects.has(exam.subjectId) : false,
          questionCount: snapshot?.questions.length ?? 0,
          totalMarks,
          passMark: snapshot?.passMark ?? exam.passMark,
          hasEssay:
            snapshot?.questions.some((question) => question.questionVersion.type === "ESSAY") ??
            false,
          status: exam.status,
          instructions: snapshot?.instructions ?? exam.instructions,
          canStart: feeLock ? false : canStart,
          canResume: feeLock ? false : canResume,
          feeLocked: Boolean(feeLock),
          attempt: latestAttempt
            ? {
                id: latestAttempt.id,
                status: latestAttempt.status,
                totalScore: scoreVisible ? latestAttempt.totalScore : null,
                submittedAt: latestAttempt.submittedAt?.toISOString() || null,
                scoreVisible,
                percent:
                  scoreVisible && attemptTotal
                    ? Math.round((latestAttempt.totalScore / attemptTotal) * 100)
                    : null,
              }
            : null,
        };
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "The exam catalogue is temporarily unavailable. Please retry shortly." },
      { status: 503 },
    );
  }
}
