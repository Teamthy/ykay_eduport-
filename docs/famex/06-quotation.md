# 06 — Quotation

**Famex OS — school operating system**
Quote no. **FMX-2026-001** · issued **13 October 2026** · valid **30 days**
Currency: **Nigerian Naira (₦)** · Prepared for: **Famex** · Prepared by: the
build team.

> All figures are produced by the model in `05-cost-model.md`
> (`npm run cost:model`). Nothing here is a rate invented for this document.

---

## Section A — Build

| Ref | Item | Detail | Amount |
|---|---|---|---:|
| A1 | Discovery, scoping and provisioning foundation | Module registry, settings, design tokens, first-run wizard, single-school boundary | ₦4,620,000 |
| A2 | Money path: ledger and Fees & Billing | Double-entry ledger, invoices, collections, receipts, discounts, refunds, statements, reconciliation | ₦5,313,000 |
| A3 | Communication spine | WhatsApp Business (WABA registration support), SMS fallback, email, push, cost metering, delivery evidence | ₦3,234,000 |
| A4 | Academics: marks, results, CBT at scale | Gradebook, report cards, transcripts, 15,000-item bank handling, blueprint papers, item analysis, offline exam centre | ₦4,389,000 |
| A5 | AI layer: AI Studio, AI Learning Hub, live classes | 34-template registry, provider router, credit metering, drafts queue, e-learning, assigned-URL live classes | ₦3,465,000 |
| A6 | Service modules: HR, Parent PRM, Front Desk, Help Desk, Documents, Timetable | As catalogued in `08-feature-catalogue.md` §11, §12, §9, §17, §15, §16 | ₦1,386,000 |
| A7 | Website, mobile parity, Licence & Usage, hardening, go-live | CMS, custom domain, mobile parity guard, backups, load test at 3,000 users, UAT support | ₦693,000 |
| | **Section A — build total** | 7 months, dedicated team (2 mid-level + 1 senior + part-time designer) | **₦23,100,000** |

## Section B — Content and data

| Ref | Item | Qty | Unit | Amount |
|---|---|---:|---:|---:|
| B1 | CBT items: written, reviewed, syllabus-tagged | 15,000 | ₦350 | ₦5,250,000 |
| B2 | Lesson packages: notes, short video, per-lesson quiz | 300 | ₦10,000 | ₦3,000,000 |
| B3 | Recording equipment and studio consumables | — | — | ₦500,000 |
| | **Section B — content total** | | | **₦8,750,000** |

## Section C — Setup, compliance and brand

| Ref | Item | Amount |
|---|---|---:|
| C1 | NDPC registration (MDP-EHL band, 1,000–5,000 data subjects) | ₦100,000 |
| C2 | NDPC processor activity fees (2 processors) | ₦10,000 |
| C3 | Domain registration | ₦60,000 |
| C4 | Legal: privacy policy, parent consent, terms of use, DPIA | ₦400,000 |
| C5 | Brand: identity, logo system, document and report-card templates | ₦800,000 |
| | **Section C — setup total** | **₦1,370,000** |

## Section D — Optional

| Ref | Item | Amount |
|---|---|---:|
| D1 | Offline exam lab: 20 machines, LAN and switching, UPS and power protection | ₦4,130,000 |

Quoted separately because the school may already own the hardware. The offline
exam centre runs on existing machines.

---

## Section E — Running cost (hosting, servers, APIs)

| Ref | Item | Monthly | Annual | Quarterly |
|---|---|---:|---:|---:|
| E1 | Infrastructure (app, PostgreSQL, Redis, storage, email, domain) | ₦144,000 | ₦1,728,000 | ₦432,000 |
| E2 | WhatsApp Business | ₦93,675 | ₦1,124,100 | ₦281,025 |
| E3 | SMS (fallback channel) | ₦4,500 | ₦54,000 | ₦13,500 |
| E4 | AI (seven modelled workloads) | ₦11,688 | ₦140,250 | ₦35,063 |
| | **Section E — running total** | **₦253,863** | **₦3,046,350** | **₦761,588** |

