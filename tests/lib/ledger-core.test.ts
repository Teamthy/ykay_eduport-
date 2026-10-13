import { describe, expect, it } from "vitest";

import {
  accountBalanceMinor,
  ageingBucket,
  buildAgeingReport,
  entryTotals,
  formatNaira,
  invoiceOutstanding,
  isPostable,
  normalBalance,
  reverseEntry,
  sumMinor,
  toMinor,
  toNaira,
  trialBalance,
  validateJournalEntry,
  type JournalLineInput,
} from "@/lib/ledger-core";

const THOUSAND = 1000; // ₦10.00 in kobo — small numbers keep the tests readable

/** The canonical happy path: a fee invoice for ₦10,000.00 issued to a student. */
const INVOICE_ENTRY: JournalLineInput[] = [
  { accountCode: "1100", accountType: "ASSET", debitMinor: 1_000_000, studentId: "stu_1" },
  { accountCode: "4010", accountType: "INCOME", creditMinor: 1_000_000 },
];

describe("money handling", () => {
  it("converts naira to integer kobo without float drift", () => {
    expect(toMinor(10)).toBe(1000);
    expect(toMinor(10.5)).toBe(1050);
    expect(toMinor(0.1 + 0.2)).toBe(30); // would be 30.000000000000004 as a float product
  });

  it("refuses to invent a value from junk", () => {
    expect(() => toMinor(Number.NaN)).toThrow();
    expect(() => toNaira(10.5)).toThrow(/integer/);
  });

  it("formats naira deterministically with grouping", () => {
    expect(formatNaira(0)).toBe("₦0.00");
    expect(formatNaira(1000)).toBe("₦10.00");
    expect(formatNaira(123_456_789)).toBe("₦1,234,567.89");
    expect(formatNaira(-50_000)).toBe("-₦500.00");
  });

  it("sums only integer minor amounts", () => {
    expect(sumMinor([1000, 250, 5])).toBe(1255);
    expect(() => sumMinor([1000, 0.5])).toThrow(/non-integer/);
  });
});

