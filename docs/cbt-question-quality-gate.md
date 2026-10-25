# CBT question-bank quality gate

## Acceptance status

Two separate CSV banks are present and must not be conflated:

- The existing `prisma/cbt-bank.csv` contains 5,483 rows, including 4,228 rows for JSS1–JSS3/SS1–SS3. The default audit (`python3 scripts/audit-cbt-bank.py`) reports 28 target-level rows with repeated options, 4,228 explanations containing the same curriculum boilerplate, and 2,061 with generic distractor rationales. Its zero invalid answer indices, zero answer-lead mismatches, and zero duplicate subject/stem pairs are structural checks only; they do **not** establish factual correctness.
- `scripts/generate-cbt-bank.py` reproducibly creates `prisma/cbt-bank-10k-draft.csv`, a separate set of exactly 10,000 original-draft items. The distribution is Mathematics 3,200; English Language 1,800; Computer Studies 600; Basic Science 900; Social Studies 500; Biology 500; Chemistry 500; Physics 500; Government 500; Economics 500; and Literature in English 500. It covers all six requested class levels. Run `python3 scripts/audit-cbt-bank.py prisma/cbt-bank-10k-draft.csv` to audit that file.

The generated file passes the current structural gate: 10,000 target-level rows; four non-empty, distinct options per row; valid answer indices; a key that matches the answer label in the explanation; four labelled option-level rationales; no duplicate subject/stem pairs; no missing topics; and `source=original-draft` on every row. These checks cannot determine whether a question, distractor, rationale, difficulty, or class/topic assignment is correct or unambiguous in its subject context. **Factual accuracy and NERDC/WAEC alignment remain NOT VERIFIED.** The generator and repository do not contain a versioned official syllabus/source set or a subject-expert answer key. The generated file is not imported or seeded by this work.

## Serving and review rules

- `prisma/cbt-bank.csv` and `/api/admin/cbt/import` create **draft** content only. Generation, import, and seeding are not review.
- Student catalogue, topic, draw, check, and session endpoints require `status=reviewed` plus a reviewer ID, review date, and non-empty reference. Legacy `published` labels do not qualify.
- The database check constraint prevents a question from being marked `reviewed` without its reviewer and citation fields.
- Admins can review candidates at `/admin/cbt-bank`. Approval requires four distinct non-empty options, a valid 0–3 key, an explanation, a curriculum/exam citation, and substantive review notes. The reviewer must still manually verify that the stem, key, every distractor rationale, class/topic alignment, and single best answer are correct against the cited source.
- The seed job clears review attestations and returns synchronized CSV rows to draft. It must not be run against a production bank without an explicitly confirmed target and migration/seed authorization.

## Before claiming launch readiness

1. Supply versioned NERDC/WAEC curriculum references and subject-expert-reviewed source sets for all six classes and included subjects.
2. Reconcile each question to a class, subject, syllabus topic, source citation, answer key, and explanatory rationale; correct or reject ambiguous, inaccurate, or out-of-level items.
3. Have a second reviewer independently solve questions and spot-check all subjects; record corrections and reviewer/date provenance.
4. Confirm how reviewed questions will be merged into the served bank. Do not replace or synchronize the existing bank with the generated draft CSV without a reviewed migration plan and authorization.
5. Run the structural audit and verify database counts against a confirmed non-production target before authorizing any import/review operation.
