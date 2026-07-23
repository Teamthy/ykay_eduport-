# Phase 6A — People, Placement & Access Control

## Included
- Admin student-record workspace: manual enrolment, parent linking, class capacity enforcement, audit log and idempotency key.
- Admin staff workspace: invitation-only account provision; activation route creates staff user and teacher profile where appropriate.
- Admissions enrollment API: only verified-paid applications that passed entrance assessment can be converted to a student; class level/capacity enforced; operation is transactional and retry-safe.
- New `StudentProfile.admissionApplicationId` prevents duplicate admission handoff.
- `IdempotencyRecord` preserves safe retry response for enrollment commands.
- First two reworked portal pages use the compact authenticated `PortalTopbar` instead of public Header/Footer.

## Deployment
1. Set all required production environment variables from `.env.example` (especially `DATABASE_URL`, `AUTH_SECRET`, Paystack and mail/storage keys).
2. Back up the production database.
3. Run `npx prisma migrate deploy`, then `npx prisma generate`.
4. Run `npm run build`.
5. Smoke test: create a staff invite; activate it; create manual student; replay the same API idempotency key; run the admissions enrollment endpoint twice with the same idempotency key.

## Deliberate scope boundary
The legacy `/admin-admissions` review screen has not yet been replaced with the new placement wizard UI. Its API workflow is included in `POST /api/admin/admissions/enroll`; the next UI pass should invoke it from the review screen after entrance-test result capture.

## Finance safety hold
The legacy parent-fee payment screen still has a simulated Paystack modal. Do **not** collect live school fees through it. Phase 6B replaces it with verified webhook-driven Paystack payments and reconciliation.
