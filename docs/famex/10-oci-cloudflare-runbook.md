# 10 — OCI + Cloudflare runbook

How Famex OS is provisioned, deployed, backed up, monitored and recovered on
Oracle Cloud Infrastructure behind Cloudflare. Read this before you create a
single resource; read §14 before you touch production.

Prices verified **2026-10-13**; re-verify before quoting (`§13`).

---

## §1 — Topology

```
            Nigerian users (Lagos PoP terminates most traffic locally)
                                    │
                    ┌───────────────▼───────────────────────────────┐
                    │            CLOUDFLARE (Lagos / LOS)           │
                    │  DNS · WAF · rate limits · cache · Turnstile  │
                    │  Access (staging + SSH) · R2 (optional)       │
                    └───────────────┬───────────────────────────────┘
                                    │  Cloudflare Tunnel (outbound TLS only)
                                    │
 ┌──────────────────────────────────▼───────────────────────────────────────┐
 │  OCI — European region (benchmark Madrid vs Frankfurt; §2)               │
 │                                                                          │
 │   ┌── app VM (Ampere A1, arm64) ─────────────────────────────────────┐   │
 │   │  cloudflared ──┬──  /              ──▶  Next.js   :3000          │   │
 │   │                └──  /api/v1/*      ──▶  Go API    :8080          │   │
 │   │  Go worker (River)      Go scheduler (cron)      OTel collector  │   │
 │   │  systemd · no public IP · no inbound ports                       │   │
 │   └──────────────────────────────────────────────────────────────────┘   │
 │                                    │ private subnet                      │
 │   ┌── db VM (Ampere A1) ───────────▼────────────────────────────────┐   │
 │   │  PostgreSQL 17 primary  ──streaming──▶  standby (resilient)     │   │
 │   │  pgBackRest: base + WAL ──▶ Object Storage (Service Gateway)    │   │
 │   └──────────────────────────────────────────────────────────────────┘   │
 │                                                                          │
 │   VCN · private subnets · Service Gateway (object storage, no egress $)   │
 │   Vault (secrets) · Monitoring + Alarms · Notifications                   │
 └──────────────────────────────────────────────────────────────────────────┘
```

Two facts explain almost every decision below:

1. **There are no inbound ports on OCI.** The tunnel is outbound-only, so the
   attack surface is Cloudflare's edge, not a VM with sshd on the internet.
2. **Cloudflare's Lagos PoP is where Nigerian traffic lands.** Cache hits never
   reach OCI at all, and API calls cross the wire once.

---

## §2 — Region choice

Oracle has **no West African region**. Current African regions are Johannesburg
(2022), **Casablanca (April 2026)** and Nairobi (planned).

| From Lagos to | Expected RTT | Verdict |
|---|---:|---|
| Lisbon (measured reference, not OCI) | **~70 ms** | the benchmark to beat |
| OCI Madrid | ~75–95 ms (Equiano path) | **default — provision here first** |
| OCI Frankfurt | ~95–125 ms | the well-peered alternative |
| OCI Casablanca | ~90–120 ms | newest region; fewer services and fewer peerings |
| OCI Johannesburg | worse than Lisbon for West Africa | no |

**Do this in week 1:** provision a throwaway A1 instance in **Madrid** and one in
**Frankfurt**, run a 24-hour ping/curl/concurrency sample from Lagos (and from
Cloudflare through the tunnel), and keep the winner. Because Cloudflare
terminates TLS in Lagos, the difference is felt only on cache misses and API
calls — real, but smaller than the raw RTT suggests. Write the measurement into
the runbook when you decide.

---

## §3 — Sizing and what it costs

Both profiles live in `scripts/cost-model.ts` and can be reproduced exactly:

```bash
npm run cost:model -- --cloud oci-budget     --breakdown
npm run cost:model -- --cloud oci-resilient  --breakdown
```

| Line | Budget | Resilient |
|---|---:|---:|
| App compute (Ampere A1) | 1 × 2 OCPU / 12 GB — $27.74 | 1 × 4 OCPU / 16 GB — $46.72 |
| Database compute (Ampere A1) | 1 × 2 OCPU / 16 GB — $32.12 | **2** × 2 OCPU / 16 GB — $64.24 |
| Block storage (balanced) | 150 GB — $6.38 | 300 GB — $12.75 |
| Object storage (standard) | 300 GB — $7.65 | 500 GB — $12.75 |
| Cloudflare | Free — $0.00 | **Pro — $25.00** |
| Transactional email + domain | $26.00 | $26.00 |
| **Monthly total** | **$99.89** | **$187.46** |
| **Annual (₦1,500/$)** | **₦1,797,930** | **₦3,374,280** |

