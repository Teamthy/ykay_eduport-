# 05 — Financial system (the strong one)

Goal: five years of a school's money that survives an audit, a bursar change, a
bank reconciliation and a parent dispute — without a spreadsheet shadow system
growing beside it.

---

## 1. What exists today (measured)

**Present and good:**

- `FeeStructure` + `FeeStructureItem` → `FeeInvoice` + `FeeInvoiceItem` →
  `FeePayment` + `FeePaymentAttempt`; amounts are integers in minor units.
- Paystack integration with signature-verified webhooks, `IdempotencyRecord`,
  refund/transfer paths (`lib/paystack.ts`, `lib/idempotency.ts`).
- Receipt numbering with retry-uniqueness (`lib/finance.ts`
  `generateUniqueReceiptNumber`), parent and admin finance contexts, fee lock,
  reminders, parent payment UI, receipt PDF (`lib/receipt.ts`).
- `Expense` (flat `category` string) and `Budget` (per term/session/category).
- `AuditLog` + `SecurityEvent`, and the super-admin finance overview.

**Missing — and each one is a real audit finding:**

| Gap | Consequence if left |
|---|---|
| No chart of accounts, no double-entry journal | Cannot produce a trial balance, income statement or balance sheet from the system; the accountant keeps the real books in Excel |
| No fiscal period / close | Nothing stops a posting into a closed term; prior-year numbers mutate |
| No bank reconciliation | Payment records and the bank statement are never proven equal |
| No arrears/ageing model | Defaulters are found by looking, not by report |
| No discounts/scholarships/bursaries model | Waivers get applied as manual invoice edits — the classic fraud surface |
| No approval limits / segregation of duties | The same person can raise, discount, collect and reverse |
| No immutable posting trail | An amount can be edited in place; the audit trail shows a new value, not the old |
| No payroll | Salary is the largest expense line and lives outside the system |
| No unallocated-payment handling | Transfers without a reference float forever as "probably this student" |
| Receipt/reference generators not tenant-scoped | Collision or ambiguity the moment two schools share a database |

`lib/finance.ts` is **128 lines** — status helpers and number generators. That is
the whole finance layer. Everything below is new.

---

## 2. Phase 1 — the ledger (do this before term 1, no exceptions)

### 2.1 Chart of accounts (draft with the bursar, not alone)

```
1000 Assets
  1010 Bank — Main (Paystack settlement)
  1020 Bank — Operations
  1030 Cash — Bursary
  1100 Fees Receivable (per-student sub-ledger)
  1150 Staff Advances
1200 Liabilities
  2010 Fees Received in Advance (unearned)
  2020 Payroll Liabilities (PAYE / Pension / NHIA payable)
  2030 Supplier Payables
3000 Equity / Fund Balance
  3010 Opening Balance
  3900 Retained Surplus
4000 Income
  4010 Tuition Fees · 4020 Boarding · 4030 ICT/Levies · 4040 Admission Fees
  4050 Exam Fees · 4060 Transport · 4070 Other Income · 4090 Discounts & Waivers (contra)
5000 Expenses
  5010 Salaries · 5020 Statutory Contributions · 5030 Teaching Materials
  5040 Utilities · 5050 Repairs & Maintenance · 5060 Transport & Fuel
  5070 ICT & Software · 5080 Marketing · 5090 Payment Gateway Fees
  5100 Bank Charges · 5110 Professional Fees · 5120 Depreciation · 5900 Sundry
```

Ask the bursar four questions while drafting: what fee categories does the school
actually collect? what discounts exist (staff ward, sibling, scholarship,
bursary, early-payment)? which expenses are recurring vs. one-off? who authorises
spending above ₦X?

### 2.2 Models

