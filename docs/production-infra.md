# Ykay College production infrastructure checklist

This repo can run on Vercel/managed Postgres, but self-hosted production needs more than the app container.

Minimum production shape:

- Next.js app container built from `Dockerfile`.
- PostgreSQL 16 with automated backups and a tested restore drill.
- Redis or Upstash for distributed rate limiting / queue coordination.
- Authenticated cron/worker for `/api/jobs/dispatch-notifications`.
- Object storage for admission documents.
- Secret manager for `AUTH_SECRET`, Paystack keys, email keys, S3 keys and `JOBS_SECRET`.
- TLS at the proxy/load balancer.
- Monitoring and alerts for 5xx, queue backlog, failed payment webhooks and failed notification delivery.

`docker-compose.prod.yml` documents the required local/self-hosted stack. For managed hosting, map each service to its managed equivalent and keep the same environment requirements.
