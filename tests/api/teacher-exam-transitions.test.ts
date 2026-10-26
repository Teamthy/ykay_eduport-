import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/teacher/exams/route";
import { mockPrisma } from "../setup";
import { getExamTeacherContext } from "@/lib/exams";

vi.mock("@prisma/client", () => ({
  ExamAttemptStatus: {
    GRADED: "GRADED",
    SUBMITTED: "SUBMITTED",
    IN_PROGRESS: "IN_PROGRESS",
  },
  ExamStatus: { DRAFT: "DRAFT", PUBLISHED: "PUBLISHED", CLOSED: "CLOSED" },
  GradebookStatus: { OPEN: "OPEN", LOCKED: "LOCKED" },
  Prisma: { JsonNull: null, DbNull: null },
}));

vi.mock("@/lib/exams", () => ({
  getExamTeacherContext: vi.fn(),
  parseBulkQuestions: vi.fn(),
  examStatusLabel: vi.fn(),
}));

vi.mock("@/lib/academic-session", () => ({
  NoCurrentTermError: class NoCurrentTermError extends Error {},
  requireCurrentLabels: vi.fn(),
}));

vi.mock("@/lib/exam-gradebook-sync", () => ({
  gradebookFieldForComponent: vi.fn(),
  isGradebookComponent: vi.fn(),
  mergeExamScoreIntoGradebook: vi.fn(),
  restoreGradebookComponent: vi.fn(),
}));

const context = {
  user: { id: "teacher_user", schoolId: "school_a" },
  teacherProfile: { id: "teacher_profile_a" },
};
const updatedAt = new Date("2026-10-25T09:00:00.000Z");

function exam(status: "DRAFT" | "PUBLISHED" | "CLOSED", questionCount = 1) {
  return {
    id: "exam_a",
    schoolId: "school_a",
    teacherProfileId: "teacher_profile_a",
    status,
    resultsReleased: false,
    updatedAt,
    questions: Array.from({ length: questionCount }, (_, index) => ({
      id: `question_${index + 1}`,
      marks: 1,
      sortOrder: index + 1,
    })),
  };
}

function actionRequest(action: "PUBLISH" | "CLOSE") {
  return new NextRequest("http://localhost/api/teacher/exams", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ examId: "exam_a", action }),
  });
}

async function act(action: "PUBLISH" | "CLOSE") {
  return PATCH(actionRequest(action));
}

describe("teacher exam state transitions at the API boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getExamTeacherContext).mockResolvedValue(context as never);
    mockPrisma.exam.findFirst.mockResolvedValue(exam("DRAFT") as never);
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: "exam_a",
      title: "Paper",
      subjectName: "Mathematics",
      instructions: null,
      durationMinutes: 30,
      theoryMinutes: 0,
      passMark: 40,
      shuffleQuestions: true,
      snapshots: [],
      questions: [{ id: "question_1", marks: 1, sortOrder: 1, versions: [{ id: "version_1" }] }],
    } as never);
    mockPrisma.examSnapshot.create.mockResolvedValue({ id: "snapshot_1" } as never);
  });

  it.each(["PUBLISHED", "CLOSED"] as const)("refuses PUBLISH directly from %s", async (status) => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam(status) as never);

    const response = await act("PUBLISH");

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("requires at least one question before publishing a draft", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam("DRAFT", 0) as never);

    const response = await act("PUBLISH");

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("publishes only with an atomic DRAFT-state condition", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam("DRAFT") as never);

    const response = await act("PUBLISH");

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "exam_a",
          schoolId: "school_a",
          teacherProfileId: "teacher_profile_a",
          status: "DRAFT",
          resultsReleased: false,
          updatedAt,
        }),
        data: { status: "PUBLISHED" },
      }),
    );
  });

  it("refuses to close a draft", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam("DRAFT") as never);

    const response = await act("CLOSE");

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("closes a published exam with an atomic PUBLISHED-state condition", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam("PUBLISHED") as never);

    const response = await act("CLOSE");

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "exam_a",
          schoolId: "school_a",
          teacherProfileId: "teacher_profile_a",
          status: "PUBLISHED",
          updatedAt,
        }),
        data: { status: "CLOSED" },
      }),
    );
  });

  it("treats CLOSE on an already-closed exam as an idempotent success", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(exam("CLOSED") as never);

    const response = await act("CLOSE");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: "Exam is already closed." });
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("treats a close race as success when another request already closed it", async () => {
    mockPrisma.exam.findFirst
      .mockResolvedValueOnce(exam("PUBLISHED") as never)
      .mockResolvedValueOnce({ status: "CLOSED" } as never);
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 } as never);

    const response = await act("CLOSE");

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, message: "Exam is already closed." });
  });
});
