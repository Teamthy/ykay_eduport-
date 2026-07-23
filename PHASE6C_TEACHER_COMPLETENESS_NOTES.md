# Phase 6C — Teacher completeness + CBT fee lock

## Ships
1. **Live TeacherSidebar** — roles from `/api/teacher/dashboard` (no mock `teacherData`, no portal switcher, no Demo badge).
2. **Teacher dashboard** — PortalTopbar shell; subject/form cards; deep-links to gradebook (`?assignmentId=`); open gradebooks + live exams.
3. **Dashboard API enrichment** — gradebooks, exams, classId, gradebookHref on assignments.
4. **Gradebook deep-link** — reads/writes `assignmentId` query param; PortalTopbar (no public Header).
5. **CBT center** — PortalTopbar only.
6. **Fee lock on CBT** — `lib/fee-lock.ts`; blocks **new** exam attempts with HTTP 402 when invoices outstanding; student exams list returns `feeLock` banner.

## Apply
```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
.\phase-6c-teacher-completeness-ingest.ps1
```

## Smoke
- Login as subject-only teacher → sidebar shows Subject teaching, not Form class.
- Login as form teacher → Form class + attendance links.
- Dashboard → click Scores on a subject → gradebook opens that assignment.
- Student with unpaid invoice → Start Exam returns fee lock message.
- Student with paid fees → exam starts normally.
