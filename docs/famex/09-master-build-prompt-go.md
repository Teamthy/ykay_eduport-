# 09 — Master build prompt: Next.js + Go, on OCI behind Cloudflare

This supersedes `07-master-build-prompt.md` **on stack, workstream content, the
phases, the test strategy and the gates**. `07` remains the authority on the
scope boundary (§2, Ykay College not EDUos), the seventeen engineering rules
(§4, which still apply and are extended in §4 here), and the definition of the
four sensitive domains (§9). `08-feature-catalogue.md` remains the authority on
**what** gets built; this document is the authority on **how and in what order**.

Deployment detail — network, Terraform, backups, cutover, cost — is
`10-oci-cloudflare-runbook.md`.

---

## §0 — Kickoff (paste-ready)

> You are building **Famex OS** in `Teamthy/Famex-OS`: a school operating system
> for one Nigerian secondary school, ~3,000 users, expected to run five years
> without a rewrite.
>
> **Stack:** Next.js 16.4 / React 19.3 renders everything a human sees. **Go
> 1.27 owns every write, every calculation and every external integration.**
> PostgreSQL 17 is the only source of truth. The backend runs on **Oracle Cloud
> Infrastructure** (Ampere A1, European region) with **Cloudflare** as the only
> public edge — DNS, WAF, CDN, Tunnel, Turnstile and zero-trust access.
>
> **Read, in order:** this file in full; `08-feature-catalogue.md` (cite feature
> IDs — `F5-04` — in every commit and PR); `07-master-build-prompt.md §2` for the
> EDUos strip list (non-negotiable) and `§4` for the seventeen standing rules;
> `02`, `03` and `05` for the AI layer, the learning space and the cost model;
> `10-oci-cloudflare-runbook.md` before you provision anything.
>
> **Work one workstream at a time, in the order in §7.** Before you claim a task
> is done, run the gate block in §11 and paste the real output. If a gate cannot
> run in your environment, say which one and what you verified instead. Never
> edit or push to the Ykay repository. Never run `panic` in a request path,
> never put money in a `float64`, and never let the client compute a total.
>
> **Definition of "done" is §13.** "It works on my machine" is not a status.

---

## §1 — The stack, pinned

| Layer | Choice | Version (verified 2026-10-13) | Why this |
|---|---|---|---|
| Frontend | Next.js | **16.4** (Oct 2026), React **19.3** | App Router, Server Components, Turbopack default, Cache Components. The existing base is already Next.js — keep the UI, replace the data layer. |
| Backend | **Go** | **1.27** (Aug 2026) | Compiles to a single static binary for arm64; no runtime; predictable memory; the concurrency model fits the fan-out we do (WhatsApp, AI providers, report-card generation). |
| Database | PostgreSQL | 17 | One source of truth for money, marks and results. Same engine in every environment. |
| Job queue | **River** (Postgres-backed) | latest | **Jobs are enqueued in the same transaction as the business write.** A payment and its receipt message either both exist or neither does. Removes a whole class of lost-message bugs, and removes a service from the stack. |
| Cache / sessions | in-process LRU + HTTP caching at Cloudflare | — | At 3,000 users, a separate cache tier is a liability, not an optimisation. Add Valkey only when a measurement demands it (§12). |
| Contracts | OpenAPI 3.1 | `api/openapi.yaml` | The only interface between the two runtimes. Generated types on both sides; CI fails on drift. |
| Contracts→Go | `oapi-codegen` | — | Server interfaces and types generated from the spec. |
| Contracts→TS | `openapi-typescript` | — | The web app gets typed clients from the same file. |
| Database access | `sqlc` + `pgx/v5` | — | SQL is written by hand and checked at build time. No ORM, no lazy loading, no N+1 surprises. |
| Migrations | `goose` | — | **One owner for DDL: Go.** Prisma switches to introspection (§3.4). |
| Money | `type Kobo int64` | — | Integers only. Rounding rules live in one package with tests. |
| Logging | `log/slog` (stdlib) | — | Structured JSON, request-scoped, no PII (§12). |
| Tracing | OpenTelemetry → OTLP | — | Traces and metrics exported to the collector on the same VM. |
| Testing | `go test` + testcontainers-go + Playwright + k6 | — | §8. |
| Hosting | OCI Ampere A1, European region | — | arm64, cheap, 10 TB/month free egress. |
| Edge | Cloudflare (Free→Pro) | Pro $25/mo since early 2026 | Lagos PoP terminates Nigerian traffic locally; Tunnel means no inbound ports on OCI at all. |

**Go 1.27 features we use deliberately:** `encoding/json/v2` for strict
interop-safe JSON at the API edge; the stdlib `uuid` package (no third-party
UUID dependency); `httptest.NewTestServer` for handler tests with no TCP ports;
`testing/synctest` for deterministic time in ledger and notification tests;
`runtime/pprof`'s goroutine-leak profile in staging; `strings.CutLast` and the
smaller-allocation path where they help hot paths. `go test` now runs the
`stdversion` vet check by default — keep the module's `go` directive honest.

---

## §2 — Architecture

### 2.1 Shape: a modular monolith, not microservices

One Go module, one deployable, hard internal boundaries. At 3,000 users,
microservices buy nothing and cost everything (network hops, distributed
tracing everywhere, two-phase everything, a deployment matrix). The boundaries
are enforced in code review and by package layout, so extraction stays possible
later *if a measurement ever demands it* — and it won't at this size.

```
                   ┌──────────────── Cloudflare (Lagos PoP) ────────────────┐
   browser ───────▶│  DNS · WAF · rate limiting · cache · Turnstile · TLS  │
                   └───────────────────────────┬───────────────────────────┘
                                   Cloudflare Tunnel (outbound only)
                                               │
                    ┌──────────────────────────▼──────────────────────────┐
                    │  OCI VM (Ampere A1, arm64) — no inbound ports        │
                    │                                                      │
                    │   cloudflared ──┬── /                ──▶ Next.js :3000│
                    │                 └── /api/v1/*        ──▶ Go API :8080│
                    │                                                      │
                    │   Go worker (queue)        Go scheduler (cron)       │
                    │   OTel collector           log shipper               │
                    └──────────────────────────┬───────────────────────────┘
                                               │ private subnet
                    ┌──────────────────────────▼──────────────────────────┐
                    │  PostgreSQL 17 primary (+ hot standby in resilient)  │
                    │  WAL + base backups ──▶ OCI Object Storage           │
                    └──────────────────────────────────────────────────────┘
```

Both application processes sit behind **one origin hostname**, so cookies are
first-party, there is no CORS in the request path, and `SameSite=Lax` does real
work. `cloudflared` routes by path, which is why no load balancer and no public
IP are needed.

### 2.2 Where Next.js ends and Go begins

| Concern | Owner |
|---|---|
| Rendering, routing, SEO, forms, client state, PWA shell | **Next.js** |
| Authentication (issuing sessions), authorisation decisions | **Go** |
| Every write to money, marks, results, attendance, admissions | **Go** |
| Every external integration: Paystack, WhatsApp, SMS, email, AI providers, storage signing | **Go** |
| Long-running work: report cards, bulk imports, broadcasts, exports | **Go worker** |
| Scheduled work: reminders, alerts, rollups, backups | **Go scheduler** |
| Reads the UI needs | **Go API** (web app calls it; transitional exceptions in §3.5) |

