# 02 — Rebrand and redesign

Target: a school that is **not** Ykay College should never see the string
"ykay", the green/navy palette, or a Ykay asset — anywhere, in any channel,
including SMS sender IDs, PDF headers, the APK, push notifications and the
database.

---

## 1. Inventory (measured on this checkout)

| Surface | Current state | Rebrand action |
|---|---|---|
| Literal `"ykay"` (case-insensitive) | **579 occurrences** in `app/`, `mobile/`, `components/`, `lib/`, `tests/`, `scripts/`, `prisma/`, `content/`, `middleware.ts` | burn-down via `npm run audit:brand` |
| Colour literals | ~200 hex values in `app/globals.css` (`#0c1824` navy, `#4ec54d` green, `#ff6e00` orange used 20+ times each) | tokenise → tenant CSS variables |
| Tenant branding model | `TenantBranding` (logo, favicon, primary/secondary/accent, fonts, hero, displayName, tagline) | extend to cover all tokens (`03 §2`) |
| Branding → CSS vars | `app/layout.tsx:114-171` injects **only** navy / navy-light / green; the code comments say so explicitly | widen the contract; no other file may hardcode a brand colour |
| Notification identity | `lib/notifications.ts` — hardcoded subject `"Attendance alert from Ykay College"` (line ~409) and `EMAIL_FROM \|\| "Ykay College <onboarding@resend.dev>"` | move to tenant notification identity |
| Cookie / storage keys | `ykay_session` in web cookies, `mobile/lib/http.ts:48,63,145`, SecureStore keys | namespace per `School.slug` |
| PWA / SEO | `public/manifest.json`, `public/sw.js`, `public/robots.txt`, `public/sitemap.xml`, `app/opengraph-image.tsx` | regenerate per tenant |
| Assets | `public/logo-ykay.svg`, `ykay-logo.png`, IT-hub photos, testimonial images, home/ hero images | new asset pack; IT/computer-school imagery only if that module is on |
| Mobile app identity | `mobile/app.json`: name `Ykay College`, slug `ykay-college`, `com.ykaycollege.app`, `scheme ykaycollege`, `associatedDomains ykaycollege.com`, EAS `projectId f38053b7-…`, camera permission string | per-school EAS build, or runtime theming (D5) |
| PDFs | `lib/branded-pdf.ts`, `lib/receipt.ts`, `lib/report-cards.ts` (12 / 11 refs) | read tenant identity, never literals |
| Seed data | `prisma/seed-ykay-college.ts` + 9 other seed files (27 refs) | new seed: `prisma/seed-<school>.ts` (see §4) |

**The `npm run audit:brand` script is the point of this section.** A rebrand is
not "find and replace once" — it is a rule you enforce for five years, because
the next feature someone ships will hardcode the brand again. The script keeps
a baseline and fails CI on *new* literals, so the count only goes down.

```bash
npm run audit:brand                 # inventory, fail on NEW literals vs baseline
npm run audit:brand -- --update     # re-baseline after an intentional change
npm run audit:brand -- --json       # machine output for a dashboard
```

**Measured on this checkout (2026-10-13), shipping scope:**

```
brand-audit: scope=shipping · 550 findings in 153 files
    275  BRAND_NAME      (read from school identity, never typed)
    165  PALETTE         (brand hex — must be a CSS variable / tenant token)
     76  DOMAIN          (ykaycollege.com / ykay.app)
     13  ASSET           (ykay-logo.*)
      8  COOKIE_STORAGE  (ykay_session)
      7  PACKAGE_SLUG    (ykay-college)
      6  MOBILE_APP_ID   (com.ykaycollege.app, applinks)

Worst files: app/globals.css 55 · lib/rate-limit.ts 38 ·
components/PlatformLanding.tsx 37 · app/layout.tsx 22 · public/sitemap.xml 21 ·
mobile/app.json 10 · mobile/src/theme/colors.ts 9 · lib/receipt.ts 8
```

