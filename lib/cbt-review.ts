/**
 * Question-bank review rules.
 *
 * Two entry points attest a batch of questions — the admin console
 * (`POST /api/admin/cbt/questions/bulk-review`) and the staging seed workflow
 * (`npm run cbt:seed:10k:staging` with attestation). They must apply exactly
 * the same structural gate, so the rules live here rather than in the route.
 */

/** Only questions with a recorded in-app or external reviewer, date and citation may be served. */
export const REVIEWED_QUESTION_FILTER = {
  status: "reviewed",
  OR: [{ reviewedByUserId: { not: null } }, { reviewedByExternalActor: { not: null } }],
  reviewedAt: { not: null },
  reviewReference: { not: null },
} as const;

/** Explanations that say nothing about why the answer is right. */
export const GENERIC_PHRASES = [
  "this sits in the nerdc scheme",
  "common distractor",
  "mixes a related but different idea",
  "not the required relationship",
  "does not satisfy the stem",
] as const;

export type ReviewableRow = {
  id: string;
  stem: string;
  topic: string;
  explanation: string;
  options: unknown;
};

export function optionsOf(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()) : [];
}

/**
 * The minimum a question must satisfy before a human attestation can apply.
 * Returns null when the row passes.
 */
export function structuralRejectionReason(row: ReviewableRow): string | null {
  const options = optionsOf(row.options);
  if (options.length !== 4 || options.some((option) => !option)) return "options incomplete";
  if (new Set(options.map((option) => option.toLowerCase())).size !== 4) return "duplicate options";
  if (row.topic.trim().length < 2) return "topic missing";
  if (row.stem.trim().length < 5) return "stem too short";
  if (row.explanation.trim().length < 40) return "explanation too short";
  const explanation = row.explanation.toLowerCase();
  if (GENERIC_PHRASES.some((phrase) => explanation.includes(phrase))) return "generic explanation";
  return null;
}
