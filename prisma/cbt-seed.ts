/**
 * CBT seed — the shared question bank.
 *
 * Imports question candidates as DRAFT content. The CSV is not factually
 * verified, so nothing here may mark a question reviewed: an authorized
 * reviewer must attest each item (see /admin/cbt-bank) before students see it.
 *
 * Usage:
 *   npm run cbt:seed                    # prisma/cbt-bank.csv, non-staging target
 *   npm run cbt:seed:10k                # the 10,000-row candidate bank
 *   CBT_SEED_TARGET=staging npm run cbt:seed:10k
 *
 * Staging runs require the same host guard as the demo seed:
 *   STAGING_DATABASE_HOST, PRODUCTION_DATABASE_STATUS,
 *   PRODUCTION_DATABASE_HOST (when Production exists)
 *
 * The target hostname is printed before writing; credentials never are.
 * Safe to re-run: subjects are upserted by slug and existing stems are skipped.
 * CBT_RESET=1 deletes CBT attempts, questions and subjects — only accepted along
 * with an explicit CBT_RESET_CONFIRMATION of "DELETE CBT ATTEMPTS AND QUESTIONS".
 */
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chunk, planBankCsv } from "../lib/cbt-bank-import";
import { validateStagingDemoTarget } from "./staging-demo-target";

const __dirname = dirname(fileURLToPath(import.meta.url));
const prisma = new PrismaClient();

const BANK_FILE = process.env.CBT_BANK_FILE?.trim() || "cbt-bank.csv";
const STEM_LOOKUP_CHUNK = 500;
const INSERT_CHUNK = 500;

function describeTarget(databaseUrl: string | undefined) {
  if (!databaseUrl) return "unset";
  try {
    const url = new URL(databaseUrl);
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "unparseable DATABASE_URL";
  }
}

function assertTargetIsSafe() {
  const target = process.env.CBT_SEED_TARGET?.trim().toLowerCase();
  if (!target) {
    console.warn(
      "CBT_SEED_TARGET is not set. This run will write to whatever DATABASE_URL points at:\n" +
        `  ${describeTarget(process.env.DATABASE_URL)}\n` +
        "Set CBT_SEED_TARGET=staging to require the staging host guard.",
    );
    return;
  }
  if (target !== "staging") {
    throw new Error("CBT_SEED_TARGET may only be 'staging'; production seeds are not supported.");
  }
  const host = validateStagingDemoTarget({
    databaseUrl: process.env.DATABASE_URL,
    stagingDatabaseHost: process.env.STAGING_DATABASE_HOST,
    productionDatabaseStatus: process.env.PRODUCTION_DATABASE_STATUS,
    productionDatabaseHost: process.env.PRODUCTION_DATABASE_HOST,
  });
  console.log(`Target verified as the staging branch: ${host}`);
}

async function main() {
  assertTargetIsSafe();

  const path = join(__dirname, BANK_FILE);
  const csv = await readFile(path, "utf8");
  const plan = planBankCsv(csv);

  console.log(
    `cbt:seed — ${BANK_FILE}: ${plan.totalRows} rows read, ` +
      `${plan.subjects.reduce((sum, group) => sum + group.rows.length, 0)} valid, ` +
      `${plan.rejected.length} rejected`,
  );
  for (const rejection of plan.rejected.slice(0, 20)) {
    console.warn(`  line ${rejection.line}: ${rejection.reason}`);
  }
  if (!plan.subjects.length) {
    throw new Error("No importable rows. Nothing was written.");
  }
  if (plan.rejected.length) {
    console.warn("Rejected rows are skipped; fix the source file and re-run to fill the gaps.");
  }

  if (process.env.CBT_RESET === "1") {
    if (process.env.CBT_RESET_CONFIRMATION !== "DELETE CBT ATTEMPTS AND QUESTIONS") {
      throw new Error(
        'CBT_RESET=1 also needs CBT_RESET_CONFIRMATION="DELETE CBT ATTEMPTS AND QUESTIONS".',
      );
    }
    console.log("CBT_RESET=1 — wiping existing CBT attempts, questions and subjects");
    await prisma.cbtPracticeAnswer.deleteMany();
    await prisma.cbtAttempt.deleteMany();
    await prisma.cbtQuestion.deleteMany();
    await prisma.cbtSubject.deleteMany();
  }

  let inserted = 0;
  let skipped = 0;

  for (const group of plan.subjects) {
    const subject = await prisma.cbtSubject.upsert({
      where: { slug: group.slug },
      create: {
        slug: group.slug,
        name: group.name,
        classLevel: group.classLevel,
        department: group.department,
      },
      update: { name: group.name, department: group.department },
      select: { id: true, classLevel: true },
    });

    if (subject.classLevel !== group.classLevel) {
      skipped += group.rows.length;
      console.warn(
        `  ${group.slug}: skipped ${group.rows.length} rows — subject already belongs to ${subject.classLevel}`,
      );
      continue;
    }

    const existingStems = new Set<string>();
    for (const stems of chunk(
      group.rows.map((row) => row.data.stem),
      STEM_LOOKUP_CHUNK,
    )) {
      const found = await prisma.cbtQuestion.findMany({
        where: { subjectId: subject.id, stem: { in: stems } },
        select: { stem: true },
      });
      for (const question of found) existingStems.add(question.stem);
    }

    const fresh = group.rows.filter((row) => !existingStems.has(row.data.stem));
    skipped += group.rows.length - fresh.length;

    // createMany in bounded batches keeps a 10k import inside the statement timeout.
    for (const batch of chunk(fresh, INSERT_CHUNK)) {
      const created = await prisma.cbtQuestion.createMany({
        data: batch.map(({ data }) => ({
          subjectId: subject.id,
          topic: data.topic,
          difficulty: data.difficulty,
          stem: data.stem,
          options: data.options,
          correctIndex: data.correctIndex,
          explanation: data.explanation,
          source: data.source,
          // Imports are never reviewed by a seed job.
          status: "draft",
          reviewedByUserId: null,
          reviewedAt: null,
          reviewReference: null,
          reviewNotes: null,
        })),
      });
      inserted += created.count;
    }

    const total = await prisma.cbtQuestion.count({ where: { subjectId: subject.id } });
    console.log(
      `  ${group.slug.padEnd(24)} ${String(fresh.length).padStart(4)} new · bank now ${total}`,
    );
  }

  const drafts = await prisma.cbtQuestion.count({ where: { status: "draft" } });
  const reviewed = await prisma.cbtQuestion.count({ where: { status: "reviewed" } });
  console.log(
    `done — ${inserted} inserted, ${skipped} skipped. Bank: ${drafts} draft, ${reviewed} reviewed.`,
  );
  if (!reviewed) {
    console.log(
      "No questions are reviewed yet, so student practice stays empty until a reviewer " +
        "attests items at /admin/cbt-bank.",
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