**Deliberately declined: OCI Database with PostgreSQL.** The smallest listed
shape (4 vCPU / 32 GB / 500 GB) is **$273.18/month** — 8.5× the self-managed
database VM, and more than every other line in the bill combined. Declining it is
a decision with a consequence: **we run PostgreSQL**, so §6–§9 are our job.

**Deliberately declined: Always Free for production.** Oracle halved the
allowance on **2026-06-15** (4→2 OCPU, 24→12 GB) and reclaims instances that stay
below 20% CPU/network/memory across a 7-day window, with no SLA. **Staging runs
on Always Free** and the nightly suites keep it busy; production runs on paid
capacity.

**Deliberately declined: an OCI load balancer** ($0.01/hour). Two `cloudflared`
connectors behind one Tunnel are load-balanced by Cloudflare automatically, and
the break-glass path in §9 covers Cloudflare being unavailable.

**When to upgrade** — triggers, not moods:

| Trigger | Add |
|---|---|
| API CPU > 60% at 1× peak for a week | App VM → 4 OCPU |
| Database p95 query time rising, or working set > shared_buffers | Database VM → 4 OCPU / 32 GB |
| A single database failure would cost more than ₦3.4 M in a year | Standby (₹resilient profile) |
| Cloudflare WAF needs the full ruleset, or you need 20-second analytics | Cloudflare Pro |
| Media outgrows OCI Object Storage, or egress exceeds 10 TB/month | Cloudflare R2 (zero egress) |
| Object storage beyond 500 GB | +$0.0255/GB/month, or archive tier at $0.0026/GB |

---

## §4 — Infrastructure as code

Everything in `infra/`, nothing by hand. Console changes are break-glass only and
must be reconciled into Terraform the same day.

```
infra/
├── terraform/
│   ├── main.tf              # provider, tenancy, region, backend (state in Object Storage)
│   ├── network.tf           # VCN, private subnets, Service Gateway, NAT, security lists
│   ├── compute.tf           # A1 flexible instances, block volumes, cloud-init
│   ├── storage.tf           # buckets: famex-documents, famex-backups (+ lifecycle rules)
│   ├── iam.tf               # dynamic group for instances, least-privilege policies
│   ├── vault.tf             # secret names (values are never in state)
│   └── monitoring.tf        # alarms and notification topics
├── cloudflare/
│   ├── tunnel.yml           # ingress rules: path → origin (versioned, validated in CI)
│   ├── dns.tf               # records, proxy settings
│   ├── waf.tf               # custom rules, rate limits, managed rulesets
│   └── access.tf            # staged.app + SSH policies
└── cloud-init/
    ├── app.yaml             # docker/systemd, cloudflared, otel collector, hardening
    └── db.yaml              # postgres 17, pgbackrest, standby bootstrap
```

Rules: **state lives in an OCI bucket**, never on a laptop. Secrets are created
in **OCI Vault** and referenced by name; Terraform never holds a secret value.
Every instance uses a **dynamic group + instance principal** — no API keys on a
VM, ever.

---

## §5 — Network and access

- **VCN** with two private subnets (`app`, `data`). **No public subnet, no
  internet gateway on the data subnet.**
- **Service Gateway** for Object Storage access from both subnets: backup and
  document traffic never leaves Oracle's network and costs nothing in egress.
- **NAT gateway** for outbound (provider APIs, package updates, Cloudflare
  Tunnel).
- **Security lists / NSGs:** app subnet accepts traffic only from the data subnet
  peers it needs; the data subnet accepts `5432` **only** from the app subnet and
  the standby. **Default deny inbound everywhere.**
- **SSH:** no port 22 exposure. Two supported paths — **OCI Bastion** (managed,
  free) or **Cloudflare Access + `cloudflared access ssh`** with a policy limited
  to named engineers and short-lived certificates. Prefer Cloudflare Access;
  log every session.
- **Staging is not public.** It sits behind **Cloudflare Access** (free to 50
  seats), so UAT testers authenticate before they can see a page. No staging
  data ever leaves the tenancy except through that gate.
