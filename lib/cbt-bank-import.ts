import Papa from "papaparse";
import { z } from "zod";
import { cbtQuestionDraftSchema, haveDistinctOptions } from "@/lib/cbt-question-validation";

export type BankRow = z.infer<typeof cbtQuestionDraftSchema>;

export type RejectedBankRow = { line: number; reason: string };

export type PlannedBank = {
  /** Subject slug -> subject metadata plus the rows in file order. */
  subjects: Array<{
    slug: string;
    name: string;
    classLevel: BankRow["classLevel"];
    department: string;
    rows: Array<{ line: number; data: BankRow }>;
  }>;
  rejected: RejectedBankRow[];
  totalRows: number;
};

const REQUIRED_COLUMNS = [
  "subjectSlug",
  "subjectName",
  "classLevel",
  "topic",
  "difficulty",
  "stem",
  "optionA",
  "optionB",
  "optionC",
  "optionD",
  "correctIndex",
  "explanation",
] as const;

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
}

/** Convert one CSV record (already keyed by header) into the shared question schema. */
export function normaliseBankRow(record: Record<string, unknown>) {
  return cbtQuestionDraftSchema.safeParse({
    subjectSlug: text(record.subjectSlug).toLowerCase(),
    subjectName: text(record.subjectName),
    classLevel: text(record.classLevel).toLowerCase(),
    department: text(record.department) || "general",
    topic: text(record.topic),
    difficulty: record.difficulty ?? 2,
    stem: text(record.stem),
    options: [record.optionA, record.optionB, record.optionC, record.optionD].map(text),
    correctIndex: record.correctIndex,
    explanation: text(record.explanation),
    source: text(record.source) || "original-draft",
  });
}

/**
 * Parse and validate a candidate bank entirely in memory.
 *
 * Nothing here touches a database: it answers "would this file import cleanly?"
 * so a caller can refuse a bad file before any write happens. Duplicate stems
 * inside the file are dropped (keeping the first) because a subject may only
 * hold one question per stem.
 */
export function planBankCsv(csv: string): PlannedBank {
  const parsed = Papa.parse<Record<string, unknown>>(csv, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
  });

  const rejected: RejectedBankRow[] = [];
  if (parsed.errors.length) {
    for (const error of parsed.errors.slice(0, 20)) {
      rejected.push({ line: (error.row ?? 0) + 2, reason: `CSV parse error: ${error.message}` });
    }
    return { subjects: [], rejected, totalRows: parsed.data.length };
  }

  const fields = parsed.meta.fields ?? [];
  const missing = REQUIRED_COLUMNS.filter((column) => !fields.includes(column));
  if (missing.length) {
    return {
      subjects: [],
      rejected: [{ line: 1, reason: `Missing columns: ${missing.join(", ")}` }],
      totalRows: parsed.data.length,
    };
  }

  const seenStems = new Map<string, Set<string>>();
  const bySlug = new Map<string, PlannedBank["subjects"][number]>();

  parsed.data.forEach((record, index) => {
    const line = index + 2; // header is line 1
    const result = normaliseBankRow(record);
    if (!result.success) {
      const issue = result.error.issues[0];
      rejected.push({
        line,
        reason: `${issue?.path.join(".") || "row"}: ${issue?.message ?? "invalid"}`,
      });
      return;
    }
    const row = result.data;
    if (!haveDistinctOptions(row.options)) {
      rejected.push({ line, reason: "options must be distinct" });
      return;
    }

    const stems = seenStems.get(row.subjectSlug) ?? new Set<string>();
    if (stems.has(row.stem)) {
      rejected.push({ line, reason: "duplicate stem within this subject in the file" });
      return;
    }
    stems.add(row.stem);
    seenStems.set(row.subjectSlug, stems);

    const group = bySlug.get(row.subjectSlug);
    if (!group) {
      bySlug.set(row.subjectSlug, {
        slug: row.subjectSlug,
        name: row.subjectName,
        classLevel: row.classLevel,
        department: row.department ?? "general",
        rows: [{ line, data: row }],
      });
      return;
    }
    group.rows.push({ line, data: row });
  });

  return { subjects: [...bySlug.values()], rejected, totalRows: parsed.data.length };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}
