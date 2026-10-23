# Production Readiness & Launch Certification Audit — Ykay College (tenant on EduOS)

**Date:** 2026-10-23 · **Audited commit:** `87190fd3b82388b4be1323ca61e6a88027be2706` (Merge PR #28, 2026-10-13)
**Repository audited:** `Teamthy/ykay_eduport-` (checkout at `/home/user/ykay_eduport-`, branch `arena/22cbd58e-ykay-eduport`)
**Product scope (per owner clarification):** The main product is **Ykay College**. EduOS is the multi-tenant platform codebase; Ykay College is (today) its only tenant. This certification is for **Ykay College going live as a single tenant**, not for EduOS onboarding its second school.

---

## 0. Scope correction — read first

The audit brief names three things: Famex-OS (`github.com/Teamthy/Famex-OS.git`), the Edu Portal, and YK-Virtual (Go backend, escrow, tutoring marketplace). Only **one** codebase was present in the workspace: `ykay_eduport-` (Next.js 16 + Prisma + Expo). No Go code, no `go.mod`, no escrow/booking service exists here; YK-Virtual appears only as (a) a marketing gateway page (`app/virtual/page.tsx` → `https://virtual.ykaycollege.com`), (b) two federated-login endpoints (`app/api/auth/verify-session`, `verify-credentials`), and (c) checklist references in `docs/GO-LIVE-CHECKLIST.md`.

**Consequence, stated plainly:**

- **Ykay College / EduPortal: audited.** Decision below.
- **YK-Virtual (Go API, booking, escrow, payouts, messaging, workers): DEFERRED — NOT VERIFIED.** No repository was available, so no claim in either direction is made. It must not inherit this report's decision. Provide the repo for a separate certification (Phases 13/23/24 of the brief cannot be executed from here).
- **Famex-OS: DEFERRED — NOT VERIFIED** for the same reason. If "Famex-OS" is a former name for this repo, this report covers it; if it is a different codebase, it was not inspected.

Missing evidence is never converted into a pass.

---

## A. Executive summary

**What exists.** A genuinely substantial single-tenant school platform: Next.js 16 App Router (145 pages, 142 API routes), PostgreSQL via Prisma (1,819-line schema, 66 models, 30 migrations), six role portals (Admin/Director/Coordinator/Bursar, Teacher/HOD, Student, Parent, IT Student, Super Admin), Paystack fees + admissions, CBT/exams, messaging, report cards, staff QR attendance, an offline-first Expo app (≈90 screens), Upstash rate limiting, S3/R2 presigned document uploads, Resend email, Sentry, and a CI pipeline (audit, lint, typecheck, unit tests, schema-drift, RLS verification, browser E2E, load test, build, mobile typecheck) that was **green on `main` at merge time** (run `38321073649`, 2026-10-13).

**Strongest areas (verified in code, not README).** Payments are the best-engineered part of the system: server-side Paystack verification with amount/currency/payer matching, HMAC-SHA512 webhook signatures with `timingSafeEqual`, atomic idempotency reservations with leases, deterministic payment references, optimistic invoice reservation, and a deliberate "inconclusive verification never marks FAILED" rule that prevents stranded money. Authentication is similarly serious: bcrypt(12), timing-oracle dummy compares, per-IP + per-email (failures-only) limiters, fail-closed DB-backed revocation on every request (`tokenVersion` + `isActive`/`isSuspended`), impersonation write-blocking in middleware on both cookie and Bearer transports, and security-event forensics. The codebase is unusually honest with itself — `docs/TENANCY_RLS_STATUS.md` correctly documents that RLS enforces nothing today.

**Weakest areas.** (1) The dependency gate is **red today**: `npm audit` reports 3 critical advisories including Next.js RCEs against the pinned `next@16.4.0`; CI at merge time predates them. (2) **No production environment evidence exists** — four different deployment paths are documented (Vercel, Render, OCI, docker-compose) and none is proven; Docker Publish is failing on `main`; the app *fails closed* (login/admissions return 503) if Upstash/S3 are unset, so an unproven config is a day-one outage. (3) Twelve High findings from the 2026-10-08 browser audit (H1–H12) are still open in code — several re-verified here (spoofable client IP, public CBT answer-key endpoints, `/sso/virtual` 404 on the login page, invisible bank-transfer claims, impersonation UX/session issues, Sentry blocked by CSP). (4) Tenant isolation is application-level only — acceptable for one school, disqualifying for a second.

**Launch decision:**

> 🔴 **NO-GO for public launch of commit `87190fd` as-is, tomorrow.**
> 🟡 **CONDITIONAL GO is close** — every blocker below is days of work, not a rewrite. Launch when the 10 conditions in §J are evidenced.
> ⏸️ **DEFERRED for YK-Virtual and Famex-OS** (no code provided) and for **EduOS multi-tenant onboarding** (RLS fail-open).

This is not "the project looks unfinished." The core is launch-grade. It is "the exact release cannot yet be *operated* safely because its security gate is red, its production configuration is unproven, and several money/role paths still mislead real users."

### What is safe / not safe / unknown

| | |
|---|---|
| **SAFE (verified)** | A client cannot mark its own payment successful; duplicate webhooks/retries cannot double-post a fee; suspended/revoked users are cut off on the next request; exam answers/keys are not sent to the *portal* exam client before grading; messaging access is derived from real school relationships; secrets are not in the repo (`.env.example` placeholders, boot-time validation). |
| **NOT SAFE (verified)** | Shipping with 3 critical dependency advisories un-triaged; trusting `X-Forwarded-For` for rate limits without a proven proxy; leaving anonymous `/api/cbt/*` key-reveal endpoints live; telling parents "continue to YK-Virtual" via a 404; bank-transfer parents seeing no pending/rejected state; onboarding a second school on fail-open RLS. |
| **UNKNOWN (not verified)** | Live Paystack/Resend/S3/Upstash/Sentry configuration; production DB role privileges; backup→restore on the real database; 1K-DAU behaviour on real infrastructure; native mobile builds on real devices; YK-Virtual in its entirety. |
| **WILL BREAK FIRST** | At results/fees peak: Postgres connections (`connection_limit=1`/instance + a DB lookup per authenticated request) and unbounded admin/report queries — before CPU. Operationally: notifications silently stall if the 60-second dispatcher isn't actually installed (Vercel cron in `vercel.json` is daily). |

---

## B. Production readiness scorecard

Statuses: PASS / FAIL / BLOCKED (could not verify here) / NOT VERIFIED / N-A. Scores are for **Ykay College single-tenant** unless noted.

| Domain | /10 | Status | Evidence | Blocking? |
|---|---|---|---|---|
| Architecture | 7 | PASS (single-tenant) | Thin routes → `lib/` services → Prisma; §2 diagram | No |
| Build reproducibility | 6 | BLOCKED here | Sandbox cannot fetch Prisma engines (`binaries.prisma.sh` not in egress allowlist); CI build green at merge | Must re-prove on release commit |
| Dependencies | 3 | **FAIL** | `npm audit`: 3 critical / 2 moderate; `npm run audit:deps` exits 1 (executed 2026-10-23) | **YES** |
| Authentication | 8 | PASS | `lib/session.ts`, `app/api/auth/login/route.ts` (code-traced) | No |
| Authorization / RBAC | 6 | FAIL (UX) / PASS (data) | APIs enforce roles; menus don't mirror them (H9, prior browser evidence, no fix since) | Conditional |
| Multi-tenancy | 4 | FAIL for EduOS-2nd-school; PASS-risk-accepted for 1 school | RLS fail-open; 18/114 routes uncovered (executed) | **YES for 2nd tenant; No for Ykay-only** |
| Application security | 6 | FAIL | H1 IP spoof, H7 public CBT, stored-XSS surface in IT learn page; headers/CSP otherwise strong | **YES (H1/H7)** |
| Payments (fees + admissions) | 9 | PASS (code) / NOT VERIFIED (live) | `lib/paystack.ts`, `lib/fee-payment-service.ts`, webhook route | Live drill required |
| Admissions workflow | 6 | NOT VERIFIED end-to-end | Draft→docs→fee→submit traced; blocked on S3 config evidence | **YES (config)** |
| Exams / CBT integrity | 7 | PASS (portal) / FAIL (public API) | Server grading, windows, fee-lock, retake tx; vs anonymous `/api/cbt/check` | **YES (public API)** |
| Booking / escrow / tutoring | — | NOT VERIFIED | No code in this repo (YK-Virtual) | DEFERRED |
| Messaging | 8 | PASS (code) | `lib/messaging.ts` relationship-derived access | No |
| File security | 7 | NOT VERIFIED (live) | Presigned PUT, size/MIME rules, malware hook (`SKIPPED` when unset) | Scanner decision required |
| Data integrity | 7 | PASS | 163 indexes/uniques; transactional money/exam paths; drift-check in CI | No |
| Frontend / UX | 5 | FAIL | H8–H12 open; B1–B7 fixed (PR #24) | Conditional (H11/H12 first) |
| Mobile | 6 | NOT VERIFIED (devices) | Offline cache+queue, SecureStore, biometrics in code; no device evidence | Staged rollout |
| Performance | 5 | NOT VERIFIED | CI load = 40 users/30 s only; Lighthouse workflow failing on `main` | No (≤1K DAU w/ conditions) |
| Capacity (1K DAU) | — | YES WITH CONDITIONS | §G model | Conditions in §G |
| Observability | 5 | FAIL | Structured logs + Sentry wired, but CSP blocks browser Sentry (H6); no alert evidence | **YES (fix + test event)** |
| Infrastructure | 4 | NOT VERIFIED | 4 documented targets, 0 proven; Docker Publish red on `main` | **YES (pick + prove one)** |
| CI/CD | 7 | PASS at merge / FAIL today | Gates are real (no `continue-on-error` on required jobs); deps now red; branch protection UNVERIFIED (API 403) | Fix deps to restore |
| Testing | 7 | PASS (design) / BLOCKED (full run here) | 634 unit tests (mocked Prisma) + Playwright vs real DB; sandbox run: 314 pass, 320 fail *all* on missing generated client (environment), lint PASS | Re-run in CI on release commit |
| Reliability / jobs | 5 | NOT VERIFIED | DB-backed notification queue w/ dedupe; dispatcher cadence unproven in prod | Conditional |
| Backup / recovery | 6 | PASS (procedure) / NOT VERIFIED (prod) | `docs/backup-restore.md` incl. BYPASSRLS trap + one logged drill (2026-08-02) | Fresh prod drill required |
| Deployment / rollback | 4 | NOT VERIFIED | No rehearsal evidence; migrations at container boot (Render path) | **YES (rehearse)** |
| Documentation | 8 | PASS | Deployment, backup, tenancy, UAT pack, go-live checklist | No |
| Product authenticity / AI-ish | 7 | PASS w/ notes | §AI scores below | No |

**AI-ish scores** (finished-product judgement, not authorship): Visual AI-ish risk **4/10** (distinct editorial identity — Anton/display type, navy/green/orange, real campus photography — though portal interiors fall back on generic card grids), Code AI-ish risk **3/10** (comments record *real past incidents* with dates/commits; dead ends like `RefreshToken` table + unused `CbtRunner.tsx` are the main generated-bulk smell), Product differentiation **7/10** (Nigerian school workflows are specific: arms, broadsheet, transfer claims, WAEC practice), Engineering authenticity **8/10**, AI-feature quality **N-A** (no LLM features found; `/it-education/ai` is a course page, not a model integration).

---

## 1. Repository inventory (Phase 1–2)

```
YKAY ECOSYSTEM (as evidenced in this checkout)
└── EDU PORTAL — ykay_eduport- @ 87190fd  [AUDITED]
    ├── Web: Next.js 16 App Router — 145 page.tsx (public site + 6 portals)
    ├── Mobile: Expo SDK 54 / RN 0.81 — ~90 screens, SQLite cache + write queue
    ├── API: 142 route handlers (app/api/**) → 63 lib service modules
    ├── Database: PostgreSQL + Prisma 6.15 — 66 models, 30 migrations, RLS (fail-open)
    ├── Payments: Paystack (hosted checkout + webhook + verify) + bank-transfer claims
    ├── Storage: S3/R2 presigned uploads (admissions docs) + optional ClamAV-HTTP scan
    ├── Email/SMS: Resend; Termii SMS; WhatsApp = stub (never reports sent)
    ├── Jobs: DB queue (NotificationJob) + /api/jobs/dispatch-notifications (secret-gated)
    └── Infra: Dockerfile (standalone) · docker-compose.prod.yml · render.yaml · vercel.json · deploy/oci timer
    └── YK-VIRTUAL [NOT IN REPO — DEFERRED]: only /virtual gateway + SSO verify endpoints here
```

**Architecture (reconstructed):** Browser/Expo → `middleware.ts` (JWT role gate for pages, CORS, per-request CSP, impersonation write-block) → route handler → scoped context helper (`getTeacherContext`, `getParentFinanceContext`, …) → domain service (`lib/fee-payment-service`, `admission-service`, `exams`, `messaging`, …) → Prisma → Postgres. Trust boundaries: (1) anonymous public surface (admissions draft/docs/fee, contact, CBT practice, status lookup) gated by opaque tokens + rate limits; (2) authenticated portal surface gated by JWT + per-request DB revocation check; (3) machine surface (Paystack webhook by HMAC; jobs by bearer secret; College SSO by shared secret). Single points of failure: the one Next.js deployment, the one Postgres, Paystack for card fees, Upstash for *security-critical* rate limits (fail-closed by design).

**Intended vs implemented:** README claims "Postgres RLS tenant isolation" as a headline guarantee; implementation (and the team's own correction in migration comments + `docs/TENANCY_RLS_STATUS.md`) is application-filtering only. README badge "663+ tests passing" — suite counted 634 tests here; treat badges as claims, CI as evidence.

---

## C. Findings (confirmed defects first; hypotheses labelled)

Severity: P0 blocker-emergency · P1 launch-blocking · P2 fix-before/soon-after launch · P3/P4 backlog. IDs `H1–H12`/`B1–B7` reference `docs/launch-user-friction-audit-2026-10-08.md` where applicable (B1–B7 verified fixed in PR #24; H-items re-checked below).

### DEP-01 — P1 — Dependencies — FAIL — Launch-blocking: YES
- **File:** `package.json` / `package-lock.json` (`next@16.4.0`, `@sentry/nextjs@10.69.0`, `dompurify@3.4.16` via `jspdf`); gate `scripts/audit-deps.mjs`.
- **Evidence (executed 2026-10-23):** `npm audit` → 5 vulns (3 critical: GHSA-2464-fhr4-w9xw Next Image-Optimization RCE, GHSA-673q-mjm6-r5xr Next `use cache` RCE, GHSA-p3m5-59mp-jv5r Next Server-Actions DoS, GHSA-mchm-gjx6-7h55 Sentry tunnel middleware bypass, DOMPurify bypasses). `npm run audit:deps` **exit 1**.
- **Exploitability triage (honest, not scanner-parroting):** `grep` shows **zero** `"use server"` actions and no `dangerouslyAllowSVG`/`tunnelRoute` in app code — so the two RCE preconditions and the Sentry-tunnel precondition appear *absent*, and DOMPurify only arrives via client-side `jspdf`. Residual risk is therefore lower than "critical" suggests, but **the release gate the team itself chose is red**, and image-optimization is reachable by default in Next.
- **Fix:** upgrade `next` (and `@sentry/nextjs`, `jspdf`/dompurify) to patched versions; re-run full CI. Only if a patch is genuinely unavailable, add scoped dated exclusions in `audit-deps.mjs` citing the absent preconditions + disable SVG optimization explicitly. **Verification:** `npm run audit:deps` exit 0 on the release commit; CI green.

### OPS-01 — P1 — Infrastructure/config — NOT VERIFIED — Launch-blocking: YES
- **Files:** `render.yaml`, `vercel.json` (cron daily 08:00), `deploy/oci/eduportal-notify.timer` (60 s), `docker-compose.prod.yml`, `lib/env.ts`, `docs/GO-LIVE-CHECKLIST.md` (every box unchecked).
- **Evidence:** Four deployment targets documented; GitHub shows **Docker Publish failing on `main`** (runs `38321534822`, `38316530227`) and **Lighthouse failing**; no staging/prod URLs, env inventory, or rehearsal record in repo. By design, missing Upstash ⇒ login/admissions **503** (`lib/rate-limit.ts` `DISTRIBUTED_REQUIRED`), missing S3 ⇒ admissions cannot submit (`lib/storage.ts`), missing Resend ⇒ password resets undeliverable. A wrong guess here is not degradation; it is an outage.
- **Fix/Verify:** pick **one** production target; complete `docs/GO-LIVE-CHECKLIST.md` §0–§2 with evidence (screenshots/logs redacted): live Paystack keys + webhook URL, Upstash (login burst ⇒ 429 not 503), S3/R2 + `docs/S3_ADMISSIONS_CORS.json` applied, Resend verified domain test mail, non-superuser `DATABASE_URL` role + `verify:rls` against prod-like DB, 60 s job dispatcher proven delivering a test notification ≤2 min, `ENABLE_PLATFORM_SIGNUP` unset.

### SEC-01 (H1) — P1 — Rate limiting — FAIL — Launch-blocking: YES (unless edge proven to overwrite)
- **File:** `lib/requests.ts:3-7` `getClientIp()` returns first `X-Forwarded-For` entry unconditionally; used by every limiter and audit log. Also raw header reads in `middleware.ts`, `app/api/platform/signup/route.ts`.
- **Impact:** any client that can set the header gets a fresh rate-limit budget per forged IP (login, reset, admissions, CBT) and poisons forensic IPs. On Vercel/Render the platform *may* overwrite it — that must be **proven on the chosen target**, not assumed; on `docker-compose.prod.yml` (`3000:3000` published) it is directly spoofable.
- **Fix:** trust `X-Forwarded-For` only behind a configured trusted proxy (use platform-specific header / rightmost-untrusted hop); add `TRUST_PROXY` handling + regression test sending forged XFF. Also address H2 (shared-NAT schools) by keeping per-email/per-account limiters primary.

### SEC-02 (H7) — P1 — Exam integrity / abuse — FAIL — Launch-blocking: YES
- **Files:** `app/api/cbt/quiz/route.ts`, `check/route.ts`, `attempts/route.ts`, `topics/route.ts`; `app/cbt/page.tsx` (redirects to login); `components/cbt/CbtRunner.tsx` (imported nowhere — confirmed by grep).
- **Evidence:** anonymous quiz draw (bulk `findMany` of *all* published questions for a subject, shuffled in memory); `check` returns `correctIndex`+explanation for any supplied ID without proof of a drawn session; limit is a generous 240/h/IP and, with SEC-01, bypassable. The endpoints serve no shipped UI.
- **Fix (choose one before launch):** disable `/api/cbt/*` (404/410) until the practice product launches, **or** require auth + session-bound draws (signed attempt token; check only IDs in that draw) + `take` cap. Confirm in writing that no live school exam draws from `CbtQuestion`. Delete or wire up `CbtRunner`.

### MNY-01 (H11) — P1 — Payments UX — FAIL — Launch-blocking: YES (money confusion → double-pay/support flood)
- **Files:** `app/api/parent/fees/route.ts` (returns only `COMPLETED` payments; no attempts), `app/api/admin/fees/payments/route.ts` (approve/reject write audit log only — no `createInAppNotification`/email; confirmed by grep).
- **Impact:** parent submits transfer → sees nothing pending → may pay again via Paystack; rejected parent is never told. Prior browser audit demonstrated both; code unchanged.
- **Fix:** return `FeePaymentAttempt`s (PENDING/FAILED + reference/date) on the parent fees payload and render them; notify parent on approve/reject with bursar reason. Regression: Playwright fee journey asserting pending→rejected visibility.

### AUTH-01 (H12) — P1/P2 — Impersonation — FAIL — Launch-blocking: YES for super-admin use in prod
- **Files:** `app/api/super-admin/impersonate/route.ts`, `app/super-admin/page.tsx:256,495` (banner is local React state on one page), `app/api/auth/logout/route.ts`, `lib/session.ts` (`signSession` always 30-day JWT).
- **Evidence (code):** (a) no portal-wide banner/exit; reload loses the only exit control; (b) impersonation shortens **cookie** maxAge to 1 h but the **JWT itself remains 30-day** — replayed as Bearer it stays valid (writes still blocked by middleware, reads as victim for 30 days); (c) logout while impersonating calls `revokeAllSessions(victim.id)` — signs the *victim* out everywhere.
- **Fix:** short-lived impersonation JWT (`exp` 60 min via dedicated signer), persistent layout banner driven by `/api/auth/me` `impersonatedBy` + End button, logout that ends impersonation instead of revoking the victim. Until fixed: **do not use View-As on production accounts** (documented operational ban is an acceptable interim mitigation).

### UX-01 (H8) — P2 — Broken flagship link — FAIL — Launch-blocking: conditional
- **File:** `app/login/page.tsx:128` → `/sso/virtual`; `app/sso/` does not exist (verified). Federated verify endpoints correctly 503 when `COLLEGE_SSO_SECRET` unset.
- **Fix:** either implement the handoff + set matching `COLLEGE_SSO_SECRET` (≥32, ≠ `AUTH_SECRET`) on both systems and test suspension propagation, or remove the link/copy for launch. Do not launch promising a 404 on the most-used page.

### OBS-01 (H6) — P2 — Observability — FAIL — Launch-blocking: YES (cheap fix; flying blind otherwise)
- **Files:** `lib/csp.ts` (`connect-src` lacks `*.ingest.sentry.io`; no tunnel route configured), `sentry.client.config.ts`.
- **Fix:** add the ingest origin (or Sentry tunnel), set DSNs, and record a received test error (client + server) per go-live checklist §1/§9. Note: logger (`lib/logger.ts`) has no correlation/request IDs — add one header end-to-end before scaling support.

### TEN-01 (EDU-01) — P1 for EduOS / P3 for Ykay-only — FAIL-OPEN RLS — Launch-blocking: YES for 2nd tenant, NO for Ykay-only
- **Files:** migrations `20260727000000_eduos_rls`, `20260802000000_..._empty_context_fix`; `lib/db-rls.ts`; `docs/TENANCY_RLS_STATUS.md`.
- **Evidence (executed):** `check:tenant-coverage` → 114 tenant routes: 1 RLS-scoped, 95 app-filtered, **18 uncovered**. I traced the riskiest uncovered routes (`teacher/analytics`, `teacher/exams/[id]/results`, `notifications`): each scopes by owner ID (`teacherProfileId`/`userId`) — **no exploitable cross-tenant IDOR demonstrated**; super-admin routes are global by design. Risk is latent: the next forgotten filter fails silently.
- **Launch rule:** Ykay-only launch may proceed with this accepted in writing; `PLATFORM_MODE`/second school stays **off** until: uncovered=0 → route via `withSchool()` → remove fail-open arm → CI `--strict`. Lower the `--max-uncovered 18` ratchet as routes are fixed.

### XSS-01 — P2 — Stored XSS surface — FAIL (privileged-author)
- **File:** `app/it-portal/courses/[slug]/learn/page.tsx:321` renders `activeModule.content` via `dangerouslySetInnerHTML` with only `\n→<br/>` (no sanitization). If instructor/admin-authored, a malicious/compromised author injects script into every IT student's session. (Other `dangerouslySetInnerHTML` uses — JSON-LD via `JSON.stringify`, static theme script — are acceptable; tenant-branding CSS interpolation in `app/layout.tsx:175` should validate hex values — *hypothesis, validation not traced*.)
- **Fix:** sanitize with DOMPurify (already transitive — add direct dep, patched) or render as text/markdown without raw HTML. Regression: unit test with `<img onerror>` payload.

### REL-01 — P2 — Release integrity — FAIL
- **Evidence:** Docker Publish + Lighthouse workflows failing on `main`; branch protection **NOT VERIFIED** (`gh api` 403 — cannot confirm required checks block merges); no `CODEOWNERS`. CI jobs themselves are well-built (no `continue-on-error`/`|| true` bypasses on required gates; tenant ratchet enforces).
- **Fix:** make the chosen deploy path green (or delete the unused workflow so red stops being normalised), confirm branch protection requires CI, practise one rollback (Vercel instant rollback or previous GHCR sha) and record it.

### Further confirmed / inherited items (fix before or in week 1)
- **H9 (P2):** `components/AdminSidebar.tsx` contains no role filtering (grep) — bursar/coordinator menus still lead to "Unauthorized" pages (prior browser counts: 19/30, 4/30). Build sidebar from the API permission map.
- **H10 (P2):** grading/release lives only on "Classic" CBT page; menu paths dead-end read-only (prior browser evidence; no intervening fix PR). Consolidate before first CA.
- **H3/H4/H5 (P2):** fee-lock reason/amount not shown to students; invoice titles carrying wrong child name in seed/demo data (verify against *production* data — may be fixture-only); raw `fetch failed` on Paystack outage + cookie banner covering Pay + US-format receipt dates. Map provider errors to plain language; format `1 Oct 2026`.
- **Admissions form (P2, needs browser re-test):** post-PR#24 notes claimed step-1 silently blocked (`bloodGroup`/`genotype` undefined; `whatsappPhone` "Required"). Schema now transforms `""→undefined` and preprocesses WhatsApp (`lib/admissions.ts:93-116`) — *plausibly fixed, NOT VERIFIED in a browser here.* Re-run the admissions journey incl. untouched optional fields before opening applications.
- **Dead code (P4):** `RefreshToken` model written only on password-reset, never issued (sessions are 30-day JWT-only — document or remove); `CbtRunner.tsx` unused; WhatsApp adapter stub (honestly reports unconfigured — keep, don't market WhatsApp alerts).
- **CSRF posture (P3, accepted with note):** no tokens; defence is `SameSite=Lax` + exact-origin CORS (`lib/cors.ts`, well tested). Acceptable for cookie POSTs in modern browsers; keep mutations off GET (exception: jobs `GET`==`POST` dispatch — secret/role-gated, low risk, remove GET alias when convenient).
- **Queries (P3):** 143 `findMany` in `app/api`, only ~90 with `take`; admin analytics/report generation load-and-reduce in memory. Fine at one-school scale; add caps/pagination + `groupBy` before 5K DAU (§H).

### Verified PASS (selection — evidence, not claims)
- **Payments:** webhook HMAC + amount/currency/status checks (`webhook/route.ts`); verify-then-post with definite/inconclusive split (`lib/paystack.ts`); atomic posting + unique reference replay (`lib/fee-payment-service.ts`); idempotency lease/takeover (`lib/idempotency.ts`); deterministic refs (`payment-intents`). *"Can a client mark itself paid?"* **No path found** — both fee and admission flows verify server-side or via signed webhook; bank transfers settle only on bursar approval. Refund/void is super-admin, transactional, audited + forensics-logged. *Gap:* no automated Paystack↔DB reconciliation job — manual day-1 procedure required (§H).
- **Exams (portal):** questions served without keys, server grading (batched, transactional), sitting-window + deadline auto-submit, fee-lock, retake consumed atomically under unique constraint (`student/exams/[id]/attempt`).
- **Messaging:** access derived from `ParentStudentLink`/class assignments, never from participant rows (`lib/messaging.ts`); thread access re-checked per request.
- **Auth lifecycle:** reset tokens hashed (SHA-256), single-use/expiring pattern, reset revokes refresh+ sessions; login 503-vs-401 correctness during DB outage; activation/invite flows rate-limited. *Absent:* MFA, email verification for IT signup (account created instantly — accept or add verify-before-pay gate), per-device session list (logout = everywhere, by design — communicate it).
- **Static checks executed in this audit:** `eslint` PASS (0 errors, 101 warnings); `check-tenant-coverage` (18 uncovered, above); `check-dead-ui` PASS, `check-orphan-pages` PASS; targeted vitest (webhook/session/security) PASS. Full vitest/typecheck/build/E2E/RLS/load **BLOCKED in sandbox** (Prisma engine download host not allowlisted; 320/634 failures were uniformly `Cannot find module '.prisma/client/default'` — environment, not assertions). Last full green evidence = CI on merge commit.

---

## D. Critical user journeys (traced; browser evidence inherited from 2026-10-08 audit where noted)

| Journey | Trace result | Failure cases | Verdict |
|---|---|---|---|
| **Parent pays fee (Paystack)** | intent (idempotency-reserved) → hosted checkout → verify (amount/email) → atomic post → receipt; webhook reconciles if browser dies | duplicate submit= replay; inconclusive verify= stays PENDING + webhook path; wrong amount= FAILED | **PASS (code)**; live ₦100 drill still required |
| **Parent bank transfer → bursar** | claim (unique ref) → PENDING queue → approve posts payment / reject fails claim | duplicate ref=409; **parent visibility/notification missing (MNY-01)** | FAIL (UX) |
| **Admissions** | draft (opaque token, 2 h) → presigned docs → fee init → submit re-verifies Paystack → PENDING_REVIEW → staff enrol | expired token=401; missing docs=422; storage unset=503 plain-language | PASS (code); **NOT VERIFIED** live (S3+form re-test) |
| **Student sits exam** | context+class+window+fee-lock → attempt (deadline) → autosave → submit → server grade → release gate | late resume=auto-submit 409; double-start=tx+unique; results hidden until released | **PASS (code)**; 60-concurrent rehearsal pending |
| **Teacher day / messaging / staff activation** | invite → one-time activation (public route correctly exempted in middleware) → attendance/gradebook/messages | wrong-role=401 + forensics; grading discoverability (H10) | PASS w/ H9/H10 caveats |

## E. Security & privacy (summary)
Attack surface: anonymous (admissions, contact w/ honeypot, CBT practice, status lookup by guessable-ish `YKCAPP…` ID — rate-limited, returns minimal fields), authenticated portals, webhooks/jobs/SSO machine endpoints. No SQL injection path found (Prisma parameterised; 7 `$queryRaw` uses are tagged-template parameterised `FOR UPDATE` locks). Security headers strong (HSTS preload, DENY framing, nosniff, restrictive Permissions-Policy with single camera exception, per-request CSP). Secrets: none committed found; boot fails fast only on truly fatal env (`lib/env.ts` — deliberate, documented); Sentry strips cookies/auth/query strings, `sendDefaultPii:false`. **Privacy flags for owner/legal review (not legal advice):** children's data (names, DOB, blood group/genotype, photos, results) across DB+S3+email+push — confirm NDPA lawful basis/consent copy, retention, and parent data-export/deletion procedure (no self-serve export/delete found); admission docs are identity paperwork — enable bucket versioning + malware scanner or formally accept `SKIPPED`; APK sideload distribution (`NEXT_PUBLIC_APK_URL`) needs checksum/signature communication to parents.

## F. Reliability & failure modes

| Failure | Current behaviour (traced) | Sev | Required action |
|---|---|---|---|
| DB unavailable | auth ⇒ 503 (fail-closed), health ⇒ 503; login no longer burns limiter | P2 | Alert on health 503; Neon failover/PITR plan |
| Redis (Upstash) down/unset | critical limiters 503 (prod); health `degraded` but 200 | P1-ops | Configure + alert; never set `ALLOW_MEMORY_RATE_LIMITS` multi-instance |
| Paystack down | init throws → reservation released; verify inconclusive → PENDING preserved | P2 | Plain-language UI (H5); manual reconciliation sheet |
| Resend down/unset | jobs retry/skip honestly; resets undeliverable | P2 | Verified domain + test; in-app fallback comms |
| S3/R2 down/unset | uploads 503; admissions blocked at docs step | P1-ops | Config proof + paper-intake fallback exists (`/admin-admissions/paper`) — train staff |
| Duplicate webhook ×50 | unique reference → replay, one `FeePayment` | — | Covered; assert in live drill |
| Duplicate exam submit | idempotency key (`attemptId:submit` mobile) + status machine | — | Covered |
| Worker/cron stopped | `NotificationJob`s accumulate PENDING silently | P2 | Alert: oldest-PENDING age; prove 60 s timer |
| Bad deploy | Vercel rollback / GHCR previous sha — **unrehearsed** | P2 | Rehearse once, write times |
| Token expiry mid-exam | 30-day JWT + DB check; attempt deadline server-side | P3 | — |
| Tenant mismatch (host) | falls back to default school (`matched:false`) | P2* | *Only safe single-tenant; log/monitor unmatched hosts |

## G. Performance & capacity — 1K DAU verdict: **YES WITH CONDITIONS**

*Measured:* only CI's 40-user/30 s smoke (`scripts/load-test.ts`, p95 budget) — a regression tripwire, **not** a capacity proof. No production metrics exist. *Model (assumptions explicit):* one school ≈ 800 students + 1,200 parents + 80 staff; 1K DAU with brutal peaks — results release/fees deadline ⇒ ~300–600 sessions in 15 min, ~30–60 rps read-heavy, exam-start bursts of one class (40) to whole-school CA (300 concurrent starts/submits). A single Next.js instance + Neon Postgres handles this **iff**: pooled `DATABASE_URL` + `DIRECT_URL` for migrations, indexes already present are used (verify with `EXPLAIN` on fees-overview/broadsheet), admin unbounded lists capped, and static/public pages cached at edge. **First bottleneck:** DB connections/queries (per-request user lookup + load-and-reduce reports), second: single-instance CPU at mass submit (grading is batched — good). *Conditions:* staging load test at 1K profile (200 concurrent parents on results + 60 concurrent exam submits) with p95/error recorded; uptime monitor on `/api/health`; do not run fees deadline + results release in the same hour of week 1.

**Scale roadmap (no premature scaling):** 1K → prove single instance + pooled DB + alerts. 5K → pagination/`groupBy` for admin reports, Redis cache for timetable/news, read replica only if measured. 10K (multi-school) → **RLS fail-closed first**, per-tenant connection strategy (PgBouncer), queue workers off request path. 50K → horizontal app tier (stateless already), CDN for portal shells, partitioned audit/notification tables. 100K+ → re-evaluate monolith boundaries (exams/payments as services) with data, not fashion.

## H. Remediation roadmap

**Before launch (blocking):** DEP-01 upgrade+green CI · OPS-01 one proven target + checklist §0–§2 evidence · SEC-01 proxy-trust fix/proof · SEC-02 CBT decision · MNY-01 transfer visibility+notify · AUTH-01 fix or ban View-As in prod · OBS-01 Sentry CSP+test event · fresh backup→restore drill on prod DB + RPO/RTO written · live-payment + admissions + exam-burst drills (§I) · confirm branch protection. *Owners:* Platform (deps/infra/obs), Backend (SEC/MNY/AUTH), Product (drills/UAT sign-off per `docs/portal-uat-tester-pack.md`).
**Immediately after (week 1):** H9 role-aware menus · H10 single grading home · UX-01 SSO finish-or-remove · H3/H5 copy+dates · correlation IDs · oldest-PENDING-job + auth-429/503 alerts · reconciliation daily sheet → job.
**Next cycle:** TEN-01 zero-uncovered programme · query caps · XSS-01 sanitization (pull forward if IT enrolments open early) · remove dead code (`RefreshToken`, `CbtRunner`) · MFA for ADMIN/SUPER_ADMIN · parent data-export/deletion · k6 suite in CI at 1K profile.

**Top launch blockers ranked:** 1 OPS-01 (certain outage if wrong) · 2 DEP-01 (known-critical framework) · 3 SEC-01 (silent limiter bypass) · 4 SEC-02 (exam-bank extraction) · 5 MNY-01 (double-pay confusion) · 6 AUTH-01 · 7 OBS-01 · 8 backup/restore unproven on prod · 9 REL-01 · 10 UX-01.
*(Improvements backlog = §H + H3–H5/H9/H10 + M1–M14/L-items in the friction audit, which remains the detailed UX backlog of record — 50+ items already enumerated there with fixes; deduplicated rather than re-invented here.)*

**Cross-system risks (College ↔ Virtual):** duplicate identities by design (Virtual must treat College `user.id`+`schoolId` as external subject, never merge on email alone — same email can exist per-tenant: `@@unique([schoolId,email])`); suspension propagates only at *new* Virtual login unless Virtual revalidates (`revalidateAfterSeconds:60` — enforce it); College outage must read as 503-retry in Virtual, not bad-password; CBT bank CSV shared between repos (`prisma/cbt-seed.ts`) — version it or banks drift; payment state must never cross systems (separate Paystack subaccounts/references).

**Fellowship/portfolio verdict:** Yes — with the caveats fixed, this is credible senior-level evidence: money-path idempotency, fail-closed auth, honest RLS accounting, drift/RLS CI gates, and incident-derived comments show real production judgement. A sharp reviewer *will* find SEC-01/SEC-02/TEN-01 — presenting this audit + remediation alongside the code strengthens, not weakens, the signal.

## I. Release runbook (adapted to chosen target; Vercel+Neon shown — substitute Render/OCI steps if chosen)

1. **Preflight:** release commit CI fully green (incl. `audit:deps`); `check:drift`, `verify:rls` as non-superuser; freeze merges; confirm env inventory vs `.env.example` (no `sk_test`, no placeholders).
2. **Backup:** `npm run db:backup` as `ykay_backup` (BYPASSRLS role per `docs/backup-restore.md`); verify archive lists; copy off-platform.
3. **Migrate:** `prisma migrate deploy` via `DIRECT_URL`; read SQL first; never let app boot race migrations on multiple instances.
4. **Deploy:** promote the exact CI-built artefact/commit; record sha + timestamp + operator.
5. **Health:** `/api/health` = healthy; login burst ⇒ 429; forced Sentry error received (client+server).
6. **Smoke (real accounts, test data flagged):** admin/teacher/student/parent/IT logins; ₦100 live fee → receipt → duplicate webhook replay; admissions test application end-to-end; one exam start/submit; one message round-trip; transfer claim approve+reject visibility.
7. **Monitor:** 5xx, p95, auth 429/503, oldest PENDING job, backup age — watched for first school day + first fees/results peaks.
8. **Rollback triggers:** health 503 >5 min, payment verify failures, login 503s, migration incompatibility. Rollback = previous deployment/sha (DB: forward-fix preferred; restore only per runbook §1c). Re-verify health+smoke after.

## J. Final certification

- **Artefact:** `87190fd3b82388b4be1323ca61e6a88027be2706`. **Environment tested:** sandbox static/code audit + executed lint/coverage/targeted tests; prior browser audit (2026-10-08) inherited for UI behaviour; **no live/staging environment was available**.
- **Executed:** eslint (PASS), tenant-coverage, dead-UI/orphan (PASS), `npm audit`/`audit:deps` (FAIL), targeted vitest (PASS). **Not executed (BLOCKED here):** `prisma generate`→typecheck/build/full vitest/Playwright/`verify:rls`/load — sandbox egress blocks Prisma binaries; must be re-evidenced by CI on the release commit.
- **Decision: 🔴 NO-GO (today) → 🟡 CONDITIONAL GO upon:** (1) DEP-01 green · (2) OPS-01 single target + config evidence · (3) SEC-01 · (4) SEC-02 · (5) MNY-01 · (6) AUTH-01 fix-or-ban · (7) OBS-01 · (8) prod restore drill · (9) live money/admissions/exam drills · (10) written single-tenant constraint (no 2nd school, platform signup off). Each needs an owner + date + evidence link in `docs/GO-LIVE-CHECKLIST.md`.
- **Accepted risks if launched on conditions:** H9/H10 in week 1 (train bursar/teachers on workarounds), no MFA (strong passwords + limiters interim), WhatsApp stub (market email/SMS/in-app only).
- **DEFERRED:** YK-Virtual, Famex-OS, EduOS multi-tenant onboarding — separate certifications required.

*This report distinguishes repository evidence from production evidence throughout. A green build was never treated as a working deployment, a configured health endpoint was never treated as a healthy system, and a documented backup was never treated as a proven restore.*

## K. Remediation status — 2026-10-23

This section supersedes the pre-remediation status and counts in §§A/H/J where they differ. The audit commit `d4777a0` is the baseline; the source changes described below are the current remediation worktree. No live or staging environment was available for this remediation pass.

### Code remediations

- **Dependency/security baseline — PASS (dependency audit):** updated the affected framework/security packages and removed the stale audit exclusion. `npm run audit:deps` now reports **0 high, 0 critical, 0 moderate and 0 low** advisories.
- **Client IP / proxy trust — ADDRESSED IN CODE:** resolve the client address from the right-hand trusted proxy hops, validate IPv4/IPv6, reject incomplete/malformed chains, and do not trust standalone `X-Real-IP`. Configure `TRUSTED_PROXY_HOPS` for the actual production proxy chain.
- **Practice CBT API — ADDRESSED IN CODE:** authenticated student-only access, distributed per-account limiting, HMAC-signed user/subject/question-bound draws with expiry, and server-side answer/question-count validation. Focused regression tests pass; live exam use and deployment settings remain unverified.
- **Fee-transfer visibility and races (MNY-01) — ADDRESSED IN CODE:** parent fees now show pending/processing/rejected attempts and review notes; unresolved attempts suppress a second payment action; transfer decisions use a pending-state compare-and-set; invoice attempts serialize under a row lock; approval/rejection and payment/audit writes are transactional; parents are notified in-app and queued for email. Parent retries reuse an idempotency key in the current page session. Provider behavior and the end-to-end payment journey still require staging evidence.
- **Impersonation — ADDRESSED IN CODE:** impersonation JWT expiry is 60 minutes, the exit banner is portal-wide, and ending impersonation clears the operator cookie without revoking the victim's sessions.
- **CSP / rendered content — ADDRESSED IN CODE:** CSP permits only the configured Sentry DSN origin; the IT-course raw-HTML path was removed; tenant CSS colors are validated and JSON-LD is escaped. A received production Sentry event is NOT VERIFIED.
- **Navigation / links — ADDRESSED IN CODE:** role-aware admin navigation, a working grade-exam destination, and `/sso/virtual` as a safe external redirect. This is not a College↔Virtual federation implementation.
- **Production configuration — ADDRESSED IN CODE:** production boot validates live Paystack key prefixes, distributed Redis unless explicit single-instance acceptance is recorded, S3 credentials, malware scanner or explicit risk acceptance, and the notification-job secret.
- **Deployment/release controls — ADDED, NOT DEPLOYED:** Render Docker Blueprint/runbook and Cron dispatch mode, corrected GHCR naming, seeded Lighthouse CI database, and a tenant-route coverage ratchet. These changes do not prove a Render service exists or that the workflows are green on the release commit.
- **Tenant coverage — PASS AS A RATCHET ONLY:** `check:tenant-coverage -- --max-uncovered 0` reports 114 routes: 1 RLS-scoped, 96 app-filtered, 17 reviewed exemptions, 0 unexplained. PostgreSQL RLS is still fail-open without tenant context; this is not multi-tenant certification.
- **Paystack intent recovery — HARDENED IN CODE:** compare invoice balance under the invoice row lock for both methods; allow only the same parent's own reference-bound pending/failed Paystack attempt to resume; keep other active attempts blocking; fail an init attempt only while its idempotency lease is still owned; and do not mark a successfully initialized checkout failed just because the replay-cache write failed. The Paystack provider's duplicate-initialization semantics and the full path still need isolated staging tests.

### Verification executed in this remediation pass

- `npm run audit:deps` — **PASS**, 0 advisories in all reported severities.
- `npm run lint` — **PASS**, exit 0, 0 errors and 102 existing warnings.
- Focused regression suite — **PASS**, 16 files / 134 tests, including fee-posting compare-and-set, Paystack verification/webhook behavior, idempotency, rate-limit fail-closed, CBT draws/auth, client IP, parent fee states, sessions/impersonation, CSP and environment guards.
- `check:tenant-coverage -- --max-uncovered 0` — **PASS**, 0 unexplained routes; RLS limitation above remains.
- `check:dead-ui` — **PASS**, 95 portal pages; `check:orphans` — **PASS**, 85 portal pages reachable; `check:boundary` — **PASS**, 168 client components checked.
- Prettier check on the touched payment/security paths and `git diff --check` — **PASS**.
- **NOT CERTIFIED:** full `tsc`, full Vitest, production build and browser E2E. Prisma client generation cannot download its engine from `binaries.prisma.sh` in this sandbox, leaving the generated client absent. The full suite's observed failures are generated-Prisma-client/Expo-config module errors, not demonstrated assertion failures; this is an environment limitation, not a green result. CI must rerun these checks on the release commit with a generated client.

### Residual launch blockers — NOT VERIFIED

1. Provision the selected Render topology and prove secrets, domain/TLS, health, migrations, Redis, S3, scanner-or-risk-acceptance, Resend and Sentry settings.
2. Obtain green CI for the exact release commit: Prisma generation, typecheck, full test suite and production build. Browser-test admissions and the payment/exam journeys on isolated staging.
3. Prove Paystack test-mode initiation, verification, duplicate webhook/retry, transfer approve/reject, notification delivery and reconciliation without charging a real account during tests. Conduct any controlled live-value check only with school approval.
4. Run the scheduled notification Cron and prove dispatch; receive test Sentry events; rehearse backup restore and record RPO/RTO; run the agreed isolated 1K-DAU test.
5. Verify required branch protection/checks. The earlier GitHub branch-protection query returned 403, so this remains NOT VERIFIED.
6. Keep platform signup and second-tenant onboarding off until RLS is made fail-closed and separately certified. YK-Virtual, Famex-OS and actual Virtual SSO remain outside the provided repository/scope.

**Decision from available evidence: NO-GO for production certification.** The code-side launch blockers listed as addressed above have focused source/static/regression evidence, but production readiness requires the operational and CI evidence in `docs/launch-deployment-runbook.md` and the remaining checklist. The original Ykay College single-tenant scope is preserved; this does not certify EduOS multi-tenancy.
