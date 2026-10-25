import { describe, expect, it } from "vitest";
import {
  buildLeaderboard,
  buildLeaderboardRankings,
  examTypesForLeaderboard,
  type LeaderboardExam,
} from "@/lib/leaderboards";

const gradedExam = (id: string, attempts: LeaderboardExam["attempts"]): LeaderboardExam => ({
  id,
  questions: [{ marks: 10 }, { marks: 10 }],
  attempts,
});

describe("leaderboard aggregation", () => {
  it("uses one best graded attempt per exam and ranks without returning scores or identities", () => {
    const result = buildLeaderboard({
      viewerStudentId: "student_b",
      eligibleStudentIds: ["student_a", "student_b", "student_c"],
      exams: [
        gradedExam("exam_1", [
          { studentProfileId: "student_a", totalScore: 18, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_a", totalScore: 16, attemptNumber: 2, submittedAt: null },
          { studentProfileId: "student_b", totalScore: 14, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_c", totalScore: 6, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "not-enrolled", totalScore: 20, attemptNumber: 1, submittedAt: null },
        ]),
        gradedExam("exam_2", [
          { studentProfileId: "student_a", totalScore: 10, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_b", totalScore: 10, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "student_c", totalScore: 10, attemptNumber: 1, submittedAt: null },
        ]),
      ],
    });

    expect(result).toMatchObject({ cohortSize: 3, myRank: 2 });
    expect(result.myStars).toBeGreaterThanOrEqual(1);
    expect(result.topStandings[0].rank).toBe(1);
    expect(JSON.stringify(result)).not.toContain("student_a");
    expect(JSON.stringify(result)).not.toContain("totalScore");
    expect(JSON.stringify(result)).not.toContain("scorePct");
  });

  it("assigns competition ranks to ties", () => {
    const result = buildLeaderboard({
      viewerStudentId: "b",
      eligibleStudentIds: ["a", "b", "c"],
      exams: [
        gradedExam("exam_1", [
          { studentProfileId: "a", totalScore: 20, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "b", totalScore: 20, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "c", totalScore: 10, attemptNumber: 1, submittedAt: null },
        ]),
      ],
    });

    expect(result.myRank).toBe(1);
    expect(result.topStandings.map((standing) => standing.rank)).toEqual([1, 3]);
  });

  it("does not invent a rank when a learner has no released graded result", () => {
    expect(
      buildLeaderboard({ exams: [], eligibleStudentIds: ["a"], viewerStudentId: "a" }),
    ).toEqual({ cohortSize: 0, myRank: null, myStars: null, topStandings: [] });
  });

  it("returns identity-linked standings only for use by authorized admin views", () => {
    const rankings = buildLeaderboardRankings({
      eligibleStudentIds: ["a", "b", "c"],
      exams: [
        gradedExam("exam_1", [
          { studentProfileId: "a", totalScore: 20, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "b", totalScore: 20, attemptNumber: 1, submittedAt: null },
          { studentProfileId: "c", totalScore: 10, attemptNumber: 1, submittedAt: null },
        ]),
      ],
    });

    expect(rankings).toEqual([
      { studentProfileId: "a", rank: 1, stars: 5 },
      { studentProfileId: "b", rank: 1, stars: 5 },
      { studentProfileId: "c", rank: 3, stars: 2 },
    ]);
    expect(JSON.stringify(rankings)).not.toContain("totalScore");
  });

  it("maps CA, exams and overall to assessed exam types only", () => {
    expect(examTypesForLeaderboard("CA")).toEqual(["CA"]);
    expect(examTypesForLeaderboard("EXAM")).toEqual(["MIDTERM", "EXAM"]);
    expect(examTypesForLeaderboard("OVERALL")).toEqual(["CA", "MIDTERM", "EXAM"]);
  });
});
