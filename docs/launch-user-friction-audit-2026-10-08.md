# YKAY College EduPortal — Launch user-friction audit

**Date:** 2026-10-08 · **Branch:** `arena/8ce3ce03-ykay-eduport` (base `9ea05b6`)
**Scope:** YKAY College as the main product (EDUos treated as later; YKAY as a tenant).
**Method:** a production build run as a real user across every role, plus API probing of every route handler.

---

## 1. Verdict

**Not ready for public launch as the code stands.** The core read paths work (portal dashboards, attendance, report cards, fee balances, the public site and the sign-in flow up to the form). Several launch-critical paths do not:

- IT students **cannot enrol** in any course (B1).
- The **contact form** discards every enquiry and tells the visitor "Enquiry Sent" (B2).
- **Admissions document upload** will be blocked by the browser's Content Security Policy once storage is configured (B3).
- The **sign-in heading and fields are nearly invisible** on the first screen of every portal (B4).
- The **sign-in page can redirect to any external site** after login (B5, open redirect).
- **Student and admin ID cards send children's names to a third-party website** (B6).
- The **school address printed on receipts, ID cards and PDFs is an unconfirmed placeholder** (B7).

Seven blockers, eight high-severity items, plus configuration prerequisites (section 6). Everything else is medium or low.

**Severity scale**

| Level | Meaning |
|---|---|
| **Blocker** | Must be fixed before public traffic. |
| **High** | Should be fixed before launch, or explicitly accepted with a mitigation. |
| **Medium** | Fix in week 1. |
| **Low** | Backlog / polish. |

**Evidence labels:** `[browser]` verified in a real Chromium session · `[API]` verified by HTTP calls · `[code]` read from source · `[inferred]` strong but not run end to end.

---

## 2. What was tested

| Area | Coverage |
|---|---|
| Page routes | **144** page routes derived from `app/**/page.tsx`, each loaded as the persona allowed by `middleware.ts` (desktop: 278 page visits; mobile: 56). |
| API routes | **202** HTTP method handlers across all `app/api/**/route.ts` files, probed anonymously, as one wrong-role persona per area, and as the owner role (read-only GET only; mutating calls were never sent as an owner), plus malformed-JSON probes. |
| Links | Every internal link discovered on those pages was requested with the persona's session (**422** link checks, desktop and mobile). |
| Scripted user journeys | Anonymous visitor, admissions family, first sign-in and every sign-in path, teacher, student, parent, IT student, school admin, platform super admin. About 85 steps in total. |
| Targeted verifications | CSP for uploads and Sentry, rate limits (per-IP and spoofed), open redirect, impersonation guard, fee lock on a live exam, QR third-party requests, computed contrast. |

**Personas** (one account per role, all from the UAT seed): platform super admin; school admin; head of school (first login, forced password change); director; bursar; coordinator; HOD; two teachers (one class teacher, SS2A); two students (one linked to a profile with a fee balance, one account with no linked profile); two parents (one with two children); IT student; anonymous visitor. Director, bursar and coordinator were **not** crawled or journeyed separately. They pass the same admin middleware gate as the admin account, so the admin persona stood in for the admin area; role-specific differences for those three accounts are untested.

**How the environment was built (sandbox only, never committed):**
- Production build (`next build`), run as the standalone bundle, same boot path as `npm start` and the Dockerfile.
- PostgreSQL 16 with all 29 migrations applied cleanly on an empty database.
- Seeded with the YKAY onboarding seed, the demo-persona seed, and the finance, attendance, report-card, gradebook, timetable, IT course, plan and CBT bank seeds (5,483 questions).
- Sandbox limits: Prisma's native query engine cannot be downloaded here, so the audit used Prisma's WASM engine with the `pg` driver adapter. Query semantics are the same; engine-level error text may differ. Chromium came from npm. The sandbox has no internet, so Paystack, email, object storage and Sentry were unreachable. Rate limiters are in memory and were reset by restarts, and all traffic came from one IP.

---

## 3. Findings at a glance

