# 05 — What Famex OS costs

Every figure here is produced by `npm run cost:model` (`scripts/cost-model.ts`),
which is dependency-free and runs offline so the school's bursar can re-run it
with their own numbers:

```bash
npm run cost:model                      # headline
npm run cost:model -- --breakdown       # every line item
npm run cost:model -- --json            # machine-readable
npm run cost:model -- --students 800 --fx 1600 --marketing 3000
```

Default profile: **2,300 students · 1,500 families · 250 teachers · 300 staff ·
₦1,500 per $1**. Nothing below is a quote — `06-quotation.md` is the quote.

---

## 1. The school's year (recurring)

| Line | Amount | Basis |
|---|---:|---|
| Infrastructure | **₦1,728,000** | $96/month at ₦1,500/$ |
| WhatsApp Business | **₦1,124,100** | utility $241.20 + marketing $468.00 + service $40.20 |
| SMS | **₦54,000** | 9,000 messages × ₦6.00 |
| AI | **₦140,250** | $93.50 across seven workloads (§3) |
| **Annual running cost** | **₦3,046,350** | ≈ **$2,031/year** |
| Payment gateway | ₦560,000 | 0.7% of ₦80,000,000 collected — *collected on the school's behalf, not a running cost* |
| **Paid APIs + gateway** | **₦1,878,350** | WhatsApp + SMS + AI + gateway |

**Per student: ₦1,325/year — ₦110/month.** That is the number to hold up against
any per-student software subscription the school has been offered.

**Fixed vs usage-scaled: 51% fixed, 49% usage-scaled.** The fixed half is the
infrastructure contract; the variable half is messages and AI, which the school
controls by how much it sends.

---

## 2. Infrastructure — $96/month

| Item | $/month | Why this size |
|---|---:|---|
| App hosting | 20 | one always-on container; the app is I/O-bound, not CPU-bound |
| PostgreSQL | 35 | 3,000 users, five years of attendance, marks and ledger history; daily backups included |
| Redis | 5 | queues, rate limits, caching |
| Object storage | 10 | documents, photos, report-card PDFs, CBT media |
| Email | 20 | transactional (receipts, resets, reports); bulk news goes over WhatsApp/SMS |
| Domain | 6 | the school's own name, renewing annually |
| Monitoring, CI, EAS builds, off-site backup | 0 | free tiers and the existing pipeline |

**Server + database + deploy ≈ ₦90,000/month.** A second app instance
(+$20/month) is only needed once the school wants zero-downtime deploys or a
standby for exam week.

**Optional triggers** — the model deliberately does not count these until they
are real:

| Trigger | $/month | When it becomes necessary |
|---|---:|---|
| Uptime + error monitoring | 26 | the first time the school asks "was it down?" |
| Second app instance | 20 | zero-downtime releases, or exam-week standby |
| Video CDN | 45 | **only if** recordings are streamed from our own storage; assigned-link live classes and object storage remove this line |

---

## 3. Paid APIs

### WhatsApp Business (Nigeria, effective 2026-10-01)

| Category | Volume/year | Rate | Cost |
|---|---:|---:|---:|
| Utility (fees, results, attendance) | 36,000 | $0.0067 | $241.20 |
| Marketing (newsletters, events) | 9,000 | $0.052 | $468.00 |
| Service (parent replies, first 1,000/number/month free) | 6,000 | $0.0067 | $40.20 |
| **Total** | **51,000** | | **$749.40 → ₦1,124,100** |

⚠️ **The single most expensive mistake available in this build** is sending fee
reminders as *marketing* templates instead of *utility*. Marketing costs $0.0516
against utility's $0.0067 — **7.7× more**. The model rounds marketing up to
$0.052 so the estimate cannot flatter us. W4 (`07-master-build-prompt.md`) makes
template category a reviewed property of every notification, not a developer's
choice at 11pm.

Authentication-international sits at $0.0750 — 11× the local rate — which is why
the WABA must be registered **in Nigeria**.

### SMS

9,000 messages × ₦6.00 = **₦54,000/year**. Used as the *fallback* channel when a
parent has no smartphone or a WhatsApp message goes undelivered; Nigerian
aggregators quote ₦5.95–8.00 promotional and ₦6.65–9.00 transactional, so ₦6 is
at the optimistic end and the fallback volume is deliberately modest.

### AI — $93.50/year across seven workloads

| Workload | Model | Tokens (in/out, M) | Cost |
|---|---|---|---:|
| AI tutor & study chat | Gemini 2.5 Flash-Lite | 12 / 6 | $3.60 |
| Practice feedback | Gemini 2.5 Flash-Lite | 8 / 3 | $2.00 |
| Question drafting | GPT-5 mini | 20 / 8 | $21.00 |
| Remarks & insight reports | GPT-5 mini | 6 / 2 | $5.50 |
| Parent message composition | Claude Haiku 4.5 | 10 / 4 | $30.00 |
| Lesson plans & schemes | Gemini 3.6–3.8 Flash | 15 / 5 | $30.00 |
| Summaries & rewrite tools | Gemini 2.5 Flash-Lite | 6 / 2 | $1.40 |
| **Total** | | | **$93.50 → ₦140,250** |