- **Turnstile** protects every public form: admissions application, contact
  enquiry, and the login page after repeated failures.

---

## §6 — Cloudflare configuration

| Setting | Value | Note |
|---|---|---|
| DNS | A/CNAME proxied (orange cloud) to the tunnel | The origin IP is never published |
| SSL/TLS | Full (strict), minimum TLS 1.2, HSTS 6 months | Nothing unencrypted reaches OCI |
| Cache rules | `/_next/static/*` immutable, 1 year; public pages with revalidation; **`/api/v1/*` bypass** | Never cache an authenticated response |
| WAF | Managed ruleset + custom rules for known abuse paths | Pro unlocks the full ruleset |
| Rate limits | `/api/v1/auth/login` 10/min/IP; `/api/v1/payments/*` 30/min/IP; public forms 5/min/IP | Turnstile handles bots first |
| Bot protection | Bot Fight Mode on; verified-bot allowlist for search engines | The public website must stay indexable |
| Tunnel ingress | `/api/v1/*` → `:8080`, everything else → `:3000`, else 404 | Versioned in `infra/cloudflare/tunnel.yml` |
| Access | Staging hostname + SSH, ≤50 seats (free) | Do not exceed 50 seats without a decision |
| Workers | Optional: security headers, edge redirects | Free tier is 100k requests/day |
| Analytics | Cloudflare Web Analytics (free) + RUM via Sentry | Two sources, so neither is a single truth |

**Break-glass path (documented, normally disabled):** a DNS-only record
(e.g. `direct.<school-domain>`) pointing at a reserved public IP on the app VM,
with the security list allowing **only** `443` from an office IP allowlist. It
exists so a Cloudflare incident does not become the school's incident; it is
enabled by a Terraform change and a written note in the incident log.

---

## §7 — PostgreSQL

Self-managed, because the managed service costs 8.5× more (§3). That trade is
honest: **we own the backups, the replication and the failover.**

**Install and tune (A1, 16 GB):**

| Setting | Value | Why |
|---|---|---|
| `shared_buffers` | 4 GB | 25% of RAM; the rest is for the OS page cache |
| `effective_cache_size` | 12 GB | tells the planner the truth |
| `work_mem` | 16 MB | reporting sorts stay on disk rather than exhausting RAM |
| `maintenance_work_mem` | 512 MB | for index builds during migrations |
| `max_connections` | 200 | with a pool budget below |
| `wal_level` | replica | required for the standby |
| `archive_mode` / `archive_command` | on / `pgbackrest archive-push` | continuous WAL to object storage |
| `archive_timeout` | 60 s | bounds RPO during quiet periods |
| `synchronous_commit` | `on` for money writes; `remote_apply` when a standby exists | a confirmed payment is durable |
| `track_io_timing`, `pg_stat_statements` | on | you cannot tune what you do not measure |

**Connection budget** — sized, not defaulted, so saturation is a fast failure
rather than a slow one:

| Process | Max connections |
|---|---:|
| Go API | 20 |
| Go worker | 10 |
| Go scheduler | 5 |
| Monitoring / admin / migration | 15 |
| Replication (per standby) | 5 |
| **Reserved headroom** | the rest of 200 |

**Roles:** the application role has `INSERT, SELECT, UPDATE, DELETE` on business
tables — and **`INSERT, SELECT` only on ledger tables**, with no `UPDATE` or
`DELETE` at all. Revoke broadly, grant narrowly, and prove it with a test that
attempts an `UPDATE` and expects a permission error.

**Failover (resilient profile):** streaming replication to a standby in the same
region; `pg_rewind` ready for re-attachment. Promotion is a documented runbook
step (§12), tested quarterly — not an improvisation at 08:10 on a fee deadline.

---

## §8 — Backups and disaster recovery

| Property | Target | How |
|---|---|---|
| **RPO** | ≤ 5 minutes | continuous WAL archiving (`archive_timeout` 60 s) |
| **RTO — resilient** | ≤ 2 minutes | standby promotion, repoint the tunnel, verify |
| **RTO — budget** | 30–60 minutes | restore base + WAL to a fresh VM from object storage |
| Retention | 7 daily, 4 weekly, 12 monthly | pgBackRest retention rules |
| Off-site | second repository in a different region/provider | guards against tenancy-level loss |
| Verification | **monthly timed restore drill** | a backup that has never been restored is a hope |

