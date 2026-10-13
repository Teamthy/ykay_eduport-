# 08 — Work plan, migration, risks, go-live

---

## 1. Workstreams and dependencies

| # | Workstream | Depends on | Lead role | Duration | Doc |
|---|---|---|---|---|---|
| W0 | Decisions (D1, D5–D9) + environments + kickoff | — | Product owner | 3–5 days | `01`, `README` |
| W1 | Brand tokens, asset pack, audit guard, public redesign | W0 | Designer + frontend | 3–4 wk | `02` |
| W2 | Finance phase 1 (ledger, periods, reconciliation, reports) | COA sign-off | Backend + bursar | 5–6 wk | `05` |
| W3 | Notification/queue spine (cadence, priorities, metrics) | W0 | Backend | 1–2 wk | `06 §5` |
| W4 | WhatsApp Business (verification, templates, adapter, webhook, inbox) | W3, Meta approval | Backend | 2–3 wk | `06` |
| W5 | CBT: bank scoping, validator, review UI, authoring run, engine hardening | Content brief | Backend + subject leads | 10–14 wk (content-dominated, starts day 1) | `04` |
| W6 | GPS clock-in (policy, geofence, offline punch, exceptions) | Staff notice | Backend + HR | 3–4 wk | `03` |
| W7 | Tenant provisioning + seed + migration dry-runs | W1, W2 | Backend | 2–3 wk | `02 §4`, `§2` below |
| W8 | UAT, training, dual-run pilot, hardening | all | QA + school | 2–3 wk | `§4` below |
| W9 | Payroll (phase 2) | W2 + one settled term | Backend + accountant | 3–4 wk | `05 §3` |

Critical path: **W0 → W2 → W7 → W8 → go-live**, with W5 and W4's Meta approval
running in parallel from day 1 because they are calendar-bound, not effort-bound.

## 2. Data migration

Rules: migrate the minimum; never migrate what you cannot reconcile; the old
system stays **read-only** for at least one term.

| Data | Approach | Verification |
|---|---|---|
| Academic structure (sessions, terms, classes, subjects) | Provisioning config, reviewed by the school | Class list signed off by the Head of School |
| Students (bio, class, guardian contacts) | CSV template → dry-run import → error report → commit | Row counts + 10% spot check against the register |
| Staff (roles, departments, subjects, assignments) | Same, plus invite-based accounts (no passwords in spreadsheets) | Every staff member logs in during training week |
| Parents + links | From the student CSV (guardian fields), phone numbers normalised to E.164 | Every parent receives one test WhatsApp/SMS |
| Photos | Bulk upload to object storage, keyed by admission number | Spot check 20 |
| **Fee balances (arrears)** | **Not a number field — an opening-balance journal entry dated the cut-over day**, per student, from the old system's statement | Bursar reconciles the total to the old system's total, to the ₦ |
| Historical results | Last 1–2 sessions only, as published report cards (PDF) if the old data is unreliable | Printed sample compared to the old report card |
| Question bank | Imported through the validator, banked as school-scoped | Coverage report vs. syllabus |

Cut-over day procedure: freeze old system at end of day → export → import →
post opening balances → trial balance = 0 → bursar sign-off → announce.

## 3. Risk register (top 12)

