import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

const teacherContext = {
  user: { id: "usr_t", schoolId: "school_1", role: "TEACHER" },
  teacherProfile: {
    id: "tp_1",
    displayName: "T One",
    subjectAssignments: [
      {
        id: "asg_1",
        subjectName: "Biology",
        classroom: { id: "cls_1", displayName: "SS 2", level: "SS2" },
      },
    ],
  },
};

vi.mock("@/lib/exams", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/exams")>();
  return { ...actual, getExamTeacherContext: vi.fn(async () => teacherContext) };
});
vi.mock("@/lib/requests", () => ({ getClientIp: vi.fn(() => "127.0.0.1") }));

function request(body: unknown) {
  return { json: async () => body } as never;
}

function baseExam(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam_1",
    schoolId: "school_1",
    classId: "cls_1",
    teacherProfileId: "tp_1",
    subjectName: "Biology",
    title: "Midterm Biology",
    examType: "MIDTERM",
    termId: "term_1",
    gradebookComponent: "CA1",
    status: "CLOSED",
    resultsReleased: false,
    updatedAt: new Date("2026-10-24T00:00:00.000Z"),
    snapshots: [{ totalMarks: 50 }],
    questions: [{ id: "q1", marks: 50, sortOrder: 1 }],
    ...overrides,
  };
}

const body = { examId: "exam_1", action: "RELEASE_RESULTS" };

