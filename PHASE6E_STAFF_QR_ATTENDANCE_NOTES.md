# Phase 6E — Staff QR attendance

## Ships
- `StaffAttendanceEvent` + `TeacherProfile.badgeCode`
- Late cut-off via `STAFF_LATE_CUTOFF` (default 08:00) / `SCHOOL_TIMEZONE` (Africa/Lagos)
- Admin scanner: `/admin/staff-attendance` (AUTO in/out, force modes, printable badges)
- APIs: `/api/admin/staff-attendance`, `/badges`, `/api/staff/attendance/me`
- Staff self check-in: `/staff/attendance`
- Audit logs for check-in/out

## Env (optional)
```
SCHOOL_TIMEZONE=Africa/Lagos
STAFF_LATE_CUTOFF=08:00
```

## Apply
```powershell
.\phase-6e-staff-qr-attendance-ingest.ps1
```
