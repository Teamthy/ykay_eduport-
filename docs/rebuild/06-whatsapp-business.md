# 06 — WhatsApp Business integration (and the queue that must exist first)

Goal: fees, results and attendance reach parents on the channel they actually
read — and parents can reply to a human who sees the history in the portal.

---

## 1. What exists today (measured)

- **The channel is already modelled**: `AlertChannel.WHATSAPP` exists in the enum,
  and `lib/notifications.ts` has a `ChannelAdapter` interface with email (live,
  Resend) and SMS (live, Termii) implementations plus
  `stubAdapter(AlertChannel.WHATSAPP)` that returns "provider not configured yet".
  **No migration is needed to switch it on** — implement the adapter.
- **The queue works but cannot carry 3,000 users**: `dispatchDueNotifications(limit = 25)`
  claims PENDING jobs with a lease (`PROCESSING_LEASE_MS`), retries with backoff
  `[5, 30, 120]` minutes, marks SENT/FAILED/SKIPPED, dedupes via `dedupeKey`,
  and `bridgeAttendanceAlerts()` converts attendance alert rows into deliveries
  with in-app notifications for linked parents.
- **The cron is the problem**: `vercel.json` runs
  `/api/jobs/dispatch-notifications` **once daily at 08:00**, `maxDuration = 60`,
  25 jobs per run. A single 1,500-parent fee broadcast would take **~60 days** at
  that rate. Meanwhile `app/faq/page.tsx` promises parents "alerts within 5
  minutes of attendance being marked", and `lib/notifications.ts` sends the
  hardcoded subject *"Attendance alert from Ykay College"* (also a rebrand bug).
- `components/WhatsAppFloat.tsx` is click-to-chat (`wa.me/<number>`) — a good
  human support channel, but it is **not** the Business API and gives the school
  no delivery data.
- Two-way messaging exists as a product surface (`MessageThread`, `Message`,
  `lib/messaging.ts` with relationship-derived access) — so inbound WhatsApp
  replies have somewhere to land.

---

## 2. Provider decision

| Option | Pros | Cons | Verdict at 3,000 users |
|---|---|---|---|
| **Meta WhatsApp Cloud API direct** | Cheapest per message, no BSP markup, official, full webhook control, template management via API | You do the onboarding (business verification, number, tokens), you own the plumbing, no hand-holding | ✅ **Recommended** |
| BSP (360dialog / Twilio / Termii / Infobip) | Faster onboarding, support desk, sometimes a nicer dashboard | Per-message markup, another vendor dependency, variable API surface | Reasonable if you want onboarding speed over margin |

Non-negotiables either way:

- **Meta Business Manager verification** for the school's legal entity — days to
  weeks, sometimes longer if documents bounce. **Start on day one of the project.**
- **A dedicated phone number** for the API. Migrating the school's existing
  WhatsApp line to the API **removes it from the phone app** — the office loses
  the ability to answer from that handset. Recommend: new SIM for API usage,
  keep the existing human line in the app, and publish the human line for
  enquiries.
- **Display name approval** per number, and a **permanent system-user token**
  (not a 24-hour user token) with secrets in the school's secret manager.
- **`phone_number_id` → schoolId map** in the DB. This is the multi-tenant
  routing key: with separate deployments (D1-B) it is one row, but build the map
  anyway so school #3 is a config change, not a refactor.

## 3. Compliance and policy (get this wrong and the number gets banned)

- **Opt-in per parent**, recorded with text + timestamp + source (admission form,
  portal checkbox, WhatsApp reply "YES"). Store it; NDPA + Meta both expect it.
- **Template categories**: *utility* (fee reminder, attendance alert, result
  ready, exam timetable), *authentication* (OTP — consider whether you need the
  channel at all), *marketing* (open day, admissions campaign — **do not** put
  fee reminders here). Every template needs approval before first send.
- **24-hour customer service window**: free-form replies only within 24h of the
  parent's last message; outside it, only approved templates. The reply inbox
  must show a countdown/state so staff do not write a message that silently
  fails to deliver.
- **Quality rating + throughput tiers** per number: a number starts at a low
  daily send limit and earns volume as it stays healthy. Keep marketing on a
  **separate number** from transactional so a marketing complaint spree cannot
  affect fee reminders and results.
- **Opt-out handling**: honour STOP/"stop messages" immediately, per parent, per
  channel, and surface it in the admin UI. Do not "win them back" with another
  channel they did not consent to.
- **Cost visibility**: message pricing varies by category and changes; **verify
  current Meta pricing and Nigerian rates at contract time** and record the
  numbers in the tenant config so the cost report is real, not estimated.

## 4. Architecture (fits the existing code)

```
 business event (invoice issued, payment received, attendance marked, result published)
     → queueNotificationJob({ channel: WHATSAPP, template, variables, dedupeKey, priority })
     → NotificationJob (PENDING, nextAttemptAt)
     → worker: claim with lease → WhatsAppAdapter.send()
         ├─ inside 24h window → text message
         └─ outside → approved template with variables
     → status webhook (sent/delivered/read/failed) → update job + metrics
     → inbound webhook (parent reply) → MessageThread for the class teacher/admin
```

