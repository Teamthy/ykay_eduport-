import { describe, expect, it } from "vitest";
import {
  buildBroadsheet,
  latestPerStudent,
  listPeriods,
  periodKey,
  pickPeriod,
  reportsForPeriod,
  type BroadsheetReport,
} from "@/lib/broadsheet";

/**
 * The broadsheet is a record of one class in one term.
 *
 * These cases pin down the two ways it used to be wrong: it mixed terms (the
 * newest card per student, whatever term it came from) and it treated a subject
 * a student does not take as a zero, which dragged every elective's average
 * down. Both produced numbers that looked plausible and were not the class's.
 */
function card(overrides: Partial<BroadsheetReport> & { name: string }): BroadsheetReport {
  const { name, ...rest } = overrides;
  return {
    reportNumber: `RC-${name}-${rest.sessionLabel ?? "2025/2026"}-${rest.termLabel ?? "Term 1"}`,
    sessionLabel: "2025/2026",
    termLabel: "Term 1",
    status: "DRAFT",
    overallAverage: 70,
    overallGrade: "B",
    classPosition: null,
    generatedAt: "2026-01-10T10:00:00.000Z",
    student: { id: `stu-${name}`, studentId: `YK/${name}`, displayName: name },
    subjects: [{ subject: "Mathematics", total: 70 }],
    ...rest,
  };
}

describe("broadsheet periods", () => {
  it("lists each session/term once, newest first, with its student count", () => {
    const reports = [
      card({ name: "Ada", termLabel: "Term 1", generatedAt: "2026-01-10T10:00:00.000Z" }),
      card({ name: "Bola", termLabel: "Term 1", generatedAt: "2026-01-11T10:00:00.000Z" }),
      card({
        name: "Ada",
        termLabel: "Term 2",
        generatedAt: "2026-04-10T10:00:00.000Z",
        overallAverage: 75,
      }),
    ];

    const periods = listPeriods(reports);

    expect(periods).toHaveLength(2);
    expect(periods[0]).toMatchObject({ termLabel: "Term 2", studentCount: 1 });
    expect(periods[1]).toMatchObject({ termLabel: "Term 1", studentCount: 2 });
  });

  it("keeps terms of different sessions apart", () => {
    const reports = [
      card({ name: "Ada", sessionLabel: "2024/2025", termLabel: "Term 3" }),
      card({ name: "Ada", sessionLabel: "2025/2026", termLabel: "Term 3" }),
    ];
    expect(listPeriods(reports)).toHaveLength(2);
    expect(periodKey("2025/2026", "Term 3")).not.toBe(periodKey("2024/2025", "Term 3"));
  });

  it("honours the requested period and falls back to the newest for a stale one", () => {
    const reports = [
      card({ name: "Ada", termLabel: "Term 1", generatedAt: "2026-01-10T10:00:00.000Z" }),
      card({ name: "Ada", termLabel: "Term 2", generatedAt: "2026-04-10T10:00:00.000Z" }),
    ];
    const periods = listPeriods(reports);

    expect(pickPeriod(periods, { session: "2025/2026", term: "Term 1" })?.termLabel).toBe("Term 1");
    // A bookmarked link to a term that no longer has cards must not render an
    // empty sheet with no explanation.
    expect(pickPeriod(periods, { session: "2019/2020", term: "Term 9" })?.termLabel).toBe("Term 2");
    expect(pickPeriod([], { session: "2025/2026", term: "Term 1" })).toBeNull();
  });
});

describe("broadsheet contents", () => {
  it("never mixes two terms into one sheet", () => {
    const reports = [
      card({ name: "Ada", termLabel: "Term 1", overallAverage: 90 }),
      card({ name: "Bola", termLabel: "Term 1", overallAverage: 60 }),
      // Ada has since been graded for Term 2; Bola has not.
      card({
        name: "Ada",
        termLabel: "Term 2",
        overallAverage: 55,
        generatedAt: "2026-04-10T10:00:00.000Z",
      }),
    ];

    const termOne = buildBroadsheet(
      "JSS1A",
      reportsForPeriod(reports, listPeriods(reports).find((p) => p.termLabel === "Term 1") ?? null),
    );

    expect(termOne?.termLabel).toBe("Term 1");
    expect(termOne?.students.map((student) => student.displayName)).toEqual(["Ada", "Bola"]);
    expect(termOne?.classAverage).toBe(75);
  });

  it("keeps the newest card when a class is regenerated", () => {
    const reports = [
      card({ name: "Ada", overallAverage: 60, generatedAt: "2026-01-10T10:00:00.000Z" }),
      card({
        name: "Ada",
        overallAverage: 82,
        generatedAt: "2026-02-10T10:00:00.000Z",
        reportNumber: "RC-REGENERATED",
      }),
    ];

    const latest = latestPerStudent(reports);
    expect(latest).toHaveLength(1);
    expect(latest[0].overallAverage).toBe(82);
  });

  it("averages a subject over the students who take it", () => {
    const reports = [
      card({
        name: "Ada",
        subjects: [
          { subject: "Mathematics", total: 90 },
          { subject: "French", total: 40 },
        ],
      }),
      card({
        name: "Bola",
        overallAverage: 60,
        subjects: [{ subject: "Mathematics", total: 70 }],
      }),
    ];

    const sheet = buildBroadsheet("JSS1A", reports);
    const french = sheet?.subjectAverages.find((entry) => entry.subject === "French");
    const maths = sheet?.subjectAverages.find((entry) => entry.subject === "Mathematics");

    // French is averaged over Ada alone; treating Bola's missing score as zero
    // would have given 20 instead of 40.
    expect(french?.average).toBe(40);
    expect(maths?.average).toBe(80);
    // The grid still shows a gap, not a zero.
    expect(sheet?.students.find((s) => s.displayName === "Bola")?.subjects.French).toBeUndefined();
  });

  it("ranks by average and breaks ties by name so the order is stable", () => {
    const reports = [
      card({ name: "Zainab", overallAverage: 70 }),
      card({ name: "Ada", overallAverage: 70 }),
      card({ name: "Bola", overallAverage: 80 }),
    ];
    const sheet = buildBroadsheet("JSS1A", reports);
    expect(sheet?.students.map((student) => student.displayName)).toEqual([
      "Bola",
      "Ada",
      "Zainab",
    ]);
  });

  it("returns null rather than an empty-looking sheet", () => {
    expect(buildBroadsheet("JSS1A", [])).toBeNull();
  });
});
