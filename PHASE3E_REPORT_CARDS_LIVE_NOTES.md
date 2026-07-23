# Phase 3E â€” Results / Report Cards Live Conversion

## What was implemented
Phase 3E converts report cards from static placeholders into live database-backed records for student, parent, and admin portals.

### Schema additions
- `ReportCardStatus`
- `ReportCard`
- `ReportCardSubject`

### New API routes
- `GET /api/student/report-cards`
- `GET /api/parent/report-cards`
- `GET /api/admin/report-cards/overview`
- `PATCH /api/admin/report-cards/overview`

### New shared UI component
- `components/LiveReportCardPreview.tsx`

### Updated pages
- `app/student/report-cards/page.tsx`
- `app/parent/report-cards/page.tsx`
- `app/admin/report-cards/page.tsx`

### New bootstrap seed
- `prisma/seed-report-cards.ts`
- npm script: `npm run db:bootstrap-report-cards`

## Admin workflow
Admin can now:
- view all report cards
- preview report card contents
- release a draft report card
- move a released report card back to draft

## Student / Parent workflow
Student and parent portals now:
- load report cards from live data
- display report-card registry tables
- preview full report cards
- support browser print / save-to-PDF

## Recommended command sequence after ingestion
```powershell
npx prisma generate
npx prisma migrate dev --name phase_3e_report_cards_live
npm run db:bootstrap-report-cards
npm run build
```

If using committed migration deployment flow:
```powershell
npx prisma generate
npx prisma migrate deploy
npm run db:bootstrap-report-cards
npm run build
```

## Recommended git branch
```powershell
git checkout -b phase/3e-results-report-cards-live
```

## What remains after Phase 3E
- 3F â€” Student / parent dashboard polish
- 3G â€” Notification delivery integration / hardening