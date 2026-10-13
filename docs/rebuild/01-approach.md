# 01 — Approach: second school, same platform

**Question asked:** *"A perfect replica of Ykay College full OS for another school — exact same, plus new features, redesign and rebrand. 3,000 users, 5 years straight, Nigeria. Strong financial system inbuilt. GPS clock in/out. Full CBT with 15k questions. WhatsApp Business integrated. What's the approach?"*

This document is the answer. Numbered decision points (`D1`…`D9`) are closed in
`08-workplan-risks-golive.md`; every open one is also listed in
`docs/rebuild/README.md`.

---

## 0. The one-paragraph answer

**Do not fork the code. Deploy the same repository a second time, against its
own database, with the brand made data instead of literals.** The repo is
already multi-tenant (tenant resolution, per-tenant branding row, per-tenant
module flags, super-admin) — so "rebuild it for another school" is *provisioning
work*, not a rewrite. The rewrite is the four new subsystems (finance ledger,
GPS attendance, CBT at 15k items, WhatsApp Business) plus the brand-token
extraction. Doing it as a fork means every security patch, NDPA change, Next.js
upgrade and bug fix for the next five years gets applied twice, by hand, and the
two copies drift within one term.

---

## 1. What actually exists today (measured, not assumed)

Run on this checkout, 2026-10-13:

| Metric | Measured value | How |
|---|---|---|
| API routes | 142 | `find app/api -name route.ts` |
| Pages | 145 | `find app -name page.tsx` |
| Prisma models / enums | 67 / 29 | `prisma/schema.prisma` (1,819 lines) |
| Migrations | 32 | `prisma/migrations/` |
| Unit/integration tests | 67 files | `tests/**/*.test.ts` (Vitest + Playwright) |
| Tenancy | `lib/tenant.ts`, `School.modules`, `TenantBranding` | already built |
| Branding injection | CSS variables at root layout | `app/layout.tsx:114-171` |
| CBT bank | **5,483 items** (3.1 MB CSV) | `wc -l prisma/cbt-bank.csv` |
| Brand literals | **550 findings in 153 shipping files** (579 repo-wide) | `npm run audit:brand` |
| Tenant-route coverage | 114 tenant routes: **1 RLS-scoped, 95 app-filter, 18 UNCOVERED** | `npm run check:tenant-coverage` |
| Notification queue drain | **25 jobs per run, cron once daily 08:00** | `vercel.json` + `lib/notifications.ts:305` |

Six role portals, Paystack payments, S3/R2 presigned uploads, attendance with
QR badges, report cards, admissions pipeline, Expo mobile app with offline
write-queue, Sentry, RLS migrations, audit logs, super-admin console. This is
not a prototype — it is a working school OS.

**The honest gap list** (these are the things that will bite on school #2, and
each has its own section below):

1. Postgres RLS is installed but **enforces nothing** — the policy is fail-open
   and `withSchool()` is used in 3 places, while 18 tenant routes have no
   `schoolId` filter at all (`docs/TENANCY_RLS_STATUS.md`). Perfectly fine for
   one school. A cross-tenant leak on school #2 is a lawsuit.
2. Brand is **code, not data**: `npm run audit:brand` finds 550 brand literals in
   153 shipping files — 275 name literals, 165 palette hex values, 76 domains,
   plus cookie keys and mobile bundle ids — and `app/globals.css` alone carries
   55 of them. `lib/notifications.ts` hardcodes the subject *"Attendance alert
   from Ykay College"*, and the mobile app's name, bundle id,
   `associatedDomains`, `scheme` and EAS project are all Ykay-only.
3. Notifications **cannot be used for 3,000 users as configured**: the queue
   drains 25 jobs per invocation and Vercel fires the cron once a day, so a
   single 1,500-parent fee broadcast would take ~60 days. The public FAQ
   promises "alerts within 5 minutes."
4. CBT items are **platform-global** — `CbtSubject` / `CbtQuestion` have no
   `schoolId`, so they are invisible to the tenant-coverage guard and shared by
   every school using the database.
5. Money is invoice-and-payment shaped, **not ledger shaped**: no chart of
   accounts, no double-entry, no period close, no reconciliation, no payroll.
   `lib/finance.ts` is 128 lines of status helpers and number generators.
6. Geolocation is **actively denied** by `Permissions-Policy` globally *and* on
   the attendance route, with two tests pinning that string
   (`tests/lib/security-hardening.test.ts:209-219`,
   `tests/e2e/02-attendance-camera.spec.ts:42`). GPS clock-in is a deliberate,
   tested policy change — not a copy-paste.

---

## 2. D1 — Fork vs. one codebase, two deployments

Three real options. Pick with eyes open.