Paid **in advance, quarterly**. Payment-gateway fees (≈₦560,000/year at this
collection volume) are charged by Paystack directly on the school's own account
and are **not** included above.

---

## Totals

| | Amount |
|---|---:|
| One-time: Section A + Section B + Section C | **₦33,220,000** |
| Running: Section E, year 1 | **₦3,046,350** |
| **Year 1 total** | **₦36,266,350** |
| Optional: Section D (exam lab) | ₦4,130,000 |
| **Five-year total cost of ownership** (one-time + 5 × running) | **₦48,451,750** |

**Per student:** ₦1,325/year running cost (₦110/month) · **₦4,213/year** across
five years including the build, the content and everything else.

---

## Payment schedule (one-time ₦33,220,000)

| Stage | Share | Amount | Trigger |
|---|---:|---:|---|
| 1 | 40% | **₦13,288,000** | On signature — mobilisation, team, environment, content commissioning |
| 2 | 25% | **₦8,305,000** | P1 accepted: money path live (invoice → collection → receipt → statement) and parents reachable on WhatsApp |
| 3 | 20% | **₦6,644,000** | P3 accepted: marks → results → release, CBT at scale, AI layer, learning space with live classes |
| 4 | 15% | **₦4,983,000** | UAT signed off and go-live |
| | **100%** | **₦33,220,000** | |

Each stage is accepted in writing against the exit criteria in
`00-README.md §3` and the feature IDs in `08-feature-catalogue.md`.

## Section F — Assumptions, exclusions and terms

**Assumptions**

1. Profile: 2,300 students, 1,500 families, 250 teachers, 300 staff; one school,
   one campus, one licence (FP-1).
2. FX **₦1,500/$**. If the naira moves more than 10% before signature, the
   USD-denominated lines (E1, E2, E4) are restated at the rate on the day of
   signing.
3. Rates current as at **13 October 2026** (Meta Nigeria rate card, provider
   pricing, NDPC fee schedule, Lagos salaries).
4. The school provides a decision-maker for scope, a content reviewer per
   subject, and access to its Paystack and domain accounts.
5. The WhatsApp Business account is registered **in Nigeria** and in the
   school's name; authentication-international pricing is avoided by design.
6. Delivery runs W1 → W12 as sequenced in `07-master-build-prompt.md`; the
   ≈5 developer-weeks saved by excluding the EDUos platform layer are held as
   schedule contingency.
7. One round of consolidated feedback per stage; further rounds are quoted
   separately.

**Exclusions**

1. Exam-lab hardware (Section D) and any other equipment, printing or
   consumables.
2. Internet connectivity, power infrastructure and on-site network cabling
   beyond the lab.
3. VAT and any other taxes or levies.
4. Third-party subscriptions, licences and API usage beyond Section E's
   modelled volumes — charged at cost with evidence.
5. Migration of legacy paper or spreadsheet records; bulk import tooling is
   included, data entry is not.
6. Video streaming beyond assigned-link live classes and object storage; a
   self-hosted video CDN is a separate decision (`05-cost-model.md §2`).
7. Post-go-live feature work outside the catalogue; changes are estimated
   against feature IDs.

**Terms**

- Sections A–C are invoiced per the schedule above. Section E is quarterly in
  advance, starting at go-live.
- The school owns its data, its domain and its WhatsApp Business account.
  Export tooling is part of the delivery (F19-12).
- Warranty: **6 months** from go-live, covering defects against the catalogue's
  acceptance criteria. Support and maintenance thereafter at the annual rate in
  Section E plus an agreed retainer for the warranty period's successor.
- Source code, documentation and the design pack are handed over at final
  payment.
- Prices hold for 30 days from issue.

**Acceptance**

Signed for Famex: ______________________  Date: __________
Signed for the build team: ______________________  Date: __________
