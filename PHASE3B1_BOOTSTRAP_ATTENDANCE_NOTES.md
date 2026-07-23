# Phase 3B.1 â€” Bootstrap Seed for Attendance Portals

## Purpose
This bootstrap seed creates the minimum live data needed for the Phase 3A + 3B attendance experience to work immediately after migration.

It provisions:
- one teacher user
- one student user
- one parent user
- one teacher profile
- one parent profile
- one live class (`SS2A`)
- six student profiles
- teacher/class assignments
- parent/student links
- attendance history sessions for the current month
- queued attendance alert jobs
- one pending attendance correction request for admin review

---

## Files added/updated
- `package.json`
- `.env.example`
- `prisma/seed-attendance.ts`

---

## New npm script
```powershell
npm run db:bootstrap-attendance
```

---

## Optional environment variables
If these are not set, the bootstrap script will:
- use sensible demo emails
- generate secure random passwords for new users
- preserve existing passwords for existing users unless you explicitly provide new ones

Optional env vars:
- `BOOTSTRAP_TEACHER_EMAIL`
- `BOOTSTRAP_TEACHER_PASSWORD`
- `BOOTSTRAP_STUDENT_EMAIL`
- `BOOTSTRAP_STUDENT_PASSWORD`
- `BOOTSTRAP_PARENT_EMAIL`
- `BOOTSTRAP_PARENT_PASSWORD`

---

## Recommended run order
After ingesting the Phase 3B bootstrap files:

```powershell
npx prisma generate
npm run db:bootstrap-attendance
npm run build
```

If you have not yet ingested Phase 3B itself, do that first and run its migration before running this seed.

---

## What you can test after running the seed
### Teacher
- `/teacher/class/attendance`
- `/teacher/class/attendance-history`

### Student
- `/student/attendance`

### Parent
- `/parent/attendance`
- `/parent/dashboard`

### Admin
- `/admin/attendance-corrections`

---

## What the seed prints
It prints a small credential table in the terminal showing:
- Teacher email/password
- Student email/password
- Parent email/password

If a password says `unchanged`, that means an existing user was preserved and no new password was generated.