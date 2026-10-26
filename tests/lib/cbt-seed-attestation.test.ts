import { describe, expect, it } from "vitest";
import { normaliseBankRow } from "@/lib/cbt-bank-import";
import { matchesBankQuestion } from "@/lib/cbt-seed-attestation";

const parsed = normaliseBankRow({
  subjectSlug: "mathematics-jss1",
  subjectName: "Mathematics",
  classLevel: "jss1",
  department: "general",
  topic: "Whole-number operations",
  difficulty: "2",
  stem: "Calculate 101 + 699.",
  optionA: "70599",
  optionB: "800",
  optionC: "598",
  optionD: "810",
  correctIndex: "1",
  explanation: "Adding the hundreds, tens and ones gives 800; 70599 multiplies instead.",
  source: "original-draft",
});

if (!parsed.success) throw new Error("Test bank row must be valid.");
const expected = parsed.data;
const persisted = {
  topic: expected.topic,
  difficulty: expected.difficulty,
  stem: expected.stem,
  options: [...expected.options],
  correctIndex: expected.correctIndex,
  explanation: expected.explanation,
  source: expected.source,
};

describe("seed attestation source matching", () => {
  it("accepts an exact persisted copy of the reviewed bank row", () => {
    expect(matchesBankQuestion(persisted, expected)).toBe(true);
  });

  it.each([
    ["topic", { topic: "Different topic" }],
    ["difficulty", { difficulty: 3 }],
    ["stem", { stem: "A different question stem." }],
    ["options", { options: ["70599", "800", "598", "811"] }],
    ["correct answer", { correctIndex: 0 }],
    [
      "explanation",
      { explanation: "A different explanation that is long enough to pass validation." },
    ],
    ["source", { source: "another-source" }],
  ])("rejects a same-subject question whose %s differs from the source row", (_field, change) => {
    expect(matchesBankQuestion({ ...persisted, ...change }, expected)).toBe(false);
  });

  it("rejects non-string options rather than treating them as a source match", () => {
    expect(matchesBankQuestion({ ...persisted, options: [1, 2, 3, 4] }, expected)).toBe(false);
  });
});