**The rule that keeps this honest:** the browser never talks to a database, and
Next.js never decides. If a number appears on screen, a server computed it. A
Server Component may fetch; it may not calculate a fee, a position or a balance.

### 2.3 Identity contract (what makes the strangler possible)

- Go issues **Ed25519-signed JWTs** (stdlib `crypto/ed25519`), published as
  **JWKS** at `/.well-known/jwks.json`.
- Access token 15 minutes in an httpOnly, `SameSite=Lax`, `Secure` cookie; a
  rotating refresh token in a second httpOnly cookie. Mobile keeps its existing
  **Bearer** contract — same tokens, same keys.
- **During the transition**, Next.js verifies both the legacy HS256 token and
  the new EdDSA token (dual-verify, JWKS-first). Cutover to single-verify only
  after every issuer is Go and a full week of staging traffic shows no legacy
  tokens.
- Authorisation is a Go decision, returned with the data (`{ data, permissions }`)
  so the UI can hide what the user cannot do — but hiding is cosmetic; the
  enforcement is server-side.

### 2.4 Money and the ledger, in Go

- `type Kobo int64`. Rates may use `math/big`-backed decimals internally, but
  every stored and transmitted amount is an integer kobo.
- Postings are **append-only**. The application's database role holds
  `INSERT, SELECT` on the postings table and **no `UPDATE` or `DELETE`** —
  enforced by `GRANT`, so a bug cannot silently rewrite history.
- A journal entry must balance. Enforced by a deferred constraint in the
  database **and** a property test in Go, because the database must also be
  right when a human with `psql` is the one making the mistake.
- Idempotency: `UNIQUE (idempotency_key)` with `ON CONFLICT DO NOTHING` plus a
  reconciliation read. A retried request returns the original result, never a
  second posting.
- Long-running money operations (statement generation, reconciliation) are
  River jobs enqueued in the same transaction as their trigger.

### 2.5 Read paths and the reporting problem

Report cards, broadsheets and class analytics are **big reads**, not writes.
They belong in SQL — window functions, CTEs, materialised views refreshed by the
scheduler — not in application loops. Every heavy query ships with an
`EXPLAIN (ANALYZE, BUFFERS)` capture in the PR, and the load test in §8.5 is what
proves it holds at 5 years of data rather than 3 terms.

---

## §3 — Repository layout

### 3.1 Top level

```
Famex-OS/
├── apps/
│   └── web/                  # Next.js 16.4 — the only user-facing runtime
├── services/
│   └── api/                  # Go 1.27 — the only writer
│       ├── cmd/{api,worker,scheduler,migrate}/
│       ├── internal/platform/    # config, logging, httpx, authn, authz, money,
│       │                         # idempotency, ratelimit, problem, otel, clock
│       ├── internal/domain/      # ledger, fees, payments, attendance, cbt, ai,
│       │                         # notify, liveclass, results, people, admissions,
│       │                         # hr, prm, tickets, documents, licence
│       ├── internal/store/       # sqlc output + repositories
│       ├── internal/jobs/        # River job types and handlers
│       ├── api/openapi.yaml      # THE contract
│       ├── db/migrations/        # goose, forward-only
│       └── db/queries/           # sqlc inputs
├── packages/
│   ├── contracts/            # generated TS types + Go server stubs (committed)
│   └── ui/                   # shared design-system components
├── infra/
│   ├── terraform/            # OCI: VCN, VMs, volumes, buckets, IAM, alarms
│   └── cloudflare/           # DNS, WAF rules, Tunnel ingress, Access, Turnstile
├── tests/
│   ├── journeys/             # Playwright, persona-driven (§8.3)
│   ├── load/                 # k6 scenarios (§8.5)
│   ├── chaos/                # adversarial + failure injection (§8.6, §8.7)
│   └── uat/                  # scripts and checklists for the real-user pilot
├── tools/
│   ├── seedgen/              # deterministic 5-year corpus generator (§8.4)
│   └── shadow/               # Go-vs-legacy read comparison harness (§3.6)
└── docs/famex/               # this pack
```

### 3.2 Rules the layout enforces

1. **Domain packages never import each other's internals.** Cross-domain work
   goes through an application service in the owning package or an interface in
   `platform`.
2. **`internal/store` is the only package that touches `pgx`.** A stray
   `pgx.Conn` in a handler fails review.
3. **Nothing outside `internal/domain/*` writes money, marks or results.**
4. **`cmd/*` contains wiring only** — no business logic.
5. **Generated code is committed** and CI proves it is current (§11).

### 3.3 Branching and commits

Trunk-based: short-lived branches, PRs into `main`, no long-running develop
branch. Conventional Commits (`feat(fees): ...`, `fix(cbt): ...`) with the
**feature ID in the body** (`F5-04`). Every PR states what it changes, how it
was tested, and pastes gate output. Money, results, CBT and auth changes need a
second reviewer — no exceptions, including for the fastest fix.

### 3.4 Schema ownership — one authority, decided now

There is **no existing Famex data**, so this is settled without a migration
story: `prisma migrate` is retired.

1. Generate a reviewed `0001_baseline.sql` from the current Prisma schema
   (`prisma migrate diff --from-empty --to-schema-datamodel`), review indexes,
   constraints and types by hand.
2. From then on, **`goose` in `services/api/db/migrations` is the only writer of
   DDL.** Every migration is forward-only and carries a written rollback note.
3. Prisma becomes a **type client only**: `prisma db pull` + `prisma generate`.
   `db:seed*` scripts keep working; `prisma migrate *` and `db:seed-plans.ts`
   are removed from `package.json`.
4. CI asserts the Prisma schema matches the SQL migrations (reuse
   `scripts/check-schema-drift.ts`, repointed at the SQL baseline) so the two
   views of the schema cannot diverge.
5. Migrations run as a **pre-deploy job**, never from an application boot. A
   failed migration aborts the deploy before any instance restarts.

### 3.5 The strangler: migrating 142 Next.js API routes

The base has working TypeScript API routes. Big-bang rewrites of working code
are how projects die, so routes move in **one direction only**, domain by
domain, each with parity evidence.