describe("PATCH /api/teacher/exams — result release and gradebook sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam() as never);
    mockPrisma.exam.findUnique.mockResolvedValue({
      ...baseExam(),
      theoryMinutes: 0,
      passMark: 40,
      shuffleQuestions: false,
      scheduledFor: null,
      availableUntil: null,
      snapshots: [],
      questions: [{ id: "q1", marks: 50, sortOrder: 1, versions: [{ id: "qv1" }] }],
    } as never);
    mockPrisma.examSnapshot.create.mockResolvedValue({ id: "snapshot_1" } as never);
    mockPrisma.examAttempt.findMany.mockResolvedValue([
      {
        id: "attempt_1",
        studentProfileId: "student_1",
        attemptNumber: 1,
        status: "GRADED",
        totalScore: 38,
        snapshot: { totalMarks: 50 },
        studentProfile: { schoolId: "school_1" },
      },
    ] as never);
    mockPrisma.term.findFirst.mockResolvedValue({
      label: "Second Term",
      session: { label: "2025/2026" },
    } as never);
    mockPrisma.subjectGradebook.upsert.mockResolvedValue({ id: "gb_1", status: "OPEN" } as never);
    mockPrisma.gradebookEntry.findUnique.mockResolvedValue({
      ca1: 2,
      ca2: 6,
      midterm: 4,
      assignment: 7,
      exam: 45,
    } as never);
    mockPrisma.gradebookEntry.upsert.mockResolvedValue({ id: "entry_1" } as never);
    mockPrisma.gradebookEntry.update.mockResolvedValue({ id: "entry_1" } as never);
    mockPrisma.examGradebookSync.findMany.mockResolvedValue([]);
    mockPrisma.examGradebookSync.findUnique.mockResolvedValue(null);
    mockPrisma.examGradebookSync.upsert.mockResolvedValue({ id: "sync_1" } as never);
    mockPrisma.examGradebookSync.update.mockResolvedValue({ id: "sync_1" } as never);
    mockPrisma.exam.update.mockResolvedValue({ id: "exam_1" } as never);
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 1 } as never);
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" } as never);
  });

  it("does not reopen a released assessment by changing its status to published", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "PUBLISH" }));

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("publishes only an unreleased draft with an atomic state check", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "DRAFT" }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "PUBLISH" }));

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        id: "exam_1",
        schoolId: "school_1",
        teacherProfileId: "tp_1",
        status: "DRAFT",
        resultsReleased: false,
        updatedAt: new Date("2026-10-24T00:00:00.000Z"),
      },
      data: { status: "PUBLISHED" },
    });
  });

  it("does not publish an assessment that is not a draft", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "PUBLISHED" }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "PUBLISH" }));

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("rejects closing a draft directly", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "DRAFT" }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "CLOSE" }));

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("closes only a published assessment and treats an already-closed assessment as idempotent", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "PUBLISHED" }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "CLOSE" }));

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        id: "exam_1",
        schoolId: "school_1",
        teacherProfileId: "tp_1",
        status: "PUBLISHED",
        updatedAt: new Date("2026-10-24T00:00:00.000Z"),
      },
      data: { status: "CLOSED" },
    });

    vi.clearAllMocks();
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "CLOSED" }) as never);
    const repeatedResponse = await PATCH(request({ examId: "exam_1", action: "CLOSE" }));
    expect(repeatedResponse.status).toBe(200);
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("treats a concurrent close as idempotent when the row is already closed", async () => {
    mockPrisma.exam.findFirst
      .mockResolvedValueOnce(baseExam({ status: "PUBLISHED" }) as never)
      .mockResolvedValueOnce(baseExam({ status: "CLOSED" }) as never);
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 } as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "CLOSE" }));

    expect(response.status).toBe(200);
    expect(mockPrisma.exam.updateMany).toHaveBeenCalledTimes(1);
    expect(mockPrisma.exam.findFirst).toHaveBeenCalledTimes(2);
  });

  it("keeps assessment settings immutable while results are released", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(
      request({ examId: "exam_1", action: "UPDATE_SETTINGS", passMark: 75 }),
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
    expect(mockPrisma.exam.updateMany).not.toHaveBeenCalled();
  });

  it("rejects settings writes if release wins the row-version race", async () => {
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 } as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(
      request({ examId: "exam_1", action: "UPDATE_SETTINGS", passMark: 75 }),
    );

    expect(response.status).toBe(409);
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        id: "exam_1",
        schoolId: "school_1",
        teacherProfileId: "tp_1",
        resultsReleased: false,
        updatedAt: new Date("2026-10-24T00:00:00.000Z"),
      },
      data: { passMark: 75 },
    });
    expect(mockPrisma.auditLog.create).not.toHaveBeenCalled();
  });

  it("requires the assessment to be closed and all attempts fully graded", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ status: "PUBLISHED" }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(409);
    expect(mockPrisma.examAttempt.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("does not release while an attempt or essay remains ungraded", async () => {
    mockPrisma.examAttempt.findMany.mockResolvedValue([
      {
        id: "attempt_1",
        studentProfileId: "student_1",
        attemptNumber: 1,
        status: "SUBMITTED",
        totalScore: 38,
        snapshot: { totalMarks: 50 },
        studentProfile: { schoolId: "school_1" },
      },
    ] as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(409);
    expect(mockPrisma.subjectGradebook.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("scales server-graded scores into the configured cumulative component atomically", async () => {
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(200);

    expect(mockPrisma.subjectGradebook.upsert.mock.calls[0][0]).toMatchObject({
      where: {
        classId_subjectName_sessionLabel_termLabel: {
          classId: "cls_1",
          subjectName: "Biology",
          sessionLabel: "2025/2026",
          termLabel: "Second Term",
        },
      },
    });
    const entryWrite = mockPrisma.gradebookEntry.upsert.mock.calls[0][0];
    expect(entryWrite.update).toMatchObject({ ca1: 8, total: 70, grade: "B2" });
    expect(mockPrisma.examGradebookSync.upsert.mock.calls[0][0]).toMatchObject({
      create: {
        schoolId: "school_1",
        examId: "exam_1",
        studentProfileId: "student_1",
        gradebookEntryId: "entry_1",
        component: "CA1",
        previousValue: 2,
        syncedValue: 8,
        isActive: true,
      },
    });
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        status: "CLOSED",
        resultsReleased: false,
        updatedAt: new Date("2026-10-24T00:00:00.000Z"),
      },
      data: { resultsReleased: true },
    });
    expect(mockPrisma.auditLog.create.mock.calls[0][0].data.metadata).toMatchObject({
      gradebookComponent: "CA1",
      syncedStudents: 1,
      termId: "term_1",
    });
  });

  it("does not release or overwrite a submitted/locked gradebook", async () => {
    mockPrisma.subjectGradebook.upsert.mockResolvedValue({ id: "gb_1", status: "LOCKED" } as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(409);
    expect(mockPrisma.gradebookEntry.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("keeps legacy assessments without a component out of the cumulative gradebook", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(
      baseExam({ gradebookComponent: null, termId: null }) as never,
    );
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(200);
    expect(mockPrisma.subjectGradebook.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.gradebookEntry.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.exam.updateMany.mock.calls[0][0]).toMatchObject({
      where: {
        status: "CLOSED",
        resultsReleased: false,
        updatedAt: new Date("2026-10-24T00:00:00.000Z"),
      },
      data: { resultsReleased: true },
    });
  });

  it("rechecks attempt grades inside the release transaction", async () => {
    mockPrisma.examAttempt.findMany
      .mockResolvedValueOnce([
        {
          id: "attempt_1",
          studentProfileId: "student_1",
          attemptNumber: 1,
          status: "GRADED",
          totalScore: 38,
          snapshot: { totalMarks: 50 },
          studentProfile: { schoolId: "school_1" },
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "attempt_1",
          studentProfileId: "student_1",
          attemptNumber: 1,
          status: "SUBMITTED",
          totalScore: 38,
          snapshot: { totalMarks: 50 },
          studentProfile: { schoolId: "school_1" },
        },
      ] as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));

    expect(response.status).toBe(409);
    expect(mockPrisma.examAttempt.findMany).toHaveBeenCalledTimes(2);
    expect(mockPrisma.gradebookEntry.upsert).not.toHaveBeenCalled();
  });

  it("rejects a release if another request already changed the release state", async () => {
    mockPrisma.exam.updateMany.mockResolvedValue({ count: 0 } as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));

    expect(response.status).toBe(409);
    expect(mockPrisma.gradebookEntry.upsert).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("does not overwrite a result after it is already released", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request(body));
    expect(response.status).toBe(200);
    expect(mockPrisma.examAttempt.findMany).not.toHaveBeenCalled();
    expect(mockPrisma.gradebookEntry.upsert).not.toHaveBeenCalled();
  });

  it("safely restores the previous cumulative score when results are hidden", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    mockPrisma.examGradebookSync.findMany.mockResolvedValue([
      {
        id: "sync_1",
        component: "CA1",
        previousValue: 2,
        syncedValue: 8,
        isActive: true,
        gradebookEntry: {
          id: "entry_1",
          ca1: 8,
          ca2: 6,
          midterm: 4,
          assignment: 7,
          exam: 45,
          gradebook: { status: "OPEN" },
        },
      },
    ] as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "UNRELEASE_RESULTS" }));

    expect(response.status).toBe(200);
    expect(mockPrisma.gradebookEntry.update.mock.calls[0][0].data).toMatchObject({
      ca1: 2,
      total: 64,
      grade: "C4",
    });
    expect(mockPrisma.examGradebookSync.update.mock.calls[0][0].data.isActive).toBe(false);
    expect(mockPrisma.exam.update.mock.calls[0][0].data.resultsReleased).toBe(false);
  });

  it("refuses to hide results after the cumulative gradebook is submitted or locked", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    mockPrisma.examGradebookSync.findMany.mockResolvedValue([
      {
        id: "sync_1",
        component: "CA1",
        previousValue: 2,
        syncedValue: 8,
        isActive: true,
        gradebookEntry: {
          id: "entry_1",
          ca1: 8,
          ca2: 6,
          midterm: 4,
          assignment: 7,
          exam: 45,
          gradebook: { status: "LOCKED" },
        },
      },
    ] as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "UNRELEASE_RESULTS" }));

    expect(response.status).toBe(409);
    expect(mockPrisma.gradebookEntry.update).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });

  it("refuses to hide results if a gradebook component changed after sync", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(baseExam({ resultsReleased: true }) as never);
    mockPrisma.examGradebookSync.findMany.mockResolvedValue([
      {
        id: "sync_1",
        component: "CA1",
        previousValue: 2,
        syncedValue: 8,
        isActive: true,
        gradebookEntry: {
          id: "entry_1",
          ca1: 9,
          ca2: 6,
          midterm: 4,
          assignment: 7,
          exam: 45,
          gradebook: { status: "OPEN" },
        },
      },
    ] as never);
    const { PATCH } = await import("@/app/api/teacher/exams/route");
    const response = await PATCH(request({ examId: "exam_1", action: "UNRELEASE_RESULTS" }));

    expect(response.status).toBe(409);
    expect(mockPrisma.gradebookEntry.update).not.toHaveBeenCalled();
    expect(mockPrisma.exam.update).not.toHaveBeenCalled();
  });
});
