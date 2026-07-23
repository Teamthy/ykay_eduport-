# Production cutover checklist

## 1. Secrets
1. Copy `.env.example` to host secret store (Vercel/Railway/VPS).
2. Fill **real** values — never commit them.
3. `NEXT_PUBLIC_SHOW_DEMO_BADGE=false` (or unset).
4. Paystack **live** keys only on production host.
5. Confirm `AUTH_SECRET` ≥ 32 random chars.

## 2. Infrastructure
1. Neon DB created; `DATABASE_URL` is pooled + ssl.
2. `npx prisma migrate deploy`
3. Seed once: `npm run db:seed-admin`, `db:seed-super-admin`, `db:seed-it-courses` (+ optional finance/attendance bootstraps).
4. S3/R2 private bucket + CORS JSON from `docs/S3_ADMISSIONS_CORS.json`.
5. Resend domain authenticated.
6. Upstash Redis for rate limits.
7. Cron every 1–5 min → `POST /api/jobs/dispatch-notifications` with whatever auth you add/host allows.
8. Paystack dashboard webhook → `https://YOUR_DOMAIN/api/payments/paystack/webhook`.

## 3. Verify
```bash
npm ci
npm run build
npm run start
# other terminal:
npm run test:e2e -- --base-url=http://127.0.0.1:3000 --no-server
```
Then manual smoke from `docs/PRODUCTION_READINESS_AUDIT.md` §8.

## 4. Clean deploy tree
```bash
npm run cleanup:artifacts
```

## 5. Go-live
1. DNS → host
2. Force HTTPS
3. Monitor first admissions payment + fee payment + staff QR morning peak