```prisma
model Account {
  id        String @id @default(cuid())
  schoolId  String
  code      String            // "4010"
  name      String
  type      AccountType       // ASSET LIABILITY EQUITY INCOME EXPENSE
  parentId  String?
  isContra  Boolean @default(false)
  isActive  Boolean @default(true)
  @@unique([schoolId, code])
}

model FiscalPeriod {
  id        String   @id @default(cuid())
  schoolId  String
  label     String            // "2026/2027 · Term 1"
  startsAt  DateTime
  endsAt    DateTime
  status    PeriodStatus      // OPEN | SOFT_CLOSED | CLOSED
  closedAt  DateTime?
  closedByUserId String?
  @@unique([schoolId, label])
}

/// Append-only. Never updated, never deleted — corrections are reversing entries.
model JournalEntry {
  id          String @id @default(cuid())
  schoolId    String
  periodId    String
  entryDate   DateTime
  memo        String
  sourceType  String            // FEE_INVOICE FEE_PAYMENT DISCOUNT REFUND EXPENSE PAYROLL ADJUSTMENT OPENING
  sourceId    String?
  reversalOfId String?          // set on a storno entry
  postedByUserId String
  postedAt    DateTime @default(now())
  hash        String            // hash of the lines — tamper evidence in exports
  @@unique([schoolId, sourceType, sourceId])   // one posting per business event = idempotent
  @@index([schoolId, periodId, entryDate])
}

model JournalLine {
  id             String @id @default(cuid())
  entryId        String
  accountId      String
  debitMinor     Int    @default(0)   // minor units; debit XOR credit per line
  creditMinor    Int    @default(0)
  studentId      String?              // sub-ledger: fees receivable per student
  staffId        String?
  vendorId       String?
  note           String?
  @@index([accountId, entryId])
  @@index([studentId])
}

model BankAccount { id String @id @default(cuid())  schoolId String  name String
  accountNumber String  bankName String  ledgerAccountId String  isActive Boolean @default(true) }

model BankStatementLine {                 // imported CSV from the bank/Paystack settlement report
  id String @id @default(cuid())  schoolId String  bankAccountId String
  valueDate DateTime  amountMinor Int  narration String  reference String?
  matchedJournalEntryId String?  matchedAt DateTime?  importedBatchId String
  @@index([schoolId, bankAccountId, valueDate])
}

model DiscountPolicy {                    // staff ward, sibling, scholarship, bursary, early payment
  id String @id @default(cuid())  schoolId String  name String  kind String
  percent Float?  amountMinor Int?  appliesToFeeItemIds Json  requiresApprovalAboveMinor Int?
  isActive Boolean @default(true) }

model OpeningBalanceLine { id String @id @default(cuid())  schoolId String
  studentId String?  accountCode String  debitMinor Int @default(0)  creditMinor Int @default(0) }
```

### 2.3 Posting rules (one business event → exactly one balanced entry)

| Event | Debit | Credit |
|---|---|---|
| Invoice issued | 1100 Fees Receivable | 4010… Income (by item) |
| Discount/waiver approved | 4090 Discounts & Waivers | 1100 Fees Receivable |
| Payment received (gateway) | 1010 Bank — Main (net) + 5090 Gateway Fees | 1100 Fees Receivable |
| Payment received (cash/transfer) | 1030 Cash / 1020 Bank | 1100 Fees Receivable |
| Fees paid for a future term | 1010 Bank | 2010 Fees Received in Advance |
| Term starts (recognition) | 2010 Fees Received in Advance | 4010 Tuition Fees |
| Expense recorded | 5xxx Expense | 1020 Bank / 1030 Cash / 2030 Payables |
| Payroll run | 5010 Salaries + 5020 Statutory | 1010 Bank + 2020 Payroll Liabilities |
| Refund | 1100 Fees Receivable | 1010 Bank (+ reversal of gateway fee if refunded) |
| Correction | **reversing entry** (`reversalOfId`) | mirror lines |

Invariants the tests must assert:

1. Every `JournalEntry` has ≥ 2 lines and `sum(debits) == sum(credits)` > 0.
2. One entry per `(sourceType, sourceId)` — a replayed webhook cannot double-credit.
3. Posted entries are **never** updated or deleted. Enforce in the DB (trigger or
   RLS policy `FOR UPDATE USING (false)` on posted rows) — app discipline is not enough.
4. `invoice.outstanding == invoice.total − sum(payments) − sum(approved discounts)`, always.
5. Every `FeePayment` has exactly one journal entry; every gateway payment has a
   settlement line; every refund reverses its original.
6. Total of `1100 Fees Receivable` equals the sum of per-student balances in the ageing report.

### 2.4 Operations that make it "strong"

- **Closing ritual**: period SOFT_CLOSED (no new postings, adjustments allowed
  with a reason) → reconciled against the bank → CLOSED (immutable). Monthly,
  and a hard year-end close with the accountant present.
- **Daily cashbook**: collections today, by channel and by class, plus cash
  physically counted at the bursary and signed off. Cash is where schools leak
  money; a daily count with a signature is cheap and effective.
- **Reconciliation worksheet**: import the bank/Paystack settlement CSV, auto-match
  on amount + date + reference, then a human resolves the exceptions (unmatched
  lines, timing differences, gateway fees, chargebacks). Unmatched inbound
  transfers land in a **holding account**, never guessed onto a student.
