import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

const mocks = vi.hoisted(() => ({ getExamTeacherContext: vi.fn() }));
vi.mock("@/lib/exams", () => ({ getExamTeacherContext: mocks.getExamTeacherContext }));

const teacherContext = {
  user: { id: "teacher_user", schoolId: "school_1", role: "TEACHER" },
  teacherProfile: { id: "teacher_1", subjectAssignments: [] },
};
const routeContext = { params: Promise.resolve({ id: "exam_1" }) };

function request(body: unknown) {
  return { json: async () => body } as never;
}

describe("PATCH /api/teacher/exams/[id]/results release race", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getExamTeacherContext.mockResolvedValue(teacherContext);
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.examAnswer.findFirst.mockResolvedValue({
      id: "answer_1",
      response: "written answer",
      snapshotQuestion: { questionVersion: { type: "ESSAY", marks: 10 } },
      attempt: { id: "attempt_1", exam: { resultsReleased: false } },
    } as never);
    mockPrisma.examAnswer.update.mockResolvedValue({ id: "answer_1" } as never);
    mockPrisma.examAttempt.findUnique.mockResolvedValue({
      id: "attempt_1",
      autoScore: 10,
      answers: [
        {
          snapshotQuestion: { questionVersion: { type: "ESSAY" } },
          awardedMarks: 4,
        },
      ],
    } as never);
    mockPrisma.examAttempt.update.mockResolvedValue({ id: "attempt_1" } as never);
  });

  it("serializes essay grading against release through the exam row", async () => {
    const { PATCH } = await import("@/app/api/teacher/exams/[id]/results/route");
    const response = await PATCH(request({ answerId: "answer_1", awardedMarks: 4 }), routeContext);

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        id: "exam_1",
        schoolId: "school_1",
        resultsReleased: false,
      },
    });
    expect(mockPrisma.examAnswer.update).toHaveBeenCalledWith({
      where: { id: "answer_1" },
      data: { awardedMarks: 4, isCorrect: true },
    });
    expect(mockPrisma.examAttempt.update.mock.calls[0][0].data).toMatchObject({
      essayScore: 4,
      totalScore: 14,
      status: "GRADED",
    });
  });

  it("refuses the essay edit if result release acquired the exam row first", async () => {
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 } as never);
    const { PATCH } = await import("@/app/api/teacher/exams/[id]/results/route");
    const response = await PATCH(request({ answerId: "answer_1", awardedMarks: 4 }), routeContext);

    expect(response.status).toBe(409);
    expect(mockPrisma.examAnswer.update).not.toHaveBeenCalled();
    expect(mockPrisma.examAttempt.update).not.toHaveBeenCalled();
  });
});
