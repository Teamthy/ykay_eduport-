/**
 * CBT seed — the shared question bank.
 *
 * Imports questions as DRAFT content. The bank may be factually reviewed, but
 * student visibility still requires an explicit, attributable attestation by an
 * authorized reviewer (see /admin/cbt-bank). This workflow only attests exact
 * question records represented in the input file.
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
 *
 * ATTESTATION (optional, explicit):
 *   CBT_ATTEST_EMAIL=<reviewer account email>
 *   CBT_ATTEST_REFERENCE=<citation for the source the bank was checked against>
 *   CBT_ATTEST_CONFIRMATION="ATTEST BANK VERIFIED"
 *
 * With all three set, every draft question in the subjects this file touches is
 * attested in the name of that account: reviewedByUserId, reviewedAt and
 * reviewReference are recorded, exactly as the admin console does, and the
 * structural gate from lib/cbt-review.ts is applied first — a malformed row is
 * left in draft and reported. Without all three, the import stays draft-only.
 * CBT_RESET=1 deletes CBT attempts, questions and subjects — only accepted along
 * with an explicit CBT_RESET_CONFIRMATION of "DELETE CBT ATTEMPTS AND QUESTIONS".
 */
import { PrismaClient } from "@prisma/client";
import { readFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { chunk, planBankCsv, type BankRow } from "../lib/cbt-bank-import";
import { structuralRejectionReason } from "../lib/cbt-review";
import { matchesBankQuestion } from "../lib/cbt-seed-attestation";
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

const ATTEST_CONFIRMATION = "ATTEST BANK VERIFIED";
const ATTEST_ROLES = new Set(["SUPER_ADMIN", "ADMIN", "DIRECTOR", "HOD"]);

/**
 * Attest imported drafts in the name of a real reviewer account.
 *
 * This is the workflow equivalent of selecting rows in /admin/cbt-bank and
 * pressing "approve": it records who checked the bank, when, and against which
 * source. It refuses to run without all three env vars, refuses a reviewer
 * account that is missing, inactive or not an academic reviewer. Only rows
 * whose persisted content exactly matches the source file can be attested;
 * mismatched, missing or structurally invalid rows are left out.
 */
type AttestationTarget = { subjectId: string; rows: BankRow[] };

async function attestBank(targets: AttestationTarget[]) {
  const email = process.env.CBT_ATTEST_EMAIL?.trim().toLowerCase();
  const reference = process.env.CBT_ATTEST_REFERENCE?.trim();
  const confirmation = process.env.CBT_ATTEST_CONFIRMATION?.trim();

  if (!email && !reference && !confirmation) return;

  if (!email || !reference || !confirmation) {
    throw new Error(
      "Attestation needs CBT_ATTEST_EMAIL, CBT_ATTEST_REFERENCE and CBT_ATTEST_CONFIRMATION together. Nothing was attested.",
    );
  }
  if (confirmation !== ATTEST_CONFIRMATION) {
    throw new Error(`CBT_ATTEST_CONFIRMATION must be exactly "${ATTEST_CONFIRMATION}".`);
  }
  if (reference.length < 10) {
    throw new Error("CBT_ATTEST_REFERENCE must name the source in at least 10 characters.");
  }

  const reviewer = await prisma.user.findFirst({
    where: { email },
    select: { id: true, email: true, role: true, isActive: true, schoolId: true },
  });
  if (!reviewer) {
    throw new Error(
      "CBT_ATTEST_EMAIL must match a reviewer account in the selected Staging database. No questions were attested.",
    );
  }
  if (!reviewer.isActive) throw new Error("The attestation account is deactivated.");
  if (!ATTEST_ROLES.has(String(reviewer.role))) {
    throw new Error(
      `The attestation account must hold one of ${[...ATTEST_ROLES].join(", ")}; it holds ${reviewer.role}.`,
    );
  }

  const reviewedAt = new Date();
  let attested = 0;
  let blocked = 0;
  const blockedSamples: string[] = [];

  for (const target of targets) {
    for (const expectedRows of chunk(target.rows, 500)) {
      const expectedByStem = new Map(expectedRows.map((row) => [row.stem, row]));
      const persistedRows = await prisma.cbtQuestion.findMany({
        where: { subjectId: target.subjectId, stem: { in: [...expectedByStem.keys()] } },
        select: {
          id: true,
          stem: true,
          topic: true,
          difficulty: true,
          options: true,
          correctIndex: true,
          explanation: true,
          source: true,
          status: true,
        },
      });
      const foundStems = new Set<string>();
      const allowed: string[] = [];

      for (const row of persistedRows) {
        const expected = expectedByStem.get(row.stem);
        if (!expected) continue;
        foundStems.add(row.stem);
        if (row.status !== "draft") continue;

        if (!matchesBankQuestion(row, expected)) {
          blocked += 1;
          if (blockedSamples.length < 10) {
            blockedSamples.push(`${row.id}: stored question differs from the reviewed bank file`);
          }
          continue;
        }

        const reason = structuralRejectionReason(row);
        if (reason) {
          blocked += 1;
          if (blockedSamples.length < 10) blockedSamples.push(`${row.id}: ${reason}`);
        } else {
          allowed.push(row.id);
        }
      }

      for (const expected of expectedRows) {
        if (!foundStems.has(expected.stem)) {
          blocked += 1;
          if (blockedSamples.length < 10) {
            blockedSamples.push(
              `${expected.stem.slice(0, 80)}: matching stored question not found`,
            );
          }
        }
      }

      if (allowed.length) {
        const result = await prisma.cbtQuestion.updateMany({
          where: { id: { in: allowed }, status: "draft" },
          data: {
            status: "reviewed",
            reviewedByUserId: reviewer.id,
            reviewedAt,
            reviewReference: reference,
            reviewNotes: `Attested against ${BANK_FILE}.`,
          },
        });
        attested += result.count;
      }
    }
  }

  await prisma.auditLog.create({
    data: {
      schoolId: reviewer.schoolId,
      actorUserId: reviewer.id,
      action: "CBT_BANK_ATTESTED_BY_SEED",
      entityType: "CbtQuestion",
      metadata: {
        bankFile: BANK_FILE,
        reference,
        attested,
        notAttested: blocked,
        sample: blockedSamples,
      },
    },
  });

  console.log(
    `attested ${attested} question(s) as ${reviewer.email} against "${reference}"` +
      (blocked ? `; ${blocked} source row(s) not attested (see warnings)` : ""),
  );
  for (const sample of blockedSamples) console.warn(`  not attested — ${sample}`);
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

  const seededSubjects: Array<{ id: string; slug: string; classLevel: string }> =
    await prisma.cbtSubject.findMany({
      where: { slug: { in: plan.subjects.map((group) => group.slug) } },
      select: { id: true, slug: true, classLevel: true },
    });
  const subjectsBySlug = new Map(seededSubjects.map((subject) => [subject.slug, subject]));
  const attestationTargets = plan.subjects.map((group) => {
    const subject = subjectsBySlug.get(group.slug);
    if (!subject)
      throw new Error(`Could not resolve imported subject ${group.slug} for attestation.`);
    if (subject.classLevel !== group.classLevel) {
      throw new Error(
        `Cannot attest ${group.slug}: the stored subject is ${subject.classLevel}, but the bank file says ${group.classLevel}.`,
      );
    }
    return { subjectId: subject.id, rows: group.rows.map(({ data }) => data) };
  });
  await attestBank(attestationTargets);

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
