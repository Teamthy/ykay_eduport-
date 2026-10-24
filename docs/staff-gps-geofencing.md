# Campus map and staff GPS attendance

## Schema rollout

This feature adds the Prisma migration `20261024100000_staff_gps_geofencing`. It adds the campus coordinates and geofence settings to `School`, plus nullable, privacy-minimised geofence audit fields to `StaffAttendanceEvent`.

**The migration has not been applied by this change.** Do not run `prisma db push`, seed data, or a migration against Production without explicit target confirmation. Apply and verify the migration in the intended non-production database first. The production migration runbook is `docs/production-database-migrations.md`; its workflow is manually dispatched and protected. Deploy the application only after its target database has the migration. Until the columns exist, the public site remains available without a map pin, while school-profile and staff self-service GPS APIs return a clear 503 rather than silently bypassing a configured fence.

## Configure the campus pin and boundary

An authorized `ADMIN`, `DIRECTOR`, or `SUPER_ADMIN` opens **Admin → School Profile**:

1. Confirm the postal address if it should be shown publicly or printed on documents.
2. Set the campus latitude and longitude manually, or use **Use this device's GPS** while physically at the school. Review the map preview before saving. The preview does not draw the geofence radius.
3. Set a boundary from 50 to 5,000 metres (default 150 metres).
4. Enable **Require GPS for staff self-service check-in and check-out** and save. The boundary cannot be enabled without both coordinates.

The campus pin is used by the public map; the postal address remains optional. No location or address is invented by the application. The staff attendance feature remains in its previous non-GPS mode until an administrator explicitly enables the boundary.

## Server-side check

When the boundary is enabled, a staff member must grant browser geolocation on `/staff/attendance`. The API validates the payload, calculates great-circle distance on the server, and accepts only if:

- the browser-reported accuracy is at most `min(100 m, radius / 2)`; and
- measured distance plus reported accuracy is within the configured radius.

The exact latitude and longitude are not stored. A successful self-service event stores the geofence result, distance rounded to 10 metres, and reported accuracy rounded up to 5 metres. Admin QR scans do not submit browser location and remain a separate path. Geolocation permission is limited by `Permissions-Policy` to the staff attendance page and the school profile page (for an admin explicitly capturing the campus pin); camera permission stays limited to the QR scanner.

Browser GPS is user/device-reported and can be spoofed. This feature is a location safeguard, not cryptographic identity verification or anti-spoof attestation. Retain QR scanning or on-site supervision where stronger assurance is needed.

## Verification

- `tests/lib/staff-geofence.test.ts` covers the Haversine calculation, boundary/accuracy rules, and invalid input.
- `tests/lib/staff-attendance-geofence-route.test.ts` covers the authenticated self-service route's required-location, outside, low-accuracy, success, disabled, and missing-schema paths.
- `tests/lib/school-profile-geofence.test.ts` covers role-protected campus configuration, coordinate/radius validation, and missing-schema responses.
- `tests/e2e/02-attendance-camera.spec.ts` checks that geolocation is granted only on the two pages that need it and remains denied on the QR scanner.
- `tests/e2e/06-mobile-navigation.spec.ts` checks the compact public menu and the admin mobile navigation drawer.
- No database migration, seed, live Production check, or GPS device test is performed by these code changes.
