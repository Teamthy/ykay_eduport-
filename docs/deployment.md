# Ykay College EduPortal — Deployment Guide

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

### Optional variables

| Variable | Description |
|----------|-------------|
| `RESEND_API_KEY` | For transactional emails |
| `S3_BUCKET`, `S3_REGION`, etc. | For document storage |
| `UPSTASH_REDIS_REST_URL` + `TOKEN` | For rate limiting |

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

## Vercel Deployment (Recommended)

1. Connect your GitHub repo to Vercel
2. Add all environment variables in Vercel dashboard
3. Set build command: `npx prisma generate && npx next build`
4. Set output directory: `.next`
5. Deploy

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

