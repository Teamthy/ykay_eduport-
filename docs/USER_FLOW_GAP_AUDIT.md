# Ykay EduPortal — User-Flow Implementation Audit

Audit basis: `userflow.md` compared with the existing Next.js source on 22 July 2026.

## Status language

- **Implemented UI** — a user can see and navigate the screen.
- **Prototype only** — interactions exist, but use mock data, browser state, alerts, or simulated payments.
- **Production workflow** — persisted data, authorization, validation, auditability, and external integrations exist.

## What existed before Phase 1

| Flow area | Existing state | Important gap |
|---|---|---|
| Public website discovery (1.1) | Implemented UI | Strong brochure pages, but no real enquiry delivery, event RSVP, virtual tour, homepage stats, or complete navigation/content architecture from the flow document. |
| Admissions application (1.2) | Prototype only | A six-step UI existed, but it skipped step validation, did not upload documents, used an alert in place of Paystack, generated a fake success on API failure, and wrote PII to a server-local JSON file. |
| Application status (1.3) | Prototype only | Lookup redirected the parent to a raw API JSON response. |
| First-time school setup (2.1) | Missing | No configuration wizard or persisted school/session setup. |
| Login, role redirect, 2FA (2.2–2.4) | Demo only | Login uses role buttons and `localStorage`; API compares plaintext passwords in a JSON file and returns a mock token. No route protection, sessions, 2FA, first-login password change, or parent child switcher. |
| Password reset (2.5) | Placeholder | API responses exist, but no token storage, email, reset page, password update, or session invalidation. |
| Admin overview (3.1) | Implemented UI / mock data | Dashboard is visually rich but not backed by school records. |
| Student enrolment (3.2) | Missing | No enrolment route, data workflow, or generated student/parent accounts. |
| Application processing (3.3) | Prototype only | `admin-admissions` is a hard-coded two-row table with no protected review or decision workflow. |
| Fees and financial reports (3.4–3.5) | Prototype only | Fee and parent-payment screens use hard-coded data; the Paystack modal simulates card entry and must not be used in production. |
| Classes, timetable, staff, promotion, EMIS (3.6–3.11) | Mostly missing | A few related screens exist, but no database workflows or required generation/reporting logic. |
| Teacher dashboard, attendance, gradebook, CBT, questions (4.1–4.11) | UI prototypes | Numerous screens exist, but actions are local/mock; no persistence, parent alerts, approval, anti-cheat enforcement, assignment workflow, virtual class, or learning-hub storage. |
| Student dashboard, exams, learning, report cards, wellbeing (5.1–5.7) | UI prototypes | Dashboard, attendance, report-card and exam interfaces exist, but no secured student identity, real exam attempts, results release, learning materials, or wellbeing workflow. |
| Parent dashboard, fees, attendance, messages, events (6.1–6.7) | UI prototypes | The screens use mock data and simulated payment/message actions; no child authorization, verified payments, real-time alerts, or RSVP persistence. |
| HOD and Director flows (7.1–8.2) | Missing | No role-specific dashboards or governed workflows. |
| Report-card release and QR verification (9.1) | Partial UI | Report-card display/PDF concepts exist, but no prerequisite checks, immutable release workflow, delivery jobs, or verification route. |
| Automated notifications (10.1–10.3) | Missing | Notification UI exists; no scheduler, provider adapter, delivery log, preferences, or retry behaviour. |
| Administration, health, library, alumni (11–13) | Missing / brochure only | Alumni public page exists; operational systems do not. |

## Phase 1 — Admissions conversion journey (implemented in this phase)

This phase replaces the unsafe admissions prototype with a production-grade foundation:

- Validated six-step application UX matching Flow 1.2.
- Private S3-compatible document uploads using short-lived presigned URLs; documents never enter `public/`, Git, or browser storage.
- Neon/PostgreSQL persistence through a corrected, versioned Prisma schema and initial migration.
- Token-bound draft session for uploads, with a two-hour expiry.
- Paystack hosted checkout (no card fields in the app), server-side transaction verification, and signed webhook handling.
- Upstash-backed public endpoint rate limits; production requests fail closed if this protection is not configured.
- Privacy-conscious status lookup UI/API for Flow 1.3; it no longer exposes raw JSON or parent data.
- Audit records for draft creation and final submission.

## Delivery order after Phase 1

### Phase 2 — Secure identity and school administration foundation

1. Replace demo/localStorage auth with password hashing, HTTP-only sessions, role guards, password-reset email, first-login password change, and account suspension.
2. Add school/session/term configuration and staff invitation workflows.
3. Build protected admin admissions queue: document viewing through temporary signed URLs, approve/decline/waitlist/document-request actions, class placement, notification records, and enrolment hand-off.

### Phase 3 — Daily school operations

1. Student/parent records, classes and arms, subject-teacher assignments.
2. Teacher attendance register, correction path, parent absence alerts, attendance dashboards.
3. Fee structures, invoices, verified Paystack fee payments, receipts, and bursar reports.

### Phase 4 — Academic delivery and results

1. Gradebook, score windows, gradebook lock, result calculations, report-card generation/release, and QR verification.
2. Question-bank approval, CBT exam creation/attempts/results, assignments, and learning-material uploads.
3. Student and parent dashboards backed by authorized records.

### Phase 5 — Communication, governance, and advanced workflows

1. Broadcast delivery service, notification preferences, scheduled reminders, delivery/retry logs.
2. HOD, coordinator, director, and executive analytics.
3. Timetable generation, promotion engine, EMIS exports, health records, inventory/library, canteen, and alumni workflows.

## Non-negotiable production rules

- Remove the previous `.data` JSON API, demo sign-in, and simulated Paystack card modal before public launch.
- Never put applicant documents in Vercel Blob/public storage. Use a private S3-compatible bucket.
- Do not expose `PAYSTACK_SECRET_KEY`, database URLs, S3 credentials, or Upstash tokens to the browser.
- Deploy Prisma migrations before the application build, configure the Paystack webhook, and test with Paystack test keys before moving live.
