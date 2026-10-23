import { describe, expect, it } from "vitest";
import {
  attemptState,
  extractReviewNote,
  isRetryablePaystackAttempt,
  serializePaymentAttempts,
  type PaymentAttemptRow,
} from "@/lib/parent-fees";

/**
 * MNY-01 regression: parents see pending and rejected transfers, with the
 * bursar's reason — not just completed payments.
 */
describe("isRetryablePaystackAttempt", () => {
  const expected = {
    schoolId: "school_1",
    invoiceId: "invoice_1",
    studentProfileId: "student_1",
    parentProfileId: "parent_1",
    amount: 45_000,
    payerEmail: "parent@example.com",
  };
  const attempt = {
    ...expected,
    provider: "PAYSTACK",
    status: "PENDING",
  };

  it.each(["PENDING", "FAILED"])("allows a same-owner %s retry", (status) => {
    expect(isRetryablePaystackAttempt({ ...attempt, status }, expected)).toBe(true);
  });

  it.each([
    ["another school", { schoolId: "school_2" }],
    ["another invoice", { invoiceId: "invoice_2" }],
    ["another student", { studentProfileId: "student_2" }],
    ["another parent", { parentProfileId: "parent_2" }],
    ["another amount", { amount: 46_000 }],
    ["another email", { payerEmail: "other@example.com" }],
    ["another provider", { provider: "BANK_TRANSFER" }],
    ["a paid reference", { status: "PAID" }],
    ["an abandoned attempt", { status: "ABANDONED" }],
  ])("rejects a reference associated with %s", (_label, override) => {
    expect(isRetryablePaystackAttempt({ ...attempt, ...override }, expected)).toBe(false);
  });
});

describe("attemptState", () => {
  it("maps a pending bank transfer to AWAITING_REVIEW", () => {
    expect(attemptState("BANK_TRANSFER", "PENDING")).toBe("AWAITING_REVIEW");
  });

  it("maps a pending Paystack attempt to PROCESSING", () => {
    expect(attemptState("PAYSTACK", "PENDING")).toBe("PROCESSING");
  });

  it("maps PAID to CONFIRMED and failures to REJECTED", () => {
    expect(attemptState("BANK_TRANSFER", "PAID")).toBe("CONFIRMED");
    expect(attemptState("BANK_TRANSFER", "FAILED")).toBe("REJECTED");
    expect(attemptState("PAYSTACK", "ABANDONED")).toBe("REJECTED");
  });
});

describe("extractReviewNote", () => {
  it("pulls the bursar's Review line out of the narration", () => {
    expect(extractReviewNote("Fees for Ada\nReview: amount did not match")).toBe(
      "amount did not match",
    );
  });

  it("returns the latest Review line and null when absent", () => {
    expect(extractReviewNote("Review: first\nReview: second")).toBe("second");
    expect(extractReviewNote("just a narration")).toBeNull();
    expect(extractReviewNote(null)).toBeNull();
    expect(extractReviewNote("Review:")).toBeNull();
  });
});

describe("serializePaymentAttempts", () => {
  it("serializes rows with state, ISO dates and review note", () => {
    const row: PaymentAttemptRow = {
      id: "attempt_1",
      invoiceId: "invoice_1",
      provider: "BANK_TRANSFER",
      status: "FAILED",
      amount: 150000,
      reference: "REF-1",
      transferNarration: "Transfer from GTBank\nReview: name mismatch",
      reviewedAt: new Date("2026-10-20T10:00:00.000Z"),
      createdAt: new Date("2026-10-19T09:00:00.000Z"),
    };
    const [attempt] = serializePaymentAttempts([row]);
    expect(attempt.state).toBe("REJECTED");
    expect(attempt.reviewNote).toBe("name mismatch");
    expect(attempt.submittedAt).toBe("2026-10-19T09:00:00.000Z");
    expect(attempt.reviewedAt).toBe("2026-10-20T10:00:00.000Z");
    expect(attempt).not.toHaveProperty("transferNarration");
  });
});
