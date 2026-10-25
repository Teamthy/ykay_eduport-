import { UserRole } from "@prisma/client";
import Papa from "papaparse";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assertNotImpersonating, requireRoleOr503 } from "@/lib/session";
import { cbtQuestionDraftSchema, haveDistinctOptions } from "@/lib/cbt-question-validation";

export const dynamic = "force-dynamic";

const MAX_IMPORT_ROWS_PER_REQUEST = 250;
const MAX_REPORTED_ERRORS = 40;

type ImportRow = Record<string, unknown>;

function parseCsv(csv: string): { rows?: ImportRow[]; error?: string } {
  const result = Papa.parse<ImportRow>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });
  if (result.errors.length) {
    return { error: `CSV parsing failed near row ${result.errors[0]?.row ?? "?"}.` };
  }
  if (!result.meta.fields?.length) return { error: "CSV needs a header row." };
  return { rows: result.data };
}

function asImportRow(value: unknown, index: number) {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const classLevel = String(row.classLevel ?? "")
    .trim()
    .toLowerCase();
  const normalized = {
    subjectSlug: String(row.subjectSlug ?? "")
      .trim()
      .toLowerCase(),
    subjectName: String(row.subjectName ?? "").trim(),
    classLevel,
    department: String(row.department ?? "general").trim() || "general",
    topic: String(row.topic ?? "").trim(),
    difficulty: row.difficulty ?? 2,
    stem: String(row.stem ?? "").trim(),
    options: [row.optionA, row.optionB, row.optionC, row.optionD].map((option) =>
      String(option ?? "").trim(),
    ),
    correctIndex: row.correctIndex,
    explanation: String(row.explanation ?? "").trim(),
    source: String(row.source ?? "original-draft").trim() || "original-draft",
  };
  return { index, parsed: cbtQuestionDraftSchema.safeParse(normalized), normalized };
}

/**
 * Import candidate questions in bounded batches. Every imported item remains
 * draft until an authorized reviewer records a source citation and approval.
 * The `rows` form is intended for the admin console's chunked 10k CSV upload;
 * `csv` remains supported for small/manual callers.
 */
export async function POST(request: NextRequest) {
  const auth = await requireRoleOr503([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  if (auth instanceof NextResponse) return auth;
  const impersonationBlock = assertNotImpersonating(auth);
  if (impersonationBlock) return impersonationBlock;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Provide a CSV string or a rows array." }, { status: 400 });
  }

  let rows: ImportRow[];
  if ("rows" in body && Array.isArray(body.rows)) {
    rows = body.rows as ImportRow[];
  } else if ("csv" in body && typeof body.csv === "string") {
    const parsedCsv = parseCsv(body.csv);
    if (!parsedCsv.rows) {
      return NextResponse.json({ error: parsedCsv.error }, { status: 400 });
    }
    rows = parsedCsv.rows;
  } else {
    return NextResponse.json({ error: "Provide a CSV string or a rows array." }, { status: 400 });
  }

  if (!rows.length)
    return NextResponse.json({ error: "There are no question rows to import." }, { status: 400 });
  if (rows.length > MAX_IMPORT_ROWS_PER_REQUEST) {
    return NextResponse.json(
      {
        error: `Import at most ${MAX_IMPORT_ROWS_PER_REQUEST} rows per request; upload in batches.`,
      },
      { status: 413 },
    );
  }

  let skipped = 0;
  const errors: string[] = [];
  const validRows: Array<{ index: number; data: z.infer<typeof cbtQuestionDraftSchema> }> = [];

  rows.forEach((row, index) => {
    const normalized = asImportRow(row, index);
    if (!normalized.parsed.success) {
      skipped += 1;
      if (errors.length < MAX_REPORTED_ERRORS) {
        errors.push(
          `Row ${index + 1}: invalid or missing subject, class, content, options, answer or explanation.`,
        );
      }
      return;
    }
    if (!haveDistinctOptions(normalized.parsed.data.options)) {
      skipped += 1;
      if (errors.length < MAX_REPORTED_ERRORS)
        errors.push(`Row ${index + 1}: options must be distinct.`);
      return;
    }
    validRows.push({ index, data: normalized.parsed.data });
  });

  let imported = 0;
  const bySubject = new Map<string, typeof validRows>();
  for (const row of validRows) {
    const group = bySubject.get(row.data.subjectSlug) ?? [];
    group.push(row);
    bySubject.set(row.data.subjectSlug, group);
  }

  try {
    for (const [slug, group] of bySubject) {
      const first = group[0]!.data;
      const subject = await prisma.cbtSubject.upsert({
        where: { slug },
        create: {
          slug,
          name: first.subjectName,
          classLevel: first.classLevel,
          department: first.department || "general",
        },
        update: {},
        select: { id: true, classLevel: true },
      });
      if (subject.classLevel !== first.classLevel) {
        skipped += group.length;
        if (errors.length < MAX_REPORTED_ERRORS) {
          errors.push(`Subject ${slug} already belongs to a different class level.`);
        }
        continue;
      }

      const candidateByStem = new Map<string, (typeof group)[number]>();
      for (const row of group) {
        if (candidateByStem.has(row.data.stem)) {
          skipped += 1;
          if (errors.length < MAX_REPORTED_ERRORS)
            errors.push(`Row ${row.index + 1}: duplicate stem in upload.`);
        } else {
          candidateByStem.set(row.data.stem, row);
        }
      }
      const candidates = [...candidateByStem.values()];
      const existing = candidates.length
        ? await prisma.cbtQuestion.findMany({
            where: {
              subjectId: subject.id,
              stem: { in: candidates.map((row) => row.data.stem) },
            },
            select: { stem: true },
          })
        : [];
      const existingStems = new Set(existing.map((question: { stem: string }) => question.stem));
      const toCreate = candidates.filter((row) => !existingStems.has(row.data.stem));
      skipped += candidates.length - toCreate.length;
      if (toCreate.length) {
        const created = await prisma.cbtQuestion.createMany({
          data: toCreate.map(({ data }) => ({
            subjectId: subject.id,
            topic: data.topic,
            difficulty: data.difficulty,
            stem: data.stem,
            options: data.options,
            correctIndex: data.correctIndex,
            explanation: data.explanation,
            source: data.source,
            status: "draft",
            reviewedByUserId: null,
            reviewedAt: null,
            reviewReference: null,
            reviewNotes: null,
          })),
        });
        imported += created.count;
      }
    }
    return NextResponse.json({ imported, skipped, errors });
  } catch {
    return NextResponse.json(
      { error: "The question import service is temporarily unavailable. Please retry this batch." },
      { status: 503 },
    );
  }
}
