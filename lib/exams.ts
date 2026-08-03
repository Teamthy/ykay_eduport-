import { ExamAttemptStatus, ExamQuestionType, ExamStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole, type SessionUser } from "@/lib/session";

export const EXAM_TEACHER_ROLES: UserRole[] = [
  UserRole.TEACHER,
  UserRole.HOD,
  UserRole.ADMIN,
  UserRole.DIRECTOR,
];

export type ExamTeacherContext = {
  user: SessionUser;
  teacherProfile: {
    id: string;
    displayName: string;
    subjectAssignments: Array<{
      id: string;
      subjectName: string;
      classroom: { id: string; displayName: string; level: string };
    }>;
  };
};

export async function getExamTeacherContext(): Promise<ExamTeacherContext | null> {
  const user = await requireRole(EXAM_TEACHER_ROLES);
  if (!user) return null;

  const teacherProfile = await prisma.teacherProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    select: {
      id: true,
      displayName: true,
      classAssignments: {
        where: { isActive: true, subjectName: { not: null } },
        orderBy: [{ classroom: { displayName: "asc" } }],
        select: {
          id: true,
          subjectName: true,
          classroom: { select: { id: true, displayName: true, level: true } },
        },
      },
    },
  });
  if (!teacherProfile) return null;

  return {
    user,
    teacherProfile: {
      id: teacherProfile.id,
      displayName: teacherProfile.displayName,
      subjectAssignments: teacherProfile.classAssignments
        .filter((assignment) => Boolean(assignment.subjectName))
        .map((assignment) => ({
          id: assignment.id,
          subjectName: assignment.subjectName as string,
          classroom: assignment.classroom,
        })),
    },
  };
}

export async function getStudentExamContext() {
  const user = await requireRole([UserRole.STUDENT]);
  if (!user) return null;
  const studentProfile = await prisma.studentProfile.findFirst({
    where: { schoolId: user.schoolId, userId: user.id, isActive: true },
    select: { id: true, displayName: true, studentId: true, currentClassId: true },
  });
  if (!studentProfile) return null;
  return { user, studentProfile };
}

/* ------------------------------------------------------------------
   Question parsing — supports the documented bulk text format:
     Q: question text
     A: option one
     B: option two
     C: option three
     D: option four
     Correct: B
   Also:
     TRUE/FALSE  -> options True/False, Correct: TRUE
     FILL: answer text (fill in the blank)
     ESSAY (no options; manually graded)
   Blank line separates questions. Optional "Marks: n" per question.
   ------------------------------------------------------------------ */

export type ParsedQuestion = {
  type: ExamQuestionType;
  questionText: string;
  options: Array<{ key: string; text: string }> | null;
  correctKey: string | null;
  correctText: string | null;
  marks: number;
};