`pgbackrest.conf` uses two repositories: primary in the tenancy's Object Storage
(via Service Gateway, no egress cost), secondary off-tenancy. Encrypt both with
a key held in OCI Vault.

**Restore drill (monthly, on the calendar, with a timer running):**

1. Provision a throwaway VM from `infra/terraform` (5 min).
2. Restore latest base + WAL; record the wall-clock time.
3. Run data assertions: row counts per table, **ledger debits = credits**,
   latest journal date, latest attendance date.
4. Start the app against it with Cloudflare Access gating the hostname.
5. Walk three critical journeys (J-01, J-05, J-11).
6. Record the actual RTO next to the target in this file; investigate any gap.

---

## §9 — Deploying

**Build:** GitHub Actions builds `linux/arm64` images for `apps/web` and
`services/api`, pushes to OCI Container Registry (OCIR), and records the image
digests in the release notes.

**Deploy — blue/green on one VM (no load balancer needed):**

1. Pull the new image to `/opt/famex/releases/<sha>/`.
2. Start the new process on the alternate port (`api :8081`, `web :3001`).
3. Wait for `/healthz` (liveness) and `/readyz` (dependencies reachable).
4. Run the six critical journeys against the new port directly.
5. **Switch the Tunnel ingress** to the new port and reload `cloudflared`.
6. Watch error rate, p95 latency and the ledger balance check for 15 minutes.
7. Stop the old process; keep the previous release directory for instant rollback.

**Rollback** is step 5 in reverse — an ingress switch, seconds, not a rebuild.

**Migrations** run as a **pre-deploy job** (`cmd/migrate`, goose), before any new
process starts, and a failed migration aborts the deploy. Migrations are
forward-only with a written rollback note; a destructive change is always two
releases (add → backfill → switch → remove).

