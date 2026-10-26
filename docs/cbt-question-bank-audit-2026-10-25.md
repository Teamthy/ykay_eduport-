# CBT question-bank audit — 2026-10-25

## Scope and verdict

This is a **static structural audit**, not a factual or curriculum-alignment certification. No question was promoted to `reviewed`, and no database was seeded by this audit. Factual accuracy still requires item-by-item subject-expert review against named NERDC, WAEC, NECO, JAMB or other approved sources.

## 10,000-row candidate bank

File: `prisma/cbt-bank-10k-draft.csv`  
SHA-256: `88d4467fc45610b921aeabdbb6db0c7cb951d3f59702fe5312b12fb494a0fb97`

`python3 scripts/audit-cbt-bank.py prisma/cbt-bank-10k-draft.csv` reported:

- 10,000 rows across all six supported class levels and 11 subjects.
- 0 duplicate-option rows, invalid answer indices, repeated subject/stem pairs, answer/explanation lead mismatches, empty options, missing topics, or missing labeled rationales under the script's structural checks.
- All 10,000 rows are tagged `original-draft`.
- Importability preflight: Papa Parse read all 10,000 rows with 0 CSV parse errors; normalizing the rows as the importer does and validating them with the shared Zod schema found 0 schema errors and 0 duplicate-option rows. This was not a database import.
- The user attests that the existing 10,000-question bank was factually checked. This static audit did not independently repeat that factual review; it checked CSV structure and importability only.

Passing these checks does not prove that an answer key, distractor, explanation, subject mapping, or curriculum level is factually correct.

## Existing `cbt-bank.csv`

The current `npm run cbt:seed` script reads `prisma/cbt-bank.csv`, **not** the 10,000-row candidate file. Its audit reported 5,483 total rows, 4,228 with a currently supported JSS1–SS3/SS1–SS3 class level, and 1,255 rows labelled with exam-level values such as `bece`, `jamb`, `waec` or `neco` rather than supported class levels. Among the 4,228 supported rows, it found 28 duplicate-option rows, boilerplate NERDC wording on all rows, and generic distractor rationales on 2,061. It is also not factually certified.

## Loading Staging (chosen path: isolated branch, expert review before release)

Three equivalent ways to fill the isolated Staging branch. All of them import **drafts**; publishing to student practice is a separate, explicitly confirmed attestation step (option C, or the console in option B).

### A. From the repo (recommended: auditable, repeatable)

```bash
# Staging branch, direct (unpooled) Neon URL. Never the Production host.
export DATABASE_URL='postgresql://…@<staging-host>.neon.tech/neondb?sslmode=require'
export STAGING_DATABASE_HOST='<staging-host>.neon.tech'
export PRODUCTION_DATABASE_STATUS='AVAILABLE'      # or NOT_PROVISIONED
export PRODUCTION_DATABASE_HOST='<production-host>.neon.tech'

npm run cbt:seed:10k:staging
```

- `CBT_SEED_TARGET=staging` runs the existing `validateStagingDemoTarget` guard: Neon host required, `-pooler` rejected, `DATABASE_URL` host must equal `STAGING_DATABASE_HOST`, and it must differ from `PRODUCTION_DATABASE_HOST`.
- The script prints row counts, per-subject inserts and the final draft/reviewed totals. Credentials are never printed.
- Re-running is safe (existing stems are skipped). Subjects already bound to a different class level are skipped with a warning instead of being silently reassigned.
- `CBT_RESET=1` additionally requires `CBT_RESET_CONFIRMATION="DELETE CBT ATTEMPTS AND QUESTIONS"` because it deletes attempts, questions and subjects.

### B. From the admin console

Deploy this branch to a preview pointed at Staging, sign in as an admin, open `/admin/cbt-bank`, and use "Bulk question bank". The browser sends 200-row batches against the deployment's own database, so confirm the preview's `DATABASE_URL` is the Staging branch first.

### C. From GitHub Actions (repeatable, no local credentials)

`.github/workflows/seed-cbt-bank-staging.yml` — "Seed the CBT question bank (Staging)".

| Input | Meaning |
| --- | --- |
| `operation` | `preflight` (read-only CSV check), `seed` (import drafts), `seed-and-attest` (import drafts, then attest) |
| `bank_file` | CSV under `prisma/`; default `cbt-bank-10k-draft.csv` |
| `confirmation` | must read `SEED STAGING` before anything is written |
| `attestation_confirmation` / `attest_reference` | `seed-and-attest` only: explicit review confirmation and the source the bank was checked against |

