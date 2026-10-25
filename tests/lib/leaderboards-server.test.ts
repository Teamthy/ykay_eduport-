import { beforeEach, describe, expect, it, vi } from "vitest";
import { mockPrisma } from "../setup";
import { loadAdminLeaderboardView, loadLeaderboardView } from "@/lib/leaderboards-server";

const student = (id: string) => ({ id });

describe("tenant- and cohort-scoped leaderboard loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.schoolClass.findFirst.mockResolvedValue({
      id: "class_1",
      displayName: "SS2 A",
      level: "SS2",
    });
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      student("student_1"),
      student("student_2"),
      student("student_3"),
    ]);
    mockPrisma.term.findFirst.mockResolvedValue({
      id: "term_1",
      label: "First Term",
      session: { label: "2026/2027" },
    });
  });

  it("limits subject standings to active current-class enrolments and released graded exams", async () => {
    mockPrisma.studentSubject.findMany
      .mockResolvedValueOnce([{ subject: { id: "subject_math", name: "Mathematics" } }])
      .mockResolvedValueOnce([
        { studentProfileId: "student_1" },
        { studentProfileId: "student_2" },
      ]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: "exam_1",
        questions: [{ marks: 10 }],
        attempts: [
          { studentProfileId: "student_1", totalScore: 9, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_2", totalScore: 7, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_3", totalScore: 10, attemptNumber: 1, submittedAt: null },
        ],
      },
    ]);

    const result = await loadLeaderboardView({
      schoolId: "school_1",
      classId: "class_1",
      viewerStudentId: "student_1",
      category: "CA",
      scope: "SUBJECT",
      subjectId: "subject_math",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.myRank).toBe(1);
    expect(result.data.cohortSize).toBe(2);
    expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school_1",
          classId: "class_1",
          termId: "term_1",
          resultsReleased: true,
          OR: [
            { subjectId: "subject_math" },
            { subjectId: null, subjectName: { equals: "Mathematics", mode: "insensitive" } },
          ],
        }),
        select: expect.objectContaining({
          attempts: expect.objectContaining({
            where: expect.objectContaining({
              studentProfileId: { in: ["student_1", "student_2"] },
            }),
          }),
        }),
      }),
    );
    expect(JSON.stringify(result.data.topStandings)).not.toContain("student_1");
    expect(JSON.stringify(result.data.topStandings)).not.toContain("totalScore");
  });

  it("rejects a subject that is not enrolled by the selected student", async () => {
    mockPrisma.studentSubject.findMany.mockResolvedValueOnce([
      { subject: { id: "subject_math", name: "Mathematics" } },
    ]);

    const result = await loadLeaderboardView({
      schoolId: "school_1",
      classId: "class_1",
      viewerStudentId: "student_1",
      category: "OVERALL",
      scope: "SUBJECT",
      subjectId: "subject_biology",
    });

    expect(result).toMatchObject({ ok: false, status: 404 });
    expect(mockPrisma.exam.findMany).not.toHaveBeenCalled();
  });

  it("builds a tenant-scoped admin leaderboard with active students and released results", async () => {
    mockPrisma.schoolClass.findMany.mockResolvedValue([
      { id: "class_1", displayName: "SS2 A", level: "SS2" },
      { id: "class_other", displayName: "SS2 B", level: "SS2" },
    ]);
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      { id: "student_1", studentId: "YK-001", displayName: "Student One" },
      { id: "student_2", studentId: "YK-002", displayName: "Student Two" },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([{ id: "subject_math", name: "Mathematics" }]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: "exam_1",
        questions: [{ marks: 10 }],
        attempts: [
          { studentProfileId: "student_1", totalScore: 9, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_2", totalScore: 7, attemptNumber: 1, submittedAt: null },
        ],
      },
    ]);

    const result = await loadAdminLeaderboardView({
      schoolId: "school_1",
      category: "OVERALL",
      scope: "CLASS",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.learners).toEqual([
      { id: "student_1", studentId: "YK-001", displayName: "Student One", rank: 1, stars: 5 },
      { id: "student_2", studentId: "YK-002", displayName: "Student Two", rank: 2, stars: 2 },
    ]);
    expect(mockPrisma.schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: "school_1", isActive: true } }),
    );
    expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school_1",
          classId: "class_1",
          status: "CLOSED",
          resultsReleased: true,
          termId: "term_1",
        }),
      }),
    );
  });

  it("limits an admin subject leaderboard to enrolled learners", async () => {
    mockPrisma.schoolClass.findMany.mockResolvedValue([
      { id: "class_1", displayName: "SS2 A", level: "SS2" },
    ]);
    mockPrisma.studentProfile.findMany.mockResolvedValue([
      { id: "student_1", studentId: "YK-001", displayName: "Student One" },
      { id: "student_2", studentId: "YK-002", displayName: "Student Two" },
    ]);
    mockPrisma.subject.findMany.mockResolvedValue([{ id: "subject_math", name: "Mathematics" }]);
    mockPrisma.studentSubject.findMany.mockResolvedValue([{ studentProfileId: "student_2" }]);
    mockPrisma.exam.findMany.mockResolvedValue([
      {
        id: "exam_1",
        questions: [{ marks: 10 }],
        attempts: [
          { studentProfileId: "student_1", totalScore: 10, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_2", totalScore: 7, attemptNumber: 1, submittedAt: null },
        ],
      },
    ]);

    const result = await loadAdminLeaderboardView({
      schoolId: "school_1",
      classId: "class_1",
      category: "CA",
      scope: "SUBJECT",
      subjectId: "subject_math",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.learners).toEqual([
      { id: "student_2", studentId: "YK-002", displayName: "Student Two", rank: 1, stars: 5 },
    ]);
    expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          examType: { in: ["CA"] },
          OR: [
            { subjectId: "subject_math" },
            { subjectId: null, subjectName: { equals: "Mathematics", mode: "insensitive" } },
          ],
        }),
      }),
    );
  });

  it("uses only the current class, term and category when building class standings", async () => {
    mockPrisma.studentSubject.findMany.mockResolvedValue([]);
    mockPrisma.exam.findMany.mockResolvedValue([]);

    const result = await loadLeaderboardView({
      schoolId: "school_1",
      classId: "class_1",
      viewerStudentId: "student_1",
      category: "EXAM",
      scope: "CLASS",
    });

    expect(result.ok).toBe(true);
    expect(mockPrisma.exam.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: "school_1",
          classId: "class_1",
          termId: "term_1",
          examType: { in: ["MIDTERM", "EXAM"] },
          status: expect.any(String),
          resultsReleased: true,
        }),
      }),
    );
  });
});