**Scheduled work** lives in the Go scheduler: notification drain (every 5
minutes, not once daily at 08:00 — the base's cadence is a known defect),
reminders, absence alerts, usage rollups, `VACUUM`/`ANALYZE` monitoring,
backup-verification, and the nightly drift check against the license counters.

---

## §10 — Observability

| Signal | Where it goes | Alert when |
|---|---|---|
| Traces (OTel, 10% sampled; 100% for money/results/auth) | OTel collector → backend | error span rate > 1% |
| Metrics (RED per route, pool saturation, queue depth) | OTel + OCI Monitoring | API p95 > 300 ms for 10 min |
| Logs (structured `slog`, no PII) | collector → OCI Logging | 5xx burst, panic recovered |
| App errors | Sentry | new issue in money/results path |
| Uptime | external prober on `/healthz` + a real journey | 2 consecutive failures |
| Database | `pg_stat_statements`, replication lag, disk | lag > 60 s, disk > 80% |
| Backups | pgBackRest check + object listing | backup age > 26 h |
| Tunnel | connector health | any connector unhealthy > 5 min |
| Business | ledger balance check, licence counters, WhatsApp cost | **any** imbalance — this is a page, not a ticket |

The **ledger balance check** runs every 15 minutes and compares the trial balance
to zero. It is the single most important alert in the system: if it fires, money
is wrong and the school must be told before it notices.

---

## §11 — Secrets

- **OCI Vault** holds every secret: database password, AUTH/JOBS/CRON secrets,
  Paystack keys, WhatsApp tokens, SMS and email credentials, AI provider keys,
  backup encryption key.
- Instances read them through a **dynamic group + instance principal**; there is
  no API key file on a VM and no secret in git, in a container image, or in
  Terraform state.
- The app reads secrets into memory at boot from a `0600` environment file
  rendered by cloud-init/systemd; anything logged is redacted by policy and by
  test.
- Rotation: quarterly for provider keys; immediately on staff departure. Rotation
  is a runbook step with a rollback (keep the previous key valid for the overlap
  window).

---

## §12 — Incident runbooks (the ones that will happen)

| Symptom | First actions |
|---|---|
| **Ledger imbalance alert** | Freeze money writes (feature flag), capture the failing entry IDs, page the ledgers' owner. Do not "fix" data by hand; write a compensating posting through the ledger API. |
| **Database primary down** | If a standby exists, promote and repoint; else restore (§8) and announce the RTO to the school. Verify balances before reopening writes. |
| **Tunnel down** | Check connector health; restart `cloudflared`; if Cloudflare itself is the problem, enable the break-glass DNS record (§6) and tell the school the URL changed. |
| **API 5xx burst** | Check the last deploy (roll back first, investigate after), then pool saturation, then a provider outage. |
| **Queue not draining** | Inspect River's failed jobs; quarantine poison payloads; money jobs take priority over notifications. |
| **Disk full on the DB VM** | WAL retention, log rotation, then object-storage lifecycle rules. Never delete WAL before it is archived. |
| **WhatsApp deliveries failing** | Confirm WABA status and template category; the SMS fallback should already be carrying the traffic — verify cost recording. |
| **Suspected data breach** | Contain, preserve evidence, assess whether personal data is involved, then follow the NDPA notification timeline (§15). |
| **Teacher/parent reports "everything is slow"** | Check RUM (real users) before the server: it is usually one route, one query, or one provider. |

Every incident gets a blameless postmortem within a week, and every action item
gets an owner and a date.

---

## §13 — Cost governance

- **Budget alerts** at 50/80/100% of the monthly figure, in OCI and Cloudflare.
- **Re-run the model** whenever a rate changes or a profile changes:
  `npm run cost:model -- --cloud oci-resilient --breakdown`. The document and the
  calculator must never disagree — that is what the tests in
  `tests/lib/cost-model.test.ts` enforce.
- **Review quarterly**: actual bill vs model, and every §3 upgrade trigger.
- Be aware of the 2026 changes that already moved these numbers: Cloudflare Pro
  $20 → **$25**, Oracle Always Free 4→**2** OCPU on 2026-06-15, and the OCI
  managed PostgreSQL minimum at **$273.18/month**.

---

## §14 — Go-live / cutover checklist

**Two weeks before**

- [ ] Load test passed at **2× modelled peak** with numbers attached
- [ ] All chaos scenarios run this quarter with expected behaviour observed
- [ ] Adversarial suite clean, or exceptions documented with owners
- [ ] Restore drill completed inside the target RTO
- [ ] UAT exit criteria met (≥90% on the twelve critical tasks)
- [ ] NDPC registration (MDP-EHL ₦100,000 at this data volume) and DPIA signed
- [ ] Paystack, WhatsApp, SMS and AI accounts opened **in the school's name**
- [ ] Domain DNS moved to Cloudflare; email records verified before the move

**One week before**

- [ ] Staff training delivered with a written takeaway pack
- [ ] Data seeded: classes, subjects, fee structures, timetables, opening balances
- [ ] Opening ledger balances posted and signed off by the bursar
- [ ] Alerts routed to named humans, tested by firing one on purpose
- [ ] Rollback rehearsed end to end (ingress switch, database restore)

**Go-live day**

- [ ] Deploy by blue/green, watched for 15 minutes
- [ ] Critical journeys run against production with real accounts
- [ ] Bursar records the day's collections with a parallel manual tally
- [ ] Support channel staffed; a named person watching the dashboard all day
- [ ] Post-day review at close: what broke, what was slow, what confused users

**Week one**

- [ ] Daily 15-minute stand-up with the school's champions
- [ ] Every support ticket tagged and reviewed for pattern
- [ ] Reconcile week one collections against the bank, line by line
- [ ] Confirm backups ran nightly and the first weekly drill passed

---

## §15 — Compliance notes (NDPA)

- **Registration:** NDPC **MDP-EHL, ₦100,000** at 1,000–5,000 data subjects, plus
  the ₦5,000 processor activity fee per processor. Budget: ₦110,000.
- **Data location:** the OCI region is in the EU (Madrid/Frankfurt), which is a
  defensible transfer destination; the **DPIA records the legal basis** for the
  transfer, what crosses the border, and why the school is not hosting in-country.
- **What must not leave the tenancy unnecessarily:** child photographs, medical
  notes, custody arrangements, and full guardian contacts are never sent to AI
  providers (the redaction layer in `domain/ai` enforces this at the template
  level).
- **Retention:** enforced in code, not in a policy document — ledger and results
  records are retained for the statutory period; gate-pass and child-safety
  records are never deleted, only superseded; AI prompts/outputs expire on a
  configured schedule (default 12 months).
- **Subject rights:** access, correction and erasure requests have a workflow, a
  deadline, and an audit trail (`F23-07`).
- **Breach:** contain → assess → notify within the statutory window → postmortem.
  The contact and the timeline are written into the runbook, not improvised.
