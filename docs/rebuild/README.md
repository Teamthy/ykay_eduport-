# Second-school rebuild — approach pack

Index for rebuilding this platform for another school: exact portal parity, new
brand, 3,000 users, five years, Nigeria, with a proper financial system, GPS
clock in/out, a 15,000-question CBT bank and WhatsApp Business.

| # | Document | Read it for |
|---|---|---|
| 01 | [`01-approach.md`](./01-approach.md) | **Start here.** The fork-vs-tenant decision, delivery model, sequencing, scope fence, first 10 days |
| 02 | [`02-rebrand-redesign.md`](./02-rebrand-redesign.md) | Brand-token extraction, the 579-literal burn-down, asset checklist, redesign depth per layer, tenant provisioning |
| 03 | [`03-gps-attendance.md`](./03-gps-attendance.md) | GPS/QR clock in-out: policy first, geofences, server-side truth, offline punches, exceptions review |
| 04 | [`04-cbt-15k.md`](./04-cbt-15k.md) | 15k-question content operations, validator, duplicate detection, review UI, tenant-scoped bank, exam engine at scale |
| 05 | [`05-financial-system.md`](./05-financial-system.md) | Chart of accounts, double-entry ledger, periods, reconciliation, payroll, controls, invariants |
| 06 | [`06-whatsapp-business.md`](./06-whatsapp-business.md) | Cloud API vs BSP, verification, templates, webhooks, two-way inbox, **and the queue fix it depends on** |
| 07 | [`07-scale-and-five-year-ops.md`](./07-scale-and-five-year-ops.md) | Load model, environment matrix, five-year upgrade plan, cost model, support model, NDPA compliance |
| 08 | [`08-workplan-risks-golive.md`](./08-workplan-risks-golive.md) | WBS, migration, risk register, UAT, go-live, decision closure |

Companion code added with this pack (runnable today):

| Artifact | Purpose |
|---|---|
| `scripts/brand-audit.ts` + `npm run audit:brand` | Brand-literal inventory with a baseline ratchet — stops new Ykay strings entering the code while the 579 existing ones are burned down |
| `lib/geo.ts` + `tests/lib/geo.test.ts` | Pure geofence/trust logic for GPS punches: haversine, accuracy gate, mock-location, velocity, clock skew, decision mapping |
| `lib/ledger-core.ts` + `tests/lib/ledger-core.test.ts` | Double-entry core: entry validation, trial balance, money in kobo, ageing buckets, posting-rule shapes |
| `lib/whatsapp.ts` + `tests/lib/whatsapp.test.ts` | WhatsApp Cloud API plumbing: E.164 normalisation, template payloads, webhook signature verification, status mapping |

---

## Open launch questions (answer these to close D5–D9)

1. **Mobile app** — one build per school (own bundle id, own store listing,
   own push identity) or one multi-brand app with a school picker? Per-school is
   simpler, and is the default; multi-brand halves build/release effort if you
   expect a dozen schools.
2. **The 15,000 questions** — author in-house (paid writers + reviewers),
   buy a bank, or licence one? Only genuinely licensed content may be
   redistributed; WAEC/NECO/JAMB past papers are copyrighted.
3. **WhatsApp** — Cloud API direct (cheap, you own onboarding) or a BSP
   (faster onboarding, per-message markup)? Meta Business verification takes
   days to weeks either way, so start it immediately.
4. **Payroll in v1?** — it is the highest-consequence automation, and it moves
   the go-live date. Default is "not in v1" unless the bursar insists.

## Decisions already recommended (override deliberately, not by accident)

| ID | Decision | Recommendation |
|---|---|---|
| D1 | Fork or reuse? | **Reuse: one repo, second deployment, its own database** (`01 §2`) |
| D2 | Delivery model | Keep portals 1:1; rebrand; rebuild finance, queue, CBT, GPS (`01 §3`) |
| D3 | Sequencing | Finance first; go-live on a **term boundary**; start CBT content + Meta verification on day 1 (`01 §4`) |
| D4 | Scope fence | In/out list in `01 §5` — get it signed |
| D7 | WhatsApp provider | Cloud API direct, SMS as the launch channel (`06 §2`) |
| D9 | Hosting | Managed path, two deployments (`07 §2`) |

## What is different about this school (fill in at kickoff)

- Name, slug, domains, colour palette, logo/assets, motto, contact identity
- Academic structure: sessions/terms, classes and arms, subjects, grading scale
- Fee categories, amounts, discount policy (staff ward / sibling / scholarship / bursary), instalment rules
- Bank details + settlement account + gateway account
- Staff list, roles, who approves what above which amount
- Channel policy: which events go by WhatsApp / SMS / email / in-app, and quiet hours
- Compliance contact (DPO or equivalent) and retention expectations
