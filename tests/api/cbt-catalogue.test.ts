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
              reviewedByUserId: { not: null },
              reviewedAt: { not: null },
              reviewReference: { not: null },
            },
          },
        },
      }),
    );
  });

  it("loads distinct reviewed topics from the selected subject slug", async () => {
    const response = await getTopics(
      new NextRequest("http://localhost/api/cbt/topics?subject=mathematics-ss2"),
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
          reviewedByUserId: { not: null },
          reviewedAt: { not: null },
          reviewReference: { not: null },
        },
      }),
    );
  });
});
