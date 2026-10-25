/**
 * CBT bank preflight — no database, no writes.
 *
 *   npx tsx scripts/cbt-bank-preflight.ts            # prisma/cbt-bank-10k-draft.csv
 *   CBT_BANK_FILE=cbt-bank.csv npx tsx scripts/cbt-bank-preflight.ts
 *
 * Runs the exact parser the seed uses and reports what a seed run would do:
 * rows read, rows accepted, rows rejected with reasons, and the subjects the
 * bank spans. Exits 1 when any row is rejected, so the staging seed workflow
 * fails on a broken source file before it ever touches a database.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { planBankCsv } from "../lib/cbt-bank-import";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BANK_FILE = process.env.CBT_BANK_FILE?.trim() || "cbt-bank-10k-draft.csv";
const BANK_DIR = join(__dirname, "..", "prisma");

async function main() {
  const csv = await readFile(join(BANK_DIR, BANK_FILE), "utf8");
  const plan = planBankCsv(csv);
  const accepted = plan.subjects.reduce((sum, group) => sum + group.rows.length, 0);

  console.log(`bank file      ${BANK_FILE}`);
  console.log(`rows read      ${plan.totalRows}`);
  console.log(`accepted       ${accepted}`);
  console.log(`rejected       ${plan.rejected.length}`);
  console.log(`subjects       ${plan.subjects.length}`);

  for (const rejection of plan.rejected.slice(0, 50)) {
    console.warn(`  line ${rejection.line}: ${rejection.reason}`);
  }
  if (plan.rejected.length > 50) {
    console.warn(`  … and ${plan.rejected.length - 50} more rejected row(s)`);
  }

  const byLevel = new Map<string, number>();
  for (const group of plan.subjects) {
    byLevel.set(group.classLevel, (byLevel.get(group.classLevel) ?? 0) + group.rows.length);
  }
  for (const [level, count] of [...byLevel].sort()) {
    console.log(`  ${level.padEnd(12)} ${count}`);
  }

  if (plan.rejected.length) {
    throw new Error(
      `${plan.rejected.length} row(s) would be skipped. Fix ${BANK_FILE} and re-run.`,
    );
  }
  if (!accepted) throw new Error("No importable rows — nothing would be seeded.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
