/**
 * Double-entry core for the school finance system.
 *
 * See docs/rebuild/05-financial-system.md. Everything here is pure and has no
 * database dependency, so the same rules can be asserted in unit tests, run
 * nightly as a production integrity check, and reused by the auditor export.
 *
 * The five invariants this file makes checkable:
 *   1. Every posted entry has at least two lines.
 *   2. Sum of debits equals sum of credits, and is greater than zero.
 *   3. No line carries both a debit and a credit, or a negative amount.
 *   4. Account balances roll up in the account's natural direction.
 *   5. A student's outstanding balance equals total minus payments minus
 *      approved discounts, and an overpayment is surfaced, never hidden.
 *
 * Money is ALWAYS an integer in minor units (kobo) — the same convention the
 * existing FeeInvoice/FeePayment models use. Floating-point naira never enters
 * this module.
 */

export const MINOR_UNITS_PER_NAIRA = 100;

export function isValidMinorAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

/** Naira (may be fractional) → integer kobo. Throws on unusable input. */
export function toMinor(naira: number): number {
  if (typeof naira !== "number" || !Number.isFinite(naira)) {
    throw new Error(`toMinor: expected a finite number, received ${String(naira)}`);
  }
  return Math.round(naira * MINOR_UNITS_PER_NAIRA);
}

export function toNaira(minor: number): number {
  if (!isValidMinorAmount(minor)) {
    throw new Error(`toNaira: expected an integer amount in kobo, received ${String(minor)}`);
  }
  return minor / MINOR_UNITS_PER_NAIRA;
}