- **Ageing report**: 0–30 / 31–60 / 61–90 / 90+ days, per student, per class,
  term-to-date, with a "promised to pay" note field. This is the report the
  proprietor actually asks for.
- **Segregation of duties**: a BURSAR can raise invoices and record receipts; a
  reversal, waiver or write-off requires ADMIN/DIRECTOR above a threshold set per
  school. Maker-checker for anything that changes a number already posted.
- **Per-student dedicated virtual accounts** (Paystack/other, recommended):
  every student gets a unique account number; transfers self-matched to the
  student and the invoice. This removes the largest recurring manual burden in
  Nigerian school finance — thousands of unlabelled transfers per term — and
  converts reconciliation from guesswork into matching. Verify pricing with the
  provider and implement after the ledger exists (the ledger is what makes the
  matching trustworthy).
- **Nightly integrity job**: run the six invariants; on failure, page a human and
  freeze postings rather than compound the error.

## 3. Phase 2 — payroll

Payroll is the other half of "strong financial system". Scope:

- `StaffCompensation` (basic, housing, transport, allowances), `PayrollRun`
  (monthly, per period, DRAFT → APPROVED → PAID → POSTED), `Payslip` (gross,
  deductions, net, printable PDF).
- Statutory deductions: **PAYE** (state internal revenue service, progressive),
  **Pension** (contributory scheme: employee/employer percentages),
  **NHF**, **NHIA** where applicable — model them as configurable rate tables,
  **not hardcoded numbers**, and have the school's accountant sign off the rates
  and thresholds before go-live. Rates and thresholds change; the system must not
  need a deploy when they do.
- Lateness/absence deductions sourced from the attendance system
  (`03-gps-attendance.md`) under rules the school writes down first.
- Staff advances and loans with scheduled recovery.
- Outputs: payslips, bank upload file, statutory schedules, and the journal entry
  that posts the run.

Sequencing: payroll after the ledger and after a full term of fee operations has
settled. It is the highest-consequence automation in the system — a wrong salary
run costs trust immediately.

## 4. Phase 3 — control and insight (the reason the proprietor pays)

Budget vs. actual by category and term with commitments; fixed-asset register with
depreciation; supplier/procurement cycle; termly board pack (income statement,
balance sheet, cash flow, arrears, budget variance, cost per student, collection
rate); 5-year trend view; and an auditor export (all journal entries + lines with
the tamper hash, plus a signed trial balance) as XLSX/CSV.

## 5. Nigerian payment realities to design for

- **Settlement timing**: gateway money arrives T+1/T+2 — reconciliation must
  accept a gap between `FeePayment` and the bank line rather than flag it as an error.
- **Gateway fees** are an expense line, not a rounding error; post them net so the
  P&L tells the truth about cost of collection (repo's own cost docs note
  Paystack's education rate and cap — verify current rates before quoting).
- **Channels in use**: cash at the bursary, bank deposit, transfer, POS, gateway.
  Each posts differently and each needs its own reconciliation path.
- **Partial payments and instalments** must be first-class (many families pay in
  three tranches) — the ageing report and receipting must handle it without
  splitting invoices manually.
- **Bank-transfer verification today is blocked by missing bank details** — see
  `docs/ONBOARDING-GAPS.md §4`. Collect bank name/account/account name from the
  new school at onboarding; virtual accounts make this largely moot.
- **Receipt numbering must be tenant-scoped and gap-free per school** — auditors
  ask "were any receipts missing?". Make that question answerable with a query.

## 6. Definition of done

- [ ] Chart of accounts, fee categories, discount policies and approval limits signed off by the bursar and proprietor.
- [ ] Journal models + posting rules implemented; the six invariants are **tests**, and the nightly job asserts them in production.
- [ ] Posted entries immutable at the DB level (verified by a test that tries to update one and fails).
- [ ] One full term: invoiced → collected (all channels) → receipted → reconciled to the bank statement → period closed, with a reconciliation sign-off from a human.
- [ ] Ageing, cashbook, collection and budget-variance reports match a manual sample within ₦0.
- [ ] Gateway flow: webhook verified, idempotent under replay, refunds reverse correctly, fees posted net.
- [ ] Opening balances posted and the trial balance is zero at the cut-over date.
- [ ] Segregation of duties enforced: a bursar cannot reverse their own posting above the threshold.
- [ ] Auditor export produced and spot-checked by the school's accountant.
- [ ] Payroll (phase 2) either live or explicitly deferred with a written date.
- [ ] Backup + restore drill includes the ledger, and a documented restore protocol says how postings after a restore point are re-established (no silent gaps in the audit trail).
