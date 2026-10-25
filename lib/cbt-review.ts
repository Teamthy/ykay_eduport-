/**
 * Only questions with a named reviewer, date and citation may be served.
 * A legacy `published` label is not equivalent to a fact-checked question.
 */
export const REVIEWED_QUESTION_FILTER = {
  status: "reviewed",
  reviewedByUserId: { not: null },
  reviewedAt: { not: null },
  reviewReference: { not: null },
} as const;