| ID | Level | Area | Who is hit | Finding |
|---|---|---|---|---|
| B1 | Blocker | IT portal | Digital student | No way to enrol in any IT course. |
| B2 | Blocker | Contact | Every visitor / parent | Contact form sends nothing and says "Enquiry Sent". |
| B3 | Blocker | Admissions | Applicant family | Document uploads blocked by CSP once storage is set up. |
| B4 | Blocker | Sign-in | Everyone | Sign-in heading and inputs nearly invisible (contrast 1.10:1). |
| B5 | Blocker | Security | Everyone | Open redirect after sign-in (`?next=//host`). |
| B6 | Blocker | Privacy | Students, staff, parents | ID cards and QR codes send names and IDs to a third party. |
| B7 | Blocker | Content | Parents, staff | Unconfirmed school address printed on receipts, ID cards, PDFs and public pages. |
| H1 | High | Security | Everyone | Rate limits bypassable with a forged `X-Forwarded-For`. |
| H2 | High | Limits | Families on shared networks | Per-IP limits lock out a whole school network. |
| H3 | High | Exams / fees | Fee-locked students | Fee lock shows a tag but no reason, amount or way to pay. |
| H4 | High | Fees | Parents | Invoice title can name a different child. |
| H5 | High | Payments | Parents | Raw "fetch failed" toast; cookie banner covers the Pay button; ambiguous receipt dates. |
| H6 | High | Monitoring | Operators | Browser errors cannot reach Sentry (CSP). |
| H7 | High | CBT | Students / integrity | Public CBT API exposes the whole bank and answer keys. |
| H8 | High | Sign-in | Parents, YK-Virtual users | "Continue to YK-Virtual" link goes to a 404. |
| M1 | Medium | Website | Visitors | News & Events empty on launch; four articles are unused. |
| M2 | Medium | Teacher | Teachers | "undefined students/parents" text; analytics KPI missing. |
| M3 | Medium | Website / SEO | Visitors, search | Missing articles return HTTP 200 "Page not found". |
| M4 | Medium | Onboarding | Head of School | Forced password change lands on the portal chooser, not the dashboard. |
| M5 | Medium | Security | Staff, parents | Password rules differ between change and reset; reset errors are generic. |
| M6 | Medium | Reliability | Operators | Malformed requests return 500/503 and flood error logs. |
| M7 | Medium | SEO / UX | Visitors | Most pages share one generic `<title>`. |
| M8 | Medium | Brand / domain | Everyone | Two domains in use; logo artwork says "TRAINING COLLEGE". |
| M9 | Medium | Admissions | Families | Application fee not stated before starting. |
| M10 | Medium | Teacher | Teachers | Question bank shows no search or filter. |
| M11 | Medium | Staff onboarding | Admin, new staff | Activation link is shown once; no email to fall back on. |
| M12 | Medium | Downloads | Parents | App download depends on env vars; redirect uses the site URL. |
| M13 | Medium | Parity | Parents | Parent timetable exists in the API and mobile app, not on the web. |
| L1–L10 | Low | Various | — | Broken hero image and favicon, duplicate pages, role/policy questions, copy issues (section 5.3). |

---

## 4. Detailed findings

### B1 — IT students cannot enrol in any course (Blocker)
- `[browser]` On `/it-portal/dashboard`, catalogue cards are links to course pages. There is no enrol button. The course page says *"You are not enrolled yet. Enroll from your IT dashboard…"* (`app/it-portal/courses/[slug]/page.tsx:175-182`), which sends the student back to a dashboard with no enrol action. The dashboard summary stayed at `enrolledCourses: 0` in every run.
- `[code]` `app/api/it/enroll/route.ts` exists, but no UI file calls it (grep of `app` and `components` finds no caller).
- Consequence: "Mark as Complete" in the course player changes nothing and shows no message, because progress cannot be recorded without enrolment (`[browser]`, progress stayed at 0 of 6).
- **Fix:** add an Enrol action on the course page and on each dashboard card, calling `POST /api/it/enroll`; show a clear message in the player when a learner is not enrolled. Re-run the IT journey.