| Order | Domain | Moves to Go in | Why first / why here |
|---|---|---|---|
| 1 | `auth` (login, logout, session, whoami, password reset, verify) | W2 | Everything else depends on it; small, well-tested surface. |
| 2 | `payments` (Paystack webhook, intents, verification) | W3 | Money-critical, must be idempotent, and it is the entry point to the ledger. |
| 3 | `fees`, `finances`, `budgets` | W3 | Reads and writes around the ledger once it exists. |
| 4 | `notifications`, `messages`, WhatsApp/SMS/email dispatch | W4 | Needs transactional enqueue — the reason River is in the stack. |
| 5 | `staff/attendance`, `admin/staff-attendance`, clock-in | W5 | Geofence maths and offline sync belong in one tested place. |
| 6 | `admissions`, `admin/admissions` | W5 | Funnel writes with documents and payments. |
| 7 | `teacher/gradebook`, `exams`, `report-cards`, `broadsheet` | W6 | Big reads and the highest-consequence writes in the school. |
| 8 | `cbt` (attempts, quizzes, practice, exams) | W7 | Rewritten properly at 15,000-item scale, not ported. |
| 9 | `ai/*` (router, metering, drafts) | W8 | New surface; Go owns provider fan-out and cost control. |
| 10 | `parent/*`, `student/*`, `me/*` | W6–W9 | Read-mostly; move with the domains behind them. |
| 11 | `hr`, `prm`, `front desk`, `help desk`, `documents` | W10–W11 | New domains, born in Go. |
| 12 | `admin CRUD` remnants, `news`, `contact`, `platform/signup` (delete) | W12 | Last; lowest risk, and some can simply retire. |

**Coexistence rules while both runtimes own routes:**

- Each route has exactly **one owner**. A route is never implemented in both
  except for the shadow-read harness below.
- The Go API is served under `/api/v1/*`; a migrated route's old path is
  rewritten at the Cloudflare Tunnel ingress to the new one, so no client
  changes are needed mid-flight.
- Any route still served by Next.js must enforce auth and authorisation itself;
  there is no shared middleware to hide behind.

### 3.6 Shadow reads — how we prove parity without risking money

For the two highest-consequence calculations (fee balance, term position):

1. Go computes the value and returns it — **Go is the writer and the answer**.
2. The legacy TypeScript implementation computes the same value from the same
   data, **read-only**, and the two are compared.
3. Divergence is logged with both values, the inputs, and a trace ID; an alert
   fires on any divergence in a sample of production traffic.
4. Shadow mode runs for **one full term**. When divergence is zero across that
   term, the legacy implementation is deleted.

**Never shadow a write.** Only one implementation may move money or marks, ever.
That rule is the difference between a migration and an incident.

---

## §4 — Engineering rules (extends `07 §4`; all twenty-five apply)

**Money and correctness**

1. Money is `int64` kobo. No `float64`, no `float32`, no "just for display".
2. Postings are append-only; corrections are counter-entries. The app's DB role
   has no `UPDATE`/`DELETE` on ledger tables.
3. Every money and enrolment write is idempotent, keyed and reconciled.
4. Every journal entry balances — asserted in the database and in a property test.
5. The server computes; the client displays. A client-sent total is treated as
   hostile input.

**Go discipline**

6. **No `panic` in a request path.** Handlers return errors; a recovered panic is
   a 500 with a trace, an alert, and a postmortem, not a control-flow tool.
7. **Every request has a context with a deadline.** No unbounded query, no
   unbounded loop, no unbounded fan-out. `context.Background()` outside `main`
   or tests is a review failure.
8. **No goroutine without an owner.** Every `go func()` is tied to a context, a
   wait group, or a supervised worker, and the goroutine-leak profile must be
   flat after a load run.
9. **Pools are sized, not defaulted.** `MaxConns` is derived from the database's
   connection ceiling divided by the number of instances, and the load test
   proves saturation behaviour is a fast 503, not a queue that grows forever.
10. **N+1 is a bug, not a style choice.** Fan-out reads are set-based; each new
    query path gets `EXPLAIN` evidence.
11. **Explicit errors, wrapped with context**, checked with `errors.Is`/`As`
    where it matters; sentinel errors are defined in the owning domain.
12. **No `init()` doing work**, no package-level mutable state, no globals except
    immutable config.
13. **`slog` with request IDs, never `fmt.Println`**, and never a log line
    containing a token, password, ID number, phone number or full name.
14. **Time comes from a `Clock` interface** so tests can travel in time. `time.Now()`
    directly in a domain package is a review failure.
15. **Every external call has a timeout, a retry policy and a circuit breaker.**
    A slow WhatsApp or AI provider must degrade the feature, not the school.

**Web discipline**

16. No brand literals — tokens and settings only (`audit:brand` must not worsen).
17. Server Components fetch; they do not compute money, marks or positions.
18. The browser never receives a database row it is not entitled to see.
19. Offline-first for attendance, marks entry and the exam centre; a lost
    connection must not lose a lesson's work.
20. Every screen survives 360px, 3G and a keyboard.

**Process**

21. **Tests ship with the change** for money, CBT, attendance, results and auth.
22. **Migrations are forward-only**, one per change, with a rollback note.
23. **Feature flags for anything risky** (new ledger path, new CBT engine), with
    a named owner and an expiry date.
24. **No direct database access from `apps/web` for new work**; new reads go
    through the Go API.
25. **The Ykay repository is out of bounds.** `upstream` is read-only.

---

## §5 — The Go domain services

| Package | Owns | Rest of the system depends on it for |
|---|---|---|
| `platform/authn` | Token issue/verify, JWKS, refresh rotation, session revocation | Identity everywhere |
| `platform/authz` | Role × permission × module entitlement decisions | Every route guard |
| `platform/money` | `Kobo`, rounding, allocation, formatting | All arithmetic on money |
| `platform/idempotency` | Key reservation and replay | Every money/enrolment write |
| `platform/httpapi` | Problem+JSON errors, pagination, request IDs, validation | Every handler |
| `domain/ledger` | Accounts, journals, postings, trial balance, reconciliation | `fees`, `payments`, reporting |
| `domain/fees` | Structures, invoices as ledger projections, discounts, refunds, arrears | Bursar and parent surfaces |
| `domain/payments` | Paystack init/verify/webhook, settlement matching | Ledger |
| `domain/notify` | Templates, WhatsApp/SMS/email/push dispatch, delivery receipts, cost | Every module that talks to a parent |
| `domain/attendance` | Registers, clock in/out with geofence, leave, alerts | Parent alerts, HR, reporting |
| `domain/cbt` | Bank, blueprints, papers, sittings, marking, item analysis | Teacher and student surfaces, offline centre |
| `domain/academics` | Marks, gradebook rules, positions, report cards, transcripts | Results release |
| `domain/ai` | Prompt registry, provider router, metering, redaction, drafts queue | AI Studio, tutor, drafting everywhere |
| `domain/liveclass` | Live classes, assigned-URL join, attendance | Learning space |
| `domain/people` | Students, staff, guardians, classes, imports | Everything |
| `domain/hr`, `domain/prm`, `domain/tickets`, `domain/documents`, `domain/licence` | The service modules | Their own screens |

Each package ships with: table-driven unit tests, integration tests against a
real PostgreSQL in a container, and at least one property or fuzz test where the
domain has an invariant (ledger balance, blueprint quotas, geofence containment,
fee allocation sums).

---

## §6 — Frontend standards (Next.js 16.4)

- **App Router, Server Components by default.** A Client Component must earn its
  place; anything that only renders stays on the server.
- **Data through the Go API** with generated types; no direct Prisma reads in
  new code.
- **Streaming and suspense** for slow sections (fee status, analytics) so a slow
  query never blocks the page.
- **Cache Components / `use cache`** for content that tolerates staleness (school
  website, news, static lists) with explicit revalidation; never for money, marks
  or attendance.