Token volumes are estimates, not measurements. What matters is that every line
names a model with a published price, so a provider's rate change is one
multiplication away from being understood. Two levers make this materially
cheaper: **routing routine work to Flash-Lite** (as above) and **batch tiers,
which are roughly 50% off** for anything that does not need an interactive
answer — question drafting, insight reports and remark drafting all qualify.

### Payment gateway

0.7% of ₦80,000,000 collected = **₦560,000/year**. Paystack's card price is
1.5% + ₦100 (capped ₦2,000); the blended 0.7% reflects the real mix of
transfers, POS and cash that a Nigerian school actually collects. If the school
moves entirely to cards, this line roughly doubles — worth saying out loud
before it happens.

---

## 4. One-off costs

| Item | Amount |
|---|---:|
| NDPC registration (MDP-EHL, 1,000–5,000 data subjects) | ₦100,000 |
| NDPC processor activity fees (2 processors × ₦5,000) | ₦10,000 |
| Domain registration | ₦60,000 |
| Legal: policies, parent consent, terms, DPIA | ₦400,000 |
| Brand: identity, logo system, templates, signage handoff | ₦800,000 |
| **Total** | **₦1,370,000** |

---

## 5. Content and equipment

| Item | Unit | Qty | Amount |
|---|---:|---:|---:|
| CBT items (written, reviewed, tagged) | ₦350 | 15,000 | ₦5,250,000 |
| Lesson packages (video/notes/quiz) | ₦10,000 | 300 | ₦3,000,000 |
| Recording and equipment | — | — | ₦500,000 |
| **Subtotal** | | | **₦8,750,000** |
| *Offline exam lab (optional)* | | | |
| Machines | ₦180,000 | 20 | ₦3,600,000 |
| LAN, switch, cabling | — | — | ₦180,000 |
| UPS and power protection | — | — | ₦350,000 |
| **Exam lab total** | | | **₦4,130,000** |

The exam lab is deliberately **outside** the headline totals: it is capital the
school may already own, and the offline exam centre (F4-09) works on whatever
machines the school has.

---

## 6. Build routes

| Route | Build cost | Time | Trade-off |
|---|---:|---:|---|
| Self-build | ₦0 | 18–24 months | No cash cost; the school carries the hiring risk and the schedule risk, and a school's own developer is a single point of failure |
| **Small dedicated team** | **₦23,100,000** | **7 months** | 2 mid-level + 1 senior + part-time designer. Recommended: enough people to keep W3 (money) and W7 (CBT) moving in parallel |
| Agency turnkey | ₦60,000,000 | 9 months | Fastest start, least control; vendor lock-in and handover are the risks |

The team route assumes **mid-level ₦700,000/month** and **senior
₦1,500,000/month** — inside the Lagos 2026 bands (mid ₦500k–1.5M, senior
₦1.2M–2.5M+) — plus a designer at ₦400,000/month part-time.

---

## 7. Five-year total cost of ownership

TCO = build + (5 × annual running) + one-off + content.

| Route | Build | 5 years running | One-off + content | **5-year TCO** |
|---|---:|---:|---:|---:|
| Self-build | ₦0 | ₦15,231,750 | ₦10,120,000 | **₦25,351,750** |
| Small dedicated team | ₦23,100,000 | ₦15,231,750 | ₦10,120,000 | **₦48,451,750** |
| Agency turnkey | ₦60,000,000 | ₦15,231,750 | ₦10,120,000 | **₦85,351,750** |

Adding the optional exam lab: **₦52,581,750** on the recommended route.

Spread over five years and 2,300 students, the recommended route is
**₦4,213 per student per year** — ₦351 per student per month — for the entire
school operating system, including the content and the running cost.

---

## 8. Verify before quoting again

| Input | Value used | Check it against |
|---|---|---|
| FX | ₦1,500/$ | CBN rate on the day the quote is signed |
| WhatsApp utility / marketing / service | $0.0067 / $0.052 / $0.0067 | Meta's Nigeria rate card |
| SMS | ₦6.00 | the school's actual aggregator quote |
| LLM prices | Flash-Lite $0.10/$0.40 · GPT-5 mini $0.25/$2.00 · Haiku 4.5 $1.00/$5.00 · Flash $0.75/$3.75 | each provider's pricing page (Flash is introductory through 2026-12-31) |
| Gateway | 0.7% blended | Paystack's current schedule vs the school's actual mix |
| NDPC | MDP-EHL ₦100,000 | NDPC fee schedule for 1,000–5,000 data subjects |
| Salaries | mid ₦700k · senior ₦1.5M | current Lagos market |
| Cloud | $96/month | the provider's pricing page at the school's region |

---

## 9. Cost levers, in order of effect

1. **WhatsApp template category discipline.** Utility instead of marketing on
   fee reminders saves ₦390,000/year at this volume — more than every other
   lever combined.
2. **Assigned-link live classes and object storage instead of a video CDN**
   removes $45/month (₦810,000/year).
3. **Batch API tiers** cut the AI line roughly in half for non-interactive work.
4. **Fallback discipline.** SMS only when WhatsApp fails; a cheap WhatsApp
   message beats a ₦6 SMS every time.
5. **Route routine AI to Flash-Lite**, reserving Haiku/GPT-5 mini for work that
   genuinely needs it.
6. **Grow the question bank with the school's own teachers** (reviewed in-portal)
   rather than outsourcing all 15,000 items.
7. **Buy the exam lab only if the school lacks machines.** The offline exam
   centre runs on existing hardware.
