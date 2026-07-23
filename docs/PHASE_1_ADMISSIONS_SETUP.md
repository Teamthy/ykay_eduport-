# Phase 1 — Production Admissions Setup

This phase implements the public admissions journey: secure draft creation, private document uploads, Paystack application-fee verification, submission confirmation, and privacy-conscious status lookup.

## Required managed services

1. **Neon PostgreSQL** — create a database and add its pooled connection string as `DATABASE_URL` in Vercel.
2. **Upstash Redis** — create a Redis database and add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Public admission endpoints intentionally return `503` in Production if rate limiting is not configured.
3. **Private S3-compatible object storage** — AWS S3 or Cloudflare R2. The bucket must not allow public reads or writes.
4. **Paystack** — add test keys to Preview/Development and live keys only to Vercel Production.

## Private bucket configuration

- Enable default server-side encryption.
- Block every public ACL and public-policy access path.
- Apply lifecycle expiry to abandoned draft uploads (for example, delete `admissions/` drafts after 30 days).
- Grant the Vercel service credentials only `s3:PutObject`, `s3:HeadObject`, and later (for admin review) `s3:GetObject` for this bucket/prefix.

For direct browser uploads, configure CORS on the bucket. Replace the domains before applying:

```json
[
  {
    "AllowedHeaders": ["content-type"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["http://localhost:3000", "https://ykaycollege.edu.ng"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

## Database deployment

Copy `.env.example` to `.env.local` locally and set real values. Then run:

```powershell
npm install
npm run prisma:migrate:deploy
npm run build
```

On Vercel, set the same environment variables and use this build command:

```text
npm run prisma:migrate:deploy && npm run build
```

## Paystack webhook

In Paystack, configure this webhook URL:

```text
https://ykaycollege.edu.ng/api/payments/paystack/webhook
```

The webhook signature is validated with `PAYSTACK_SECRET_KEY`. Do not expose that key to the browser.

## Safety notes

- The old `.data` file-based admission API must be removed; serverless filesystems are not durable and cannot safely hold applicant PII.
- This phase never collects card details. Paystack’s hosted inline checkout handles payment data.
- Admission documents are uploaded only to a private bucket. They are not stored in `public/`, the repository, or browser local storage.
