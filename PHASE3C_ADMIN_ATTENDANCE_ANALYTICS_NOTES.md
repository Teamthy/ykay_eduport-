# Phase 3C â€” Admin Attendance Analytics

## What was added
Phase 3C introduces a live admin analytics surface for attendance operations.

### New API route
- `GET /api/admin/attendance/analytics`

### New page
- `app/admin/attendance-analytics/page.tsx`

### Updated navigation
- `components/AdminSidebar.tsx`
  - adds a live link to Attendance Analytics

## What the analytics page shows
- attendance sessions tracked for the selected month
- overall attendance rate
- absent and late counts
- queued alert pressure
- pending correction request count
- class-level attendance performance
- daily attendance trend
- students needing attention
- recent submitted sessions
- recent correction requests
- alert breakdown by channel and status

## Filters
- month filter
- optional class scope filter

## Data sources used
- `AttendanceSession`
- `AttendanceEntry`
- `AttendanceAlertJob`
- `AttendanceCorrectionRequest`
- `SchoolClass`
- `StudentProfile`
- `TeacherProfile`

## Files changed
- `app/api/admin/attendance/analytics/route.ts`
- `app/admin/attendance-analytics/page.tsx`
- `components/AdminSidebar.tsx`

## Migration status
No schema change was required for Phase 3C.
So after ingestion, you only need:

```powershell
npx prisma generate
npm run build
```

## Recommended Git branch name
```powershell
git checkout -b phase/3c-admin-attendance-analytics
```