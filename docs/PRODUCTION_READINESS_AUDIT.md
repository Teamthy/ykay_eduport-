# Ykay EduPortal — Production Readiness Audit
**Branch:** `phase/5b-operations` @ Phase 6E  
**Date:** 2026-07-23

## 1. Executive summary

The platform has moved from brochure + demo shells to a **real multi-portal school system** with Prisma/Neon, auth sessions, admissions, attendance, finance, CBT, IT education, notifications, and staff QR attendance.

**Production-ready for a controlled pilot** once:
1. real `.env` secrets are set,
2. Paystack webhook + S3 + Resend/Upstash are verified,
3. e2e smoke passes against staging,
4. inject/script artifacts are cleaned from the deploy tree,
5. remaining mock portal pages are hidden or clearly labeled.

Not every userflow in `userflow.md` is complete (virtual class, canteen, library, EMIS, HOD deep workflows). Those are **P2/P3**, not launch blockers for core school ops.

---

## 2. What is DONE (shipped through Phase 6E)

| Domain | Status | Notes |
|---|---|---|
| Public brochure site | Strong | Header, Hero, About, Academics, Admissions, Campus, Contact |
| Auth / sessions | Live | JWT httpOnly, bcrypt, role middleware, password reset, mustChangePassword |
| Admissions | Live | Draft, S3 upload, Paystack fee, status, admin review + enroll + entrance |
| People | Live | Staff invite/activate/direct-create; student enroll; parent link; idempotency |
| Attendance (students) | Live | Teacher register, history, corrections, admin analytics |
| Staff QR attendance | Live | Check-in/out, late tracking, badges, self-service |
| Finance | Live | Invoices, Paystack fee payments, bank review, cash, expenses, budgets, reminders |
| Academics | Live | Gradebook, locks, broadsheet, report cards + QR verify |
| CBT | Live | Teacher create, student attempt, fee-lock gate |
| Notifications | Live | Jobs, dispatch, admin console, in-app bell |
| Super-admin | Live | Overview, audit, user rescue |
| News CMS | Live | Admin CMS + public `/news-events` |
| IT education | Partial→stronger in Phase 7 | Hub, courses, portal, APIs; Phase 7 elevates nav + live catalog + UX |
| ID cards | Live | Admin generator from live students |

---

## 3. What is STILL LEFT (prioritized)

### P0 — Before real parents/money (this week)
- [ ] Configure **production** `.env` (see `.env.example` + section 6)
- [ ] Paystack **live** keys + webhook `POST /api/payments/paystack/webhook`
- [ ] Private S3/R2 bucket + CORS for admissions uploads
- [ ] Resend domain verified; test fee reminder + admission emails
- [ ] Upstash Redis for rate limits (or accept degraded limits only in non-prod)
- [ ] Run `npm run test:e2e` against staging base URL
- [ ] Remove/disable `DemoIndicator` in production (Phase 7)
- [ ] `git prune` / stop committing `*.ps1` injectors to deploy branch long-term

### P1 — Pilot polish (next sprint)
- [ ] Replace remaining **mock teacher/student/parent pages** (timetable, messages, behavior, etc.) with live or “coming soon”
- [ ] Strip public `<Header/>` from portal pages still using brochure chrome
- [ ] School setup wizard (session/term/grading) — still missing as guided UX
- [ ] Stronger admissions document preview (signed GET URLs in admin review)
- [ ] CBT anti-cheat UX polish + analytics dashboard for teachers
- [ ] IT certification transcript PDF + public verify page
- [ ] Cron for `/api/jobs/dispatch-notifications` (Vercel cron / external)

### P2 — Product expansion
- [ ] Assignments / learning hub storage
- [ ] Virtual classroom (Jitsi)
- [ ] Parent multi-child switcher UX completion
- [ ] HOD/Director executive dashboards beyond super-admin
- [ ] Promotion engine, EMIS export
- [ ] Canteen, library, health records, alumni ops

### P3 — Hardening
- [ ] Backup/restore runbook for Neon
- [ ] Observability (Sentry), uptime checks
- [ ] Load test fee webhook + attendance peaks
- [ ] Accessibility pass (keyboard, contrast)
- [ ] Data retention / archival policy

---

## 4. Mock / demo debt (inventory)

Still referencing mock/demo patterns (non-exhaustive):
- `components/DemoIndicator.tsx` mounted in root layout
- Several `/teacher/*` secondary pages (performance, evaluations shell, class behavior, messages…)
- Some `/student/*` and `/parent/messages|events` shells
- Homepage still has legacy component names (`Churches`, `Groups`) from earlier brand transform — cosmetic debt

**Core money/identity paths are NOT mock:** admissions pay, school fees, staff invite, gradebook, exams, staff QR.

---

## 5. IT Education — strategy vs code

Strategy wants IT as a **flagship brand pillar**. Code already has hub + 8 course pages + portal + APIs.

Phase 7 upgrades:
- Top-level **IT Education** nav (not buried under Academics only)
- Homepage flagship IT band
- Live course catalog API for hub
- Stronger CTAs into `/it-portal/auth`
- E2E coverage of IT public + API routes

Still later: full certification PDF verify, admin IT analytics, curriculum CMS.

---

## 6. Production `.env` checklist

Copy `.env.example` → `.env.production` / host secrets UI. Required:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon pooled URL |
| `AUTH_SECRET` | ≥32 chars |
| `NEXT_PUBLIC_SITE_URL` | Canonical https URL |
| `PAYSTACK_PUBLIC_KEY` / `PAYSTACK_SECRET_KEY` | Live keys when going live |
| `RESEND_API_KEY` / `EMAIL_FROM` | Transactional email |
| `S3_*` | Private admissions docs |
| `UPSTASH_REDIS_REST_URL` / `TOKEN` | Rate limits |
| `SCHOOL_*` | Profile bootstrap |
| `INITIAL_ADMIN_*` / `SUPER_ADMIN_*` | First operators |
| `SCHOOL_TIMEZONE` / `STAFF_LATE_CUTOFF` | Staff QR late rules |

**Never commit real secrets.** Rotate any key that ever appeared in chat or git history.

---

## 7. Deploy sequence (recommended)

1. `npm ci`
2. `npx prisma migrate deploy`
3. `npm run db:seed-admin` / `db:seed-super-admin` / `db:seed-it-courses` (once)
4. `npm run build && npm start` (or host build command)
5. Configure Paystack webhook + cron for notification dispatch
6. `npm run test:e2e -- --base-url=https://staging...`
7. Smoke critical journeys manually (section 8)
8. `npm run cleanup:artifacts` on deploy clones if inject scripts were copied in

---

## 8. Manual smoke (launch day)

1. Public home → IT Education → course → IT portal signup  
2. Admissions apply → pay (test key) → admin approve/enroll  
3. Parent fee pay + bank transfer review  
4. Teacher attendance + gradebook  
5. Student CBT (fee lock when outstanding)  
6. Staff QR check-in late after cutoff  
7. Super-admin audit log visible  

---

## 9. Definition of “production ready” for Ykay pilot

- [x] `next build` green  
- [ ] Staging e2e smoke green  
- [ ] Live secrets only in host env  
- [ ] Webhook + email + storage verified  
- [ ] No DemoIndicator for real users  
- [ ] Operators trained on admin admissions, fees, staff QR  
- [ ] Rollback plan: previous deployment + `prisma migrate` status known  

---

*This audit supersedes older “everything is mock” language in early gap docs for domains listed in section 2.*
