import { ExamAttemptStatus, ExamStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getStudentExamContext } from "@/lib/exams";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Student exam-practice catalogue (WAEC / JAMB / BECE prep).
 *
 * Practice exams are ordinary Exam rows with examType = "PRACTICE", created by
 * teachers in the CBT centre. This endpoint groups them by subject and reports
 * the student's own attempt history so the page can show real progress.
 *
 * Two deliberate differences from graded CBT (see /api/student/exams):
 *
 *  1. No fee lock. Fee gating exists to stop an unpaid student sitting a
 *     graded assessment. Blocking revision would punish exactly the students
 *     most likely to be behind on fees, and it earns the school nothing.
 *  2. Unlimited attempts. Practice is for repetition — requiring a teacher to
 *     grant a retake before a second go would make the feature unusable.
 *
 * Both rules are enforced server-side in ./[id]/attempt.
 */
export async function GET(request: NextRequest) {
  const context = await getStudentExamContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const requestedCategory = request.nextUrl.searchParams.get("category")?.trim() || "";
  const allowedCategories = new Set(["WAEC", "JAMB", "JUNIOR_WAEC", "OTHER"]);
  if (requestedCategory && !allowedCategories.has(requestedCategory)) {
    return NextResponse.json({ error: "Unknown practice category." }, { status: 400 });
  }
  const requestedTermId = request.nextUrl.searchParams.get("termId")?.trim() || "";
  const terms = await prisma.term.findMany({
    where: { schoolId: context.user.schoolId },
    orderBy: [{ session: { label: "desc" } }, { index: "asc" }],
    select: {
      id: true,
      label: true,
      index: true,
      isCurrent: true,
      session: { select: { label: true } },
    },
  });

  const exams = await prisma.exam.findMany({
    where: {
      schoolId: context.user.schoolId,
      OR: [
        { classId: context.studentProfile.currentClassId },
        { attempts: { some: { studentProfileId: context.studentProfile.id } } },
      ],
      examType: "PRACTICE",
      status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
      ...(requestedCategory ? { practiceCategory: requestedCategory } : {}),
      ...(requestedTermId ? { termId: requestedTermId } : {}),
    },
    orderBy: [{ subjectName: "asc" }, { createdAt: "desc" }],
    take: 200,
    select: {
      id: true,
      classId: true,
      title: true,
      subjectName: true,
      practiceCategory: true,
      classroom: { select: { displayName: true } },
      teacherProfile: { select: { displayName: true } },
      term: { select: { id: true, label: true, session: { select: { label: true } } } },
      durationMinutes: true,
      passMark: true,
      instructions: true,
      status: true,
      snapshots: {
        orderBy: { revision: "desc" },
        take: 1,
        include: { questions: { select: { id: true } } },
      },
      attempts: {
        where: { studentProfileId: context.studentProfile.id },
        orderBy: { attemptNumber: "desc" },
        take: 50,
        select: {
          id: true,
          status: true,
          totalScore: true,
          attemptNumber: true,
          submittedAt: true,
          snapshot: { select: { totalMarks: true } },
        },
      },
    },
  });

  const cards = exams.map((exam) => {
    const snapshot = exam.snapshots[0];
    const totalMarks = snapshot?.totalMarks ?? 0;
    const finished = exam.attempts.filter(
      (attempt) => attempt.status !== ExamAttemptStatus.IN_PROGRESS,
    );
    const inProgress = exam.attempts.find(
      (attempt) => attempt.status === ExamAttemptStatus.IN_PROGRESS,
    );

    const percentages = finished
      .filter((attempt) => attempt.snapshot.totalMarks > 0)
      .map((attempt) => Math.round((attempt.totalScore / attempt.snapshot.totalMarks) * 100));
    const bestPercent = percentages.length ? Math.max(...percentages) : null;
    const lastPercent = percentages.length ? percentages[0] : null;

    const isCurrentClass = exam.classId === context.studentProfile.currentClassId;
    return {
      id: exam.id,
      title: exam.title,
      subjectName: exam.subjectName,
      teacherName: exam.teacherProfile.displayName,
      practiceCategory: exam.practiceCategory ?? "OTHER",
      className: exam.classroom.displayName,
      term: exam.term
        ? { id: exam.term.id, label: exam.term.label, sessionLabel: exam.term.session.label }
        : null,
      isHistoricalClass: !isCurrentClass,
      durationMinutes: snapshot?.durationMinutes ?? exam.durationMinutes,
      passMark: snapshot?.passMark ?? exam.passMark,
      instructions: snapshot?.instructions ?? exam.instructions,
      questionCount: snapshot?.questions.length ?? 0,
      totalMarks,
      // Practice never locks: a student may retake as often as they like.
      canStart:
        isCurrentClass &&
        exam.status === ExamStatus.PUBLISHED &&
        (snapshot?.questions.length ?? 0) > 0,
      canResume: Boolean(inProgress),
      resumeAttemptId: inProgress?.id ?? null,
      attemptCount: finished.length,
      bestPercent,
      lastPercent,
      lastAttemptAt: finished[0]?.submittedAt?.toISOString() ?? null,
    };
  });

  // Group by subject for the picker.
  const bySubject = new Map<string, typeof cards>();
  for (const card of cards) {
    const list = bySubject.get(card.subjectName) ?? [];
    list.push(card);
    bySubject.set(card.subjectName, list);
  }

  const subjects = [...bySubject.entries()]
    .map(([name, list]) => {
      const scored = list.filter((item) => item.bestPercent !== null);
      return {
        name,
        examCount: list.length,
        questionCount: list.reduce((sum, item) => sum + item.questionCount, 0),
        attemptCount: list.reduce((sum, item) => sum + item.attemptCount, 0),
        bestPercent: scored.length
          ? Math.max(...scored.map((item) => item.bestPercent as number))
          : null,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  // Whole-catalogue summary — real numbers, replacing the hardcoded tiles.
  const allFinished = cards.flatMap((card) =>
    card.attemptCount > 0 && card.bestPercent !== null ? [card] : [],
  );
  const summary = {
    testsTaken: cards.reduce((sum, card) => sum + card.attemptCount, 0),
    questionsAnswered: cards.reduce((sum, card) => sum + card.attemptCount * card.questionCount, 0),
    averagePercent: allFinished.length
      ? Math.round(
          allFinished.reduce((sum, card) => sum + (card.lastPercent ?? 0), 0) / allFinished.length,
        )
      : null,
    bestPercent: allFinished.length
      ? Math.max(...allFinished.map((card) => card.bestPercent as number))
      : null,
  };

  return NextResponse.json({
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
    categories: ["WAEC", "JAMB", "JUNIOR_WAEC", "OTHER"],
    subjects,
    exams: cards,
    summary,
  });
}
