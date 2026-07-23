# Phase 5 — School Operations, Super Admin Console & UI Hardening

Branch: `phase/5-operations`.

## 1. SUPER ADMIN (developer) console — `/super-admin`
New `SUPER_ADMIN` role, route-guarded by middleware (only SUPER_ADMIN can enter; they can also
open `/admin/*` pages for support work).

Three tabs:
- **Overview** — platform analytics: active users, logins today/7-days, audit events today,
  suspended accounts, applications, IT enrollments, exam attempts; users-by-role table;
  notification delivery health (failed/pending + recent failure details); latest sign-ins with IPs.
- **Audit Logs** — full searchable audit trail (filter by action, actor email; top-action quick
  chips; 50/page pagination).
- **User Control** — rescue tools for admin issues: search any account, **Suspend / Unsuspend**,
  **Reset Password** (issues a one-time temporary password shown once), **Promote to Admin /
  Demote to Teacher**. Every action is audit-logged as `SUPER_ADMIN_*`. Super-admin accounts
  cannot be modified by this panel; you cannot suspend/demote yourself.

APIs: `GET /api/super-admin/overview`, `GET /api/super-admin/logs`, `GET/PATCH /api/super-admin/users`.

Seed: `npm run db:seed-super-admin`
- env: `SUPER_ADMIN_EMAIL` (default developer@ykaycollege.com), `SUPER_ADMIN_PASSWORD` (optional —
  otherwise a strong password is generated and printed ONCE), `SUPER_ADMIN_NAME`.
- Sign in via `/login` → routed to `/super-admin`.

## 2. Teacher & Class Manager — `/admin/class-manager`
Mirrors the reference screens: expandable class list with live rosters.
- **Change Form Teacher** per class (deactivates old assignment, activates new — audit-logged)
- **Move student** between class arms
- **Archive student** (soft delete — records preserved) and **Archived Students** panel with Restore
- Student search across all classes
APIs: `GET/PATCH /api/admin/class-manager`, `GET /api/admin/class-manager/archived`.

## 3. Post & News CMS — `/admin/news`
`NewsPost` model. Write posts with category/excerpt/content, **Publish Now** or **Save Draft**,
unpublish, delete. Audit-logged. (Public news page wiring to live posts comes with the next
content pass.)

## 4. Button / CSS hardening (globals.css)
Per report: some buttons' text became invisible on hover.
- `.btn-outline:hover` no longer inverts (background stays transparent; border highlights instead)
- `.btn-ghost:hover` keeps its text colour
- `.btn-primary` / `.btn-secondary` text is forced white in every state
- disabled buttons keep readable text
No layout changes — your design system, spacing, and colours are untouched.

## Stepwise ingestion

```powershell
cd C:\Users\USER\Desktop\PROJECTS\ykay_edu\envoys-site
git checkout main; git pull; git status              # after Phase 4 PR merged
git checkout -b phase/5-operations

.\phase-5-ingest-b64.ps1                             # expect 16 green lines

npx prisma generate
npx prisma migrate dev --name phase_5_operations
npm run db:seed-super-admin                          # note the printed password!

Remove-Item -Recurse -Force .next
npm run build

# Smoke test (npm run dev)
#  1. /login with the super-admin credentials -> /super-admin
#     - Overview shows live platform stats
#     - Audit Logs filters work
#     - User Control: reset a test user's password -> temporary password shown once
#  2. admin -> /admin/class-manager: change a form teacher, move a student, archive + restore
#  3. admin -> /admin/news: publish a post, unpublish, delete
#  4. Check buttons across portals: text visible in normal AND hover states

git add -A
git commit -m "Phase 5: super admin console, class manager, news CMS, button CSS hardening"
git push -u origin phase/5-operations
# PR: https://github.com/Teamthy/ykay_eduport-/compare/main...phase/5-operations
```

## Remaining Phase-5 backlog (next iteration on this branch or 5B)
- ID card generation with QR + PDF (student & staff)
- Staff QR check-in/check-out attendance with late tracking
- Finance completion: expense recording, budgets, fee-lock gating CBT access
- Public /news-events page fed from live NewsPost data
- Parent directory
