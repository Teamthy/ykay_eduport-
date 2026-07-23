# Phase 4 — Academic Delivery & Results (4A + 4B + 4C)

Branch: `phase/4-academics`. Converts the academic core from mock pages into database-backed,
authorized workflows (userflow Flows 4.3–4.5, 4.10, 5.2, 9.1).

## 4A — Gradebook → Lock → Report Cards
- `GradebookStatus`, `SubjectGradebook`, `GradebookEntry` models (OPEN → SUBMITTED → LOCKED)
- `lib/gradebook.ts` — WAEC grading, score clamping, session/term resolution, auto-provisioning
- `GET/POST /api/teacher/gradebook` — live score sheets with server-side validation
- `GET/PATCH /api/admin/gradebook/locks` — admin lock/reopen console
- `GET/POST /api/admin/report-cards/generate` — refuses until every subject is LOCKED, then compiles
  DRAFT report cards with class positions, live attendance %, and open fee balances
- Rebuilt `/teacher/gradebook` and `/admin/gradebook-lock` pages
- Seed: `npm run db:bootstrap-gradebooks` (3 SUBMITTED gradebooks for SS2A)

## 4B — CBT Exam Engine
- Models: `Exam`, `ExamQuestion` (MCQ / TRUE_FALSE / FILL_BLANK / ESSAY), `ExamAttempt`,
  `ExamAnswer`, `ExamRetake`
- `lib/exams.ts` — bulk question parser (documented text format), objective auto-grading,
  attempt finalization
- Teacher (`/teacher/cbt-center`, APIs `/api/teacher/exams*`):
  create exams per subject/class, bulk-paste questions, publish/close, view results,
  grade essays inline, release/hide results, grant per-student retakes
- Student (`/student/exams`, `/student/exams/[id]`, APIs `/api/student/exams*`):
  live exam list with scores after release; full-screen runner with countdown + auto-submit,
  15s autosave, deterministic question shuffle, flag-for-review navigator,
  tab-switch recording (anti-cheat, reported to the teacher)
- Retake flow: second attempts blocked unless the teacher grants a retake (single-use)

### Bulk question format (paste into CBT Center)
```
Q: What is 2 + 3?
A: 4
B: 5
C: 6
D: 7
Correct: B

Q: The sun rises in the east.
Correct: TRUE

Q: The capital of Nigeria is ___
FILL: Abuja

Q: Explain photosynthesis.
ESSAY
Marks: 5
```
Blank line between questions. Optional `Marks: n` per question.

## 4C — Broadsheet & QR Verification
- `GET /api/admin/broadsheet?classId=` — latest report per student, subject columns,
  subject averages, class average, ranked
- `/admin/broadsheet` — print-ready one-page class broadsheet (uses existing print CSS)
- `/verify/report/[reportNumber]` — public QR verification page: AUTHENTIC (released reports
  only, shows student/term/overall) or NOT VERIFIED
- `LiveReportCardPreview` now renders a verification QR + link on every report card
- AdminSidebar: Broadsheet link added

## Stepwise ingestion

```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
git checkout main; git pull; git status            # clean, after 3G PR merged
git checkout -b phase/4-academics

.\phase-4-ingest-b64.ps1                           # expect 19 green lines

npx prisma generate
npx prisma migrate dev --name phase_4_academics
npm run db:bootstrap-gradebooks

Remove-Item -Recurse -Force .next                  # avoid stale-cache type errors
npm run build

# Smoke test (npm run dev)
#  A. teacher -> /teacher/gradebook: enter scores, Save, Submit Final
#     admin  -> /admin/gradebook-lock: lock all 3 subjects -> class shows Ready -> Generate Drafts
#     admin  -> /admin/report-cards: release one -> parent email queued + bell alert (3G)
#  B. teacher -> /teacher/cbt-center: create exam, paste questions, Publish
#     student -> /student/exams: Start -> answer -> Submit (try switching tabs: recorded)
#     teacher -> Results: grade essay, Release Results -> student sees score
#     teacher -> grant Retake -> student can retake once
#  C. admin  -> /admin/broadsheet: pick class, Print/Save PDF
#     scan QR on any released report card -> /verify/report/... shows AUTHENTIC

git add -A
git commit -m "Phase 4: gradebook pipeline, CBT exam engine, broadsheet + QR verification"
git push -u origin phase/4-academics
# PR: https://github.com/Teamthy/ykay_eduport-/compare/main...phase/4-academics
```

## Next phase
`phase/5-operations` — Teacher & Class Manager, student directory + archive, ID cards with QR,
staff QR check-in attendance, finance completion (expenses, fee-lock), Post & News CMS, messaging.