/** Deterministic ₦ formatting (no ICU dependency, so tests are stable). */
export function formatNaira(minor: number): string {
  if (!isValidMinorAmount(minor)) {
    throw new Error(`formatNaira: expected an integer amount in kobo, received ${String(minor)}`);
  }
  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const whole = Math.trunc(absolute / MINOR_UNITS_PER_NAIRA).toString();
  const fraction = (absolute % MINOR_UNITS_PER_NAIRA).toString().padStart(2, "0");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}₦${grouped}.${fraction}`;
}

/** Sum kobo amounts, refusing anything that is not an integer. */
export function sumMinor(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    if (!isValidMinorAmount(amount)) {
      throw new Error(`sumMinor: non-integer minor amount ${String(amount)}`);
    }
    total += amount;
  }
  if (!Number.isSafeInteger(total)) {
    throw new Error("sumMinor: total exceeded safe integer range");
  }
  return total;
}

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";

/** Assets and expenses increase on the debit side; everything else on credit. */
export function normalBalance(type: AccountType): "DEBIT" | "CREDIT" {
  return type === "ASSET" || type === "EXPENSE" ? "DEBIT" : "CREDIT";
}

export type JournalLineInput = {
  accountCode: string;
  accountType: AccountType;
  debitMinor?: number;
  creditMinor?: number;
  /** Optional sub-ledger tags — used by the receivable ageing. */
  studentId?: string | null;
  staffId?: string | null;
  vendorId?: string | null;
};

export type EntryValidation = {
  ok: boolean;
  errors: string[];
  debitsMinor: number;
  creditsMinor: number;
};

/**
 * Tolerant sum: an integrity job must be able to REPORT corrupt rows, not
 * crash on them. Unusable amounts contribute zero and are surfaced by
 * validateJournalEntry's per-line errors instead.
 */
function tolerantSum(amounts: readonly (number | undefined)[]): number {
  let total = 0;
  for (const amount of amounts) if (isValidMinorAmount(amount) && amount >= 0) total += amount;
  return total;
}

export function entryTotals(lines: readonly JournalLineInput[]): {
  debitsMinor: number;
  creditsMinor: number;
  balanced: boolean;
} {
  const debitsMinor = tolerantSum(lines.map((l) => l.debitMinor ?? 0));
  const creditsMinor = tolerantSum(lines.map((l) => l.creditMinor ?? 0));
  return { debitsMinor, creditsMinor, balanced: debitsMinor === creditsMinor && debitsMinor > 0 };
}

/**
 * Validate an entry before it is ever written. Called by the posting service
 * and asserted again by the nightly integrity job against stored rows.
 */
export function validateJournalEntry(lines: readonly JournalLineInput[]): EntryValidation {
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push("A journal entry needs at least two lines (debit and credit).");
  }

  lines.forEach((line, index) => {
    const debit = line.debitMinor ?? 0;
    const credit = line.creditMinor ?? 0;
    const where = `line ${index + 1} (${line.accountCode})`;

    if (!isValidMinorAmount(debit) || !isValidMinorAmount(credit)) {
      errors.push(`${where}: amounts must be integers in minor units.`);
      return;
    }
    if (debit < 0 || credit < 0) {
      errors.push(`${where}: negative amounts are not allowed — post a reversing entry instead.`);
    }
    if (debit > 0 && credit > 0) {
      errors.push(`${where}: a line is either a debit or a credit, never both.`);
    }
    if (debit === 0 && credit === 0) {
      errors.push(`${where}: line carries no amount.`);
    }
    if (!line.accountCode?.trim()) {
      errors.push(`${where}: missing account code.`);
    }
  });

  const { debitsMinor, creditsMinor, balanced } = entryTotals(lines);
  if (!balanced) {
    errors.push(
      `Entry does not balance: debits ${formatNaira(debitsMinor)} vs credits ${formatNaira(creditsMinor)}.`,
    );
  }

  return { ok: errors.length === 0, errors, debitsMinor, creditsMinor };
}

/** True when the entry balances and is therefore postable. */
export function isPostable(lines: readonly JournalLineInput[]): boolean {
  return validateJournalEntry(lines).ok;
}

/**
 * A reversing ("storno") entry. Posted entries are never edited; a mistake is
 * corrected by posting the mirror image and keeping both in the trail.
 */
export function reverseEntry(lines: readonly JournalLineInput[]): JournalLineInput[] {
  return lines.map((line) => ({
    ...line,
    debitMinor: line.creditMinor ?? 0,
    creditMinor: line.debitMinor ?? 0,
  }));
}

export type LedgerLineForBalance = {
  accountCode: string;
  accountType: AccountType;
  debitMinor: number;
  creditMinor: number;
};

/**
 * Balance in the account's natural direction (positive = normal).
 *
 * Accepts journal-line shapes where only one side is set, because that is how
 * postings are authored: `{ debitMinor: 5000 }` or `{ creditMinor: 5000 }`.
 */
export function accountBalanceMinor(
  type: AccountType,
  lines: readonly { debitMinor?: number; creditMinor?: number }[],
): number {
  const debits = tolerantSum(lines.map((l) => l.debitMinor ?? 0));
  const credits = tolerantSum(lines.map((l) => l.creditMinor ?? 0));
  return normalBalance(type) === "DEBIT" ? debits - credits : credits - debits;
}

export type TrialBalanceRow = {
  accountCode: string;
  accountType: AccountType;
  debitMinor: number;
  creditMinor: number;
  balanceMinor: number;
};

export function trialBalance(lines: readonly LedgerLineForBalance[]): {
  rows: TrialBalanceRow[];
  debitsMinor: number;
  creditsMinor: number;
  balanced: boolean;
} {
  const byAccount = new Map<string, LedgerLineForBalance[]>();
  for (const line of lines) {
    const list = byAccount.get(line.accountCode);
    if (list) list.push(line);
    else byAccount.set(line.accountCode, [line]);
  }

  const rows: TrialBalanceRow[] = [...byAccount.entries()]
    .map(([accountCode, accountLines]) => {
      const accountType = accountLines[0].accountType;
      const debits = sumMinor(accountLines.map((l) => l.debitMinor));
      const credits = sumMinor(accountLines.map((l) => l.creditMinor));
      const balanceMinor =
        normalBalance(accountType) === "DEBIT" ? debits - credits : credits - debits;
      return { accountCode, accountType, debitMinor: debits, creditMinor: credits, balanceMinor };
    })
    .sort((a, b) => a.accountCode.localeCompare(b.accountCode));

  const debitsMinor = sumMinor(lines.map((l) => l.debitMinor));
  const creditsMinor = sumMinor(lines.map((l) => l.creditMinor));

  return { rows, debitsMinor, creditsMinor, balanced: debitsMinor === creditsMinor };
}

/* ------------------------------------------------------------------
   Fee receivables — what a parent actually owes
   ------------------------------------------------------------------ */

export type InvoicePosition = {
  /** Amount invoiced, in kobo. */
  totalMinor: number;
  /** Sum of all successful payments against this invoice. */
  paidMinor: number;
  /** Sum of approved discounts/waivers (never an edit to totalMinor). */
  discountMinor: number;
};

export function invoiceOutstanding({ totalMinor, paidMinor, discountMinor }: InvoicePosition): {
  outstandingMinor: number;
  overpaidMinor: number;
  settled: boolean;
} {
  if (![totalMinor, paidMinor, discountMinor].every(isValidMinorAmount)) {
    throw new Error("invoiceOutstanding: amounts must be integers in minor units");
  }
  const outstanding = totalMinor - paidMinor - discountMinor;
  if (outstanding > 0) {
    return { outstandingMinor: outstanding, overpaidMinor: 0, settled: false };
  }
  // A credit balance is real money the school is holding — never clamp it to zero.
  return { outstandingMinor: 0, overpaidMinor: -outstanding, settled: true };
}

export type AgeingBucket = "CURRENT" | "D0_30" | "D31_60" | "D61_90" | "D90_PLUS";

/** Days overdue → reporting bucket. Not-yet-due balances are CURRENT. */
export function ageingBucket(daysOverdue: number): AgeingBucket {
  if (daysOverdue <= 0) return "CURRENT";
  if (daysOverdue <= 30) return "D0_30";
  if (daysOverdue <= 60) return "D31_60";
  if (daysOverdue <= 90) return "D61_90";
  return "D90_PLUS";
}

export type ReceivableRow = {
  studentId: string;
  outstandingMinor: number;
  dueDate: Date;
};

export type AgeingReport = {
  asOf: Date;
  buckets: Record<AgeingBucket, number>;
  byStudent: { studentId: string; buckets: Record<AgeingBucket, number>; totalMinor: number }[];
  totalMinor: number;
};

const MS_PER_DAY = 86_400_000;

function emptyBucketRecord(): Record<AgeingBucket, number> {
  return { CURRENT: 0, D0_30: 0, D31_60: 0, D61_90: 0, D90_PLUS: 0 };
}

/**
 * Ageing report per student. Buckets are computed from whole days overdue so
 * the report is stable within a day, whatever time it runs.
 */
export function buildAgeingReport(rows: readonly ReceivableRow[], asOf: Date): AgeingReport {
  const byStudent = new Map<
    string,
    { buckets: Record<AgeingBucket, number>; totalMinor: number }
  >();
  const buckets = emptyBucketRecord();

  for (const row of rows) {
    if (!isValidMinorAmount(row.outstandingMinor) || row.outstandingMinor <= 0) continue;
    const daysOverdue = Math.floor((asOf.getTime() - row.dueDate.getTime()) / MS_PER_DAY);
    const bucket = ageingBucket(daysOverdue);

    const entry = byStudent.get(row.studentId) ?? { buckets: emptyBucketRecord(), totalMinor: 0 };
    entry.buckets[bucket] += row.outstandingMinor;
    entry.totalMinor += row.outstandingMinor;
    byStudent.set(row.studentId, entry);

    buckets[bucket] += row.outstandingMinor;
  }

  return {
    asOf,
    buckets,
    byStudent: [...byStudent.entries()]
      .map(([studentId, entry]) => ({ studentId, ...entry }))
      .sort((a, b) => b.totalMinor - a.totalMinor),
    totalMinor: sumMinor(Object.values(buckets)),
  };
}