### B2 — The contact form discards enquiries and claims success (Blocker)
- `[code]` `app/contact/page.tsx:69-72`: `onSubmit` calls `e.preventDefault()` and then `alert("Enquiry Sent")`. Nothing is sent to any endpoint. The file has no `required` attributes and no `name` attributes on its inputs, so even a browser-level check would not catch an empty form. The `[browser]` journey confirmed that an empty submit raised no validation.
- Consequence: every parent enquiry is lost and the parent is told it was received.
- **Fix:** send the enquiry to a server endpoint that stores it and notifies the office (or use a verified `mailto`). Show success only after the request succeeds.

### B3 — Admissions document upload will be blocked by the browser (Blocker)
- `[code]` The form uploads each file straight from the browser to the presigned storage URL: `components/admissions/AdmissionApplicationForm.tsx:313` (`fetch(upload.uploadUrl, { method: "PUT" … })`).
- `[code]` `next.config.ts:45` sets `connect-src 'self' https://api.paystack.co https://*.upstash.io https://*.neon.tech …`. The storage origin is not allowed.
- `[browser]` A test PUT to a storage host is refused by the browser before any network call: *"Connecting to 'https://…s3…' violates the following Content Security Policy directive: connect-src …"*.
- Consequence: once `S3_BUCKET` is configured, families cannot attach the four required documents (birth certificate, passport photo, report card, transfer certificate), so applications cannot be submitted.
- **Fix:** add the storage origin (S3 regional endpoint or R2 domain) to `connect-src`, or proxy uploads through the server. Test with the real bucket on staging, including a malware-scanner path.

### B4 — Sign-in heading and fields are nearly invisible (Blocker)
- `[browser]` On `/login`, the "SIGN IN" heading computes to `rgb(241,245,249)` on a `rgb(255,255,255)` card: **contrast 1.10:1** (WCAG AA needs 3:1 even for large text). The subtitle is also very faint.
- `[browser]` The email and password inputs compute to a white background with `rgba(255,255,255,0.08)` borders, so the fields are barely visible. A first-time parent may not see where to type.
- `[inferred]` Dark-theme text and input tokens are applied on a card whose background stays white (`app/login/page.tsx`, card and form markup).
- **Fix:** give the card explicit light-theme colours (or make the card follow the theme), add a visible input border and background, and re-check contrast on every portal sign-in variant (`?portal=staff|student|parent|it`).