Those 550 are the burn-down queue; the baseline is committed at
`scripts/brand-audit.baseline.json`, so any **new** literal fails the build with
`file:line` until it is fixed or deliberately re-baselined. (Repo-wide, including
tests/scripts/docs/prisma, the literal count is 579 occurrences in 179 files —
those are history, not shipping code, and `--all` reports them.)

---

## 2. Design-system work (the part that makes it a *different* product, not a recolour)

Do it in this order. Steps 1–3 are mechanical and low-risk; step 4 is the
actual redesign.

**1. Token contract.** One block in `app/globals.css` defines *every* brand
value; every other file references `var(--…)` only.

```css
:root {
  /* tenant-injected (overwritten at /layout by TenantBranding) */
  --brand-primary: #0c1824;
  --brand-secondary: #1a2e4d;
  --brand-accent: #4ec54d;
  --brand-accent-alt: #ff6e00;
  --brand-ink: #0c1824;
  --brand-on-accent: #0c1824;
  --brand-gradient-primary: linear-gradient(135deg, var(--brand-accent), var(--brand-secondary));
  /* platform-owned (same for every school) */
  --space-1…--space-12; --radius-sm…--radius-xl; --font-display; --font-body; --motion-fast…
}
```

Rule to enforce in review and in CI (extend `scripts/check-dead-ui.ts` or add a
sibling): **no `#rrggbb` outside the token block** in `app/globals.css` and none
at all in `components/**`. Contrast is already taken seriously in this repo
(`--btn-primary-text` comments cite 8.4:1 / 6.4:1) — keep it: every new palette
must be checked for WCAG AA on the four button/interactive pairs, and the
`tenantBranding` admin UI should refuse to save a failing combination or warn.

**2. Widen `TenantBranding`.** Current fields are a subset. Add:
`accentAltColor`, `onAccentColor`, `gradientStops (Json)`, `neutralInkColor`,
`fontDisplayUrl/fontBodyUrl` (self-hosted or licensed), `emailFromName`,
`emailFromAddress`, `smsSenderId`, `whatsappDisplayName`, `supportPhone`,
`supportEmail`, `addressLines (Json)`, `motto`, `reportCardFooterNote`,
`receiptFooterNote`, `idCardBackText`, `loginBackgroundUrl`,
`socialLinks (Json)`, `themePreset` (`light|dark|auto`).

**3. One server-side accessor, no client fan-out.** `lib/branding.ts` already
has `getTenantBranding(schoolId)`; extend it to `getSchoolIdentity()` returning
a fully-defaulted, cached object (use `lib/cache.ts`) and make everything —
emails, PDFs, SMS/WhatsApp templates, receipts, manifest, OG image — read from
it. Any place that currently builds a user-visible string with a brand name is a
bug after this change.

**4. Redesign, layered by risk.** Keep the portal shell (nav, tables, forms,
cards) and redesign the *experience surface*:

| Layer | Redesign depth | Why |
|---|---|---|
| Public marketing site (home, about, academics, admissions, contact, gallery, news) | **Full** — new layout, hero, section rhythm, imagery, copy | This is what parents and the brand see; cheap to change, no data risk |
| Login / onboarding / portal landing per role | **Medium** — new palette, imagery, dashboard tiles | First impression inside the product |
| Portal inner pages (tables/forms/dashboards) | **Tokens + spacing + typography only** | Re-layouting 145 pages buys nothing and risks 145 regressions |
| PDFs, ID cards, receipts | **Brand template remake** | Physically printed, parents keep them; must look institutional |
| Mobile app | **Brand + home/nav refresh** (D5) | Expo/RN screens, splash, icon, push identity |

Rules for the redesign: (a) density stays — Nigerian school admins work on
1366×768 labtops and cheap Android phones, not Retina MacBooks; (b) test at
360px width and on a throttled 3G profile (there are Lighthouse and Playwright
configs in the repo already); (c) imagery weight matters — the public site
already ships several JPEGs, so compress to WebP/AVIF and lazy-load with the
existing `lib/after-lcp.ts` helper; (d) dark mode must be a real, checked theme,
not an afterthought (`userInterfaceStyle: "dark"` is set in the mobile app).