- **Bundle budget**: initial JS ≤ 200 KB gzipped per route, enforced in CI. Any
  new dependency over 20 KB is a review question.
- **Images** through `next/image`; lesson media served from object storage with
  signed URLs.
- **PWA**: installable, offline shell, offline queues for the three offline-first
  flows; service worker updates are explicit, not silent.
- **Accessibility**: WCAG 2.2 AA. Every interactive element keyboard-reachable,
  labelled, and contrast-checked. axe runs in CI and must stay at zero critical
  findings on the critical journeys.
- **No client-side authorisation logic.** Hidden buttons are convenience;
  enforcement is server-side.

---

## §7 — Phases and workstreams (80 developer-weeks)

The stack change adds **+13 developer-weeks** over the 67 in `07`. §14 explains
where the time goes and what it does to the quotation.

| Phase | Workstreams | Weeks | Content |
|---|---|---|---|
| **P0 — Foundations** | W1–W2 | 6.5 | Strip EDUos, single-school, rebrand; Go platform, auth, contract pipeline, IaC, CI/CD, observability |
| **P1 — Money & reach** | W3–W5 | 18 | Ledger and Fees & Billing in Go; notification spine and WhatsApp; people, admissions, timetable, attendance |
| **P2 — Academics** | W6–W7 | 17.5 | Marks, results, report cards; CBT at 15,000-item scale and the offline exam centre |
| **P3 — Learning & AI** | W8–W9 | 15 | AI layer with metering and approval; e-learning and live classes |
| **P4 — Service modules** | W10–W11 | 15 | HR and payroll; Parent PRM, Front Desk, Help Desk |
| **P5 — Launch** | W12 | 8 | Website CMS, Licence & Usage, hardening, load/chaos/UAT, go-live |

### W1 — Strip EDUos, go single-school, rebrand (1.5 wk)
**Entry:** the repository exists with the base imported.
**Deliverables:** the `07 §2` strip list removed in one reviewable PR;
`Subscriptions` → Licence & Usage; brand tokens drive name, colour, crest and
letterhead; the source of truth for the ratchet stays `npm run audit:brand`, re-cut for Famex.
**Exit:** no EDUos surface remains; the app boots as a single-school install; no
brand literal is added.

### W2 — Foundations: Go platform, auth, contracts, infrastructure (5 wk)
**Entry:** W1 done.
**Deliverables:** monorepo layout (§3.1); `goose` baseline migration and Prisma
switched to introspection (§3.4); OpenAPI skeleton with the generated Go server
stubs and TS client; **auth service in Go with JWKS-verifiable EdDSA tokens**;
`platform/*` packages (money, idempotency, httpapi, authz, clock, otel);
Terraform for OCI and Cloudflare config as code; CI for two runtimes; staging on
the OCI Always Free instance; observability (OTel → collector, Sentry, uptime
probe); first-run provisioning wizard; module registry driving nav and
entitlements.
**Exit:** a fresh school can be provisioned end to end; a user logs in through
Go and Next.js verifies the token via JWKS; `check:modules` passes; the staging
URL is behind Cloudflare Access and unreachable from the public internet except
through the tunnel.

### W3 — Finance: ledger, then Fees & Billing (8 wk)
**Entry:** W2 done.
**Deliverables:** `domain/ledger` with the append-only posting model and the
no-UPDATE grant; chart of accounts; `domain/payments` (Paystack init, verify,
webhook, settlement matching) with idempotency and replay tests; invoices as
ledger projections; partial payments, credits, discounts, refunds, transfers;
arrears ageing and collection workflow; bursar dashboard; statements.
**Exit:** every naira traces from a receipt back to a journal entry; a replayed
webhook posts once; the property test suite proves debits equal credits across
randomised sequences; the shadow read on fee balance agrees with the legacy
implementation across the seeded corpus.

### W4 — Notification spine + WhatsApp Business (4.5 wk)
**Entry:** W3 done (templates reference money).
**Deliverables:** `domain/notify` with River-backed jobs enqueued
transactionally; WABA registered in Nigeria; utility/marketing/service
categories enforced as data, not as a developer's habit; templates with
variables; delivery receipts and automatic SMS fallback; two-way replies into
the school inbox; per-message cost metering.
**Exit:** a payment enqueues its receipt in the same transaction and the message
arrives; an undelivered WhatsApp message falls back to SMS and says so; the
cost dashboard matches the provider's bill for a sample week.

### W5 — People, admissions, timetable, attendance (5.5 wk)
**Entry:** W2 done.
**Deliverables:** `domain/people` (students, staff, guardians, classes, streams,
bulk import with validation and preview); admissions funnel through offer and
enrolment; timetable editor with clash detection; `domain/attendance` with
registers that work offline and **GPS clock in/out for all users** — including
the reviewed CSP change that currently denies geolocation
(`next.config.ts:22,49`).
**Exit:** a full day's attendance is captured on a phone with the network cut
mid-morning and synced later without duplicates; GPS accuracy and mock-location
rejection behave as specified; a class can be timetabled with no clashes.

### W6 — Academics: marks and results (8 wk)
**Entry:** W5 done.
**Deliverables:** gradebook with configurable weights; offline mark entry
(single-writer, conflict-free); lock and correction-request workflow; broadsheet;
report-card generation as a **River job**; positions, cumulatives, transcripts;
result release control; verification pages with QR; the term's heavy reads
`EXPLAIN`-verified against the 5-year corpus.
**Exit:** a full term of marks produces report cards for 3,000 students in under
15 minutes as a background job; the shadow read on term position agrees with
legacy across the corpus; no result is visible to a parent before release.

### W7 — CBT at scale + offline exam centre (9.5 wk)
**Entry:** W6 done.
**Deliverables:** the CBT engine **rewritten in Go** (not ported); 15,000-item
bank with `schoolId`, review workflow, lifecycle and audit; blueprint assembly
with per-candidate papers; item analysis; sitting windows; retake rules; exam-lab
device management; the **offline exam centre** (LAN server that marks locally and
syncs later); media and maths notation; accessibility modes.
**Exit:** 250 candidates start a paper within 10 minutes with autosave p99 under
500 ms; a candidate's machine loses power mid-paper and the attempt resumes with
the right answers; a blueprint produces reproducible papers; item analysis
matches a hand-worked example.

### W8 — AI layer (7 wk)
**Entry:** W3 and W6 done (money and results data exist to ground prompts).
**Deliverables:** prompt registry with 34 versioned templates; provider router
with tiers, cost ceilings, failover and batch; metering and caps enforced in the
router; redaction layer with tests per provider path; the drafts queue with named
approvers; usage dashboard; teacher templates first (highest time saved per call).
**Exit:** no AI output reaches a parent, pupil or published result without a
recorded approver; a provider outage fails over invisibly; the monthly AI spend
cannot exceed the configured cap even under a runaway loop.

