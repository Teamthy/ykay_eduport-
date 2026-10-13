# 07 — 3,000 users, five years, Nigeria: infrastructure and operations

The engineering question is not "will Next.js handle 3,000 users" — it will. The
questions that decide whether this survives five years are: **what happens on
results day**, **who fixes it at 7am when the term starts**, **how are upgrades
landed**, and **what happens when the person who built it is unavailable**.

---

## 1. Load model

3,000 accounts ≈ 2,300 students + 300 staff + 400–600 parent logins. Accounts
are not concurrency: normal days are quiet, and **five moments** are not.

| Peak | Shape | Real risk |
|---|---|---|
| Fee deadline (last 3 days of a window) | 300–800 families paying in hours; each payment = webhook + receipt + WhatsApp + ledger posting | Gateway webhook burst, double-post if idempotency is weak, notification queue flood |
| Results published | Every parent and student opens report cards within an hour | Read-heavy burst, PDF generation CPU, DB connections |
| CBT sitting (whole class/school) | 200–600 concurrent exam sessions, each autosaving per answer | Write burst on attempts/answers, **server-authoritative timers**, network flakiness |
| Resumption week | Everyone logs in first time on unfamiliar devices | Auth/OTP/rate limiter behaviour, support load |
| Broadcast (fees/attendance/news) | 1,500–3,000 messages in one action | Provider rate limits, queue backlog, **cost spike** |

Design decisions that follow:

- **Rate limiters fail closed** in this repo for login/reset/payment/admissions
  when Upstash is absent (`docs/production-infra.md`). At 3,000 users that is
  correct for security but means **Upstash (or Redis) is mandatory**, not
  optional — without it, the first resumption-morning traffic spike returns 503s
  to parents. Either configure Upstash or explicitly set
  `ALLOW_MEMORY_RATE_LIMITS=true` on a single-instance deployment and accept the
  documented risk. Decide deliberately, write it down.
