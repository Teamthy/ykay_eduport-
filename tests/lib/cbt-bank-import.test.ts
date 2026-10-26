import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { chunk, planBankCsv } from "@/lib/cbt-bank-import";

const HEADER =
  "subjectSlug,subjectName,classLevel,department,topic,term,week,difficulty,stem,optionA,optionB,optionC,optionD,correctIndex,explanation,source";

function row(overrides: Record<string, string> = {}) {
  const base: Record<string, string> = {
    subjectSlug: "mathematics-jss1",
    subjectName: "Mathematics",
    classLevel: "jss1",
    department: "general",
    topic: "Whole-number operations",
    term: "",
    week: "",
    difficulty: "2",
    stem: "Calculate 101 + 699.",
    optionA: "70599",
    optionB: "800",
    optionC: "598",
    optionD: "810",
    correctIndex: "1",
    explanation: "Adding the hundreds, tens and ones gives 800; 70599 multiplies instead.",
    source: "original-draft",
    ...overrides,
  };
  // Explanation prose contains commas, exactly like the real bank, so quote it.
  return Object.values(base)
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(",");
}

describe("planBankCsv", () => {
  it("accepts a valid row and groups it under its subject", () => {
    const plan = planBankCsv([HEADER, row()].join("\n"));

    expect(plan.rejected).toEqual([]);
    expect(plan.totalRows).toBe(1);
    expect(plan.subjects).toHaveLength(1);
    expect(plan.subjects[0]).toMatchObject({
      slug: "mathematics-jss1",
      name: "Mathematics",
      classLevel: "jss1",
    });
    expect(plan.subjects[0]?.rows[0]?.data.source).toBe("original-draft");
    expect(plan.subjects[0]?.rows[0]?.data.term).toBeNull();
    expect(plan.subjects[0]?.rows[0]?.data.week).toBeNull();
  });

  it("normalises common term labels for curriculum CSVs", () => {
    const plan = planBankCsv([HEADER, row({ term: "Second Term" })].join("\n"));
    expect(plan.rejected).toEqual([]);
    expect(plan.subjects[0]?.rows[0]?.data.term).toBe("second");
  });

  it("accepts only valid week numbers attached to a verified term", () => {
    const valid = planBankCsv([HEADER, row({ term: "first", week: "4" })].join("\n"));
    expect(valid.rejected).toEqual([]);
    expect(valid.subjects[0]?.rows[0]?.data.week).toBe(4);

    const withoutTerm = planBankCsv([HEADER, row({ week: "4" })].join("\n"));
    expect(withoutTerm.rejected[0]?.reason).toContain("week");

    const invalid = planBankCsv([HEADER, row({ term: "first", week: "1.5" })].join("\n"));
    expect(invalid.rejected[0]?.reason).toContain("week");
  });

  it("rejects an unrecognised term label rather than guessing", () => {
    const plan = planBankCsv([HEADER, row({ term: "midyear" })].join("\n"));
    expect(plan.rejected[0]?.reason).toContain("term");
  });

  it("rejects unsupported class levels and duplicate options with a line number", () => {
    const plan = planBankCsv(
      [
        HEADER,
        row({ classLevel: "jamb" }),
        row({ stem: "Calculate 2 + 2.", optionA: "4", optionB: "4" }),
      ].join("\n"),
    );

    expect(plan.subjects).toEqual([]);
    expect(plan.rejected.map((entry) => entry.line)).toEqual([2, 3]);
    expect(plan.rejected[0]?.reason).toContain("classLevel");
    expect(plan.rejected[1]?.reason).toContain("distinct");
  });

  it("drops a repeated stem inside the same subject but keeps it for another subject", () => {
    const plan = planBankCsv(
      [HEADER, row(), row(), row({ subjectSlug: "mathematics-jss2", classLevel: "jss2" })].join(
        "\n",
      ),
    );

    expect(plan.rejected.map((entry) => entry.line)).toEqual([3]);
    expect(plan.subjects.map((subject) => [subject.slug, subject.rows.length])).toEqual([
      ["mathematics-jss1", 1],
      ["mathematics-jss2", 1],
    ]);
  });

  it("fails closed when required columns are missing", () => {
    const plan = planBankCsv("subjectSlug,stem\nmathematics-jss1,Calculate 1 + 1");

    expect(plan.subjects).toEqual([]);
    expect(plan.rejected[0]?.reason).toContain("Missing columns");
  });

  it("imports the real 10,000-row candidate bank with no rejected rows", () => {
    const csv = readFileSync(join(process.cwd(), "prisma", "cbt-bank-10k-draft.csv"), "utf8");
    const plan = planBankCsv(csv);
    const accepted = plan.subjects.reduce((sum, subject) => sum + subject.rows.length, 0);

    expect(plan.totalRows).toBe(10_000);
    expect(plan.rejected).toEqual([]);
    expect(accepted).toBe(10_000);
    expect(plan.subjects).toHaveLength(42);
    expect(plan.subjects.every((subject) => subject.rows.length > 0)).toBe(true);
    // The generator only ever emits draft provenance; nothing in the bank is pre-reviewed.
    expect(
      plan.subjects
        .flatMap((subject) => subject.rows)
        .every((entry) => entry.data.source === "original-draft"),
    ).toBe(true);
  });
});

describe("chunk", () => {
  it("splits without dropping or reordering items", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunk([], 10)).toEqual([]);
  });
});
