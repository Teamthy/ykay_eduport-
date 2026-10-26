import type { BankRow } from "@/lib/cbt-bank-import";

export type PersistedBankQuestion = {
  topic: string;
  difficulty: number;
  stem: string;
  options: unknown;
  correctIndex: number;
  explanation: string;
  source: string;
};

/**
 * Require every persisted question field to match the reviewed source row before
 * the seed workflow can attach a reviewer attestation to it.
 */
export function matchesBankQuestion(persisted: PersistedBankQuestion, expected: BankRow): boolean {
  if (
    persisted.topic !== expected.topic ||
    persisted.difficulty !== expected.difficulty ||
    persisted.stem !== expected.stem ||
    persisted.correctIndex !== expected.correctIndex ||
    persisted.explanation !== expected.explanation ||
    persisted.source !== expected.source ||
    !Array.isArray(persisted.options)
  ) {
    return false;
  }

  return (
    persisted.options.length === expected.options.length &&
    persisted.options.every(
      (option, index) => typeof option === "string" && option === expected.options[index],
    )
  );
}
