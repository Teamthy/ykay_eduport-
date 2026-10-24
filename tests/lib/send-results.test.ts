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
vi.mock("@/lib/rate-limit", () => ({
  enforceRateLimit: vi.fn(async () => ({ success: true, retryAfterSeconds: 0 })),
}));
vi.mock("@/lib/gradebook", () => ({
  waecGrade: (percent: number) => (percent >= 75 ? "A1" : percent >= 50 ? "C6" : "F9"),
}));

type NoticeInput = {
  id: string;
  schoolId: string;
  userId: string;
  kind: "REPORT_RELEASED";
  title: string;
  body: string;
  link: string;
};
const createInAppNotificationOnce = vi.fn(async (_input: NoticeInput) => ({
  created: true,
  notification: { id: "n1" },
}));
vi.mock("@/lib/notifications", () => ({ createInAppNotificationOnce }));

function request(body: unknown) {
  return { json: async () => body, headers: new Headers() } as never;
}

function gradedAttempt(overrides: Record<string, unknown> = {}) {
  return {
    id: "att_1",
    attemptNumber: 1,
    totalScore: 38,
    submittedAt: new Date("2026-05-12T10:00:00Z"),
    studentProfile: {
      id: "stu_1",
      studentId: "YK-001",
      displayName: "Student One",
      userId: "student_user_1",
      parentLinks: [
        {
          parentProfile: {
            id: "parent_profile_1",
            schoolId: "school_1",
            userId: "parent_user_1",
            isActive: true,
          },
        },
      ],
    },
    ...overrides,
  };
}

function releasedExam(overrides: Record<string, unknown> = {}) {
  return {
    id: "exam_1",
    schoolId: "school_1",
    title: "Midterm Biology",
    subjectName: "Biology",
    examType: "CA",
    classroom: { displayName: "SS 2" },
    term: { label: "Second Term", session: { label: "2025/2026" } },
    questions: [{ marks: 50 }],
    attempts: [gradedAttempt()],
    ...overrides,
  };
}

const validBody = { examId: "exam_1", studentProfileIds: ["stu_1"] };

describe("/api/teacher/send-results", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.auditLog.create.mockResolvedValue({ id: "audit_1" } as never);
    mockPrisma.exam.findMany.mockResolvedValue([]);
    mockPrisma.exam.findFirst.mockResolvedValue(releasedExam() as never);
    mockPrisma.user.findMany.mockResolvedValue([
      { id: "student_user_1", role: "STUDENT" },
      { id: "parent_user_1", role: "PARENT" },
    ] as never);
    createInAppNotificationOnce.mockResolvedValue({ created: true, notification: { id: "n1" } });
  });

  it("lists only closed, released assessments within assigned class/subject pairs", async () => {
    mockPrisma.exam.findMany.mockResolvedValue([releasedExam() as never]);
    const { GET } = await import("@/app/api/teacher/send-results/route");

    const body = await (await GET()).json();
    expect(body.exams).toHaveLength(1);
    expect(body.exams[0].students[0]).toMatchObject({
      profileId: "stu_1",
      score: 38,
      total: 50,
      percent: 76,
    });
    const where = mockPrisma.exam.findMany.mock.calls[0][0].where;
    expect(where.schoolId).toBe("school_1");
    expect(where.status).toBe("CLOSED");
    expect(where.resultsReleased).toBe(true);
    expect(where.OR).toEqual([{ classId: "cls_1", subjectName: "Biology" }]);
  });

  it("derives notifications from persisted graded attempts and ignores browser-supplied scores", async () => {
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const response = await POST(
      request({
        ...validBody,
        results: [{ studentProfileId: "stu_1", score: 999, total: 1 }],
        subjectName: "Forged subject",
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sent).toBe(1);
    expect(body.notifications).toBe(2);
    const recipientCalls = createInAppNotificationOnce.mock.calls.map(([input]) => input);
    expect(recipientCalls.map((input) => input.userId)).toEqual([
      "parent_user_1",
      "student_user_1",
    ]);
    expect(recipientCalls[0].body).toContain("38/50 (76%)");
    expect(recipientCalls[0].body).toContain("Biology — Midterm Biology");
    expect(recipientCalls[0].id).toContain("att_1");
  });

  it("requires the assessment to be within the teacher's assigned scope and released", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(null);
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const response = await POST(request(validBody));

    expect(response.status).toBe(404);
    expect(createInAppNotificationOnce).not.toHaveBeenCalled();
    const where = mockPrisma.exam.findFirst.mock.calls[0][0].where;
    expect(where.schoolId).toBe("school_1");
    expect(where.status).toBe("CLOSED");
    expect(where.resultsReleased).toBe(true);
    expect(where.OR).toEqual([{ classId: "cls_1", subjectName: "Biology" }]);
  });

  it("rejects a selected student without a fully graded attempt", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(releasedExam({ attempts: [] }) as never);
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const response = await POST(request(validBody));

    expect(response.status).toBe(409);
    expect(createInAppNotificationOnce).not.toHaveBeenCalled();
  });

  it("rejects a stored result that exceeds the exam's server-side marks", async () => {
    mockPrisma.exam.findFirst.mockResolvedValue(
      releasedExam({ attempts: [gradedAttempt({ totalScore: 51 })] }) as never,
    );
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const response = await POST(request(validBody));

    expect(response.status).toBe(409);
    expect(createInAppNotificationOnce).not.toHaveBeenCalled();
  });

  it("rejects duplicate or empty recipient IDs", async () => {
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const duplicate = await POST(
      request({ examId: "exam_1", studentProfileIds: ["stu_1", "stu_1"] }),
    );
    const empty = await POST(request({ examId: "exam_1", studentProfileIds: [] }));

    expect(duplicate.status).toBe(400);
    expect(empty.status).toBe(400);
  });

  it("scopes recipient accounts to active parent/student users in the same school", async () => {
    const { POST } = await import("@/app/api/teacher/send-results/route");
    await POST(request(validBody));
    const where = mockPrisma.user.findMany.mock.calls[0][0].where;

    expect(where.schoolId).toBe("school_1");
    expect(where.isActive).toBe(true);
    expect(where.isSuspended).toBe(false);
    expect(where.role.in).toEqual(["PARENT", "STUDENT"]);
  });

  it("is idempotent when result notices already exist", async () => {
    createInAppNotificationOnce.mockResolvedValue({ created: false, notification: { id: "n1" } });
    const { POST } = await import("@/app/api/teacher/send-results/route");
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect((await response.json()).notifications).toBe(0);
    expect(createInAppNotificationOnce).toHaveBeenCalledTimes(2);
  });

  it("records an audit entry against the released exam", async () => {
    const { POST } = await import("@/app/api/teacher/send-results/route");
    await POST(request(validBody));
    expect(mockPrisma.auditLog.create.mock.calls[0][0].data).toMatchObject({
      action: "RESULTS_SENT_TO_PARENTS",
      entityType: "Exam",
      entityId: "exam_1",
      actorUserId: "usr_t",
    });
  });
});