| | **A. Second tenant, same DB** | **B. Second deployment, own DB** ⭐ | **C. Hard fork / new repo** |
|---|---|---|---|
| Isolation | Logical. Blocked on fixing RLS fail-open + the 18 uncovered routes. | Physical. Separate Postgres per school. Zero cross-tenant surface. | Physical. |
| Cost | $0 extra | ~$15–25/mo extra Postgres | $0 |
| Maintenance | One | One (two deploys, same code) | **Two, forever** |
| Bug/security fixes | Applied once | Applied once | Applied twice, drift guaranteed |
| Next/Prisma/Expo upgrades | Once | Once | Twice, and fork #2 lags |
| Rebrand | Tenant branding row + assets | Tenant branding row + assets | Free-form divergence |
| Per-school customisation | Module flags + branding | Module flags + branding (+ branch if truly needed) | Unlimited, at the cost of everything above |
| Good for | 5–50 schools, one ops team | **First 2–5 schools, one ops team** | Client contractually demanding their own IP |

**Recommendation: B for this school.** One repo, one CI, one deploy pipeline,
two environments pointing at two databases (e.g. `school-a.db` / `school-b.db`),
distinguished by config only. It buys physical isolation on day one with no RLS
project blocking the launch, and it keeps the upgrade path to A (multi-tenant
SaaS) open for when you have schools 4+ and the app-level filtering work is
actually done.

Go to **C** only if: the contract requires source handover, or the school's
domain model genuinely differs (a university with semesters/credit units and
faculty/department hierarchy is not this schema), or you are selling white-label
builds as a business model. If C, then fork *after* the brand-token extraction
in `02-rebrand-redesign.md`, never before — otherwise you fork 579 hardcoded
strings and two divergent asset trees.

### What B means concretely

- Keep the tenant machinery, run with a single school per database
  (`SCHOOL_SLUG`, `PLATFORM_BASE_DOMAIN` set per environment). `resolveTenantFromHost()`
  falls back to the default school — correct for a one-school deploy.
- Two `.env` files, two Postgres databases, two domains, two S3/R2 buckets (or
  one bucket with per-school prefixes), two Paystack accounts (money must never
  mix), two WhatsApp numbers, two Sentry environments.
- **One** GitHub repo, **one** branch strategy, two deploy targets.
- Per-school differences live in: tenant branding row, module flags, fee
  structures, classes/terms, notification templates, and — when needed — an
  env flag. Not in `if (school === "x")` branches in `app/`.
- Fix RLS *anyway* (it is cheap and it is the backstop that catches the route
  someone forgets to filter), but do it as scheduled hardening, not as a launch
  blocker. Sequence in `07-scale-and-five-year-ops.md`.

---

## 3. D2 — Delivery model: what "exactly the same, plus features" should mean

A literal replica is the wrong target. Ship **the same portal surfaces** (so
training material, support scripts and mental models transfer) on **a different
skin**, with **four subsystems rebuilt properly** and **three things deliberately
different**:

**Keep 1:1 (no redesign):** role model & permissions, admissions pipeline,
attendance register, gradebook, report cards, timetable, ID cards, messaging,
in-app notifications, mobile app structure, admin/teacher/parent/student
portals, super-admin console.

**Rebrand (skin + data):** palette, type, logo, favicon, OG images, PDF/receipt
headers, email identity, SMS/WhatsApp sender IDs, portal copy, SEO, domain,
mobile app identity.

**Rebuild properly (the new work, in dependency order):**

1. **Finance ledger** (`05-financial-system.md`) — longest critical path, highest
   blast radius, do first. Everything else depends on money being right.
2. **Notification/queue spine** (`06-whatsapp-business.md`) — a 3k-user school
   cannot run on a once-a-day 25-job cron. This is a prerequisite for WhatsApp,
   for fee reminders and for attendance alerts.
3. **CBT at 15k items** (`04-cbt-15k.md`) — 95% content operations, 5% code. The
   authoring pipeline and the item-quality gate are the deliverable.
4. **GPS attendance** (`03-gps-attendance.md`) — smallest code surface, biggest
   policy/hr surface. Do it as an *evidence* system, not a surveillance system.

**Deliberately different from Ykay (and why):**

- **Tenant isolation** — separate DB (D1-B).
- **Queue** — real worker cadence, priorities, provider rate limiting, backlog
  alerting.
- **Payments** — add per-student dedicated virtual accounts so bank transfers
  self-match to invoices instead of being reconciled by hand for five years.

---

## 4. D3 — Sequencing (why this order)