---

## 3. Assets and identities to produce (checklist)

| Item | Spec | Where it goes |
|---|---|---|
| Primary logo | SVG + PNG @1x/2x/3x, light & dark variants, mark-only version | `public/`, portal header/footer, PDFs, mobile |
| Favicon + PWA icons | 32/180/192/512, maskable 512 | `public/manifest.json`, `app/icon`, `apple-touch-icon` |
| OG/Twitter image | 1200×630 template, school name + crest | `app/opengraph-image.tsx` (already dynamic — rework it) |
| Email header/footer | text-safe HTML, brand colours, physical address (required for deliverability) | Resend templates |
| Receipt / report card / ID card | A4 + ID-card-size templates | `lib/receipt.ts`, `lib/report-cards.ts`, `app/admin/id-cards` |
| Mobile | icon, adaptive icon, splash, notification icon, store screenshots | `mobile/assets`, EAS |
| Social | WhatsApp Business profile photo + description, Facebook/Instagram kit | Meta console |
| Domain/email | `.ng` or `.com.ng` domain, `portal.` subdomain, SPF/DKIM/DMARC, Google Workspace | DNS + Resend domain verify |
| Print | letterhead, fee-payment slips, banners | offline artifacts, but derive from the same tokens |

Deliverability note: move off `onboarding@resend.dev` to the school's verified
domain, and set SPF/DKIM/DMARC before the first parent email goes out. A fee
reminder landing in spam is a finance problem, not a marketing one.

---

## 4. Seed and provisioning (how a new school is born in the DB)

Today, onboarding is `db:seed-ykay` + `HO_PASSWORD` env + manual admin work
(`docs/ONBOARDING-GAPS.md` documents the resulting gaps). For school #2 that is
acceptable. For school #3 onward it is not. Build a **provisioning script** now,
because you need the structure anyway:

```
scripts/provision-school.ts --config prisma/tenants/<slug>.json
  1. School row (name, slug, subdomain, customDomain, status, modules)
  2. TenantBranding row (from config: colours, logo, contact, document footers)
  3. Academic structure: sessions, terms, classes/arms, subjects, class levels
  4. Staff invite → Head of School account (mustChangePassword), no password in env
  5. Fee structures + categories (from config, seeded as DRAFT, bursar approves)
  6. Notification identity (sender IDs, email from, WhatsApp number → school map)
  7. Chart of accounts + fiscal periods (finance doc §2)
  8. Verify: log in as each role, print a test receipt, send a test WhatsApp/SMS
```

Config file per tenant, committed (no secrets), reviewable in a PR. That single
file becomes the answer to "what is different about this school?"

---

## 5. Definition of done

- [ ] `npm run audit:brand -- --strict` passes with an **empty baseline** for `app/`, `components/`, `lib/`, `middleware.ts` (tests/scripts/docs may keep historical references).
- [ ] No `#rrggbb` literal outside the token block in `app/globals.css`; none in `components/**`.
- [ ] Branding change in the admin UI updates: portal, public site, email, receipt, report card, ID card, OG image, manifest — **without a deploy**.
- [ ] A brand-name string typed by a user is never rendered in a system email/SMS/WhatsApp from another school's identity.
- [ ] Mobile app builds, installs, and shows zero Ykay strings (D5 decides single vs multi-brand).
- [ ] Contrast audit passes AA on all interactive pairs; dark mode checked.
- [ ] `scripts/check-tenant-route-coverage.ts`, `check:dead-ui`, `check:orphans`, Lighthouse and Playwright suites still pass.
- [ ] One full walkthrough recorded with a non-technical staff member of the new school: log in → fee receipt → report card → PDF → WhatsApp.