| # | Risk | Impact | Likelihood | Mitigation |
|---|---|---|---|---|
| R1 | Cross-tenant data leak | Severe (legal/trust) | Low if D1-B, high if shared DB without RLS fix | separate database; then RLS hardening (`07 §6`) |
| R2 | Ledger posting bug → wrong money | Severe | Medium (new code) | invariant tests, nightly integrity job, period close, freeze-on-failure, opening-balance reconciliation |
| R3 | Question bank has wrong keys / duplicates | High | High if rushed | mandatory review gate, duplicate detection, item analysis, sample re-marking against manual marking |
| R4 | Copyright claim over copied past questions | High | Medium | original items only, `*-style` sources, provenance fields, written policy for writers |
| R5 | Meta verification delays WhatsApp past go-live | Medium | Medium | start day 1; SMS fallback already live; FAQ/SLA copy honest |
| R6 | GPS punctuality disputes / staff grievance | High (people) | Medium | written notice + consent, dual-run pilot, exception review not auto-punishment, fallbacks published |
| R7 | Double-credit / lost payment | High | Low–Medium | idempotency keys, webhook signature, one posting per event, nightly reconciliation |
| R8 | Notification queue backlog at 3k users | Medium | High if unchanged | W3 before W4, priorities, backlog alert, provider rate limiting |
| R9 | Data loss (no verified restore) | Severe | Low | nightly backup + **rehearsed** restore drill before go-live |
| R10 | Scope creep ("exactly the same, plus…") | High (schedule) | High | written scope fence (D4), change requests priced in weeks |
| R11 | Key-person dependency | Severe | Medium | two-person rule, runbooks, recorded handover, code in one repo |
| R12 | NDPA non-compliance (children's data, location, cross-border) | High | Medium | compliance pack before first parent message; retention + export; DPO named |

Review the register monthly; a risk that has not moved in two months is either
closed or being ignored.

## 4. UAT, pilot, and go-live

**UAT (2 weeks, school staff run it, not you):**

1. Admissions → enrolment → class assignment → fee invoice issued (portal + WhatsApp).
2. Parent pays by gateway, by transfer (virtual account), and cash at the bursary → receipt → ledger → reconciliation.
3. Fees partially paid across three instalments → ageing report shows the correct balance.
4. Attendance marked → parent alerted within the promised SLA; absentee list correct.
5. Staff punches in via GPS on-site (accepted), off-site (flagged), offline (queued then synced), and via QR (fallback).
6. CBT: a full paper sat by a real class, results released, one item disputed and resolved with the audit trail.
7. Report card generated, printed, and verified against the gradebook.
8. Term close: period closed, treasurer's report produced, budget variance reviewed.
9. Restore drill into staging, timed.

**Dual-run pilot (2–4 weeks):** fees recorded in both systems and reconciled
daily; attendance by QR **and** GPS; alerts sent and delivery rates measured.
Cut over only when the two systems agree to the ₦/punch.

**Go-live day (term start):** freeze window and comms (parents + staff, via
WhatsApp and SMS), support rota staffed, rollback plan written and agreed, and a
named person empowered to call "roll back" without a committee.

**Post-go-live:** week 1 daily standup (10 min, real issues only), week 2–4
weekly, then monthly ops review with the dashboard in `07 §3`.

## 5. Acceptance criteria (testable, so "done" is not an opinion)

- [ ] Every role logs in, sees only their school's data, and cannot reach another school's records (attempted in tests, not assumed).
- [ ] Ledger invariants hold for a full term of real transactions; period closed; reconciliation signed.
- [ ] Receipt for every payment; no payment without a posting; no posting without a source event.
- [ ] Alerts delivered within the published SLA; WhatsApp delivery rate measured and reported; opt-out honoured.
- [ ] 15,000+ published items, all reviewed; one real exam and one mock sat end-to-end; zero unresolved key disputes.
- [ ] GPS punches: on-site accepted, off-site flagged, offline synced with both clocks recorded, exception list worked weekly.
- [ ] Backup restored into staging within the target window; runbook time recorded.
- [ ] Brand: zero Ykay literals in shipping code (`npm run audit:brand -- --strict`), and a live branding change with no deploy.
- [ ] Reports produced for the proprietor: collection rate, arrears ageing, P&L, budget variance, cost per student.
- [ ] Two people can deploy and restore; runbooks handed over and acknowledged.

## 6. Decision closure

Close these before W1 starts (each is small to decide and expensive to change):

| ID | Decision | Options | Default if nobody decides |
|---|---|---|---|
| D1 | Fork vs. two deployments, one codebase | A / **B** / C (`01 §2`) | B (separate DB, same repo) |
| D2 | Scope fence for v1 | `01 §5` | fence as written |
| D3 | Go-live date | term-boundary date | first day of next term |
| D5 | Mobile app: per-school build vs. multi-brand app | one app per school / one app + tenant picker | per-school build, Android first |
| D6 | 15k CBT bank: author / buy / licence | author / buy / hybrid | author, with bought items only if licences permit redistribution |
| D7 | WhatsApp provider | **Cloud API direct** / BSP | Cloud API direct, SMS as launch fallback |
| D8 | Payroll in v1 or v2 | in / out | out of v1 unless the bursar insists — then it moves the date |
| D9 | Self-hosted vs. managed hosting | managed / OCI+Docker | managed (repo's own recommendation) |

Write the answer for each into `docs/rebuild/README.md` so the next person reads
the decision, not the debate.