```
                 ┌── content ops (CBT authoring) ──────────┐  ← longest lead time,
        day 1 ───┤                                          │    start before code
                 └── Meta Business verification + templates─┘
                            │
   week 1  ─ D1/D9 decisions, tenant provisioning, brand tokens, asset pack
   week 1–4 ─ brand extraction + CI guard + public site redesign
   week 2–7 ─ finance ledger phase 1 (critical path) ── requires opening-balance design
   week 3–8 ─ queue spine → WhatsApp Business (adapter + webhook + templates)
   week 4–9 ─ CBT: bank scoping, item schema, authoring pipeline, engine hardening
   week 5–10 ─ GPS clock-in (policy change + geofence + offline punch + audit)
   week 8–11 ─ migration dry-run: people, classes, terms, opening balances
   week 11–13 ─ UAT, training, dual-run pilot (GPS+QR, old+new finance)
   go-live ── term boundary only. Never mid-term.
```

Two non-code lead times dominate the schedule and must start on day one:

- **Question authoring** — 15,000 reviewed items is ~10–14 weeks of paid writer
  + reviewer throughput (`04-cbt-15k.md §3`).
- **Meta Business verification + template approval** — days to weeks, outside
  your control (`06-whatsapp-business.md §2`).

Also, from this repo's own operating memory: a mid-term launch creates dual
sources of truth for attendance, fees and results. **Go live on the first day of
a term, into a fresh term**, with the previous term closed in the old system.

---

## 5. D4 — Scope fence (what "plus features" must NOT silently include)

Every extra subsystem you accept pushes the go-live term. Write the fence down
and get it signed. Suggested default fence for v1:

**In:** the six portals, ledger-based finance (fees + expenses + budget +
reconciliation + payroll-ready), GPS/QR attendance with exceptions review, CBT
with a 15k-item bank and school-scoped proctored exams, WhatsApp Business with
parent two-way messaging, report cards, mobile app (Android), offline-first,
NDPA compliance pack, 5-year ops runbook.

**Out (v2 candidates):** library, hostel/boarding, transport/routes, biometric
fingerprint hardware, AI tutor/adaptive learning, live video classes, canteen
POS, alumni fundraising, multi-campus, WAEC/NECO registration filing, student
attendance via RFID turnstiles, iOS app (until Android is stable), public-SaaS
billing for other schools.

Say "v2" out loud in the kickoff meeting. Unowned scope is how five-year
projects die.

---

## 6. What I would do in the first 10 days (in this order)

1. **Close D1** (fork vs tenant). Everything else is downstream. → `README.md`
2. **Provision** the second environment: repo branch, prod DB, R2 bucket,
   domain, Resend domain, Paystack account, Upstash, Sentry project, WhatsApp
   number reserved. Detail: `07-scale-and-five-year-ops.md §2`.
3. **Start the two long-lead items today**: open the Meta Business verification
   for the WhatsApp number, and issue the CBT authoring brief + pay rates.
4. **Run the brand audit** to convert "579 literals" into a burn-down list:
   ```bash
   npm run audit:brand              # inventory + fail on NEW literals
   npm run audit:brand -- --update  # re-baseline after intentional changes
   ```
   (`scripts/brand-audit.ts`, added with this doc set.)
5. **Draft the chart of accounts** with the school's bursar *before* writing
   ledger code. Account names, fee categories, discount types, and who may
   approve a waiver/write-off above what amount. `05-financial-system.md §2`.
6. **Answer the four launch questions** in `README.md` (mobile app
   single/multi-brand, 15k bank: author/buy/licence, WhatsApp provider, payroll
   scope) — each one changes the work plan.
7. **Freeze the go-live date to a term boundary** and work back from it.

---

## 7. Definition of done for "school #2 is live"

Not "the app runs." All of:

- [ ] 3,000 accounts provisioned; every role logs in; parent↔student links verified against the register.
- [ ] Opening balances posted as a dated journal entry; trial balance = 0; bursar signed off.
- [ ] One full term of fees invoiced, collected, receipted, reconciled to the bank statement, and closed.
- [ ] Attendance: QR + GPS both live, exception list reviewed weekly, staff notified in writing and consented.
- [ ] CBT: ≥15,000 published items, each with a named reviewer; one real school examination sat end-to-end.
- [ ] WhatsApp: opt-in recorded for every parent, delivery rate measured, two-way replies landing in the inbox.
- [ ] Report cards printed/issued from the portal for one full term.
- [ ] Backups running + **one successful restore drill into a staging DB**.
- [ ] Queue backlog alert + uptime alert + payment webhook alert firing to a human.
- [ ] Runbooks handed over; two people (not one) can deploy and restore.
- [ ] NDPA pack: privacy policy, consent records, retention schedule, breach playbook, DPO named.
- [ ] Data export works: the school can walk away with their data in CSV/XLSX/PDF.

The last two items are what make this a five-year system rather than a
one-term demo.
