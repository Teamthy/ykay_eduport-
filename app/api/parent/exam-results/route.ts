import { ExamAttemptStatus, ExamStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { jsonNoStore } from "@/lib/requests";
import { getParentReportCardContext } from "@/lib/report-cards";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const context = await getParentReportCardContext();
  if (!context) {
    return jsonNoStore(
      { error: "No active parent profile is linked to this account." },
      { status: 404 },
    );
  }

  const children = context.parentProfile.studentLinks.map((link) => ({
    id: link.studentProfile.id,
    studentId: link.studentProfile.studentId,
    displayName: link.studentProfile.displayName,
    className: link.studentProfile.currentClass.displayName,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
  }));
  if (!children.length) {
    return jsonNoStore({
      parent: { displayName: context.parentProfile.displayName },
      children: [],
      selectedChild: null,
      results: [],
    });
  }

  const requestedStudentId = request.nextUrl.searchParams.get("studentId")?.trim();
  const selectedLink = requestedStudentId
    ? context.parentProfile.studentLinks.find(
        (link) => link.studentProfile.id === requestedStudentId,
      )
    : context.parentProfile.studentLinks[0];
  if (!selectedLink) {
    return jsonNoStore(
      { error: "That student is not linked to your parent account." },
      { status: 404 },
    );
  }

  const student = await prisma.studentProfile.findFirst({
    where: { id: selectedLink.studentProfile.id, schoolId: context.user.schoolId },
    select: { currentClassId: true },
  });
  if (!student) return jsonNoStore({ error: "Student profile not found." }, { status: 404 });

  const attempts = await prisma.examAttempt.findMany({
    where: {
      studentProfileId: selectedLink.studentProfile.id,
      status: ExamAttemptStatus.GRADED,
      exam: {
        schoolId: context.user.schoolId,
        status: ExamStatus.CLOSED,
        resultsReleased: true,
        examType: { not: "PRACTICE" },
      },
    },
    orderBy: [{ submittedAt: "desc" }, { createdAt: "desc" }],
    include: {
      snapshot: { select: { totalMarks: true, passMark: true } },
      exam: {
        include: {
          classroom: { select: { id: true, displayName: true } },
          teacherProfile: { select: { displayName: true } },
          term: { select: { label: true, session: { select: { label: true } } } },
        },
      },
    },
  });

  const results = attempts.flatMap((attempt) => {
    const total = attempt.snapshot.totalMarks;
    if (total <= 0 || attempt.totalScore < 0 || attempt.totalScore > total) return [];
    return [
      {
        id: attempt.id,
        examId: attempt.exam.id,
        title: attempt.exam.title,
        subjectName: attempt.exam.subjectName,
        teacherName: attempt.exam.teacherProfile.displayName,
        examType: attempt.exam.examType,
        practiceCategory: attempt.exam.practiceCategory,
        className: attempt.exam.classroom.displayName,
        isHistoricalClass: attempt.exam.classId !== student.currentClassId,
        sessionLabel: attempt.exam.term?.session.label ?? "Legacy session",
        termLabel: attempt.exam.term?.label ?? "Legacy term",
        score: attempt.totalScore,
        total,
        percent: Math.round((attempt.totalScore / total) * 100),
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt?.toISOString() ?? null,
      },
    ];
  });

  return jsonNoStore({
    parent: { displayName: context.parentProfile.displayName },
    children,
    selectedChild: {
      id: selectedLink.studentProfile.id,
      studentId: selectedLink.studentProfile.studentId,
      displayName: selectedLink.studentProfile.displayName,
      className: selectedLink.studentProfile.currentClass.displayName,
      relationship: selectedLink.relationship,
      isPrimary: selectedLink.isPrimary,
    },
    results,
  });
}
