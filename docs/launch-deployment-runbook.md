# Ykay College — single-tenant launch deployment runbook

**Canonical launch target:** Render Docker Blueprint in `render.yaml`, with Render PostgreSQL, Upstash Redis, private S3-compatible storage, a malware scanner, and the Render Cron notification dispatcher. The repository still contains Vercel, OCI and docker-compose examples; they are **alternative/unverified paths, not launch-supported targets**. This is a code/documentation choice, not evidence that a production Render environment exists or is ready.

**Scope:** one Ykay College school only. Do not enable platform self-signup or onboard another school on this runbook; database RLS is still fail-open for missing tenant context.

## 1. Provision the dependencies

1. Create Render PostgreSQL in the same region as the web service. Use its **Internal Database URL** for the web service's `DATABASE_URL`.
2. Create an Upstash Redis database and set both `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Final mode requires the shared store; do not use a process-local memory limiter as a production substitute.
3. Create a private S3/R2 bucket for admissions documents. Set `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY`; set `S3_ENDPOINT` and `S3_FORCE_PATH_STYLE` only as required by the provider. Keep bucket CORS limited to the exact public College origin. Do not expose the bucket publicly.
4. Configure `MALWARE_SCANNER_URL` to an authenticated/restricted scanner reachable from the web service. Final mode requires scanning; unscanned-document waivers are not supported.
5. Configure Resend (`RESEND_API_KEY`, verified `EMAIL_FROM`) for password resets, invitations and queued parent notifications. Configure Sentry (`SENTRY_DSN` and/or `NEXT_PUBLIC_SENTRY_DSN`) and send a test event.
6. For final Production, configure genuine **live** Paystack keys (`pk_live_…` and `sk_live_…`) and set Paystack's webhook URL to `/api/payments/paystack/webhook`. Test keys and placeholders are never Production credentials. While the deployment is explicitly in temporary mode, the keys may be absent; Paystack checkout, verification, and webhooks then return HTTP 503.
7. Generate a unique 32+ character `AUTH_SECRET`. Generate a separate, high-entropy `JOBS_SECRET` (at least 16 characters) and use the exact same value on the web and Cron services. Never reuse `AUTH_SECRET` for this.

The Render Blueprint includes `sync:false` entries for secrets. Add them privately in Render; never commit real values. Configure `TRUSTED_PROXY_HOPS=1` for the single Render proxy hop unless the actual proxy chain differs. Keep `ENABLE_PLATFORM_SIGNUP=false`.

### Temporary site-shell mode (not launch-ready)

`APP_READINESS_MODE=temporary` is an explicit, temporary exception for an incomplete public site. It may defer Redis, S3-compatible document storage, malware scanning, and Paystack credentials; database, auth, site URL, and `JOBS_SECRET` remain strict. Missing Redis keeps security-critical rate-limited operations fail-closed with HTTP 503; missing storage/scanning disables admissions document upload, confirmation, and submission with HTTP 503. If Paystack keys are missing or not live-prefixed, Paystack checkout, verification, and webhooks return an actionable HTTP 503 without creating payment attempts or accepting unverified events. Manual bank-transfer claims and bursar review remain available. `/api/health` reports `degraded` while temporary mode or dependencies are incomplete. Switch to `APP_READINESS_MODE=final` only after all dependencies, including genuine live Paystack keys, are configured; final mode refuses startup if any is absent or invalid. Do not treat temporary mode as a production launch approval.

## 2. Configure the notification Cron service

`render.yaml` defines `ykay-notification-dispatch`, a one-shot service using the same image. In `EDUPORTAL_CRON_MODE=true`, the container skips web startup, DB migrations and seed steps, then calls the web service's authenticated `/api/jobs/dispatch-notifications` route. The Cron process requires:

- `EDUPORTAL_BASE_URL`: the web service's HTTPS origin (no path), e.g. `https://ykay-college.onrender.com` or the configured custom domain.
- `JOBS_SECRET`: the exact web-service secret.

The committed schedule is every five minutes. Verify the first run manually in Render logs and confirm a due notification is dispatched. If the school requires a shorter delivery SLA, change the schedule only after checking the platform's supported Cron frequency and capacity.

## 3. First deployment and environment gate

1. Create the Render Blueprint from the reviewed release commit. The Blueprint sets `APP_READINESS_MODE=final`.
2. Set all mandatory variables before the web service starts. `instrumentation.ts` calls `assertEnv()` and production boot is refused for missing database/auth/site/Paystack configuration, Upstash credentials, S3 credentials, malware scanner, or job secret. Legacy memory-rate-limit and unscanned-document flags do not waive final-mode requirements.
3. Wait for the Docker build and health check. The image applies Prisma migrations before starting the web process. Confirm `/api/health` reports the database and all readiness dependencies; check Render logs for warnings and errors.
4. Confirm a production error reaches Sentry and the browser CSP permits the **exact DSN origin** (not a broad wildcard).
5. Verify that `/api/platform/signup` remains disabled (404) and `ENABLE_PLATFORM_SIGNUP` is not true.

## 4. Release gate (staging first)

On the exact release commit, with generated Prisma client and an isolated staging database:

```bash
npm ci
npx prisma generate
npm run audit:deps
npm run lint
npx tsc --noEmit
npx vitest run
npm run check:tenant-coverage -- --max-uncovered 0
npm run check:dead-ui
npm run check:orphans
npm run verify:rls
npm run test:e2e:browser
npm run build
```

Do not turn a sandbox/network failure into a pass. The tenant-route ratchet blocks new unexplained routes, but it does **not** make PostgreSQL RLS fail-closed or certify a second tenant.

Before a public cutover, rehearse all of the following on staging with Paystack test credentials (then a controlled live-value check with school approval):

- parent account: Paystack initiation → provider verification/webhook → one fee ledger entry and receipt; retry and concurrent callback do not double-post;
- transfer claim: pending state appears immediately, bursar approval/rejection updates parent state and queues a notification; concurrent approve/reject permits one outcome only;
- admissions: upload clean documents, rejected MIME/oversize/expired presign, scanner clean/infected/unavailable, review and enrollment;
- CBT: anonymous/non-student calls return 401/403, question answers are never bulk-returned, the student's signed draw is required, expired/tampered/foreign draws fail;
- restore a production-like backup into an isolated scratch database and record measured RPO/RTO;
- results-day concurrency test at the agreed 1K-DAU profile; record p95/p99, database connection headroom and failure rate.

Never run destructive, brute-force, provider-charge, or load tests against the live production database or Paystack account.

## 5. Rollback and incident controls

- Deploy the prior immutable image/tag only after checking migration compatibility; do not run `prisma db push` or reverse migrations as a rollback shortcut.
- Keep the database backup and restore path independent from the app image. Rehearse a point-in-time restore before launch.
- If payment state is uncertain, preserve PENDING attempts and reconcile against Paystack before any manual adjustment; never mark a provider transaction failed solely because the client timed out.
- On an S3, Redis, DB, mail, scanner, or Cron outage, stop new public admissions/payment traffic as appropriate, preserve audit records, and use the incident contact/runbook. Do not silently replace distributed rate limiting with memory on a multi-instance service.

## 6. What this runbook does not certify

No production Render service, secret configuration, domain/TLS state, Paystack live transaction, malware scanner, scheduled Cron run, backup restore or 1K-DAU load test was available to this coding session. All of those remain **NOT VERIFIED** until the operator attaches the resulting logs, screenshots, provider references (redacted), and measured test results to the release record. YK-Virtual's service-side SSO remains separate; the College `/sso/virtual` route is only a safe redirect, not proof of federated sign-in.
