# 02 — The AI layer

Famex OS uses AI for one purpose: **to give teachers and administrators time
back**, without ever letting a machine decide something a person is accountable
for. Every AI action in the product is a registered template, a metered call, a
logged result, and — where it reaches a parent or a pupil — a draft awaiting a
human's approval (**FP-5**, F3-16).

Catalogue: module 3 (AI Studio, 16 features), module 2 (AI Learning Hub, 10
features). Cost: `05-cost-model.md §3` — ₦140,250/year at the modelled volumes.

---

## §1 — Architecture

```
  UI  ──►  AiDraft (queued, editable, approvable)
            ▲
            │
        Prompt registry  ──►  Redaction layer  ──►  Provider router  ──►  vendor
        (versioned)           (child-data rules)     (tier, cost, failover)
            │                                             │
            └──────────────►  AiUsage / metering  ◄───────┘
```

Four rules the architecture enforces rather than documents:

1. **No component calls a provider directly.** If it is not in the registry, it
   does not run.
2. **Redaction happens before the request**, not after the response.
3. **Every call is metered** against a role, a module and a budget.
4. **Every output lands in a queue** with an approver recorded.

---

## §2 — Prompt registry and the 34 templates

`PromptTemplate` (identity, audience, module, default model tier, cost ceiling)
and `PromptVersion` (the actual text, immutable once published, with a
`reviewedBy`). Editing a template creates a version; nothing is edited in place.

| Audience | Templates | Examples |
|---|---:|---|
| Teachers | 12 | lesson plan, scheme of work, MCQ drafting, theory-question drafting, distractor review, difficulty estimate, marking scheme, report-card remark, class performance summary, differentiated worksheet, homework set, rubric |
| Administrators | 10 | parent message (utility), newsletter copy, attendance alert wording, fee-reminder copy, event announcement, website news post, policy summary, job advert, offer letter, warning letter |
| Bursar / finance | 3 | arrears insight report, budget narrative, fee-change explanation |
| Front desk / help desk | 3 | enquiry reply, complaint reply, FAQ article |
| Students | 4 | tutor Q&A, study plan, revision quiz, explain-this-concept |
| Parent PRM | 2 | meeting invitation, engagement digest |
| **Total** | **34** | |

Each template declares: audience, module, model tier, maximum output length, a
hard cost ceiling per call, whether personal data is permitted, and whether the
output must be human-approved before leaving the building. Student-facing and
parent-facing templates are **always** approval-required.

---

## §3 — Provider router

An interface (`generate(task, prompt, options)`) with named tiers, so swapping a
vendor is a configuration change and an outage is a failover rather than an
incident.

| Tier | Used for | Default model | Fallback | Ceiling per call |
|---|---|---|---|---:|
| `fast` | tutor Q&A, rewrite tools, summaries, practice feedback | Gemini 2.5 Flash-Lite | GPT-5 mini | $0.004 |
| `balanced` | question drafting, remarks, parent messages | GPT-5 mini | Claude Haiku 4.5 | $0.02 |
| `deep` | lesson plans, schemes, insight reports, long-form | Gemini 3.6–3.8 Flash | Claude Haiku 4.5 | $0.05 |

Router behaviour:

- **Failover order** per tier, with a 15-second timeout and one retry on the
  fallback before surfacing an honest error to the UI.
- **Batch where latency does not matter** (question drafting, insight reports,
  remark drafting): the batch tiers are ≈50% cheaper and nobody is waiting.
- **Cost ceiling per call is enforced, not advisory.** Exceeding it fails the
  job with a visible reason rather than quietly spending money.
- **Vendor neutrality:** no vendor SDK leaks past the router; everything else in
  the codebase speaks the router's interface.

Which models, at which rates, and why: `05-cost-model.md §3`.

---

## §4 — Metering, caps and credit control

`AiUsage` records per call: actor, role, module, template version, model, tokens
in/out, cost in kobo, latency, outcome. Everything else (dashboards, caps,
invoices) is a projection of that table.

| Guard | Default | Behaviour at the limit |
|---|---|---|
| Student tutor questions | 30/day/student | Queue for later, tell the learner honestly |
| Teacher generations | 200/day/teacher | Warn at 80%, then require a Head of Department's approval |
| Admin broadcasts | Metered per *message*, not per generation | Cost shown before send (F14-16) |
| School-wide AI budget | Set in Licence & Usage (F20-02) | Alert at 80%; hard stop at 100% with an admin override |

A runaway loop must be unable to produce a five-figure bill: the caps are
enforced in the router, not in the UI, and they fail **closed**.

---

## §5 — Child data, NDPA and the redaction layer

The redaction layer runs before every provider call and is tested on every
provider path.

| Rule | Implementation |
|---|---|
| No names, addresses or guardian contacts in prompts unless the task needs them | placeholder substitution (`{{learner}}`, `{{guardian}}`) with re-hydration only in the school's own UI |
| No medical, disciplinary or custody data to a provider, ever | blocked at the template level; a template that declares "no personal data" cannot receive it |
| No student photographs to a provider | not implemented as a feature; do not add one |
| Provider must not train on school data | contractual terms + the provider's zero-retention option where offered |
| Student-facing AI requires guardian consent | captured once (F12-09), honoured everywhere, revocable |
| Prompts and outputs retained for audit, then expired | retention set by the school (F15-10), default 12 months |
| Every call attributable | `AiUsage` links to the actor and the template version |

A DPIA covering the AI layer ships with the NDPA pack (F23-06).

---

## §6 — Build order

| Step | Deliverable | Feature IDs |
|---|---|---|
| 1 | `PromptTemplate`/`PromptVersion` + registry UI | F3-01, F3-13 |
| 2 | Provider router with tiers, ceilings, failover, batch | F3-02 |
| 3 | `AiUsage` metering, caps, alerting | F3-03, F3-14 |
| 4 | Redaction layer + tests | F3-15 |
| 5 | Drafts queue with approvals | F3-16 |
| 6 | Teacher templates (12) — highest time saving per call | F3-04, F3-05, F3-06, F3-09 |
| 7 | Admin and communication templates | F3-07, F3-08, F3-11 |
| 8 | Insight reports and summaries | F3-10, F3-12 |
| 9 | Student-facing tutor behind consent | F2-07, F1-05, F21-10 |
| 10 | AI-assisted marking-risk and anomaly analysis | F6-09, F4-10, F4-11, F8-10 |

Steps 1–5 are W8's first half and must land **before** any template is switched
on: metering and approval are what make the interesting templates affordable and
safe.
