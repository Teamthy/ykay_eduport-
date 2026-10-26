import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";

const auth = vi.hoisted(() => ({
  user: {
    id: "user_1",
    schoolId: "school_1",
    name: "Student One",
    email: "student@example.test",
    role: "STUDENT",
  },
}));

vi.mock("@/lib/cbt-auth", () => ({
  requireCbtUser: vi.fn(async () => auth.user),
  isResponse: (value: unknown) => value instanceof Response,
}));

import { GET, POST } from "@/app/api/cbt/sessions/route";

const candidateQuestions = Array.from({ length: 80 }, (_, index) => ({
  id: `question_${index}`,
  subjectId: "subject_math",
}));

describe("personal CBT session creation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long-for-testing";
    mockPrisma.studentProfile.findFirst.mockResolvedValue({ id: "student_1" });
    mockPrisma.cbtSubject.findMany.mockResolvedValue([
      { id: "subject_math", slug: "mathematics-ss2", name: "Mathematics" },
    ]);
    mockPrisma.cbtQuestion.findMany
      .mockResolvedValueOnce(candidateQuestions)
      .mockImplementationOnce(async (args) => {
        const selectedIds = new Set(args.where.id.in as string[]);
        return candidateQuestions
          .filter((question) => selectedIds.has(question.id))
          .map((question) => ({
            ...question,
            topic: "Number",
            difficulty: 1,
            stem: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            subject: { name: "Mathematics" },
          }));
      });
    mockPrisma.cbtAttempt.create.mockResolvedValue({ id: "attempt_1", createdAt: new Date() });
  });

  it("caps a set at 60 and never includes answer keys in the question payload", async () => {
    const request = new NextRequest("http://localhost/api/cbt/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classLevel: "ss2",
        practiceMode: "subject",
        term: "second",
        week: 5,
        subjectSlugs: ["mathematics-ss2"],
        questionCount: 60,
        durationMinutes: 0,
      }),
    });

    const response = await POST(request);
    const payload = await response.json();
    expect(response.status).toBe(201);
    expect(payload.questionCount).toBe(60);
    expect(payload.isTimed).toBe(false);
    expect(payload.questions).toHaveLength(60);
    expect(JSON.stringify(payload.questions)).not.toContain("correctIndex");
    expect(JSON.stringify(payload.questions)).not.toContain("explanation");
    expect(mockPrisma.cbtQuestion.findMany.mock.calls[0]?.[0].where).toMatchObject({
      term: "second",
      week: 5,
    });
    expect(mockPrisma.cbtAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          term: "second",
          week: 5,
          isTimed: false,
          total: 60,
          userId: "user_1",
          schoolId: "school_1",
        }),
      }),
    );
  });

  it("keeps an expired timer resumable so the session can auto-submit on resume", async () => {
    mockPrisma.cbtAttempt.findMany.mockResolvedValue([
      {
        id: "attempt_timed",
        classLevel: "ss2",
        practiceMode: "subject",
        topic: null,
        subjectIds: ["subject_math"],
        subjectId: "subject_math",
        total: 12,
        isTimed: true,
        deadlineAt: new Date(Date.now() - 60_000),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 60_000),
      },
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.sessions).toHaveLength(1);
    expect(payload.sessions[0].id).toBe("attempt_timed");
    expect(payload.sessions[0].secondsLeft).toBe(0);
  });

  it("rejects a week filter without a specific term", async () => {
    const request = new NextRequest("http://localhost/api/cbt/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classLevel: "ss2",
        practiceMode: "subject",
        term: "all",
        week: 5,
        subjectSlugs: ["mathematics-ss2"],
        questionCount: 10,
        durationMinutes: 0,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mockPrisma.cbtAttempt.create).not.toHaveBeenCalled();
  });

  it("rejects a client request above the server-enforced maximum", async () => {
    const request = new NextRequest("http://localhost/api/cbt/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        classLevel: "ss2",
        practiceMode: "subject",
        subjectSlugs: ["mathematics-ss2"],
        questionCount: 61,
        durationMinutes: 0,
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(mockPrisma.cbtAttempt.create).not.toHaveBeenCalled();
  });
});