### W9 — E-learning and live classes (8 wk)
**Entry:** W8 for the tutor; W5 for timetables.
**Deliverables:** courses, modules, lessons with resumable progress and
low-bandwidth mode; assignments and submissions; lesson quizzes with the
deliberate CA posting path; **live classes with an assigned URL** — `joinUrl`
for students, encrypted `hostUrlEnc` that is never exposed; join-window
enforcement; automatic attendance; recordings; offline lesson download; study
plan.
**Exit:** a learner joins a live class from the portal and attendance is recorded
without a teacher marking anything; a leaked host link is not obtainable from the
student-facing surface; a quiz result reaches the gradebook once, and only after
the teacher posts it.

### W10 — HR and payroll (7.5 wk)
**Entry:** W3 ledger and W5 attendance done. **Payroll runs only after one
settled term** of clean data — the code can be early, the run cannot.
**Deliverables:** staff files, contracts, leave management, appraisals, training,
disciplinary records, recruitment; payroll runs to payslips; statutory schedules
(PAYE, pension, NHF, ITF); exit and clearance.
**Exit:** a full payroll month reconciles to the ledger; payslips are correct for
a hand-checked sample including a mid-month hire, an unpaid-leave deduction and a
loan.

### W11 — Parent PRM, Front Desk, Help Desk (7.5 wk)
**Entry:** W4 messaging and W5 admissions done.
**Deliverables:** household and 360° parent profiles; communication preferences;
engagement flags; meeting booking; consent management (the source of truth for
AI and recording consent); visitors, appointments, and **Gate Pass** with
child-safety retention; tickets with SLAs, knowledge base and satisfaction.
**Exit:** a parent's consent choice changes what the system will do with their
child's data elsewhere; a gate pass cannot be deleted, only superseded.

### W12 — Website CMS, licence, hardening, go-live (8 wk)
**Entry:** everything above.
**Deliverables:** website CMS with themes and a custom domain; media library;
licence and usage; the hardening block — **full load run at 2× peak, all chaos
scenarios, adversarial suite, the UAT pilot, blue/green release rehearsal, and a
timed restore drill**; NDPA pack and DPIA signed; staff training; cutover.
**Exit:** §13's definition of done, with the evidence attached.

---

## §8 — Real-user simulation: the test strategy

The point of this section is that **a green test suite is not evidence that a
school can use the system.** The failure modes that hurt are a bursar on a slow
connection at 7:55am, a parent whose WhatsApp never arrives, a teacher whose
marks vanish when the power goes, and a student who shares a live-class link.
So the suite is built around people, devices and adversity — not around
functions.

### 8.1 The layers

| Layer | Tool | Runs | Proves |
|---|---|---|---|
| 1 Unit | `go test` | every push | logic and arithmetic |
| 2 Property & fuzz | `testing/quick`, `go test -fuzz` | every push (short), nightly (long) | invariants hold for inputs nobody wrote down |
| 3 Integration | testcontainers-go, real PostgreSQL | every push | SQL, constraints, transactions, migrations |
| 4 Contract | `oapi-codegen` / `openapi-typescript` drift check | every push | the two runtimes agree on the interface |
| 5 Journey (persona) | Playwright, throttled, on real device profiles | every push (6 critical), nightly (all) | a human can finish the task |
| 6 Adversarial | custom Go + Playwright, ZAP baseline | nightly | the system resists a cheap attacker |
| 7 Load | k6, journey-shaped with think time | nightly + before every release | it holds on the worst day of the year |
| 8 Chaos | scenario runner + fault injection | weekly in staging | failure is graceful and recoverable |
| 9 UAT | real humans, scripted tasks | P5 | the school can actually run it |
| 10 Production | RUM, OTel, SLO alerts | continuous | reality still matches the model |

Coverage targets are by risk, not by vanity: **≥90% on money, CBT marking,
attendance and auth**; ≥70% overall in `services/api`; no target for generated
code or `cmd/*` wiring.

### 8.2 Personas

Every journey belongs to a persona, with a device, a network and a deadline —
because "the user" is nine different people with nine different tolerances.

| # | Persona | Role | Device | Network | When | Cares about |
|---|---|---|---|---|---|---|
| P1 | Mrs. Adebayo, 52 | Bursar | Desktop, Chrome | Office LAN, occasional drop | 07:30–09:00, month-end | Absolute correctness, receipts, reconciling to the bank |
| P2 | Mr. Okonkwo, 38 | Form teacher | Mid Android (4 GB) | 4G that drops | 07:40, before assembly | Register done in under 2 minutes, nothing lost offline |
| P3 | Chidi, 16 | SS2 student | Low-end Android | 3G, shared, data-capped | Evenings, exam periods | Practice works, live class joins, does not eat data |
| P4 | Mrs. Nwosu, 41 | Parent | Budget Android | WhatsApp-first, 3G | Termly, deadlines | Pays without stress, sees the receipt, gets the alert |
| P5 | Mr. Eze, 30 | Front desk | Desktop | Busy LAN | 07:00–08:30 rush | Fast, no queue at the gate, gate pass is safe |
| P6 | Mrs. Balogun, 47 | Head teacher | Laptop | Wi-Fi | Results day, term end | Release is safe, approvals are simple, reports are trusted |
| P7 | Mr. Idris, 34 | HOD / teacher | Laptop, shared office | 4G | Weekly | AI saves time, never embarrasses him in front of a parent |
| P8 | Aisha, 29 | HR officer | Desktop | Office | Monthly, termly | Forms do not lose data, payroll is defensible |
| P9 | Mr. Ade, 35 | IT / support | Laptop + phone | Office + mobile | Daily | Can diagnose a complaint without guessing |
| A1 | — | **Adversary** | Any | Any | Anytime | Curiosity, cheap fraud, a leaked link |

### 8.3 Journey catalogue (persona-driven Playwright)

Each journey is a script with a precondition, a device/network profile, and
**pass criteria that include a time budget and a correctness assertion** — not
just "clicked without error".