### B5 — Open redirect after sign-in (Blocker)
- `[code]` `app/login/page.tsx:73`: `router.replace(next && next.startsWith("/") ? next : …)`. A value such as `//example.com/phish` starts with `/` and is accepted.
- `[browser]` After signing in with `/login?next=//example.com/phish`, the browser issued a navigation to `http://example.com/phish`. The request failed only because the sandbox has no internet.
- **Fix:** accept only same-origin paths, for example `new URL(next, window.location.origin).origin === window.location.origin`, and reject values beginning with `//` or `/\`.

### B6 — ID cards and QR codes send names and IDs to a third party (Blocker)
- `[browser]` The student ID card requests `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=YKAY%7CYKC%2F2026%2F001%7CEmmanuel%20Adebayo`, which is the student's ID and full name.
- `[code]` The same pattern appears in:
  - `app/student/id-card/page.tsx:71` (student ID and name)
  - `app/admin/id-cards/page.tsx:87` (student ID, name and class)
  - `app/staff/attendance/page.tsx:36` and `app/admin/staff-attendance/page.tsx:58-59` (staff badge payload: `{kind: "STAFF_BADGE", schoolId, code: badgeCode}` from `lib/staff-attendance.ts:64-70`. The `badgeCode` is static, not rotating, so it works as a long-lived check-in credential, and the third party receives it)
  - `components/LiveReportCardPreview.tsx:205` (report numbers)
  - `lib/apk.ts:78` (download link)
- Impact: children's personal data and staff check-in payloads leave the school's control. Images break when the third party is slow or down; this happened throughout the sandbox run.
- **Fix:** generate QR codes locally (the `qrcode` package is already a dependency) and remove the third-party URLs. Confirm the data-processing position with the school.

### B7 — Unconfirmed school address on receipts, ID cards and public pages (Blocker)
- `[code]` "Sango Ota, Ogun State" / "Km 38, Lagos-Abeokuta Expressway" is hard-coded in `app/contact/page.tsx:44`, `lib/receipt.ts:39`, `lib/branded-pdf.ts:59,194,380`, `app/student/id-card/page.tsx:115`, `app/about/page.tsx:51`, and the page metadata and structured data in `app/layout.tsx:69-70` and the JSON-LD block.
- `[code]` The database seed uses a different placeholder, "Alishiba Junction, Nigeria" (`prisma/seed-ykay-college.ts:56`).
- `[code]` `docs/ONBOARDING-GAPS.md` says the Sango Ota address is "a guess from an earlier draft and is not confirmed by this form".
- Impact: receipts, report cards and ID cards may print an address the school has not confirmed. Changing the database row would not change the hard-coded PDFs.
- **Fix:** confirm the address, store it once in school settings, and read it everywhere (pages, receipts, PDFs, ID cards, structured data).

### H1 — Rate limits are bypassable with a forged `X-Forwarded-For` (High)
- `[code]` `lib/requests.ts:4-6` uses the first value of `x-forwarded-for` as the client IP.
- `[API]` After the real IP was blocked with 429 on `/api/cbt/check`, 20 requests with different spoofed `X-Forwarded-For` values all returned 400 (accepted) rather than 429.
- Affects every IP-keyed limiter: login (10 per 15 minutes), IT signup (5 per hour), admissions draft, payment and upload, password reset, and CBT (240 per hour).
- Production exposure depends on whether the edge proxy overwrites the header. That must be verified on staging. The application should not trust the client-supplied first value either way.
- **Fix:** read the address your trusted proxy appends (or the platform's verified client-IP header), and add a staging test that sends a spoofed header and expects no effect.

### H2 — Shared per-IP limits will lock out families on a shared network (High)
- `[code]` `lib/rate-limit.ts`: admissions draft 5/hour (`:82`), upload 40/hour (`:83`), payment 8/hour (`:84`), login 10 per 15 minutes (`:87`), per-account failures 3 per 15 minutes (`:88`), password reset 3/hour (`:98`), signup 5/hour (`:100`), CBT 240/hour (`:118`).
- `[API]` The sixth IT signup request from one IP returned 429 *"Too many sign-up attempts. Please wait and try again."* — and all six were invalid, because the limiter runs before validation.
- `[API]` The sixth draft request returned 429 *"Too many attempts. Please wait before trying again."*
- Each admissions application makes several draft writes (creation, each document, payment, submit), so one shared IP can complete roughly one application per hour. The messages give no wait time.
- Impact: on admissions day, IT enrolment or fees day, a school Wi-Fi or carrier NAT can lock out every family or student behind it.
- **Fix:** key budgets per account or application rather than per IP where possible; count only successful writes; raise shared-IP ceilings; show the wait time; and configure Upstash Redis in production (`.env.example` says security limiters fail closed without it).

### H3 — Fee-locked students get no reason and no way to pay (High)
- `[browser]` With a published exam for SS2A, the fee-locked student's exam list shows the card with only a small **"FEES OUTSTANDING"** tag. There is no start control, no amount, no reason and no link to the fee page (`app/student/exams/page.tsx`; the lock comes from `app/api/student/exams/route.ts`, which returns `feeLock.blocked: true`, ₦45,000 outstanding).
- `[browser]` With no exams published, the page says *"No exams have been published for your class yet."* It does not mention the lock.
- **Fix:** show the lock reason, the outstanding amount and a "View fees and pay" link on the page and on each locked card.

### H4 — An invoice title can name a different child (High)
- `[browser]` The parent's fee page shows the card title "Adeola Ogunlade School Fees" while the child selector shows Emmanuel Adebayo · SS2A. The invoice's student link is correct (`YKC-INV-2026-001` → Emmanuel's profile), but the stored `FeeInvoice.title` names another student.
- `[code]` `FeeInvoice.title` is a free-text stored string, displayed verbatim. The title came from the UAT finance seed. I did not verify whether production invoice generation derives it from the student record.
- Impact: a parent can pay an invoice labelled for someone else.
- **Fix:** derive titles from the student record (or make them read-only), and add a check that the title matches the linked student when invoices are generated.

### H5 — Payment failure shows a raw error; the banner blocks Pay; receipt dates are ambiguous (High)
- `[browser]` Pressing *"Pay ₦45,000 with Paystack"* got a 502 from `POST /api/parent/fees/payment-intents`. The parent saw a red toast reading **"fetch failed"**, a technical message (`app/parent/fees/page.tsx:359` is the button).
- `[browser]` On a fresh session the cookie banner covers the Pay button; the click times out until the banner is dismissed.
- `[browser]` Receipt dates show as `10/1/2026` (`M/D/YYYY`), which Nigerian readers will take as 10 January.
- Not verified: an actual Paystack transaction, webhook or bursar approval (no internet here).
- **Fix:** map upstream errors to plain language ("We could not reach the payment provider. Your invoice has not changed. Please try again shortly."); make the banner non-blocking (bottom bar or sheet that does not cover actions); format dates as "1 Oct 2026".

### H6 — Browser errors cannot reach Sentry (High)
- `[browser]` With the production CSP, a request to `https://o0.ingest.sentry.io` is refused (*"violates … connect-src"*). `next.config.ts:45` has no Sentry origin.
- Consequence: when a DSN is configured, client-side errors are silently dropped. The go-live checklist requires a received test error.
- **Fix:** allow `https://*.ingest.sentry.io` (or add a tunnel route) and confirm with a forced error on staging.

