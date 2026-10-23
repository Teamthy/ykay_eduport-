#!/bin/sh
# Ykay College — Render/production container entrypoint.
#
# 1. applies Prisma migrations (idempotent — safe on every boot)
# 2. optionally seeds the shared CBT bank (SEED_CBT_ON_BOOT=true — skips
#    questions whose stem already exists, so re-boots are no-ops)
# 3. optionally ensures the super admin exists (SUPER_ADMIN_EMAIL set)
# 4. starts the Next.js standalone server
set -e

# Render Cron uses the same image with a small HTTP client mode. Exit before
# database migrations or seeding: the long-running web service owns all DB
# work, while this one-shot process simply asks it to dispatch due jobs.
if [ "$EDUPORTAL_CRON_MODE" = "true" ]; then
  echo "[entrypoint] running one-shot notification dispatcher…"
  exec node scripts/dispatch-notifications.mjs
fi

echo "[entrypoint] applying prisma migrations…"
node node_modules/prisma/build/index.js migrate deploy --schema prisma/schema.prisma

if [ "$SEED_CBT_ON_BOOT" = "true" ] && [ -f prisma/cbt-seed.mjs ]; then
  echo "[entrypoint] seeding CBT bank (idempotent)…"
  node prisma/cbt-seed.mjs || echo "[entrypoint] cbt seed failed (non-fatal) — run it manually later"
fi

if [ -n "$SUPER_ADMIN_EMAIL" ] && [ -f prisma/seed-super-admin.mjs ]; then
  echo "[entrypoint] ensuring super admin…"
  node prisma/seed-super-admin.mjs || echo "[entrypoint] super-admin seed failed (non-fatal)"
fi

echo "[entrypoint] starting server on port ${PORT:-3000}"
exec node server.js