| ID | Persona | Journey | Pass criteria |
|---|---|---|---|
| J-01 | P1 | Record an offline bank-transfer payment and issue a receipt | Receipt correct to the kobo; two journal entries posted; p95 < 1.5 s on office LAN |
| J-02 | P1 | Reconcile yesterday's Paystack settlements against invoices | Match runs unattended; unreconciled items listed with reasons; no invoice double-marked |
| J-03 | P1 | Produce the arrears list and send reminders | Correct 30/60/90 buckets; **utility** templates used; cost shown before send |
| J-04 | P1 | Apply and approve a bursary discount | Approval recorded with approver and reason; ledger reflects it; audit row exists |
| J-05 | P2 | Take the register on a mid-range phone, network cut mid-task | Completes offline; syncs exactly once on reconnect; no duplicates after retry |
| J-06 | P2 | Enter 30 CA scores offline and sync | No lost or duplicated scores; conflict rule visible if a second writer appears |
| J-07 | P2 | Open the class dashboard on 3G | Interactive in < 5 s cold, < 2.5 s warm; usable at 360 px |
| J-08 | P3 | Practice 20 CBT questions on Slow 3G, then lose power at question 14 | Answers up to 14 persisted server-side; resume shows the same questions and answers |
| J-09 | P3 | Join a live class from the portal | Joins through the signed redirect; attendance timestamped; **host link absent from every response and asset** |
| J-10 | P3 | View a released report card on a phone | Loads < 4 s on Slow 3G; not visible before release time |
| J-11 | P4 | Pay term fees from a transfer and find the receipt | Balance updates once; receipt downloadable; WhatsApp confirmation delivered |
| J-12 | P4 | Reply to a WhatsApp message and see it answered in-portal | Reply lands in the school inbox within 60 s; staff sees full history |
| J-13 | P4 | Check a child's attendance and see an absence alert | Alert arrives the same day; portal agrees with the alert |
| J-14 | P4 | Read a report card and a teacher's remark | Renders on a budget Android; remark is teacher-approved text, never raw AI draft |
| J-15 | P5 | Sign in a visitor during the morning rush, then sign them out | Gate pass/visitor log correct; p95 < 2 s with 5 simultaneous sign-ins |
| J-16 | P5 | Release a pupil with a gate pass to a named collector | Collector identity, ID check and authoriser recorded; record cannot be deleted |
| J-17 | P5 | Log a complaint and see it reach the help desk | Appears in the queue with SLA clock; parent-visible status correct |
| J-18 | P6 | Release results for a year group | Nothing visible before the release time; 1,800 parent reads served within SLO |
| J-19 | P6 | Approve a batch of discounts and inspect the ledger effect | Every approval attributable; trial balance still balances |
| J-20 | P6 | Review the broadsheet for a class | Correct positions including ties; renders < 5 s for 40 students × 12 subjects |
| J-21 | P6 | Check licence, usage and the AI spend | Numbers match the metering tables |
| J-22 | P7 | Draft a lesson plan with AI, edit it, approve it | Draft versioned; approver recorded; nothing published unapproved |
| J-23 | P7 | Review 20 AI-drafted questions and approve 5 | Approved items enter the bank with reviewer; rejected ones retained with reasons |
| J-24 | P7 | Compose a parent message with AI and send as **utility** | Category is utility where it should be; cost preview accurate; delivery receipt recorded |
| J-25 | P8 | Apply for leave, have it approved, see the balance | Ledger of leave days correct; approval audited |
| J-26 | P8 | Run payroll for a month and open a payslip | Reconciles to the ledger; hand-checked sample matches to the kobo |
| J-27 | P9 | Provision a new teacher and verify their access | Only permitted modules visible **and** enforced (verified from the wrong role) |
| J-28 | P9 | Investigate a failed WhatsApp delivery | Delivery attempt, error code, fallback and cost all visible for one message |
| J-29 | P9 | Run the restore drill | Backup restores to a clean database within the stated RTO; row counts match |

**The six that run on every pull request** — the ones whose failure means the
school stops working: **J-01, J-05, J-08, J-09, J-11, J-18.**

### 8.4 Device, network and adversity simulation

Playwright drives real Chromium under CDP constraints, so "Slow 3G" is a
measured condition, not a hope:

| Profile | Applied as | Used by |
|---|---|---|
| Slow 3G | 400 ms RTT, 400 kbps down / 400 kbps up, 1% packet loss | J-07, J-08, J-10 |
| 2G / edge | 800 ms RTT, 250 kbps, 2% loss | P3, P4 journeys |
| Drops mid-task | profile for N seconds, then `setOffline(true)` at a named step | J-05, J-06, J-08 |
| Power loss | kill the browser context mid-journey | J-08 — asserts server state, not client state |
| Low-end device | 4× CPU throttle, 360×640, DPR 2, no GPU | every journey gets one low-end run |
| Slow first paint | cold cache + no service worker | J-07, J-10 |
| Clock skew | client clock moved ±5 minutes | J-01, J-05 — server time must win |
| Duplicate submit | the same POST fired twice within 300 ms | J-01, J-11 — exactly one posting |

**Generating the data these run against (`tools/seedgen`, deterministic and
seeded):** 3,000 students, 1,500 households, 120 staff; **five academic years ×
three terms** of attendance (≈2.7 M rows), marks (≈540 K), ledger (≈30 K
invoices, ≈60 K payments, ≈200 K postings), CBT (15,000 items, ≈100 K attempts),
notifications (≈300 K dispatches) — roughly **30 million rows**, regenerated
byte-for-byte from a seed so a performance result can be reproduced exactly.

It also deliberately includes **messy reality**: missing marks, late payments,
duplicate names, phone numbers in three formats, partial addresses, one class
with a mid-term teacher change, and a handful of records with 3+ guardians.
Simulating users against pristine data is how you build software that breaks on
contact with a school.

### 8.5 Load: model the worst day, with think time

Endpoint hammering proves nothing. k6 runs **journeys with human pacing**:

| Scenario | Shape | Why it is the worst day |
|---|---|---|
| `morning-peak` | 600 concurrent sessions, ramp 07:30→08:00, think time 8–20 s; mix 40% register, 25% clock-in, 15% dashboards, 10% payments, 10% misc | eight hundred people arrive at once, on the same 20 minutes |
| `results-release` | 1,800 unique users over 2 h, burst at announcement, read-heavy | every parent and student at once, on the highest-stakes page |
| `exam-start` | 250 candidates start within 10 min, 40 questions each, autosave every 20 s | sustained autosave concurrency is the real CBT load |
| `fee-deadline` | 900 payments over 3 days, peak 150/hour | payment paths, idempotency and gateway latency together |
| `month-end` | bursar statements + bursar reports + reconciliation | the heaviest reads in the system, against 5 years of data |

**Service-level objectives, and the pass conditions:**

| Measure | Target | Pass condition |
|---|---|---|
| API p95 (server) | ≤ 300 ms | at 1× peak |
| API p99 | ≤ 900 ms | at 1× peak |
| Error rate | ≤ 0.5% | at 1× peak (5xx only; 4xx are user error) |
| CBT autosave p99 | ≤ 500 ms | `exam-start` |
| Login p95 | ≤ 1.2 s | `morning-peak` |
| LCP on Slow 3G | ≤ 2.5 s warm, ≤ 5 s cold | `morning-peak` |
| **Headroom** | **2× modelled peak**, CPU < 40%, DB connections < 60% of pool | the release gate |
| Degradation | at 4× peak, fast 503s and no data loss | chaos, not a target to serve |

The load run must also prove **bounded behaviour**: when the connection pool
saturates, requests fail fast and visibly — they do not queue until timeout, and
nothing is half-written.

### 8.6 Chaos: failure, on purpose

Run weekly in staging against the seeded corpus, with the expected behaviour
written down **before** the run:

| Scenario | Expected behaviour |
|---|---|
| Kill the Go API mid-webhook handling | Payment still posts exactly once; the retry finds the idempotency key and returns the original result |
| Fail PostgreSQL over to the standby | RTO < 2 min; in-flight requests get a clear retryable error; ledger balances after |
| Stop `cloudflared` on one connector | Second connector serves within seconds; no failed logins during the switch |
| Corrupt a River job payload | Job dead-letters with the payload quarantined; the queue keeps draining; an alert fires |
| Fill the queue (10 K jobs) | Notifications delay, money does not; the API stays inside SLO |
| Exhaust the database connection pool | Fast 503s, no panics, no goroutine growth, recovery on its own |
| Drop the AI provider (timeouts + 500s) | Router fails over; if all providers are down, the feature says so and queues nothing silently |
| Drop the WhatsApp provider | SMS fallback fires; cost recorded honestly as fallback |
| Cut power to the exam lab mid-paper | The offline centre keeps marking; sync after power restores reconciles with no lost answers |
| Lose the network for 45 minutes at 07:45 | Registers, clock-ins and marks are captured offline and sync exactly once |
| Delete the WAL archive folder | Backup alerts fire; the restore drill still succeeds from base + remaining WAL |
| Set the client clock 5 minutes fast | Server time governs; attendance ordering is correct |

