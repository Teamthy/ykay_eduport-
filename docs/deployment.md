# Ykay College EduPortal — Deployment Guide

> **Launch scope:** use the Render Docker Blueprint in `render.yaml` as the one
> supported Ykay College production path for now. Vercel, OCI and Compose files
> remain alternatives that have not been launch-certified. The checklist in
> [`launch-deployment-runbook.md`](./launch-deployment-runbook.md) is the
> required operational gate; the existence of a config file is not deployment
> evidence.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (Neon recommended)
- Redis (Upstash recommended, required for rate limiting in production)
- Paystack account (test keys for staging, live keys for production)
- S3-compatible storage (AWS S3 or Cloudflare R2) for document uploads
- Resend account for transactional emails

## Environment Setup

Copy `.env.example` to `.env` and fill in **every** value:

```bash
cp .env.example .env
```

### Required variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | 32+ character secret for JWT signing |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the deployed site |
| `PAYSTACK_PUBLIC_KEY` | Paystack public key |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |

### Production dependencies (not optional for the launch target)

| Variable | Production requirement |
|----------|------------------------|
| `APP_READINESS_MODE` | Defaults to `final`. Set `temporary` only for an incomplete site shell; it defers Redis/storage/scanner startup requirements, not their dependent operations. |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Required in final mode. Critical auth/admissions limiters fail closed without Redis in both readiness modes; `ALLOW_MEMORY_RATE_LIMITS` is test-harness-only and cannot waive production readiness. |
| `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` | Required in final mode for private admissions-document storage; intake returns 503 until configured in temporary mode. |
| `MALWARE_SCANNER_URL` | Required in final mode. Unscanned-document waivers are not supported; upload, confirmation and submission remain unavailable until configured. |
| `JOBS_SECRET` | Required in every production mode for the Render notification Cron to authenticate to the web service. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Strongly required for account recovery, invitations and queued parent email; currently warned at boot rather than fatal. |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | Configure to receive server/browser faults; browser CSP allows only the configured DSN origin. |

## Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Seed initial admin account
npm run db:seed-admin

# (Optional) Seed demo data
npm run db:seed-it-courses
```

### ⚠️ The DATABASE_URL role must NOT be a superuser

Row-Level Security (RLS) is a core tenant-isolation control, but a superuser (or
any role with `BYPASSRLS`) **silently bypasses every policy**. If the app
connects as a superuser, RLS is effectively off and the isolation guarantee is
gone — while every test still passes, because the check itself runs under the
same bypass.

Create a dedicated, least-privilege app role for the `DATABASE_URL`:

```sql
CREATE ROLE app LOGIN PASSWORD '<a strong password>';
GRANT USAGE ON SCHEMA public TO app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app;
```

`npm run verify:rls` refuses to run as a superuser (it fails fast with this
message), so it doubles as a check that your production role is correctly
scoped. Run it against production before go-live:

```bash
DATABASE_URL=postgresql://app:<password>@host/db npm run verify:rls
npm run verify:rls:coverage
```

## Build & Start

The app is configured with `output: "standalone"` (see `next.config.ts`), so the
production server is the traced bundle under `.next/standalone`, not `next start`
(which refuses to serve a standalone build).

```bash
# 1. Build
npm run build

# 2. Start the production server (copies .next/static + public into the bundle,
#    then boots .next/standalone/server.js)
npm start

# Options:
PORT=3001 npm start            # default port is 3000
HOSTNAME=127.0.0.1 npm start   # bind only localhost (default binds 0.0.0.0)
```

For containers, the included `Dockerfile` already runs the standalone server
directly with a non-root user and a healthcheck.

## Health Check

After deployment, verify:
```
GET https://your-domain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-07-23T...",
  "uptime": 42,
  "checks": {
    "database": { "status": "up", "latencyMs": 12 },
    "redis": { "status": "configured" }
  }
}
```

## Alternative deployment files (not launch-certified)

Vercel, OCI and local Compose examples are retained for development or future
review, but they are **not** the supported Ykay College launch target until
separately rehearsed. In particular, the committed Vercel cron cadence and
serverless Redis/storage configuration must not be assumed to satisfy the
Render runbook. Do not select a different target for production without
updating the environment-specific secrets, cron, proxy-hop and rollback plan.

## Docker / Container Deployment

The repo ships a production `Dockerfile` (multi-stage, standalone build,
non-root user, healthcheck) and `.dockerignore`. The **Docker Publish** CI
workflow builds the image on every tag and push to `main` and publishes it to
**GitHub Container Registry**:

```bash
# After pushing a tag (v1.2.3), pull the published image on any host:
docker pull ghcr.io/<owner>/ykay-eduport:1.2.3

# Or use the :latest / :main tags
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=... \
  -e AUTH_SECRET=... \
  -e NEXT_PUBLIC_SITE_URL=https://your-domain.com \
  -e PAYSTACK_PUBLIC_KEY=... \
  -e PAYSTACK_SECRET_KEY=... \
  ghcr.io/<owner>/ykay-eduport:1.2.3
```

Or with the included `docker-compose.yml` (env vars passed from your shell):

```bash
docker compose up -d --build
```

Migrations are NOT run by the image (a stateless server should not own schema
changes). Run them once from a deploy step or a one-off container:

```bash
# One-off migrate using the image's prisma client:
docker run --rm -e DATABASE_URL=... ghcr.io/<owner>/ykay-eduport:1.2.3 \
  npx prisma migrate deploy
```

## Post-Deployment Checklist

- [ ] Health check returns `"healthy"`
- [ ] Login works with admin credentials
- [ ] Admissions form submits successfully
- [ ] Paystack payment flow works (test mode)
- [ ] Rate limiting is active (check Redis connection)
- [ ] Security headers present (check with browser DevTools)
- [ ] HTTPS enforced
- [ ] DNS configured with proper CNAME/A records
- [ ] Email delivery working (Resend)
- [ ] Error monitoring configured (Sentry)
- [ ] Backup schedule confirmed for database

