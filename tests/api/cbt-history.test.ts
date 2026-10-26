import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";

const auth = vi.hoisted(() => ({
  user: {
    id: "student_user",
    schoolId: "school_one",
    name: "Student One",
    email: "student@example.test",
    role: "STUDENT",
  } as unknown,
}));

vi.mock("@/lib/cbt-auth", () => ({
  requireCbtUser: vi.fn(async () => auth.user),
  isResponse: (value: unknown) => value instanceof Response,
}));

import { GET } from "@/app/api/cbt/history/route";

describe("personal practice history API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.user = {
      id: "student_user",
      schoolId: "school_one",
      name: "Student One",
      email: "student@example.test",
      role: "STUDENT",
    };
    mockPrisma.cbtAttempt.count.mockResolvedValue(11);
    mockPrisma.cbtAttempt.aggregate.mockResolvedValue({
      _avg: { scorePct: 72.4 },
      _max: { scorePct: 96 },
      _sum: { total: 130, correct: 94, durationSeconds: 7200 },
    });
    mockPrisma.cbtAttempt.findMany.mockResolvedValue([
      {
        id: "attempt_1",
        subjectId: "subject_math",
        subjectIds: ["subject_math", "subject_english"],
        classLevel: "ss2",
        practiceMode: "mixed",
        topic: null,
        term: "second",
        total: 20,
        correct: 17,
        skipped: 1,
        scorePct: 85,
        durationSeconds: 1800,
        isTimed: true,
        completedAt: new Date("2026-10-25T12:00:00Z"),
        createdAt: new Date("2026-10-25T11:30:00Z"),
      },
    ]);
    mockPrisma.cbtSubject.findMany.mockResolvedValue([
      { id: "subject_math", name: "Mathematics" },
      { id: "subject_english", name: "English" },
    ]);
  });

  it("returns only the signed-in student's completed personal sets with filtered summary and pagination", async () => {
    const response = await GET(
      new NextRequest(
        "http://localhost/api/cbt/history?page=2&classLevel=ss2&practiceMode=mixed&period=30",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.cbtAttempt.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        userId: "student_user",
        schoolId: "school_one",
        mode: "practice",
        status: "COMPLETED",
        classLevel: "ss2",
        practiceMode: "mixed",
        createdAt: { gte: expect.any(Date) },
      }),
    });
    expect(mockPrisma.cbtAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
    expect(payload.pagination).toEqual({ page: 2, pageSize: 10, total: 11, pages: 2 });
    expect(payload.summary).toEqual({
      attempts: 11,
      averageScorePct: 72,
      bestScorePct: 96,
      questions: 130,
      correct: 94,
      practiceSeconds: 7200,
    });
    expect(payload.items[0]).toMatchObject({
      id: "attempt_1",
      subjectNames: ["Mathematics", "English"],
      scorePct: 85,
      completedAt: "2026-10-25T12:00:00.000Z",
    });
    expect(JSON.stringify(payload)).not.toContain("student@example.test");
  });

  it("clamps an out-of-range page to the last available page", async () => {
    mockPrisma.cbtAttempt.count.mockResolvedValue(5);

    const response = await GET(new NextRequest("http://localhost/api/cbt/history?page=99"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockPrisma.cbtAttempt.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 }),
    );
    expect(payload.pagination).toEqual({ page: 1, pageSize: 10, total: 5, pages: 1 });
  });

  it("rejects invalid filters", async () => {
    const response = await GET(
      new NextRequest("http://localhost/api/cbt/history?classLevel=super-admin"),
    );

    expect(response.status).toBe(400);
    expect(mockPrisma.cbtAttempt.findMany).not.toHaveBeenCalled();
  });
});
