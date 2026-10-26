export const CBT_TERMS = ["first", "second", "third"] as const;
export type CbtTerm = (typeof CBT_TERMS)[number];

/** Accept common worksheet labels while rejecting unknown terms instead of guessing. */
export function normalizeCbtTerm(value: unknown): string | null {
  const raw =
    typeof value === "string"
      ? value.trim().toLowerCase().replace(/[._-]+/g, " ").replace(/\s+/g, " ")
      : value == null
        ? ""
        : String(value).trim().toLowerCase();
  if (!raw) return null;
  if (["first", "first term", "term 1", "1", "1st"].includes(raw)) return "first";
  if (["second", "second term", "term 2", "2", "2nd"].includes(raw)) return "second";
  if (["third", "third term", "term 3", "3", "3rd"].includes(raw)) return "third";
  return raw;
}
