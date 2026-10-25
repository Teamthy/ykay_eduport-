import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/parent/leaderboards/route";
import { getParentReportCardContext } from "@/lib/report-cards";
import { loadLeaderboardView } from "@/lib/leaderboards-server";
import { mockPrisma } from "../setup";

const parentContext = {
  user: { id: "parent_user", schoolId: "school_a", role: "PARENT" },
  parentProfile: {
    id: "parent_a",
    displayName: "Parent One",
    studentLinks: [
      {
        isPrimary: true,
        relationship: "Mother",
        studentProfile: {
          id: "student_a",
          studentId: "YK-001",
          displayName: "Student One",
          currentClass: { displayName: "SS2 A" },
        },
      },
    ],
  },
};

vi.mock("@/lib/report-cards", () => ({ getParentReportCardContext: vi.fn() }));
vi.mock("@/lib/leaderboards-server", () => ({ loadLeaderboardView: vi.fn() }));

function request(query = "") {
  return new NextRequest(`http://localhost/api/parent/leaderboards${query}`);
}

describe("parent leaderboard ward scoping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getParentReportCardContext).mockResolvedValue(parentContext as never);
    mockPrisma.studentProfile.findFirst.mockResolvedValue({
      id: "student_a",
      currentClassId: "class_a",
    });
    vi.mocked(loadLeaderboardView).mockResolvedValue({
      ok: true,
      data: {
        cohortSize: 18,
        myRank: 3,
        myStars: 4,
        topStandings: [
          { rank: 1, stars: 5 },
          { rank: 2, stars: 4 },
          { rank: 3, stars: 4 },
        ],
        category: "CA",
        scope: "SUBJECT",
        classroom: { id: "class_a", displayName: "SS2 A", level: "SS2" },
        periodLabel: "2026 · First Term",
        subjectOptions: [{ id: "subject_a", name: "Mathematics" }],
        selectedSubject: { id: "subject_a", name: "Mathematics" },
      },
    } as never);
  });

  it("returns only the selected linked ward's rank and anonymous stars", async () => {
    const response = await GET(
      request("?studentId=student_a&category=CA&scope=SUBJECT&subjectId=subject_a"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(loadLeaderboardView).toHaveBeenCalledWith({
      schoolId: "school_a",
      classId: "class_a",
      viewerStudentId: "student_a",
      category: "CA",
      scope: "SUBJECT",
      subjectId: "subject_a",
    });
    expect(body.leaderboard.myRank).toBe(3);
    expect(body.leaderboard.myStars).toBe(4);
    expect(JSON.stringify(body)).not.toContain("totalScore");
    expect(JSON.stringify(body)).not.toContain("percentage");
  });

  it("rejects a student ID that is not linked to this parent", async () => {
    const response = await GET(request("?studentId=student_other"));

    expect(response.status).toBe(404);
    expect(loadLeaderboardView).not.toHaveBeenCalled();
    expect(mockPrisma.studentProfile.findFirst).not.toHaveBeenCalled();
  });

  it("returns no ward data for an account without an active parent profile", async () => {
    vi.mocked(getParentReportCardContext).mockResolvedValue(null);

    const response = await GET(request());

    expect(response.status).toBe(404);
    expect(loadLeaderboardView).not.toHaveBeenCalled();
  });
});
