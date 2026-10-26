import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { mockPrisma } from "../setup";

const auth = vi.hoisted(() => ({
  requireCbtUser: vi.fn(),
}));

vi.mock("@/lib/cbt-auth", () => ({
  requireCbtUser: auth.requireCbtUser,
  isResponse: (value: unknown) => value instanceof Response,
}));

import { GET as getSubjects } from "@/app/api/cbt/subjects/route";
import { GET as getTopics } from "@/app/api/cbt/topics/route";
import { GET as getWeeks } from "@/app/api/cbt/weeks/route";

describe("student personal-practice catalogue endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.requireCbtUser.mockResolvedValue({
      id: "student_1",
      schoolId: "school_1",
      role: "STUDENT",
    });
    mockPrisma.cbtSubject.findMany.mockResolvedValue([
      {
        id: "subject_1",
        slug: "mathematics-ss2",
        name: "Mathematics",
        classLevel: "ss2",
        department: "science",
        _count: { questions: 12 },
      },
    ] as never);
    mockPrisma.cbtSubject.findUnique.mockResolvedValue({ id: "subject_1" } as never);
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([
      { topic: "Algebra" },
      { topic: "Geometry" },
    ] as never);
  });

  it("returns only reviewed subjects for the selected class and routes each subject to its slug", async () => {
    const response = await getSubjects(
      new NextRequest("http://localhost/api/cbt/subjects?classLevel=ss2"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subjects).toEqual([
      {
        id: "subject_1",
        slug: "mathematics-ss2",
        name: "Mathematics",
        classLevel: "ss2",
        department: "science",
        questionCount: 12,
      },
    ]);
    expect(mockPrisma.cbtSubject.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          classLevel: "ss2",
          questions: {
            some: {
              status: "reviewed",
              OR: [{ reviewedByUserId: { not: null } }, { reviewedByExternalActor: { not: null } }],
              reviewedAt: { not: null },
              reviewReference: { not: null },
            },
          },
        },
      }),
    );
  });

  it("returns only reviewed week assignments for the selected class and term", async () => {
    mockPrisma.cbtQuestion.findMany.mockResolvedValue([{ week: 2 }, { week: 5 }] as never);
    const response = await getWeeks(
      new NextRequest("http://localhost/api/cbt/weeks?classLevel=ss2&term=second"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.weeks).toEqual([2, 5]);
    expect(mockPrisma.cbtQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          term: "second",
          week: { not: null },
          subject: { is: { classLevel: "ss2" } },
        }),
        distinct: ["week"],
        orderBy: { week: "asc" },
      }),
    );
  });

  it("rejects week discovery across all terms", async () => {
    const response = await getWeeks(
      new NextRequest("http://localhost/api/cbt/weeks?classLevel=ss2&term=all"),
    );
    expect(response.status).toBe(400);
    expect(mockPrisma.cbtQuestion.findMany).not.toHaveBeenCalled();
  });

  it("loads distinct reviewed topics from the selected subject slug", async () => {
    const response = await getTopics(
      new NextRequest("http://localhost/api/cbt/topics?subject=mathematics-ss2&term=second&week=5"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.topics).toEqual(["Algebra", "Geometry"]);
    expect(mockPrisma.cbtSubject.findUnique).toHaveBeenCalledWith({
      where: { slug: "mathematics-ss2" },
      select: { id: true },
    });
    expect(mockPrisma.cbtQuestion.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          subjectId: "subject_1",
          status: "reviewed",
          OR: [{ reviewedByUserId: { not: null } }, { reviewedByExternalActor: { not: null } }],
          reviewedAt: { not: null },
          term: "second",
          week: 5,
          reviewReference: { not: null },
        },
      }),
    );
  });
});