### H7 — Public CBT API exposes the whole bank and every answer key (High)
- `[API]` `GET /api/cbt/quiz` answers anonymously with question stems and options for any subject (verified for `agricultural-science-bece`).
- `[API]` `POST /api/cbt/check` returns `correctIndex` and the explanation for any question after one call (verified live).
- With H1 the CBT limit is also bypassable, so the bank can be harvested in full.
- `[code]` The public runner `components/cbt/CbtRunner.tsx` is not imported anywhere, and `/cbt` redirects anonymous visitors to login. The public endpoints therefore serve no UI.
- Impact: if any school exam draws from this bank, its integrity is compromised.
- **Fix:** confirm that exam banks are separate; disable or authenticate the `/api/cbt/*` public endpoints until the practice product is ready; remove the dead component.

### H8 — The "Continue to YK-Virtual" link goes to a 404 (High)
- `[code]` `app/login/page.tsx:126` links to `/sso/virtual`, which does not exist. The page requests it on every load (Next.js prefetch), so it shows as a 404 in the network log.
- The federated sign-in is also disabled here (`COLLEGE_SSO_SECRET` unset; the verify endpoints correctly return 503). Copy on the most-used page promises a path that does not exist.
- **Fix:** remove the link and copy, or finish the integration before launch.

### M1 — News & Events is empty on launch (Medium)
- `[code]` `app/news-events/page.tsx:13-15` reads only `prisma.newsPost`. The four markdown articles in `content/news/` are not referenced anywhere (grep finds no reader).
- `[browser]` The public page has no items. Publishing from the admin area works once a post exists ("Publish Now" → visible on the public page), so this is a content gap.
- **Fix:** publish two or three real items before launch, or delete the unused markdown.

### M2 — "undefined students / parents" and a missing analytics KPI (Medium)
- `[browser]` `/teacher/announcements` renders *"All My Students undefined students"* and *"All Parents undefined parents"* (`app/teacher/announcements/page.tsx:182,194`).
- `[code]` `teacher.totalStudentsTaught` is read by that page and by `app/teacher/analytics/page.tsx:112`, but no API returns that field.

