import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

vi.mock("@/lib/prisma", () => ({ prisma: mockPrisma }));

describe("immutable exam snapshots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("freezes published settings and pins ordered questions to immutable versions", async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: "exam_1",
      schoolId: "school_1",
      title: "Algebra test",
      subjectName: "Mathematics",
      instructions: "Show your work",
      durationMinutes: 45,
      theoryMinutes: 10,
      passMark: 50,
      shuffleQuestions: false,
      snapshots: [{ revision: 2 }],
      questions: [
        { id: "q1", sortOrder: 1, marks: 2, versions: [{ id: "q1-v3" }] },
        { id: "q2", sortOrder: 2, marks: 3, versions: [{ id: "q2-v4" }] },
      ],
    } as never);
    mockPrisma.examSnapshot.create.mockResolvedValue({ id: "snapshot_3" } as never);

    const { createExamSnapshot } = await import("@/lib/exam-snapshots");
    const snapshot = await createExamSnapshot(mockPrisma as never, "exam_1");

    expect(snapshot.id).toBe("snapshot_3");
    expect(mockPrisma.examSnapshot.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        examId: "exam_1",
        revision: 3,
        title: "Algebra test",
        durationMinutes: 45,
        theoryMinutes: 10,
        passMark: 50,
        totalMarks: 5,
        shuffleQuestions: false,
        questions: {
          create: [
            { schoolId: "school_1", questionId: "q1", questionVersionId: "q1-v3", sortOrder: 1 },
            { schoolId: "school_1", questionId: "q2", questionVersionId: "q2-v4", sortOrder: 2 },
          ],
        },
      }),
    });
  });

  it("refuses to publish if a current question lacks a recorded version", async () => {
    mockPrisma.exam.findUnique.mockResolvedValue({
      id: "exam_1",
      questions: [{ id: "q1", versions: [] }],
      snapshots: [],
    } as never);
    const { createExamSnapshot } = await import("@/lib/exam-snapshots");

    await expect(createExamSnapshot(mockPrisma as never, "exam_1")).rejects.toThrow(
      "QUESTION_VERSION_MISSING",
    );
    expect(mockPrisma.examSnapshot.create).not.toHaveBeenCalled();
  });
});
