# Production database migrations

Use this runbook when deploying Prisma schema changes to the Ykay College Production database. Vercel builds generate Prisma Client but do not apply migrations. Never use `prisma db push` against Production.

## One-time GitHub setup

1. In the repository's **Settings → Environments**, create an environment named `production-migrations`.
2. Add required reviewers and restrict deployments to the `main` branch before adding a credential.
3. Add an **environment secret** named `NEON_DIRECT_DATABASE_URL` containing the Neon direct (unpooled) connection URL for the intended Production database. Do not put it in repository files or chat.

The `Production database migrations` workflow maps this secret to `DATABASE_URL` only in the Prisma command steps. `prisma/schema.prisma` currently reads `DATABASE_URL`; it does not declare a separate `directUrl`.

## Safe sequence

1. Confirm in Neon that this is the intended Ykay College database. A new empty database will not contain the previous database's school, users, or other records. Restore/migrate existing data first if any must be preserved.
2. In GitHub **Actions → Production database migrations**, select branch `main` and operation `status`. This is read-only. A fresh database may report unapplied migrations and the status step may exit non-zero; that is expected and no schema changes are made. If the logs show a connection problem, unexpected schema objects, or a failed migration, stop and investigate the target before deployment.
3. Only after confirming the target and intended fresh-database state, dispatch again with operation `deploy` and confirmation `APPLY`. Approve the protected `production-migrations` environment. The job runs `prisma migrate deploy`, then checks migration status again.
4. Confirm the final status is up to date. The migration history creates the schema, including `public."School"`, but does not seed Ykay College records or accounts.
5. If this is an intentionally fresh Ykay College database, verify the school row and follow the approved onboarding seed procedure separately. `npm run db:seed-ykay` requires a fresh, operator-supplied `HO_PASSWORD` of at least 12 characters and creates the initial Ykay school structure and Head of School account. Do not use a shared/default password or run the seed if existing data should be restored instead.
6. Verify the site at `/` and inspect `/api/health`. The current health route tests database connectivity with `SELECT 1`; it does not prove the application tables exist. Use migration status and the application page as schema checks.

## Workflow safeguards

- The workflow is `workflow_dispatch` only and runs only when dispatched from `main`.
- `status` never applies migrations. `deploy` requires the exact confirmation `APPLY` and the protected environment approval.
- A concurrency lock prevents overlapping migration runs.
- Only the Neon direct URL is used, and the workflow masks it from logs. Never paste it into workflow inputs, source code, or chat.
- The workflow does not run seeds, `db push`, or destructive data tests.
