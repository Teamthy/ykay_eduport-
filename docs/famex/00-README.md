# Famex OS — product rebuild pack

Famex OS is the school operating system for **Famex** — built from the Ykay
College EduPortal base (measured state: 142 API routes, 145 pages, 67 Prisma
models, six role portals, Paystack, attendance, gradebook, report cards, CBT
engine, notification spine, Expo mobile app), expanded into a much larger
product surface: AI learning, AI studio, offline exam centre, HR, Parent PRM,
front desk, e-learning with live virtual classes, and school subscriptions.

This repo is separate from Ykay on purpose (`04-repo-and-delivery.md` covers the
porting policy). The Ykay repository stays untouched and remains the reference
implementation.

> **Scope boundary (read this first).** The base repo contains **two products**:
> the **Ykay College** school OS and **EDUos**, the multi-tenant SaaS platform
> layer (tenant resolution by host, `Plan`/`Subscription`, super-admin console,
> platform landing, RLS enforcement). **Famex OS rebuilds Ykay College only.**
> The EDUos layer is stripped or frozen — the exact list, and what replaces the
> `Subscriptions` nav item, is in `07-master-build-prompt.md §2`.

| # | Document | Read it for |
|---|---|---|
| 00 | this file | What Famex is, decisions, phases, repo status |
| 01 | [`01-module-map.md`](./01-module-map.md) | Every nav item → reuse / extend / new, with data-model deltas and effort |
| 02 | [`02-ai-layer.md`](./02-ai-layer.md) | AI Studio, AI Hub, AI Chat, AI reports: providers, credits, cost control, child-data safety |
| 03 | [`03-elearning-and-virtual-classes.md`](./03-elearning-and-virtual-classes.md) | Lessons, assignments, live classes with assigned URLs, auto attendance, offline reality |
| 04 | [`04-repo-and-delivery.md`](./04-repo-and-delivery.md) | Repo strategy, upstream sync from Ykay, rebrand guard, environments, build order |
| 05 | [`05-cost-model.md`](./05-cost-model.md) | **What it costs**: build routes, content, one-off, annual running cost, 5-year TCO, unit economics, cost levers. Runnable calculator: `npm run cost:model` |
| 06 | [`06-quotation.md`](./06-quotation.md) | **The quotation**: line items, totals, payment schedule, assumptions and exclusions — ready to send to the school |
| 07 | [`07-master-build-prompt.md`](./07-master-build-prompt.md) | **The master build prompt**: scope boundary (Ykay College, *not* EDUos), engineering rules, workstreams W1–W12 with exit criteria, verification gates, banned moves, definition of done |
| 08 | [`08-feature-catalogue.md`](./08-feature-catalogue.md) | **Every feature the product will have** — 331 ID-tagged rows (`F0-01`…`F24-03`) across 25 sections, each marked ✅ in base / 🔧 extend / 🆕 new / ✂️ strip / ⏸ v2. Verified by `npm run check:features` |
| 09 | [`09-master-build-prompt-go.md`](./09-master-build-prompt-go.md) | **The master build prompt, Go edition** — Next.js 16.4 + Go 1.27 on OCI behind Cloudflare: architecture, repo layout, the strangler migration of 142 API routes, twenty-five engineering rules, phases P0–P5 (80 dev-weeks), **the real-user simulation test strategy**, CI/CD, gates, and the honest schedule/cost impact |
| 10 | [`10-oci-cloudflare-runbook.md`](./10-oci-cloudflare-runbook.md) | **Deployment runbook** — region choice, sizing and cost, Terraform layout, network and access, Cloudflare configuration, self-managed PostgreSQL, backups and DR, blue/green deploys, observability, incident runbooks, cutover checklist, NDPA notes |

> **Start here for scope.** `08-feature-catalogue.md` is the authoritative list of
> what gets built — 331 features, 97 of them already working in the base. Every
> ticket, PR and QA pass should cite a feature ID from it.
>
> **Start here for the build.** `09-master-build-prompt-go.md` supersedes `07` on
> stack, phases, tests and gates. The stack is **Next.js 16.4 for everything a
> human sees, Go 1.27 for every write, calculation and integration**, PostgreSQL 17
> as the only source of truth, on **Oracle Cloud Infrastructure behind Cloudflare**
> (`10-oci-cloudflare-runbook.md`). `07` remains authoritative on the EDUos scope
> boundary and the seven standing rules that survive the stack change.