### 8.7 Adversarial simulation: assume a curious 16-year-old

| Attack | Simulation | Required outcome |
|---|---|---|
| IDOR sweep | Every `/api/v1/*` path fetched with another user's IDs, for every role | 403/404, no data, an audit event, and an alert above a threshold |
| Role matrix | Every route called with every role × module entitlement combination | Deny by default; the matrix is generated from the catalogue, not hand-written |
| Double payment | Same idempotency key twice, and two keys 300 ms apart | One posting; the second is a no-op or an explicit duplicate warning |
| Forged webhook | Paystack webhook with a bad signature and a replayed body | Rejected; replays are idempotent, not re-posted |
| JWT tamper | Signature stripped, `alg` swapped, expired token, token from another school | All rejected; JWKS rotation honoured |
| Brute force | 10,000 logins against one account and against 10,000 accounts | Rate limits hold; no account enumeration in responses or timing |
| Link share | Student forwards the live-class URL to a non-enrolled account | Join denied outside enrolment/window; event logged |
| Prompt injection | Parent message containing "ignore previous instructions…" into an AI drafting flow | Treated as data; output never executes, no system prompt leak |
| CSV injection | Import a question bank with `=cmd|...` cells | Sanitised on export; import flags it |
| Upload confusion | `.exe` renamed `.pdf`, oversized file, zero-byte file | Rejected by content sniffing, not by extension |
| SQL injection | Hostile strings through every text field on the import paths | Parameterised queries only; fuzz test proves it |
| Public form abuse | 1,000 admissions enquiries in 5 minutes | Turnstile + rate limit; a human sees nothing |
| Data exfil attempt | A staff account exports far beyond its normal pattern | Volume anomaly alert; export audited |

### 8.8 UAT with real humans (P5, gates go-live)

Twenty-five to forty real people — 5 teachers, 2 bursars, 1 front desk, 2 admins,
1 HR, 10 parents, 10 students — for two weeks on **staging with synthetic data**,
each with the device they actually use. They are given twelve scripted critical
tasks (drawn from §8.3) plus freedom to explore and break things.

