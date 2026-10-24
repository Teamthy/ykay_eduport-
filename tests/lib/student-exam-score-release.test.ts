import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";

const mocks = vi.hoisted(() => ({
  getStudentExamContext: vi.fn(),
  getStudentFeeLock: vi.fn(),
  studentSubjectIds: vi.fn(),
}));

vi.mock("@/lib/exams", () => ({ getStudentExamContext: mocks.getStudentExamContext }));
vi.mock("@/lib/fee-lock", () => ({ getStudentFeeLock: mocks.getStudentFeeLock }));
vi.mock("@/lib/subjects", () => ({
  availabilityLabel: (value: string) => value,
  examAvailability: () => "READY",
  studentSubjectIds: mocks.studentSubjectIds,
}));

const studentContext = {
  user: { id: "user_student", schoolId: "school_1", role: "STUDENT" },
  studentProfile: {
    id: "student_1",
    studentId: "YK-001",
    displayName: "Student One",
    currentClassId: "class_1",
  },
};

function exam(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam_1",
    schoolId: "school_1",
    classId: "class_1",
    title: "Biology CA",
    subjectName: "Biology",
    teacherProfile: { displayName: "Teacher One" },
    classroom: { displayName: "SS 2" },
    examType: "CA",
    practiceCategory: null,
    term: null,
    scheduledFor: null,
    availableUntil: null,
    subjectId: null,
    questions: [{ id: "question_1", marks: 50, type: "MCQ" }],
    attempts: [
      {
        id: "attempt_1",
        status: "GRADED",
        totalScore: 45,
        submittedAt: new Date("2026-05-12T10:00:00Z"),
      },
    ],
    retakes: [],
    durationMinutes: 30,
    theoryMinutes: 0,
    passMark: 40,
    status: "CLOSED",
    resultsReleased: false,
    shuffleQuestions: true,
    instructions: null,
    ...overrides,
  };
}

describe("GET /api/student/exams score visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getStudentExamContext.mockResolvedValue(studentContext);
    mocks.getStudentFeeLock.mockResolvedValue(null);
    mocks.studentSubjectIds.mockResolvedValue([]);
    mockPrisma.term.findMany.mockResolvedValue([]);
    mockPrisma.exam.findMany.mockResolvedValue([exam() as never]);
  });

  it("does not return a graded score before release", async () => {
    const { GET } = await import("@/app/api/student/exams/route");
    const response = await GET(new NextRequest("http://localhost/api/student/exams?section=ca"));
    const body = await response.json();

    expect(body.exams[0].attempt).toMatchObject({
      status: "GRADED",
      totalScore: null,
      scoreVisible: false,
      percent: null,
    });
  });

  it("returns the score only after the closed assessment is released", async () => {
    mockPrisma.exam.findMany.mockResolvedValue([exam({ resultsReleased: true }) as never]);
    const { GET } = await import("@/app/api/student/exams/route");
    const response = await GET(new NextRequest("http://localhost/api/student/exams?section=ca"));
    const body = await response.json();

    expect(body.exams[0].attempt).toMatchObject({
      status: "GRADED",
      totalScore: 45,
      scoreVisible: true,
      percent: 90,
    });
  });
});
