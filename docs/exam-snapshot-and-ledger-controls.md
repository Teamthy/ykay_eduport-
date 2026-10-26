# Exam snapshots, payment ledger, and operational controls

## Exam integrity

- `ExamQuestionVersion` is populated by a PostgreSQL trigger for every inserted or updated `ExamQuestion`. Each version stores the exact statement, options, key/text, type, and marks. The database rejects updates/deletes to version rows.
- Publishing a draft and creating its `ExamSnapshot` happen in one transaction. A snapshot freezes assessment settings, the sitting window, total marks, order, and the exact question-version IDs. Snapshot/version/correction rows carry `schoolId` and receive the repository's tenant RLS policies.
- New `ExamAttempt` rows require a snapshot reference. Student runners and grading read only the attempt's snapshot, not the mutable question row. The student's exam response omits keys; practice review remains the deliberate post-submit exception.
- Assessment settings and questions are draft-only at the server API. Question removal archives a row rather than deleting version history. A historical migration backfills a revision and snapshot for all existing exams and links existing attempts and answers; it aborts rather than fabricate a missing answer/question relation.
- Autosaves carry a monotonic client sequence. The attempt row is conditionally claimed in the same transaction as answer writes so a delayed/replayed full-answer payload cannot overwrite a newer accepted save. Finalization first claims the in-progress attempt and grades its snapshot inside one transaction, serializing it with autosave.

## Financial integrity and provider reconciliation

- `FeePayment` is an append-only receipt fact enforced by a database trigger, with restrictive foreign keys so parent/invoice deletion cannot erase it.
- Void/refund requests append one `FeePaymentCorrection` with a negative amount and reason; they do not rewrite the source receipt. The invoice balance is recalculated from posted receipts plus signed corrections. Finance correction requires SUPER_ADMIN and is audited.
- Paystack webhook signatures remain mandatory. Existing payment posting is reference-idempotent and transactional. An authenticated event with an unknown reference or mismatched amount/currency/status is not silently converted to a failed payment: it creates/refreshes a deduplicated `PaymentReconciliationIssue` and logs an actionable error.
- SUPER_ADMIN can inspect open issues at `GET /api/super-admin/payment-reconciliation` and resolve them with a reasoned `PATCH`. Resolving records review only; it never posts money or marks a payment paid. Finance must separately reconcile against the provider statement and use the existing authoritative payment posting path if money should be applied.

## Backups, restoration, and monitoring evidence

- **Historical evidence only:** `docs/backup-restore.md` records a 2026-08-02 restore drill (4.8k invoices; 58 RLS policies). That predates this migration and does not verify restoration of the new trigger/table definitions.
- **NOT VERIFIED for this change:** no database restore drill was run because the task environment has no explicitly confirmed scratch database target. Before production migration, run the existing restore drill against an approved non-production source and restore into a disposable scratch database; verify the schema drift check, RLS coverage, question-version triggers, snapshot links, immutable-payment triggers, and matching row counts. Never point the scratch/restore process at Production.
- Webhook failures/mismatches are returned as retriable 5xx for processing errors or persisted as reconciliation work for authenticated data mismatches. Reconciliation issues and correction actions have server-side role gates and audit paths. Production alert delivery and end-to-end webhook/reconciliation behavior are **NOT VERIFIED** here.

## Validation record for this implementation

- Migration contract and snapshot-helper unit tests were added.
- Static TypeScript/format checks are partially blocked: Prisma Client generation could not download its schema engine from `binaries.prisma.sh` in this sandbox. Do not treat the resulting broad typecheck errors as application regressions or as a passing typecheck; regenerate the client and rerun CI in an environment with Prisma engine access.
- No live database, Paystack, Production, or third-party tests were performed.