describe("entry validation (invariants 1–3)", () => {
  it("accepts a balanced two-line entry", () => {
    const result = validateJournalEntry(INVOICE_ENTRY);
    expect(result.ok).toBe(true);
    expect(result.debitsMinor).toBe(1_000_000);
    expect(result.creditsMinor).toBe(1_000_000);
  });

  it("accepts a multi-line entry (payment split across gateway fee and bank)", () => {
    const lines: JournalLineInput[] = [
      { accountCode: "1010", accountType: "ASSET", debitMinor: 993_000 },
      { accountCode: "5090", accountType: "EXPENSE", debitMinor: 7_000 },
      { accountCode: "1100", accountType: "ASSET", creditMinor: 1_000_000, studentId: "stu_1" },
    ];
    expect(isPostable(lines)).toBe(true);
  });

  it("rejects an unbalanced entry", () => {
    const result = validateJournalEntry([
      { accountCode: "1100", accountType: "ASSET", debitMinor: 1_000_000 },
      { accountCode: "4010", accountType: "INCOME", creditMinor: 999_000 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/does not balance/i);
  });

  it("rejects a single-line entry", () => {
    const result = validateJournalEntry([
      { accountCode: "1030", accountType: "ASSET", debitMinor: 5000 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toMatch(/at least two lines/i);
  });

  it("rejects a line that is both debit and credit", () => {
    const result = validateJournalEntry([
      { accountCode: "1030", accountType: "ASSET", debitMinor: 5000, creditMinor: 5000 },
      { accountCode: "4010", accountType: "INCOME", creditMinor: 0 },
    ]);
    expect(result.errors.join(" ")).toMatch(/never both/i);
  });

  it("rejects negative amounts — corrections must be reversing entries", () => {
    const result = validateJournalEntry([
      { accountCode: "1100", accountType: "ASSET", debitMinor: -1000 },
      { accountCode: "4010", accountType: "INCOME", creditMinor: -1000 },
    ]);
    expect(result.errors.join(" ")).toMatch(/negativ/i);
  });

  it("rejects non-integer (floating-point) amounts", () => {
    const result = validateJournalEntry([
      { accountCode: "1100", accountType: "ASSET", debitMinor: 10.5 },
      { accountCode: "4010", accountType: "INCOME", creditMinor: 10.5 },
    ]);
    expect(result.errors.join(" ")).toMatch(/integer/i);
  });

  it("rejects empty lines and missing account codes", () => {
    const result = validateJournalEntry([
      { accountCode: "", accountType: "ASSET", debitMinor: 0, creditMinor: 0 },
      { accountCode: "4010", accountType: "INCOME", creditMinor: 0 },
    ]);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("reversal (storno) entries", () => {
  it("mirrors debits and credits", () => {
    const reversed = reverseEntry(INVOICE_ENTRY);
    expect(reversed[0]).toMatchObject({
      accountCode: "1100",
      debitMinor: 0,
      creditMinor: 1_000_000,
    });
    expect(reversed[1]).toMatchObject({
      accountCode: "4010",
      debitMinor: 1_000_000,
      creditMinor: 0,
    });
    expect(isPostable(reversed)).toBe(true);
  });

  it("a posted entry plus its reversal nets to zero", () => {
    const lines = [...INVOICE_ENTRY, ...reverseEntry(INVOICE_ENTRY)];
    const { balanced, debitsMinor, creditsMinor } = entryTotals(lines);
    expect(balanced).toBe(true);
    expect(debitsMinor).toBe(creditsMinor);
    expect(
      accountBalanceMinor(
        "ASSET",
        lines.filter((l) => l.accountCode === "1100"),
      ),
    ).toBe(0);
  });
});

describe("account balances and trial balance (invariant 4)", () => {
  it("knows which side each account type grows on", () => {
    expect(normalBalance("ASSET")).toBe("DEBIT");
    expect(normalBalance("EXPENSE")).toBe("DEBIT");
    expect(normalBalance("LIABILITY")).toBe("CREDIT");
    expect(normalBalance("EQUITY")).toBe("CREDIT");
    expect(normalBalance("INCOME")).toBe("CREDIT");
  });

  it("returns balances in the account's natural direction", () => {
    const income = [
      { accountCode: "4010", accountType: "INCOME" as const, debitMinor: 0, creditMinor: 500_000 },
    ];
    expect(accountBalanceMinor("INCOME", income)).toBe(500_000);

    const receivable = [
      {
        accountCode: "1100",
        accountType: "ASSET" as const,
        debitMinor: 1_000_000,
        creditMinor: 400_000,
      },
    ];
    expect(accountBalanceMinor("ASSET", receivable)).toBe(600_000);
  });

  it("produces a trial balance that balances for a realistic day of postings", () => {
    const lines = [
      // invoice issued
      { accountCode: "1100", accountType: "ASSET" as const, debitMinor: 1_000_000, creditMinor: 0 },
      {
        accountCode: "4010",
        accountType: "INCOME" as const,
        debitMinor: 0,
        creditMinor: 1_000_000,
      },
      // payment received net of gateway fee
      { accountCode: "1010", accountType: "ASSET" as const, debitMinor: 993_000, creditMinor: 0 },
      { accountCode: "5090", accountType: "EXPENSE" as const, debitMinor: 7_000, creditMinor: 0 },
      { accountCode: "1100", accountType: "ASSET" as const, debitMinor: 0, creditMinor: 1_000_000 },
      // cash expense
      { accountCode: "5040", accountType: "EXPENSE" as const, debitMinor: 50_000, creditMinor: 0 },
      { accountCode: "1030", accountType: "ASSET" as const, debitMinor: 0, creditMinor: 50_000 },
    ];

    const trial = trialBalance(lines);
    expect(trial.balanced).toBe(true);
    expect(trial.debitsMinor).toBe(trial.creditsMinor);
    expect(trial.rows.map((r) => r.accountCode)).toEqual([
      "1010",
      "1030",
      "1100",
      "4010",
      "5040",
      "5090",
    ]);

    const receivableRow = trial.rows.find((r) => r.accountCode === "1100");
    expect(receivableRow?.balanceMinor).toBe(0); // invoiced then fully paid
  });
});

describe("invoice position (invariant 5)", () => {
  it("computes what is still owed after payments and approved discounts", () => {
    const result = invoiceOutstanding({
      totalMinor: 1_000_000,
      paidMinor: 400_000,
      discountMinor: 100_000, // e.g. staff-ward discount, approved, posted separately
    });
    expect(result.outstandingMinor).toBe(500_000);
    expect(result.settled).toBe(false);
  });

  it("surfaces an overpayment instead of clamping it to zero", () => {
    const result = invoiceOutstanding({
      totalMinor: 1_000_000,
      paidMinor: 1_050_000,
      discountMinor: 0,
    });
    expect(result.outstandingMinor).toBe(0);
    expect(result.overpaidMinor).toBe(50_000);
    expect(result.settled).toBe(true);
  });

  it("treats a fully discounted invoice as settled with nothing collected", () => {
    const result = invoiceOutstanding({
      totalMinor: 500_000,
      paidMinor: 0,
      discountMinor: 500_000,
    });
    expect(result.settled).toBe(true);
    expect(result.outstandingMinor).toBe(0);
  });
});

describe("arrears ageing", () => {
  it("buckets days overdue at the documented boundaries", () => {
    expect(ageingBucket(-5)).toBe("CURRENT");
    expect(ageingBucket(0)).toBe("CURRENT");
    expect(ageingBucket(1)).toBe("D0_30");
    expect(ageingBucket(30)).toBe("D0_30");
    expect(ageingBucket(31)).toBe("D31_60");
    expect(ageingBucket(60)).toBe("D31_60");
    expect(ageingBucket(61)).toBe("D61_90");
    expect(ageingBucket(91)).toBe("D90_PLUS");
  });

  it("builds a per-student ageing report the bursar can act on", () => {
    const asOf = new Date("2026-10-13T00:00:00.000Z");
    const report = buildAgeingReport(
      [
        {
          studentId: "stu_1",
          outstandingMinor: 300_000,
          dueDate: new Date("2026-11-01T00:00:00.000Z"),
        }, // not yet due
        {
          studentId: "stu_1",
          outstandingMinor: 200_000,
          dueDate: new Date("2026-09-20T00:00:00.000Z"),
        }, // 23 days
        {
          studentId: "stu_2",
          outstandingMinor: 150_000,
          dueDate: new Date("2026-06-01T00:00:00.000Z"),
        }, // >90
        { studentId: "stu_3", outstandingMinor: 0, dueDate: new Date("2026-06-01T00:00:00.000Z") }, // settled, ignored
      ],
      asOf,
    );

    expect(report.buckets.CURRENT).toBe(300_000);
    expect(report.buckets.D0_30).toBe(200_000);
    expect(report.buckets.D90_PLUS).toBe(150_000);
    expect(report.totalMinor).toBe(650_000);
    expect(report.byStudent.map((s) => s.studentId)).toEqual(["stu_1", "stu_2"]); // biggest debtor first
    expect(report.byStudent[0].totalMinor).toBe(500_000);
  });

  it("is empty but valid when nobody owes anything", () => {
    const report = buildAgeingReport([], new Date("2026-10-13T00:00:00.000Z"));
    expect(report.totalMinor).toBe(0);
    expect(report.byStudent).toEqual([]);
    expect(Object.values(report.buckets).every((v) => v === 0)).toBe(true);
  });

  it("keeps the thousand-kobo constant honest", () => {
    expect(THOUSAND).toBe(1000);
    expect(formatNaira(THOUSAND)).toBe("₦10.00");
  });
});
