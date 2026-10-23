/**
 * Parent-facing serialization of fee payment attempts (audit MNY-01 / H11).
 *
 * `/api/parent/fees` historically returned only COMPLETED payments, so a
 * bank transfer awaiting bursar review — or one the bursar rejected —
 * simply vanished for the parent: no trace, no reason, balance unchanged.
 * Parents either assumed it worked (child later fee-locked) or paid twice.
 * These pure helpers map raw attempt rows into the states a parent needs.
 */

export type PaymentAttemptRow = {
  id: string;
  invoiceId: string;
  provider: string;
  status: string;
  amount: number;
  reference: string;
  transferNarration: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
};

export type PaystackAttemptIdentity = {
  schoolId: string;
  invoiceId: string;
  studentProfileId: string;
  parentProfileId: string | null;
  provider: string;
  amount: number;
  payerEmail: string | null;
  status: string;
};

export type PaystackAttemptOwner = Omit<PaystackAttemptIdentity, "provider" | "status">;

/**
 * The payment-intent route may resume only the same parent's own attempt for
 * the deterministic reference. This permits crash recovery for an exact
 * idempotent retry without recycling another parent's/provider's reference.
 */
export function isRetryablePaystackAttempt(
  attempt: PaystackAttemptIdentity,
  expected: PaystackAttemptOwner,
): boolean {
  return (
    attempt.schoolId === expected.schoolId &&
    attempt.invoiceId === expected.invoiceId &&
    attempt.studentProfileId === expected.studentProfileId &&
    attempt.parentProfileId === expected.parentProfileId &&
    attempt.provider === "PAYSTACK" &&
    attempt.amount === expected.amount &&
    attempt.payerEmail === expected.payerEmail &&
    (attempt.status === "PENDING" || attempt.status === "FAILED")
  );
}

export type ParentPaymentAttemptState = "AWAITING_REVIEW" | "PROCESSING" | "REJECTED" | "CONFIRMED";

export type ParentPaymentAttempt = {
  id: string;
  invoiceId: string;
  provider: string;
  state: ParentPaymentAttemptState;
  amount: number;
  reference: string;
  submittedAt: string;
  reviewedAt: string | null;
  /** Bursar's review note, when one was recorded on rejection/approval. */
  reviewNote: string | null;
};

/**
 * The bursar review appends `Review: <note>` to the transfer narration
 * (see REJECT_TRANSFER in app/api/admin/fees/payments/route.ts). Extract
 * the latest such line so the parent sees the reason, not the raw blob.
 */
export function extractReviewNote(narration: string | null | undefined): string | null {
  if (!narration) return null;
  const lines = narration
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.toLowerCase().startsWith("review:"));
  if (!lines.length) return null;
  const note = lines[lines.length - 1].slice("review:".length).trim();
  return note || null;
}

export function attemptState(provider: string, status: string): ParentPaymentAttemptState {
  if (status === "PAID") return "CONFIRMED";
  if (status === "PENDING") {
    return provider === "BANK_TRANSFER" ? "AWAITING_REVIEW" : "PROCESSING";
  }
  // FAILED / ABANDONED: for a bank transfer this means the bursar did not
  // confirm it; for Paystack it means the charge did not complete. Either
  // way the parent's balance was not credited and they must be told.
  return "REJECTED";
}

export function serializePaymentAttempts(rows: PaymentAttemptRow[]): ParentPaymentAttempt[] {
  return rows.map((row) => ({
    id: row.id,
    invoiceId: row.invoiceId,
    provider: row.provider,
    state: attemptState(row.provider, row.status),
    amount: row.amount,
    reference: row.reference,
    submittedAt: row.createdAt.toISOString(),
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    reviewNote: extractReviewNote(row.transferNarration),
  }));
}