The shared engineering pack from the Ykay rebuild (`docs/rebuild/`) travels with
this repo and still applies: finance ledger (`05`), GPS attendance (`03`), CBT at
scale (`04`), WhatsApp Business (`06`), five-year ops (`07`), work plan and risks
(`08`). Where this pack contradicts it, **this pack wins** (the Ykay pack assumed
one repo, two deployments — Famex is its own product).

---

## 1. The complete Famex surface (from the product screenshots)

Nineteen top-level modules, roughly 110 screens, plus the student learning
space. The screenshots the school supplied are *examples* of the surface, not
the whole of it — the module list below is the committed scope.

| # | Module | What it is |
|---|---|---|
| 1 | Home | Role-aware landing, search, "ask Famex", today's tasks |
| 2 | AI Learning Hub | Courses, lessons, assignments, live classes, AI tutor |
| 3 | AI Studio | The 34-template AI workbench, credits, drafts queue |
| 4 | AI CBT | Question bank at 15,000-item scale, offline exam centre, item analysis |
| 5 | Fees & Billing | Ledger-first money: invoices, payments, discounts, refunds, statements |
| 6 | Marks Entry | Gradebook, CA/exam weights, locks, offline capture |
| 7 | Result Generation | Report cards, positions, remarks, transcripts, verification |
| 8 | Admissions | Application funnel, documents, entrance tests, offers |
| 9 | Front Desk | Visitors, appointments, gate pass, parcels, complaints |
| 10 | Attendance | Clock in/out with GPS, registers, alerts, leave |
| 11 | HR Management | Staff files, contracts, leave, payroll, appraisals |
| 12 | Parent PRM | Households, preferences, engagement, meetings, consent |
| 13 | Users | Students, staff, guardians, classes, ID cards |
| 14 | Communication | WhatsApp Business, SMS, email, push, broadcasts, costs |
| 15 | Documents | Vault, templates, bulk generation, e-signature, retention |
| 16 | Timetable | Editor, auto-generation, rooms, exam timetables, substitutions |
| 17 | Help Desk | Tickets, SLAs, knowledge base, satisfaction |
| 18 | School Website | Public site, CMS, admissions funnel, custom domain |
| 19 | Settings | Profile, terms, grading, modules, integrations, backups |
| 20 | Licence & Usage | *(was: Subscriptions)* licence, usage, limits, add-ons |

---

## 2. Frozen product principles

These are the decisions that everything else follows from. They do not get
revisited mid-build without a written reason.

| # | Principle | Status |
|---|---|---|
| FP-1 | **Single-school install.** Famex OS is a school system, not a SaaS platform. `schoolId` stays as hygiene; tenancy plumbing is frozen, not extended. | ✅ decided |
| FP-2 | **Ledger-first money.** Every naira that moves is a double-entry posting. Invoices are a view of the ledger, never the source of truth. | ✅ decided |
| FP-3 | **Server authority.** Money, marks, results, attendance and releases are computed and validated on the server. The client may only ask. | ✅ decided |
| FP-4 | **Offline-first where it matters.** Marks entry, attendance, exam centre and lesson content keep working when the connection drops. | ✅ decided |
| FP-5 | **AI drafts, humans decide.** No AI output reaches a parent, a pupil or a published result without a named human approving it. | ✅ decided |
| FP-6 | **Child data by default protected.** Minimise, redact, log, and never send more personal data to a provider than the task needs. | ✅ decided |
| FP-7 | **Nothing that matters is deleted.** Financial records, results, gate passes and child-safety records are corrected by counter-entry or amendment, with an audit trail. | ✅ decided |
| FP-8 | **One place for the brand.** No brand literals in code; one token set drives web, mobile, PDF and email. | ✅ decided |

---

## 3. Phases

