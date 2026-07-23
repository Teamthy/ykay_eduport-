# Phase 6B — Secure Fees, Placement UI, Portal Hygiene

## What this phase ships
1. **Idempotent school-fee payments**
   - `FeePaymentAttempt` table
   - `lib/fee-payment-service.ts` atomic balance reservation + unique reference
   - Parent payment intents (Paystack hosted + bank transfer claims)
   - Parent payment confirm only after Paystack verify
   - Webhook handles both admissions fees and school fees
   - Bursar cash record + bank transfer approve/reject (`/admin/fees/transfers`)

2. **Admissions → class placement**
   - Admin admissions queue UI: entrance score, pass/fail, class suggestion, enroll
   - Uses existing idempotent `POST /api/admin/admissions/enroll`

3. **Teacher live students**
   - `GET/POST /api/teacher/students`
   - Form teachers enrol into their class; subject teachers get read-only roster
   - Entrance-pass suggestions for form class levels

4. **Staff direct create**
   - `POST /api/admin/staff/direct` + UI on `/admin/staff`
   - Staff still cannot self-register

5. **Portal hygiene**
   - Portal sidebars without cross-role switcher / demo badge
   - Admissions, teacher students, parent fees, id-cards, staff use `PortalTopbar` (no public Header)

6. **Live news**
   - `/news-events` and `/news-events/[slug]` read `NewsPost`

7. **ID cards**
   - Live students + QR + print/PDF

## Apply
```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
.\phase-6b-secure-ops-ingest.ps1
```

## Configure
- Paystack webhook URL must include `/api/payments/paystack/webhook`
- `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, `AUTH_SECRET` set in `.env`