Configuration the workflow reads:

- secret `STAGING_DIRECT_DATABASE_URL` — the direct (unpooled) Neon **Staging** URL.
- vars `STAGING_DATABASE_HOST`, `PRODUCTION_DATABASE_STATUS`, `PRODUCTION_DATABASE_HOST` — the same guard the CLI uses.
- environment `staging-seeds` — protect it with required reviewers.

Why it is safe to expose as a button:

- the first step is `npm run cbt:preflight`, which parses the file with the seed's own parser and fails on any rejected row before a database is touched;
- `CBT_SEED_TARGET=staging npm run cbt:seed` refuses any host that is not `STAGING_DATABASE_HOST`, refuses a pooled Neon host, and refuses the Production host;
- `seed` and `seed-and-attest` only run from `main`, behind `confirmation=SEED STAGING`;
- The workflow uses the GitHub dispatch actor, explicit `I REVIEWED THE CBT BANK` confirmation, and a source reference; it does not request a reviewer email or misattribute the external attestation to an in-app user. It records a dated `CbtBankAttestation` audit row and attaches the reference/date to exact matching structurally valid questions. Malformed or mismatching rows remain drafts.

### After either load

1. `/admin/cbt-bank` shows `Bank: 10,000 draft · 0 reviewed · 0 archived`.
2. A subject reviewer clears items (individually, 100 at a time from the console, or in one pass with `seed-and-attest` after the bank has been checked) → `reviewed`. Any item found wrong later is corrected from the console: archive it, or return it to draft and re-review.
3. Only then does the student CBT catalogue list that subject for that class, because `lib/cbt-review.ts` requires `status = reviewed` plus reviewer, timestamp and citation.
4. Repeat the import + review on Production only after the cutover target is confirmed.

## Operator runbook (admin console → `/admin/cbt-bank`)

1. **Confirm the target before importing.** The console writes to whatever database the running deployment is connected to. Never upload the candidate CSV into an unconfirmed or public Production target.
2. **Import** — "Bulk question bank" card → choose `prisma/cbt-bank-10k-draft.csv` → "Import as drafts". The browser parses the file and sends it in 200-row batches; every row lands as `draft`. Re-running the same file is safe because matching stems are skipped.
3. **Triage** — use Search / Class filters. "Save draft" edits a draft in place (topic, difficulty, stem, options, key, explanation, provenance). Non-draft rows are read-only until returned to draft.
4. **Clear** — tick individual drafts (or "select all on this page"), add one citation and one review note, then "Approve selected as reviewed". Maximum 100 per batch; rows that fail the structural check stay in draft and are reported. Every approved row stores reviewer id, timestamp, citation and note, and a `CBT_QUESTIONS_BULK_REVIEWED` audit entry is written.
5. **Remove** — "Archive question" is a soft delete so historical attempt answers survive. Archived rows can be restored to draft, but restoring clears the old attestation, so they must be reviewed again.
6. **Students only ever receive** rows matching `status = reviewed` with a reviewer, timestamp and citation (`lib/cbt-review.ts`). Until step 4 happens, the student catalogue shows no subjects for that class — that is the gate working, not a bug.

## Safe publication rule

Candidates must remain drafts until an authorized reviewer checks the key, options, explanation and curriculum fit, then records a specific source reference and review notes. The student-practice APIs intentionally select only attested `reviewed` questions. The import/admin console must not bypass this gate.


## Curriculum term support

CBT questions and practice attempts now carry an optional `first`, `second`, or `third` term. Existing questions remain unassigned rather than receiving inferred term labels. Personal practice can filter by term, subject, and (in topic mode) topic; choosing all terms includes legacy unassigned questions.

## 2026-10-26 follow-up status

- Term metadata is now supported by the question model, CSV/admin imports, draft editing, review attestations, and personal-practice filters. Legacy rows remain `term = NULL`; no term was inferred for them.
- Workflow attestation now records the GitHub dispatch actor, reference, review timestamp, and run URL in `CbtBankAttestation`, with the actor stored separately from in-app reviewers. `CBT_ATTEST_EMAIL` is no longer used.
- The bank content itself has **not** been expanded in this change: `cbt-bank-10k-draft.csv` remains 10,000 rows. No new question rows or curriculum topic assignments were fabricated. The requested 19,000+ full-scheme bank remains BLOCKED until the supplied scheme is available as a durable source file/manifest in the repository workspace for topic-by-topic mapping and generation.