> **Superseded by `09`.** The table below is the original 67-week plan from
> `07`. The Go backend, OCI deployment and real-user test strategy in `09` add
> **+13 developer-weeks** — **80 in total, ≈8.5 months** — because a second
> runtime, its test harness and its infrastructure are real work. `09 §14`
> itemises the delta and the two options (full Go core, or Go for auth/ledger/
> messaging/CBT only at 74 weeks). The phase *shape* below is unchanged; only the
> content and the length of each phase move.

The build runs to **67 developer-weeks** across twelve workstreams
(`07-master-build-prompt.md §5`). The phases below are the delivery view of the
same plan.

| Phase | Workstreams | Weeks | Content | Exit |
|---|---|---|---|---|
| **P0 — Foundations** | W1–W2 | 3.5 | Strip EDUos, single-school, rebrand ratchet; module registry, settings, tokens, provisioning | A new school can be provisioned end to end; no EDUos surface remains |
| **P1 — Money & people** | W3–W5 | 15 | Ledger then Fees & Billing; notification spine + WhatsApp; people, admissions, timetable, attendance | A term can be invoiced, collected, receipted and reconciled; parents are reachable on WhatsApp |
| **P2 — Academics** | W6–W7 | 14.5 | Marks and results; CBT at scale and the offline exam centre | A full term's marks → report cards → release, and a 15,000-item bank with blueprint papers |
| **P3 — Learning & AI** | W8–W9 | 13 | AI layer; e-learning and live classes | Students learn and attend live classes in-portal; AI is metered and reviewed |
| **P4 — Service modules** | W10–W11 | 14 | HR and payroll; Parent PRM, Front Desk, Help Desk | The school's day-to-day front office runs on Famex |
| **P5 — Launch** | W12 | 7 | Website CMS, Licence & Usage, hardening, go-live | UAT signed off, training delivered, backups rehearsed, go-live |
| **Total** | W1–W12 | **67** | | |

Weeks inside each phase are workstream *estimates*, not a calendar promise: W3–W7
are the schedule-critical path, and the ≈5 developer-weeks saved by dropping the
EDUos platform layer are held as **schedule contingency**, not spent upfront.

---

## 4. Repository status

| Item | State |
|---|---|
| New repo | `Teamthy/Famex-OS` (created by the owner) |
| Base import | Fresh root commit, code-only clone of Ykay College — no Ykay history |
| Remotes | `origin` → Famex-OS, `upstream` → Ykay (push URL disabled) |
| Design pack | `docs/famex/00–08`, mirrored on the Ykay `arena/4897ad52-ykay-eduport` branch until Famex-OS accepts pushes from the build environment |
| Tooling | `npm run check:features` (scope guard), `npm run cost:model` (running-cost calculator, `--cloud oci-budget\|oci-resilient`) |
| Stack | Next.js 16.4 / React 19.3 (UI) · Go 1.27 (all writes, calculations, integrations) · PostgreSQL 17 |
| Hosting | OCI Ampere A1, European region · Cloudflare edge (Lagos PoP), Tunnel, WAF, Turnstile, Access |

> **Why the pack is mirrored.** The build environment's GitHub connection is
> scoped to selected repositories and did not include `Teamthy/Famex-OS` at
> creation time, so the pack was briefly held only in a working copy — and was
> lost once to a workspace rollback. It now lives in git on the Ykay session
> branch, and moves to Famex-OS the moment the connection covers it. Nothing in
> the pack is intended for Ykay's `main`.

---

## 5. What "done" means

1. Every feature in `08-feature-catalogue.md` is either delivered or explicitly
   deferred in writing.
2. The money path is on the ledger: invoice → collection → receipt → statement →
   reconciliation, with no spreadsheet in the chain.
3. A full term runs end to end without a manual database edit: admissions →
   enrolment → fees → attendance → marks → results → release.
4. 15,000 CBT items are loaded, blueprinted and analysable.
5. Parents are reachable on WhatsApp Business with delivery evidence and a
   known cost per message.
6. Live classes run in-portal from assigned links, with attendance recorded.
7. `npm run check:features`, `npm test` and the verification gates in
   `07-master-build-prompt.md §8` pass in CI.
8. The school's own staff can run the system after handover, and the school
   holds its own data.