### M3 — Missing articles return HTTP 200 "Page not found" (Medium)
- `[browser]` `/news-events/2025-07-15-admissions-open` returns HTTP 200 with a not-found body. Search engines will index it as content.
- **Fix:** return 404 (`notFound()`) for unknown slugs.

### M4 — Forced password change ends on the portal chooser (Medium)
- `[browser]` After the Head of School sets a new password, the app lands on `/portal` (`app/change-password/page.tsx:29`, `router.replace("/portal")`), not the admin dashboard. The first-run experience needs an extra step.
- **Fix:** send the user to their role's destination, as the login route does.

### M5 — Password rules differ between paths; reset errors are generic (Medium)
- `[code]` Change password requires 12+ characters with upper case, lower case and a digit (`app/api/auth/change-password/route.ts:10`). Password reset requires 12+ characters only (`app/api/auth/password-reset/confirm/route.ts:10`).
- `[API]` Every reset failure returns *"Unable to reset password."*, including an invalid token and a short password.
- **Fix:** use one password policy everywhere, with a specific message for each failure.

### M6 — Malformed requests cause server errors and noisy logs (Medium)
- `[API]` Malformed JSON to admissions draft, submit, upload, payment and document-confirm endpoints returns 500; to CBT attempt and check, 500; to login, 503 "temporarily unavailable". Each is logged as an error (captured in the server log).
- Browsers do not send malformed bodies, so this is not user-visible. It does drown real incidents in error tracking and misreports client errors as outages.
- **Fix:** parse bodies defensively and return 400.

### M7 — Most pages share one generic title (Medium)
- `[browser]` `/about`, `/academics`, `/admissions`, `/contact` and most others use "Ykay College & Leadership Academy — Excellence in Education". Tabs, bookmarks and search results all look the same.
- **Fix:** add per-page `metadata.title` and description.

### M8 — Domain and brand inconsistencies (Medium)
- `[code]` The site fallback is `https://ykaycollege.edu.ng` (`app/layout.tsx`, and about 20 files), while `.env.example`, emails and the sign-in copy use `ykaycollege.com`. Confirm the production domain: it drives canonical URLs, sitemap, OpenGraph, CORS and redirects.
- `[browser]` The logo artwork on the splash screen reads **"TRAINING COLLEGE & LEADERSHIP ACADEMY"**, while the official name in the onboarding form and the site is "Ykay College & Leadership Academy". Confirm with the brand owner.

### M9 — The application fee is not stated before a family starts (Medium)
- `[browser]` No ₦ or NGN amount appears on `/admissions` (text search). Families cannot plan before entering personal details.
- **Fix:** show the fee and what it covers on the landing page.

### M10 — The question bank shows no search or filter (Medium)
- `[browser]` `/teacher/question-bank` rendered no input or select controls, for a bank of 5,483 questions.
- Verify with a teacher on real subjects before treating this as final.

### M11 — Staff activation depends on copying a one-time link (Medium)
- `[code]` `app/admin/staff/page.tsx:290`: *"The activation token is displayed once and expires after seven days."* Tokens are stored as hashes (`StaffInvite.tokenHash`).
- With no email provider configured, the administrator must copy the link at the moment of creation. The end-to-end activation was not run here.
- **Fix:** keep the copy button, add a "resend link" action, and state clearly what to do if the email does not arrive.

### M12 — The app download depends on configuration (Medium)
- `[API]` `/download/apk` answers `302 → /download?error=unavailable` while `NEXT_PUBLIC_APK_URL` is unset in this build. I did not confirm how the `/download` page presents that error, because my check selected the wrong link.
- `[code]` `app/download/apk/route.ts` builds that redirect from `NEXT_PUBLIC_SITE_URL`, which falls back to `localhost:3000`. In this build the redirect pointed at localhost. A misconfigured site URL sends parents to localhost.
- **Fix:** set the APK URL and the public site URL before launch, and test the download from a phone.

