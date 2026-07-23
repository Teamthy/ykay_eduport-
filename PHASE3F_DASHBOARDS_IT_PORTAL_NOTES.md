# Phase 3F — Live Dashboards, Production Portal Page & IT Education Portal

This phase closes the dashboard/UX gap (userflow Flows 3.1, 4.1, 5.1) and elevates IT Education
from brochure pages into a real product portal (it-education-strategy.md, Phase 2 "Portal &
Enrollment Integration").

## What was implemented

### 1. Live dashboards (mock data removed)
- `GET /api/student/dashboard` — attendance rate, latest released report card, fee balance,
  recent attendance, personal activity feed (from AuditLog)
- `GET /api/teacher/dashboard` — class/student/subject counts, today's register status,
  pending corrections, assignments, recent submitted registers, activity feed
- `GET /api/admin/dashboard` — live school counts, outstanding fees, today's attendance rate,
  IT enrollments, "Needs Attention" queue (pending applications / corrections / draft reports /
  open invoices), school-wide activity feed
- Rebuilt pages: `app/student/dashboard`, `app/teacher/dashboard`, `app/admin` — all fetch live
  data, no more `lib/mockData` / `lib/teacherData` on these pages

### 2. Production-clean /portal page
- Demo banners, "Demo Mode", and mock-data notices removed
- Four cards side by side: **Staff · Student · IT Education · Parent**, each with its own Sign In button
- Admin portal card removed — admins sign in through the Staff card and middleware routes them
  to `/admin` automatically by role
- Staff/Student/Parent buttons → `/login?portal=staff|student|parent` (login page shows portal context)
- IT Education button → `/it-portal/auth` (the only portal with Sign Up)

### 3. IT Education portal (new product surface)
- Schema: `ItCourse`, `ItModule`, `ItEnrollment`, `ItModuleProgress`, `ItCertificate` + `IT_STUDENT` role
- Open self-signup at `/it-portal/auth` (bcrypt, auto session, audit-logged)
- `/it-portal/dashboard` — stats, my courses with progress bars, certificates, free-enrollment catalog
- `/it-portal/courses/[slug]` — module-by-module learning page with content, mark-complete,
  automatic certificate issuance (e.g. `YKIT/2026/PYTHON/XXXXXX`) when all modules complete
- APIs: `POST /api/it/signup`, `POST /api/it/enroll`, `POST /api/it/progress`,
  `GET /api/it/dashboard`, `GET /api/it/courses/[slug]`
- Middleware protects `/it-portal/*` (IT_STUDENT, STUDENT, ADMIN, DIRECTOR); `/it-portal/auth` is public
- Ykay students can use their existing student account in the IT portal (cross-link card on the
  student dashboard)
- Seed: `prisma/seed-it-courses.ts` — 8 courses, 41 modules with real lesson content
  (Digital Literacy, Word, PowerPoint, Excel, Excel Expert, Python, Cybersecurity, AI)

### 4. Login page upgrade
- `?portal=` context headings (Staff / Student / Parent Sign In)
- IT_STUDENT role destination → `/it-portal/dashboard`
- Cross-link to the IT portal auth page
- Safe `next` redirect handling

## Stepwise ingestion (run in PowerShell at the project root)

```powershell
# STEP 0 — make sure you are on a clean main
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
git checkout main
git pull
git status        # must be clean

# STEP 1 — create the phase branch
git checkout -b phase/3f-dashboards-it-portal

# STEP 2 — run the ingestion script (from wherever you saved it)
.\phase-3f-dashboards-it-portal-ingest.ps1

# STEP 3 — regenerate the client and create the migration
npx prisma generate
npx prisma migrate dev --name phase_3f_it_education

# STEP 4 — seed the IT course catalog
npm run db:seed-it-courses

# STEP 5 — verify the build
npm run build

# STEP 6 — smoke test locally
npm run dev
#   /portal                -> 4 production cards, no demo banners
#   /it-portal/auth        -> sign up a test account -> lands on IT dashboard
#   /it-portal/dashboard   -> enroll in Python -> open course -> complete modules -> certificate
#   /login?portal=staff    -> admin credentials -> lands on /admin (live stats)
#   /student/dashboard     -> live attendance/report data (student login)
#   /teacher/dashboard     -> live assignments/registers (teacher login)

# STEP 7 — commit and merge
git add -A
git commit -m "Phase 3F: live dashboards, production portal page, IT education portal"
git push -u origin phase/3f-dashboards-it-portal
# open a PR and merge to main when satisfied
```

## Branch plan going forward
- `phase/3f-dashboards-it-portal` ← this phase
- `phase/3g-notification-delivery` ← next (notification jobs, dispatcher, retries, admin console)
- `phase/4-academics` ← ALL of Phase 4 (4A gradebook ingest + 4B CBT engine + 4C broadsheet/QR)
- `phase/5-operations` ← ALL of Phase 5 (class manager, ID cards, finance completion, comms)
- `phase/6-governance` ← HOD/Director dashboards, promotion engine, timetable, EMIS

## Notes
- The old `/login/admin`, `/login/student`, `/login/parent`, `/login/teacher` pages still exist but
  are no longer linked; they can be deleted in Phase 3G cleanup.
- `lib/mockData.ts` and `lib/teacherData.ts` are still imported by sidebars/other prototype pages;
  they will be fully retired as those pages convert in later phases.
