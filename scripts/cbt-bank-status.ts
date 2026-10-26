/**
 * Read-only status of the CBT question bank.
 *
 * "The questions are not showing" has exactly three possible causes, and this
 * distinguishes them without opening the admin console or guessing:
 *
 *   EMPTY      no rows at all  -> the bank was never seeded into this database
 *   UNREVIEWED rows exist but none are reviewed -> students cannot see them;
 *              practise draws only from reviewed questions
 *   READY      reviewed rows exist -> a student gap is a filter problem
 *
 * Writes nothing. Safe to run against any configured database, including
 * Production, where it only reads counts.
 *
 *   npm run cbt:bank:status
 */
import { PrismaClient } from "@prisma/client";
import { REVIEWED_QUESTION_FILTER } from "../lib/cbt-review";

const prisma = new PrismaClient();

async function main() {
  const [total, draft, reviewed, archived] = await Promise.all([
    prisma.cbtQuestion.count(),
    prisma.cbtQuestion.count({ where: { status: "draft" } }),
    prisma.cbtQuestion.count({ where: { status: "reviewed" } }),
    prisma.cbtQuestion.count({ where: { status: "archived" } }),
  ]);

  const subjects = await prisma.cbtSubject.findMany({
    select: {
      name: true,
      classLevel: true,
      _count: { select: { questions: { where: REVIEWED_QUESTION_FILTER } } },
    },
    orderBy: [{ classLevel: "asc" }, { name: "asc" }],
  });

  console.log("");
  console.log("CBT question bank");
  console.log("─────────────────");
  console.log(`  total     ${total.toLocaleString()}`);
  console.log(`  draft     ${draft.toLocaleString()}`);
  console.log(`  reviewed  ${reviewed.toLocaleString()}   (the only rows students can practise)`);
  console.log(`  archived  ${archived.toLocaleString()}`);

  const byLevel = new Map<string, { subjects: number; reviewed: number }>();
  for (const subject of subjects) {
    const entry = byLevel.get(subject.classLevel) ?? { subjects: 0, reviewed: 0 };
    entry.subjects += 1;
    entry.reviewed += subject._count.questions;
    byLevel.set(subject.classLevel, entry);
  }

  console.log("");
  console.log("  class    subjects with reviewed questions / subjects");
  for (const [level, entry] of byLevel) {
    console.log(
      `  ${level.padEnd(8)} ${String(entry.reviewed > 0 ? "yes" : "no").padEnd(8)} ${entry.subjects} subject(s) defined`,
    );
  }

  console.log("");
  if (total === 0) {
    console.log("VERDICT: EMPTY — this database has no CBT questions at all.");
    console.log("         Seed them (Staging only):  npm run cbt:seed:10k:staging");
    process.exitCode = 2;
  } else if (reviewed === 0) {
    console.log(`VERDICT: UNREVIEWED — ${draft.toLocaleString()} draft row(s), 0 reviewed.`);
    console.log("         Practice draws only from reviewed questions, so students see none.");
    console.log("         Approve them in /admin/cbt-bank, or run the seed-and-attest workflow.");
    process.exitCode = 1;
  } else {
    const ready = [...byLevel.entries()].filter(([, entry]) => entry.reviewed > 0);
    console.log(
      `VERDICT: READY — ${reviewed.toLocaleString()} reviewed question(s) across ${ready.length} class level(s).`,
    );
  }
}

main()
  .catch((error) => {
    console.error(`Could not read the CBT bank: ${error instanceof Error ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
