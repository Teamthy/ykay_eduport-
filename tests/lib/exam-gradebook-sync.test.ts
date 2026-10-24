import { describe, expect, it } from "vitest";
import {
  gradebookFieldForComponent,
  isGradebookComponent,
  mergeExamScoreIntoGradebook,
  restoreGradebookComponent,
  scaleExamScoreToComponent,
} from "@/lib/exam-gradebook-sync";

describe("released exam to cumulative gradebook mapping", () => {
  it("scales percentage results to the configured gradebook component", () => {
    expect(scaleExamScoreToComponent(38, 50, "CA1")).toBe(8);
    expect(scaleExamScoreToComponent(45, 50, "EXAM")).toBe(54);
  });

  it("preserves other term components and recomputes the total and grade", () => {
    const result = mergeExamScoreIntoGradebook(
      { ca1: 0, ca2: 7, midterm: 6, assignment: 8, exam: 40 },
      38,
      50,
      "CA1",
    );
    expect(result).toEqual({
      ca1: 8,
      ca2: 7,
      midterm: 6,
      assignment: 8,
      exam: 40,
      total: 69,
      grade: "B3",
    });
  });

  it("restores only the configured component while retaining the other gradebook marks", () => {
    const restored = restoreGradebookComponent(
      { ca1: 8, ca2: 6, midterm: 4, assignment: 7, exam: 45 },
      2,
      "CA1",
    );
    expect(gradebookFieldForComponent("CA1")).toBe("ca1");
    expect(restored).toEqual({
      ca1: 2,
      ca2: 6,
      midterm: 4,
      assignment: 7,
      exam: 45,
      total: 64,
      grade: "C4",
    });
  });

  it("rejects invalid marks instead of silently writing a corrupt component", () => {
    expect(() => scaleExamScoreToComponent(51, 50, "CA1")).toThrow(RangeError);
    expect(() => scaleExamScoreToComponent(1, 0, "CA1")).toThrow(RangeError);
  });

  it("only accepts configured cumulative components", () => {
    expect(isGradebookComponent("MIDTERM")).toBe(true);
    expect(isGradebookComponent("PRACTICE")).toBe(false);
    expect(isGradebookComponent(null)).toBe(false);
  });
});
