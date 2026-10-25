import { describe, expect, it } from "vitest";

import { structuralRejectionReason } from "@/lib/cbt-review";

/**
 * The console (bulk-review route) and the staging seed workflow both attest
 * questions with this gate. If it loosens, malformed items become visible to
 * students in practice — so each rule gets a case here.
 */
const base = {
  id: "q1",
  stem: "Simplify 2x + 3x.",
  topic: "Algebra",
  explanation: "Like terms add: 2x + 3x = 5x, because the coefficient 2 + 3 = 5.",
  options: ["5x", "6x", "5x²", "x"],
};

describe("structuralRejectionReason", () => {
  it("accepts a complete question", () => {
    expect(structuralRejectionReason(base)).toBeNull();
  });

  it("requires exactly four non-empty options", () => {
    expect(structuralRejectionReason({ ...base, options: ["5x", "6x", "x"] })).toBe(
      "options incomplete",
    );
    expect(structuralRejectionReason({ ...base, options: ["5x", "6x", "", "x"] })).toBe(
      "options incomplete",
    );
    expect(structuralRejectionReason({ ...base, options: "5x" })).toBe("options incomplete");
  });

  it("rejects duplicate options regardless of case", () => {
    expect(structuralRejectionReason({ ...base, options: ["5x", "5X", "6x", "x"] })).toBe(
      "duplicate options",
    );
  });

  it("requires a topic, a stem and a real explanation", () => {
    expect(structuralRejectionReason({ ...base, topic: " " })).toBe("topic missing");
    expect(structuralRejectionReason({ ...base, stem: "2x?" })).toBe("stem too short");
    expect(structuralRejectionReason({ ...base, explanation: "Because it is." })).toBe(
      "explanation too short",
    );
  });

  it("rejects the filler explanations the bank must not ship", () => {
    for (const filler of [
      "This sits in the NERDC scheme, so it is the right one.",
      "The others are a common distractor for this topic.",
      "It mixes a related but different idea about algebra.",
      "The wrong options are not the required relationship here.",
      "It does not satisfy the stem in this question, so it is wrong.",
    ]) {
      expect(structuralRejectionReason({ ...base, explanation: filler })).toBe(
        "generic explanation",
      );
    }
  });
});