- **Database**: managed Postgres with connection pooling (Prisma + PgBouncer or
  the provider's pooler). Sizing from the repo's own estimate is ~10 GB / ~1k DAU
  on a $15–25/mo tier; 3,000 users with CBT attempts, notification jobs and audit
  logs will outgrow that — plan a tier up, and treat **attempts / notification
  events / audit logs** as the tables that grow fastest (partition or archive by
  academic session).
- **PDF generation is CPU**, and it clusters (results day). Generate report
  cards in a queued job with caching, not synchronously on 600 page views.
- **Storage**: R2/S3 for admission documents, ID cards, report cards, receipts
  and the APK, with a lifecycle rule; 5 years of documents ≈ tens of GB, which is
  cheap — but only if the bucket is not accidentally public.
- **Caching**: `lib/cache.ts` + Upstash for public site, fee structures, question
  metadata. Never cache anything per-student without a userId in the key.

## 2. Environment (what a second school's deployment needs)

| Item | Deployment A (Ykay) | Deployment B (new school) |
|---|---|---|
| Repo / branch | `main` | same repo, same `main`, different env config |
| Database | `ykay` Postgres | **separate** Postgres (D1-B) |
| Domain | existing | new `.ng`/`.com.ng` + `portal.` subdomain + TLS |
| `SCHOOL_SLUG` / `PLATFORM_BASE_DOMAIN` | ykay-college | new slug |
| Secrets | `AUTH_SECRET`, Paystack, Resend, S3, `JOBS_SECRET`, Sentry, Upstash | **all new values** — never share a payment secret between schools |
| Payments | Paystack account | **its own Paystack account** (money must never mix) |
| Email | verified domain, SPF/DKIM/DMARC | own verified domain; `EMAIL_FROM` = school identity |
| SMS/WhatsApp | Termii sender ID + WhatsApp number | own sender ID + own number + own WABA |
| Storage | bucket/prefix | separate bucket or prefix |
| Monitoring | Sentry project | separate project (or tagged environment) |
| Cron/worker | existing | same, configured independently |
| Backups | nightly + PITR + drill | same, **verified** before go-live |

Two things to fix in the codebase before B is provisioned: brand identity must
come from data (`02-rebrand-redesign.md`) and the receipt/reference generators
must be tenant-safe (`05-financial-system.md §1`).

## 3. Five-year engineering plan

- **Upgrade cadence** (this is the main long-run cost): Next.js major (~yearly),
  Prisma major, React, Tailwind, Expo SDK (each Expo major = a store
  resubmission), Postgres major (every ~2–3 years, needs a maintenance window),
  Node LTS. Budget **one upgrade sprint per year** and one full-day test cycle per
  Expo/Next major. Do not skip majors — skipping is what makes a 5-year-old app
  un-upgradable.
- **Security patching**: `npm audit` in CI (already present via
  `scripts/audit-deps.mjs`), Dependabot, and a rule that a critical CVE gets
  patched within 7 days. Secrets rotated annually and on any staff departure.
- **Two-person rule**: at least two people can deploy, restore a backup, and run
  the migration procedure. Key-person risk is the single most common cause of
  death for bespoke school software. Document + verify with a drill.
- **Android reality**: APK sideloading is how most Nigerian schools distribute
  (`/download/apk` exists). Keep the APK signed with a **kept** keystore
  (losing it means you cannot update installed apps), publish version + release
  notes, and keep `runtimeVersion` in mind for OTA updates (`mobile/app.json`
  already uses `appVersion` policy — deliberately bump `appVersion` when native
  modules change, or OTA will break installs).
- **Runbooks** (short, tested, one page each): deploy rollback · restore from
  backup · restore *drill* · payment webhook failure · queue backlog ·
  term rollover · new session setup · school-wide broadcast ·
  gateway outage (switch to cash + manual receipting) · data export for a parent
  or a regulator.
- **Term-boundary readiness**: the repo already ships `npm run check:readiness`;
  make it part of the ritual — before each term, verify sessions/terms, fee
  structures, timetables, class assignments and question coverage, then run a
  subscription-free "dry run" on staging.

## 4. Cost model (planning ranges, verify before quoting)

The repo's own `docs/operating-cost.md` estimates a managed path at
**≈ $38–73/month (≈ ₦700K–1.2M/year at the ₦1,450/USD planning rate)** for a
1000-DAU single school. For the new school, the additions are:

| Added cost | Driver | Control |
|---|---|---|
| Second Postgres | own DB, larger tier | tier up only when metrics say so |
| WhatsApp messages | per message × per category × 3k families | budget cap, template discipline, quiet hours, dedupe |
| SMS fallback | per SMS × Termii/number | fallback only when WhatsApp fails or is unread after N minutes |
| Push + email | ~free | — |
| Storage | documents/PDFs over 5 years | lifecycle rules, compression |
| Paystack | % of collection volume | education rate (verify), virtual accounts may add fees |
| Support/ops labour | the real cost | runbooks, training, admin champion |
| Yearly upgrade sprint | engineering time | budget it; do not defer |

**The cost shape that catches schools out is messaging**, not hosting: a school
that sends 6 WhatsApp alerts + 6 SMS per family per term to 1,500 families is
18,000 messages per term. Put a per-school monthly cap in the system and a
"messaging spend" line on the bursar's dashboard so cost is never a surprise.

## 5. Support model (what actually keeps it alive)

- **School-side admin champion** — one staff member trained to first-line
  support (resets, fee structure edits, class/term setup). Everything else
  escalates.
- **Support channel**: a WhatsApp support line + a named rota for the first two
  weeks of each term and on results days.
- **In-portal feedback** with screenshots (the repo has `whats-new`, error
  boundaries and Sentry — wire a "report a problem" entry point that attaches the
  request id and the Sentry event id).
- **Training**: role-based sessions (admin/bursar/teacher/parent), recorded, in
  the school's language, plus a printed one-page guide per role. Parent training
  is ideally a WhatsApp broadcast with a 2-minute video.
- **SLA in writing**: response and resolution targets per severity, defined
  windows (term-time vs holidays), and what counts as a change request vs. a bug.

## 6. Compliance (Nigeria — NDPA 2023 and friends)

- **NDPA 2023**: lawful basis and consent records for parent/student/staff data;
  privacy policy that matches practice; **retention schedule**; breach playbook
  with a 72-hour notification posture to NDPC (verify the current requirement and
  the school's registration obligation as a data controller with the Commission —
  volume and sensitivity may make registration mandatory); named contact/DPO.
- **Children's data**: students are minors — extra care, minimal collection, no
  third-party marketing use, guardian consent for photos/publicity.
- **Location data** for staff punches: notice, basis, retention (12 months),
  punch-only (never continuous), documented in `03-gps-attendance.md §2`.
- **Biometrics**: if the school later wants fingerprint clock-in, treat it as
  sensitive personal data — explicit consent, local storage preferred, and a
  fresh assessment. Do not bolt it on casually.
- **Cross-border processing**: Neon/Vercel/Sentry/Resend may process outside
  Nigeria. Map it, document the safeguards, and disclose it in the policy.
- **Records that must outlive the vendor**: transcripts, results and financial
  records must be exportable in a durable format. A school must never be held
  hostage by its software provider — write the exit clause and build the export.

## 7. Definition of done

- [ ] Load test at the shapes in §1 (fee deadline, results day, CBT sitting), with results recorded and the known limits written down.
- [ ] Upstash (or explicit documented memory-limit acceptance) + connection pooling configured; 503s under burst confirmed absent.
- [ ] Nightly backups + **restore drill passed** into a staging DB, with the runbook timed and dated.
- [ ] Monitoring live: uptime, 5xx, queue backlog, webhook failures, disk/DB growth, with alerts reaching a human phone.
- [ ] Upgrade calendar published for 5 years, with a named owner per year.
- [ ] Two people have deployed and restored; drill evidence recorded.
- [ ] Runbooks written and one rehearsed end-to-end (recommend: gateway outage).
- [ ] APK keystore backed up in two places, documented, with the signing procedure written down.
- [ ] NDPA pack complete; retention + export documented and tested once.
- [ ] Support rota, SLA, training material and admin champion in place before term 1.
- [ ] Messaging budget cap configured and visible on the bursar's dashboard.