export function parseBulkQuestions(raw: string): { questions: ParsedQuestion[]; errors: string[] } {
  const blocks = raw
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const questions: ParsedQuestion[] = [];
  const errors: string[] = [];

  blocks.forEach((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const qLine = lines.find((line) => /^Q[:.]/i.test(line));
    if (!qLine) {
      errors.push(`Block ${index + 1}: missing "Q:" line.`);
      return;
    }
    const questionText = qLine.replace(/^Q[:.]\s*/i, "");
    const marksLine = lines.find((line) => /^Marks[:.]/i.test(line));
    const marks = marksLine
      ? Math.max(1, Math.min(20, parseInt(marksLine.replace(/^Marks[:.]\s*/i, ""), 10) || 1))
      : 1;

    const fillLine = lines.find((line) => /^FILL[:.]/i.test(line));
    if (fillLine) {
      questions.push({
        type: ExamQuestionType.FILL_BLANK,
        questionText,
        options: null,
        correctKey: null,
        correctText: fillLine.replace(/^FILL[:.]\s*/i, "").trim(),
        marks,
      });
      return;
    }

    if (lines.some((line) => /^ESSAY\s*$/i.test(line))) {
      questions.push({
        type: ExamQuestionType.ESSAY,
        questionText,
        options: null,
        correctKey: null,
        correctText: null,
        marks: Math.max(marks, 5),
      });
      return;
    }

    const correctLine = lines.find((line) => /^Correct[:.]/i.test(line));
    if (!correctLine) {
      errors.push(`Block ${index + 1}: missing "Correct:" line.`);
      return;
    }
    const correctKey = correctLine
      .replace(/^Correct[:.]\s*/i, "")
      .trim()
      .toUpperCase();

    if (correctKey === "TRUE" || correctKey === "FALSE") {
      questions.push({
        type: ExamQuestionType.TRUE_FALSE,
        questionText,
        options: [
          { key: "TRUE", text: "True" },
          { key: "FALSE", text: "False" },
        ],
        correctKey,
        correctText: null,
        marks,
      });
      return;
    }

    const options: Array<{ key: string; text: string }> = [];
    for (const line of lines) {
      const match = line.match(/^([A-D])[:.]\s*(.+)$/i);
      if (match) options.push({ key: match[1].toUpperCase(), text: match[2].trim() });
    }
    if (options.length < 2) {
      errors.push(`Block ${index + 1}: needs at least options A and B.`);
      return;
    }
    if (!options.some((option) => option.key === correctKey)) {
      errors.push(`Block ${index + 1}: Correct answer "${correctKey}" does not match any option.`);
      return;
    }
    questions.push({
      type: ExamQuestionType.MCQ,
      questionText,
      options,
      correctKey,
      correctText: null,
      marks,
    });
  });

  return { questions, errors };
}

/* ------------------------------------------------------------------
   Grading
   ------------------------------------------------------------------ */

export function gradeObjectiveAnswer(input: {
  type: ExamQuestionType;
  correctKey: string | null;
  correctText: string | null;
  marks: number;
  response: string | null;
}): { isCorrect: boolean | null; awardedMarks: number | null } {
  if (input.type === ExamQuestionType.ESSAY) return { isCorrect: null, awardedMarks: null };
  if (!input.response) return { isCorrect: false, awardedMarks: 0 };

  if (input.type === ExamQuestionType.FILL_BLANK) {
    const expected = (input.correctText || "").trim().toLowerCase();
    const given = input.response.trim().toLowerCase();
    const correct = expected.length > 0 && given === expected;
    return { isCorrect: correct, awardedMarks: correct ? input.marks : 0 };
  }

  const correct = input.response.trim().toUpperCase() === (input.correctKey || "").toUpperCase();
  return { isCorrect: correct, awardedMarks: correct ? input.marks : 0 };
}

export async function finalizeAttempt(attemptId: string) {
  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    include: {
      answers: { include: { question: true } },
      exam: { select: { id: true } },
    },
  });
  if (!attempt) return null;

  let autoScore = 0;
  let hasEssay = false;

  for (const answer of attempt.answers) {
    const graded = gradeObjectiveAnswer({
      type: answer.question.type,
      correctKey: answer.question.correctKey,
      correctText: answer.question.correctText,
      marks: answer.question.marks,
      response: answer.response,
    });
    if (answer.question.type === ExamQuestionType.ESSAY) {
      hasEssay = true;
      continue;
    }
    autoScore += graded.awardedMarks || 0;
    await prisma.examAnswer.update({
      where: { id: answer.id },
      data: { isCorrect: graded.isCorrect, awardedMarks: graded.awardedMarks },
    });
  }

  // Unanswered objective questions count as zero — ensured by autoScore accumulation.
  const updated = await prisma.examAttempt.update({
    where: { id: attempt.id },
    data: {
      status: hasEssay ? ExamAttemptStatus.SUBMITTED : ExamAttemptStatus.GRADED,
      submittedAt: new Date(),
      autoScore,
      totalScore: autoScore + attempt.essayScore,
    },
  });

  return updated;
}

export function examStatusLabel(status: ExamStatus) {
  if (status === ExamStatus.PUBLISHED) return "Published";
  if (status === ExamStatus.CLOSED) return "Closed";
  return "Draft";
}
