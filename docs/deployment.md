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

```bash
npm run build
npm start
```

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