New pieces:

- **`lib/whatsapp.ts`** (added with this doc set): E.164 normalisation for
  Nigerian numbers, template payload building, `X-Hub-Signature-256` verification
  against the raw body, status/error-code mapping, and a small
  `WhatsAppClient` interface so tests and the adapter share one implementation.
- **`WhatsAppAdapter`** implementing the existing `ChannelAdapter`, registered in
  the `adapters` map. `configured` becomes true only when token + phone number id
  are present — the existing "SKIPPED, never silently SENT" behaviour stays.
- **Webhook route** `app/api/webhooks/whatsapp/route.ts`: GET verification
  handshake (`hub.mode`/`hub.verify_token`/`hub.challenge`), POST with **raw-body**
  signature verification (Next.js parses JSON by default — read the raw body),
  message-id dedupe (Meta retries), status fan-out, and inbound routing.
- **Templates table** `WhatsAppTemplate(schoolId, name, category, language,
  bodyTemplate, variables Json, status, approvedAt, metaTemplateId)` plus a
  rendered-message log `WhatsAppMessage(jobId, waMessageId, direction, category,
  status, errorCode, costMinor, sentAt, deliveredAt, readAt)` so delivery and
  spend are queryable per school, per term.
- **Attachments** (report cards, receipts): Meta fetches media by public URL —
  put it on S3/R2 with a short-lived signed URL, not a public bucket.
- **Fallback chain per school**: WhatsApp → SMS (Termii, already live) → in-app →
  email, with a per-message cost ledger and a monthly budget cap that degrades
  gracefully instead of running up a bill.

## 5. Fix the queue first (prerequisite, not optional)

The WhatsApp work is wasted if delivery is throttled at 25/day. Before enabling
WhatsApp at scale:

1. **Cadence**: run the dispatcher every 1–5 minutes (or a long-lived worker)
   instead of once daily.
2. **Batch + concurrency**: raise the batch (e.g. 200–500 per run) with bounded
   concurrency (e.g. 5–10 in flight), respecting `maxDuration` — or move to an
   always-on worker on the self-hosted path (`docker-compose.prod.yml` already
   provisions Redis for exactly this future).
3. **Provider rate limiting**: a token-bucket per channel/provider, so a
   broadcast never trips Meta's per-second limits or Termii's throughput.
4. **Priority lanes**: transactional (payment receipts, attendance) ahead of
   marketing (newsletters, admissions). A fee deadline broadcast must never delay
   a receipt.
5. **Backlog observability**: queue depth, oldest-pending age, per-channel
   failure rate on the admin dashboard, with an alert when the oldest pending job
   exceeds ~15 minutes for transactional channels.
6. **Quiet hours**: default 19:00–07:00 Africa/Lagos for non-urgent sends;
   transactional payments can go anytime.
7. **Reconcile the promise**: either make the 5-minute claim true, or change
   `app/faq/page.tsx` to match reality. Marketing copy that contradicts the queue
   is how a school loses confidence in the whole portal.

## 6. Failure modes to plan for

| Failure | Mitigation |
|---|---|
| Meta verification stalls | Start day 1; keep SMS as the launch channel and enable WhatsApp when approved (no code change needed) |
| Template rejected / paused | Maintain 2 variants per critical template; monitor template status; alert on status change |
| 24h window expires mid-campaign | Adapter checks window state and switches to a template automatically; log which path was used |
| Number quality rating drops | Transactional and marketing on separate numbers; opt-out honoured instantly; monitor block/report rate |
| Token expires/rotated | Token expiry monitoring + alert 7 days ahead; secrets in a manager, never in Git |
| Duplicate sends after retry | Existing `dedupeKey` + `waMessageId` uniqueness; adapter is idempotent per job |
| Webhook downtime | Meta retries; add a reconciliation job that pulls delivery statuses for recently-sent messages |
| Bill shock | Per-school monthly cap, cost ledger per template, dashboard by category |

## 7. Definition of done

- [ ] Meta Business verified; number live; display name approved; permanent token in secrets; `phone_number_id` mapped to the school.
- [ ] ≥ 8 approved templates (fee reminder, payment received, attendance alert, result ready, exam timetable, admission received/approved, welcome/onboarding, outstanding balance) with reviewed copy in the school's voice.
- [ ] `WhatsAppAdapter` live; e2e test proves a queued job reaches SENT with a `waMessageId`; unconfigured state still yields SKIPPED, never a false SENT.
- [ ] Webhook signature verified (unit-tested against the documented HMAC), replays deduped, statuses persisted.
- [ ] Parent replies land in `MessageThread` and a staff member can reply within the 24h window from the portal.
- [ ] Opt-in recorded for every parent; opt-out honoured within one dispatch cycle; consent visible in the admin UI.
- [ ] Queue moving at the configured cadence with priority lanes; backlog alert firing to a human; no job older than 15 minutes on transactional channels at 3,000 users.
- [ ] Cost ledger reports spend per term per category, and the monthly cap is enforced.
- [ ] FAQ/support copy matches the real delivery SLA.