### M13 — Parent timetable is missing from the web portal (Medium)
- `[code]` `app/api/parent/timetable/route.ts` exists and the mobile app has a parent timetable, but there is no `app/parent/timetable` page and no link to one.
- **Fix:** add the page, or document the gap for parents.

---

## 5. Low-severity items

### 5.1 Broken or missing assets
- **L1** Hero background `/home/green-ribs.jpg` returns 404 (`components/Hero.tsx:17`). Decorative, but it is a request on every home visit.
- **L2** `/favicon.ico` returns 404 (the layout uses `/ykay-logo.png`). Browsers request it by default.

### 5.2 Duplicate or dead surfaces
- **L3** `/admissions/status` and `/application-status` are duplicate pages.
- **L4** Admin can open teacher pages that error, because the admin has no teacher profile (middleware allows it; the same rule covers Director, which I did not crawl).
- **L5** `components/cbt/CbtRunner.tsx` is unused; `/cbt` only redirects.

### 5.3 Policy questions and smaller UX gaps
- **L6** A student's profile is read-only (photo only). Phone and email corrections go through the school administrator. Confirm this is intended.
- **L7** School-student sessions can read and update the IT profile (own record only; no cross-user access seen). Confirm this is intended.
- **L8** IT course pages do not state the cost, while the public track page says "Start free".
- **L9** An unknown admissions application ID returns *"Enter a valid Application ID."* (422). That is misleading for a well-formed ID that does not exist.
- **L10** A student login with no linked profile shows an empty dashboard (dashboard API returns 404; the page shows empty tiles). The API's own message is "No student profile is linked to this account. Contact the school administrator." I did not confirm whether the page displays that message. This came from UAT seed collisions; check every student login at go-live.

---

## 6. Launch prerequisites (configuration)

These are not code defects. The server reports them at boot, and each one disables a feature that families will need. Treat them as launch items.

| Setting | Current state here | Consequence until fixed |
|---|---|---|
| `RESEND_API_KEY`, `EMAIL_FROM` | unset | Password reset, staff invitations and parent emails will not send. The reset page still says "you will receive a reset link shortly". |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | unset | Limits are per instance. With multiple instances, security limiters fail closed (503) unless `ALLOW_MEMORY_RATE_LIMITS` is set deliberately. |
| `S3_BUCKET` (+ fix B3) | unset | Admissions uploads fail. |
| `MALWARE_SCANNER_URL` | unset | Uploads are recorded as `SKIPPED`. Acceptable for testing, not for real parent documents. |
| `JOBS_SECRET` or `CRON_SECRET` | unset | The notification dispatcher cannot authenticate, so alerts will not go out. |
| `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` | test keys | Live keys required; the server warns about test keys in production. |
| `NEXT_PUBLIC_SITE_URL` | localhost in this run | Drives links, CORS and the download redirect (M12). |
| `NEXT_PUBLIC_APK_URL`, `ANDROID_CERT_SHA256` | unset | Download unavailable; app links not verified. |
| `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_DSN` | unset | Errors not reported (and H6 once set). |
| `COLLEGE_SSO_SECRET` | unset | YK-Virtual federated sign-in disabled (H8). |

**Data:** never load the demo seed (`prisma/seed-all.ts`, one shared password) into the production database. Run only the college onboarding seed, and verify with the go-live checklist that no demo or fixture accounts exist.

---

## 7. Facts to confirm with the school before printing anything

1. Full postal address, LGA and state (B7).
2. Production domain: `ykaycollege.com` or `ykaycollege.edu.ng` (M8).
3. The logo's wording and the school's motto (M8, and the seed's "Raising Role Models" versus the env example's "Excellence in Education").
4. The application fee and what it covers (M9).
5. Which IT courses are free, and the policy for paid certification (L8).
6. Whether the public CBT bank is shared with school exams (H7).
7. Whether school students may use the IT portal (L7).

---

## 8. What works (verified)

