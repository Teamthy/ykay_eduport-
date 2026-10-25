/**
 * Pure aggregation for school leaderboards.
 *
 * Callers supply only released, graded exam results already scoped to one
 * tenant and one cohort. This module returns positions and star tiers only —
 * student identities and raw marks/percentages never leave the server.
 */
export type LeaderboardCategory = "CA" | "EXAM" | "OVERALL";
export type LeaderboardScope = "CLASS" | "SUBJECT";

export type LeaderboardAttempt = {
  studentProfileId: string;
  totalScore: number;
  attemptNumber: number;
  submittedAt: Date | null;
};

export type LeaderboardExam = {
  id: string;
  questions: Array<{ marks: number }>;
  attempts: LeaderboardAttempt[];
};

export type Standing = { rank: number; stars: number };

export type LeaderboardResult = {
  cohortSize: number;
  myRank: number | null;
  myStars: number | null;
  topStandings: Standing[];
};

export function examTypesForLeaderboard(category: LeaderboardCategory): string[] {
  if (category === "CA") return ["CA"];
  if (category === "EXAM") return ["MIDTERM", "EXAM"];
  return ["CA", "MIDTERM", "EXAM"];
}

function isBetterAttempt(candidate: LeaderboardAttempt, current: LeaderboardAttempt): boolean {
  if (candidate.totalScore !== current.totalScore) {
    return candidate.totalScore > current.totalScore;
  }
  if (candidate.attemptNumber !== current.attemptNumber) {
    return candidate.attemptNumber > current.attemptNumber;
  }
  return (candidate.submittedAt?.getTime() ?? 0) > (current.submittedAt?.getTime() ?? 0);
}

function starsForRank(rank: number, cohortSize: number): number {
  if (cohortSize <= 1 || rank <= Math.ceil(cohortSize * 0.1)) return 5;
  if (rank <= Math.ceil(cohortSize * 0.25)) return 4;
  if (rank <= Math.ceil(cohortSize * 0.5)) return 3;
  if (rank <= Math.ceil(cohortSize * 0.75)) return 2;
  return 1;
}

/**
 * Rank students by their weighted mean across released assessments. A student's
 * best graded attempt counts once per exam, so retakes cannot inflate the
 * number of observations. Ties receive competition ranks (1, 1, 3).
 */
export function buildLeaderboard(params: {
  exams: LeaderboardExam[];
  eligibleStudentIds: string[];
  viewerStudentId: string;
  topLimit?: number;
}): LeaderboardResult {
  const eligible = new Set(params.eligibleStudentIds);
  const totals = new Map<string, { score: number; possible: number }>();

  for (const exam of params.exams) {
    const totalMarks = exam.questions.reduce((sum, question) => sum + question.marks, 0);
    if (totalMarks <= 0) continue;

    const bestByStudent = new Map<string, LeaderboardAttempt>();
    for (const attempt of exam.attempts) {
      if (!eligible.has(attempt.studentProfileId)) continue;
      if (attempt.totalScore < 0 || attempt.totalScore > totalMarks) continue;
      const current = bestByStudent.get(attempt.studentProfileId);
      if (!current || isBetterAttempt(attempt, current)) {
        bestByStudent.set(attempt.studentProfileId, attempt);
      }
    }

    for (const [studentId, attempt] of bestByStudent) {
      const aggregate = totals.get(studentId) ?? { score: 0, possible: 0 };
      aggregate.score += attempt.totalScore;
      aggregate.possible += totalMarks;
      totals.set(studentId, aggregate);
    }
  }

  const rows = [...totals.entries()]
    .filter(([, total]) => total.possible > 0)
    .map(([studentId, total]) => ({ studentId, ...total }))
    .sort((left, right) => {
      const delta = left.score * right.possible - right.score * left.possible;
      return delta === 0 ? left.studentId.localeCompare(right.studentId) : delta > 0 ? -1 : 1;
    });

  const ranks = new Map<string, Standing>();
  let previous: (typeof rows)[number] | null = null;
  let previousRank = 0;
  rows.forEach((row, index) => {
    const tied =
      previous !== null && row.score * previous.possible === previous.score * row.possible;
    const rank = tied ? previousRank : index + 1;
    ranks.set(row.studentId, { rank, stars: starsForRank(rank, rows.length) });
    previous = row;
    previousRank = rank;
  });

  const myStanding = ranks.get(params.viewerStudentId) ?? null;
  const topLimit = Math.max(1, Math.min(params.topLimit ?? 10, 25));
  const topStandings: Standing[] = [];
  const seenRanks = new Set<number>();
  for (const row of rows) {
    const standing = ranks.get(row.studentId);
    if (!standing || seenRanks.has(standing.rank)) continue;
    seenRanks.add(standing.rank);
    topStandings.push(standing);
    if (topStandings.length >= topLimit) break;
  }

  return {
    cohortSize: rows.length,
    myRank: myStanding?.rank ?? null,
    myStars: myStanding?.stars ?? null,
    topStandings,
  };
}
