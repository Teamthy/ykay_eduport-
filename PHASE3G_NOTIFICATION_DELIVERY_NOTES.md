# Phase 3G — Notification Delivery Integration & Hardening

Converts queued notifications from database rows that never move into a real delivery pipeline
with retries, failure tracking, admin visibility, and a live in-app notification bell
(userflow Flows 10.1–10.3).

## What was implemented

### Schema additions
- `NotificationKind` enum — ATTENDANCE_ALERT, FEE_REMINDER, REPORT_RELEASED, BROADCAST, ADMISSION_UPDATE, SYSTEM
- `NotificationJob` — outbound delivery queue: channel, recipient, subject/body, dedupe key,
  attempts/maxAttempts, nextAttemptAt (backoff), lastError, sentAt
- `UserNotification` — per-user in-app notifications feeding the NotificationBell

### Delivery engine — `lib/notifications.ts`
- **Channel adapter interface** — EMAIL live via Resend (branded HTML template);
  SMS/WHATSAPP are stubs that mark jobs SKIPPED until a provider (Termii/Twilio) is wired in
- **queueNotificationJob()** with dedupe-key idempotency
- **dispatchDueNotifications()** — processes due PENDING jobs; retry with backoff (5m → 30m → 2h),
  FAILED after maxAttempts, permanent errors fail immediately
- **bridgeAttendanceAlerts()** — converts the attendance register's `AttendanceAlertJob` rows into
  NotificationJob deliveries + in-app notifications for linked parents

### API routes
- `POST /api/jobs/dispatch-notifications` — cron-safe dispatcher.
  Auth: `Authorization: Bearer <JOBS_SECRET>` (set env var, min 16 chars) OR signed-in ADMIN/DIRECTOR
- `GET/PATCH /api/admin/notifications` — admin queue with status filter, per-channel stats,
  RETRY (re-queue failed/skipped) and CANCEL (pending) actions — audit-logged
- `GET/PATCH /api/notifications` — current user's in-app notifications, mark-read / mark-all-read

### Event hooks
- **Report-card release** (`/api/admin/report-cards/overview` PATCH) now queues a guardian email
  (deduped per report) + in-app notifications for the linked parent and the student

### UI
- `/admin/notifications` — delivery console: Pending/Sent/Failed/Skipped stat cards,
  **Dispatch Now** button, status tabs, per-job attempt counts + error messages, Retry/Cancel
- `components/NotificationBell.tsx` — now fully live: fetches `/api/notifications`, 60s polling,
  optimistic mark-read, unread badge; renders only for signed-in portal users
- AdminSidebar: "Notifications" link added (Live badge)

### Cleanup
- Deleted orphaned `/login/admin`, `/login/student`, `/login/parent`, `/login/teacher` pages
  (single `/login?portal=` flow remains)

## Environment
| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | already used for password reset — now powers notification email delivery |
| `EMAIL_FROM` | optional branded sender |
| `JOBS_SECRET` | NEW — bearer token for the cron dispatcher (16+ chars) |

### Scheduling (production)
Vercel Cron (vercel.json):
```json
{ "crons": [{ "path": "/api/jobs/dispatch-notifications", "schedule": "*/10 * * * *" }] }
```
Vercel Cron sends no custom headers by default; either allow GET with the secret as a query
fallback, or use an external scheduler (GitHub Actions / cron-job.org) with:
`curl -X POST -H "Authorization: Bearer $JOBS_SECRET" https://yourdomain/api/jobs/dispatch-notifications`
For manual operation, the **Dispatch Now** button on /admin/notifications does the same as admin.

## Stepwise ingestion

```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
git checkout main; git pull; git status          # clean, after 3F PR merged
git checkout -b phase/3g-notification-delivery

.\phase-3g-ingest-b64.ps1                        # expect 10 green "Updated" lines

npx prisma generate
npx prisma migrate dev --name phase_3g_notifications
npm run build

# Smoke test
npm run dev
#  1. Sign in as teacher -> submit attendance with an ABSENT student
#  2. Sign in as admin -> /admin/notifications -> "Dispatch Now"
#     -> attendance alerts bridged; EMAIL jobs sent (needs RESEND_API_KEY), SMS/WA skipped
#  3. Release a report card -> parent gets email job + bell notification
#  4. Sign in as parent -> bell shows unread notifications

git add -A
git commit -m "Phase 3G: notification delivery pipeline, retries, admin console, live bell"
git push -u origin phase/3g-notification-delivery
```

## Next phase
`phase/4-academics` — 4A gradebook ingest (already built) + 4B CBT exam engine + 4C broadsheet & QR verification.