- **Public site:** 47 of 47 anonymous pages load; no horizontal overflow and no unlabelled icon buttons on the 47 mobile pages. All internal links resolve except `/sso/virtual`.
- **Access control:** protected pages redirect to sign-in; anonymous API calls to protected data return 401; the webhook rejects bad signatures; the internal security-event endpoint is forbidden to outsiders; platform self-signup is disabled. With one wrong-role probe per area, no wrong-role access to admin, teacher, student or parent records was found across the 202 handlers (the IT endpoints are covered in L7).
- **Sessions:** cookies are `httpOnly`, `secure` in production and `sameSite=lax`. Sign-out bumps the account's token version (`app/api/auth/logout/route.ts`), so every session for that account stops working; an admin token issued earlier returned 401 after the sign-in journey signed out. This is a design choice to confirm: signing out on a shared lab computer also signs the account out on every other device.
- **First sign-in:** the forced password change works; the complexity message is specific; a wrong current password is reported clearly.
- **Lockout:** three failures on one account lock it (429) as designed.
- **Impersonation:** read-only. Writes are refused with 403 *"Writes are not permitted while impersonating…"*; reads succeed; ending impersonation restores the super admin's session.
- **Database:** all 29 migrations apply cleanly on an empty PostgreSQL 16 database.
- **Build:** the production build (including type checks) succeeds.
- **Admissions validation:** the step-1 messages are specific ("First name is required", "Enter a valid date of birth").
- **Teacher:** class attendance submits and locks the session; report-card statuses are visible; all 22 sidebar links resolve.
- **Student:** released report card with PDF and print; full weekly timetable; attendance; the fee lock is enforced server-side.
- **Parent:** child list and invoices show; report-card download is present; messaging is reachable.
- **Admin:** student search works; report cards show RELEASED and DRAFT; news publishing works end to end.
- **Headers:** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, and a restrictive `Permissions-Policy` (camera allowed only on the admin QR scanner route).

---

## 9. Not verified in this audit

- Live Paystack payments, webhooks, reconciliation, and bursar approval of bank-transfer claims.
- Email delivery (no provider configured); object-storage uploads and malware scanning end to end.
- The native Android/iOS app (Expo), offline sync and push notifications.
- Staff activation end to end, and parent-to-teacher message delivery.
- Exam-day load (for example 60 concurrent starts at the deadline), backups and restore, alerting, DNS and TLS on the real domain.
- Real devices, real networks and other browsers (headless Chromium only). Assistive technology was not tested; contrast and labels were checked programmatically.
- Tenant isolation. `docs/TENANCY_RLS_STATUS.md` documents that row-level security is fail-open and that application-level filtering is the only control. This is not a blocker for one school, but it must be fixed before EDUos onboards a second school.

---

## 10. Test artifacts and how to reproduce

**Sandbox database changes** (these affect only the audit database, never production; delete before reusing it):
- A published exam "Audit test: First Term CA1" for SS2A, inserted directly into the database, to test the fee lock.
- News posts titled "Launch audit …" created through the admin screen (one published, one draft).
- One staff invitation for a test teacher, and one submitted attendance session for SS2A.
- The head of school's password was changed during the sign-in test.
- Audit log entries for impersonation and sign-in attempts.

**Reproduction kit** (outside the repository, in the workspace): `/home/user/audit/sim/` holds the crawler, the API matrix, the journeys and the verification scripts; `/home/user/audit/results/` holds the raw JSON; `/home/user/audit/shots/` holds the screenshots. The sandbox-only Prisma harness is in `/home/user/audit/harness/`. Nothing from these folders is part of the product, and no credentials are stored in the repository.

**Suggested order of work before launch:** B4 and B5 (under an hour each), then B2, B6 (generate QR codes locally), B7 (confirm the address), B1 (IT enrolment), B3 (CSP for storage), H1 and H2 (limiter keys and shared-IP budgets), then H3–H6 (fee lock, invoice titles, payment messages, Sentry). Re-run the journeys after each group.