Capture: task completion, time on task, points of confusion, support tickets,
and the exact words they use for things (which become the UI's vocabulary).
**Exit criteria:** ≥90% completion on all twelve critical tasks, zero open P1
defects, and every confusing step either fixed or explicitly accepted in writing
by the school. Feedback from this pilot is a deliverable, not a courtesy.

### 8.9 Production: real users, watched

- **RUM and traces**: Sentry (already in the base) plus OTel traces sampled at
  10%, 100% for money, results and auth.
- **SLOs and an error budget**: the §8.5 targets become alerting thresholds.
  Budget exhausted → the next release ships fixes only.
- **Nightly replay**: five critical journeys (J-01, J-05, J-08, J-11, J-18) run
  against staging every night with the seed generator's fresh corpus, so drift
  is caught by a robot before a parent finds it.
- **Canary by construction**: blue/green — deploy to the idle process, run the
  six critical journeys against it directly, switch the Tunnel ingress, watch
  error rate and latency for 15 minutes, roll back by switching the ingress back.
- **Weekly**: chaos scenarios and a dependency scan. **Monthly**: restore drill.
  **Quarterly**: full load run and a capacity review against real growth.

### 8.10 What "the tests pass" has to mean

A release is not ready because the suite is green. It is ready when:

1. Every gate in §11 passes, with output pasted.
2. Load passes at **2× peak** inside the SLOs, with the headroom numbers attached.
3. Every chaos scenario in §8.6 has been run this quarter with the expected
   behaviour observed.
4. The adversarial suite is clean, or every exception is written down with an owner.
5. The UAT exit criteria are met (P5 only).
6. The restore drill has been run in the last 30 days.

---

## §9 — Deployment (summary; detail in `10`)

- **Cloudflare is the only public surface.** DNS, WAF, rate limiting, caching,
  Turnstile and TLS terminate at the Lagos PoP — Nigerian users are served
  locally instead of from Europe.
- **No inbound ports on OCI.** `cloudflared` makes an outbound tunnel; the VM's
  security rules deny everything inbound. A stray open port is impossible
  because there is none.
- **Region**: an OCI European region (Madrid or Frankfurt — benchmark both from
  Lagos in week 1 and keep the winner). Measured Lagos→Lisbon is ~70 ms; with
  Cloudflare terminating in Lagos, only cache misses and API calls cross.
- **OCI Always Free is staging, never production.** Oracle halved the free
  allowance on 2026-06-15 (4→2 OCPU, 24→12 GB) and reclaims instances idle below
  20% CPU/network/memory over 7 days. The nightly test runs keep staging busy;
  production runs on paid capacity with an SLA.
- **Database**: self-managed PostgreSQL 17 on Ampere A1 with a hot standby, WAL
  archived to OCI Object Storage. The managed service lists at **$273/month** for
  its smallest shape — 8.5× a self-managed VM — which is why it is documented
  and declined, not overlooked.
- **Egress**: 10 TB/month free, then $0.0085/GB. The school will never leave the
  free band.
- **Cost** (`npm run cost:model -- --cloud oci-resilient --breakdown`):
  **$187.46/month** for the resilient profile, **$99.89** for the budget profile.

---

## §10 — CI/CD

**On every pull request**

```
go vet · golangci-lint · staticcheck · govulncheck
go test ./... -race                        # unit + property
go test -tags=integration ./...            # real PostgreSQL, testcontainers
sqlc diff · openapi drift check            # generated code must be current
migration lint                             # forward-only, rollback note present
npm ci · tsc --noEmit · eslint · vitest
playwright --project=critical              # the six journeys in §8.3
axe scan on critical journeys · bundle budget check
npm run check:features · npm run cost:model
secret scan · dependency audit
```

**Nightly**

```
full Playwright journey suite across Slow 3G / 2G / low-end device
k6: morning-peak, exam-start (baseline against the seeded corpus)
adversarial suite + ZAP baseline
full seedgen corpus regeneration and a data-integrity assertion run
```

**Weekly**: chaos scenarios in staging · dependency and image scans.
**Monthly**: restore drill · capacity review against real growth.
**Quarterly**: full load run at 2× peak · pen-test scope review.

**Release**: merge to `main` → images built for arm64 → staging deploy →
migrations (pre-deploy job) → smoke → **blue/green switch via Tunnel ingress** →
15-minute watch on error rate, latency and the ledger balance check → rollback
by ingress switch if the error budget burns.

**API versioning**: `/api/v1` with a written deprecation policy — sunset headers,
six months' notice, and no breaking change inside a version. The school's mobile
app is the constraint that keeps this honest.

---

## §11 — Verification gates

```bash
# ── backend ───────────────────────────────────────────────────────────────
cd services/api
go vet ./... && golangci-lint run ./... && staticcheck ./...
go test ./... -race -count=1
go test -tags=integration ./... -count=1          # testcontainers + PostgreSQL
go test ./internal/domain/ledger/... -run Fuzz    # invariants under fuzzing
sqlc diff && (oapi-codegen --config codegen.yaml api/openapi.yaml | git diff --exit-code)
govulncheck ./...
goose -dir db/migrations validate

# ── frontend ──────────────────────────────────────────────────────────────
cd apps/web
npm run typecheck && npm run lint && npm test
npm run check:features          # docs/famex/08 totals still match its rows
npm run cost:model              # cost assumptions still hold

# ── journeys and load ─────────────────────────────────────────────────────
npx playwright test --project=critical            # J-01, J-05, J-08, J-09, J-11, J-18
npx playwright test --project=slow-3g --project=low-end   # nightly
k6 run tests/load/morning-peak.js                 # release gate, 1× then 2×
k6 run tests/load/exam-start.js                   # release gate
```

Rule, unchanged from `07`: **paste the actual output in the PR description.**
"Tests pass" without output is not evidence. If a gate cannot run (no network to
a provider, no container runtime), say which one and what you verified instead.

---

## §12 — Banned moves (Go edition)

| Banned | Why |
|---|---|
| `float64` anywhere near money | the ledger stops balancing and nobody trusts it again |
| `panic` in a request path | one bad input becomes a school-wide outage |
| `context.Background()` in a domain function | uncancellable work that outlives its request |
| A goroutine without a lifetime | leaks that appear as a mystery at month three |
| Unbounded `SELECT` or a loop over all students | works with 50 rows, dies with 3,000 |
| An ORM hiding the SQL | the reporting queries are the product; see them |
| Adding Valkey "for performance" without a measurement | a new component, a new failure mode, no evidence |
| Long-running work inside an HTTP request | timeouts, retries and duplicate side effects |
| Logging PII, tokens or full names | NDPA exposure in the cheapest possible place |
| Training or fine-tuning on school or child data | a contractual and ethical line, not a technical one |
| A second writer of DDL | two migration tools is how schemas drift |
| Shadow-writing money or marks during migration | two writers of one ledger is an incident waiting for a date |
| Shipping a feature without its journey test | the journeys are the definition of working |
| "We'll add tests after go-live" | no |

---

## §13 — Definition of done (whole build)

1. Every feature in `08-feature-catalogue.md` is delivered or deferred in
   writing, against its ID.
2. `services/api` has no `float64` money, no `panic` in handlers, flat goroutine
   profiles after a load run, and passing property/fuzz tests on the ledger.
3. A full term runs end to end with no manual database edits: admissions →
   enrolment → fees → attendance → marks → results → release.
4. The money path reconciles to the bank, and a replayed webhook posts once.
5. 15,000 CBT items are loaded, blueprinted and analysable; the offline exam
   centre survives a power cut mid-paper.
6. Parents are reachable on WhatsApp with delivery evidence and a known cost.
7. Live classes run from assigned links, with attendance recorded and no host
   link ever exposed to a student.
8. Load passes at **2× modelled peak** inside the SLOs; every chaos scenario has
   been run and behaved; the adversarial suite is clean or documented.
9. A restore drill has been completed within the last 30 days and the RPO/RTO
   are as stated.
10. UAT: ≥90% completion on the twelve critical tasks, zero open P1 defects.
11. NDPA pack and DPIA signed; retention schedules enforced in code.
12. The school holds its own data, domain and WhatsApp account — and can run the
    system without us.

---

## §14 — What this does to the plan (be honest about it)

Adding a Go backend is **not a free choice**, and pretending otherwise would be
the first dishonest thing in this pack.

### Schedule

| | Weeks | Calendar |
|---|---:|---|
| Original plan (`07`) | 67 | 7 months |
| **This plan** | **80** | **8.5 months** |

The +13 weeks, itemised:

| Work | Weeks |
|---|---:|
| Go platform: repo, contract pipeline, auth service, `platform/*`, IaC, CI for two runtimes, observability | +3.0 |
| Money in Go: ledger, idempotent payments, webhook, property tests | +1.0 |
| Notifications in Go: transactional enqueue, WhatsApp/SMS, delivery receipts | +1.0 |
| Attendance/clock service with geofence and offline sync | +1.0 |
| Academics in Go: marks, results, heavy report queries, PDF service | +1.0 |
| CBT engine rewritten in Go at 15,000-item scale, with parity tests | +2.0 |
| AI router and metering in Go | +1.0 |
| Live-class join and attendance service | +1.0 |
| HR/payroll and PRM/front-desk/help-desk domains in Go | +1.0 |
| Hardening: load at 2×, chaos, adversarial, UAT, blue/green, DR drill | +1.0 |
| **Total** | **+13.0** |

Two honest options:

- **Option A — as specified here:** 80 weeks, 8.5 months, build **₦28,050,000**
  (was ₦23,100,000), i.e. **+₦4,950,000**.
- **Option B — Go core only:** move just auth, ledger + payments, notifications
  and the CBT engine to Go (74 weeks, 7.75 months, build ≈ **₦25,575,000**), and
  migrate the remaining domains after go-live on a published backlog. Slower to
  reach the full Go surface, cheaper now, same destination.

### Running cost

| Cloud profile | Monthly | Annual | Per student / year |
|---|---:|---:|---:|
| Original model (managed PaaS) | $96.00 | ₦1,728,000 | ₦752 |
| **OCI budget** | **$99.89** | **₦1,797,930** | **₦782** |
| **OCI resilient** (hot standby, Cloudflare Pro) | **$187.46** | **₦3,374,280** | **₦1,467** |

Total annual running cost (infrastructure + WhatsApp + SMS + AI):

| Cloud profile | Annual running | Per student / year |
|---|---:|---:|
| Original model | ₦3,046,350 | ₦1,325 |
| OCI budget | ₦3,116,280 | ₦1,355 |
| **OCI resilient** | **₦4,692,630** | **₦2,040** |

**The recommendation: ratchet.** Run `oci-budget` through P0–P2 while the system
is being built, then move to `oci-resilient` **before fees and results go live** —
the standby is what protects the ledger, and the whole reason for it is that a
restore is measured in tens of minutes while a failed fee deadline is measured in
parents' trust. Blended first-year infrastructure lands near **₦2,586,000**.

Five-year total cost of ownership (Option A build + content + setup + 5 years of
running):

| Cloud | 5-year TCO |
|---|---:|
| Original plan, original model | ₦48,451,750 |
| This plan, OCI budget | ≈ **₦53,750,000** |
| This plan, OCI resilient | ≈ **₦61,633,000** |

`06-quotation.md` needs reissuing against whichever option is chosen — the totals
above come from `npm run cost:model -- --cloud oci-resilient`, not from
arithmetic done in a document.
