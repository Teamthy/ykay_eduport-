# Phase 3D â€” Finance Live Data Conversion

## What was implemented
Phase 3D converts fees and finance from static demo UI into database-backed workflows.

### Schema additions
- `FeeInvoiceStatus`
- `FeePaymentMethod`
- `FeePaymentStatus`
- `FeeInvoice`
- `FeeInvoiceItem`
- `FeePayment`

### New API routes
- `GET /api/parent/fees`
- `POST /api/parent/fees/payments`
- `GET /api/admin/fees/overview`
- `GET /api/admin/finances/overview`

### Updated pages
- `app/parent/fees/page.tsx`
- `app/parent/dashboard/page.tsx`
- `app/admin/fees/page.tsx`
- `app/admin/finances/page.tsx`

### New bootstrap script
- `prisma/seed-finance.ts`
- npm script: `npm run db:bootstrap-finance`

## What the parent portal now supports
- live invoice lookup by linked child
- live payment history
- receipt generation from real fee records
- modal payment persistence into DB using the current paystack demo success flow
- parent dashboard now shows live fee balance and latest invoice snapshot

## What the admin portal now supports
- live invoice registry
- billed / collected / outstanding summary cards
- recent payment history
- finance dashboard period summaries
- class collection performance

## Bootstrap behavior
The finance bootstrap seeds:
- one partial invoice for the main linked child
- one partial invoice for the second linked child
- one fully paid invoice for admin visibility
- one overdue unpaid invoice
- multiple fee payments / receipts

## Required commands after ingestion
```powershell
npx prisma generate
npx prisma migrate dev --name phase_3d_finance_live_data
npm run db:bootstrap-finance
npm run build
```

If using committed migration deployment flow:
```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:bootstrap-finance
npm run build
```

## Recommended git branch
```powershell
git checkout -b phase/3d-finance-live-data
```