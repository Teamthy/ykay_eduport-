# Ykay College — Church-to-School Transformation Reference

This document maps every file, component, section, and design element from the original church website (`rccgtheenvoys.org`) to the new premium school website (`Ykay College & Leadership Academy`).

---

## 1. Foundation / Design System

| Element | Church Original | School Replacement | Status |
|---|---|---|---|
| Brand font (display) | Anton (same) | Anton (same) | ✅ Preserved |
| Brand font (body) | DM Sans (same) | DM Sans (same) | ✅ Preserved |
| Background | `#0D0D0D` | `#0D0D0D` | ✅ Preserved |
| Foreground | `#FFFFFF` | `#FFFFFF` | ✅ Preserved |
| Accent crimson | `#C2185B` | `#C2185B` | ✅ Preserved |
| Accent purple | `#7B1FA2` | `#7B1FA2` | ✅ Preserved |
| Card background | `rgba(255,255,255,0.03)` | `rgba(255,255,255,0.03)` | ✅ Preserved |
| Subtle border | `rgba(255,255,255,0.1)` | `rgba(255,255,255,0.1)` | ✅ Preserved |
| Loading animation | Rotating ring text | Rotating ring text (text changed) | ✅ Updated |
| Scrollbar style | Dark custom | Dark custom | ✅ Preserved |
| Tailwind config | v4 syntax | v4 syntax | ✅ Preserved |
| PostCSS config | Missing (caused build issue) | `postcss.config.mjs` added | ✅ Fixed |
| TypeScript | `5.9.3` (conflict) | `4.9.5` (compatible) | ✅ Fixed |
| Module resolution | `bundler` (TS4.9 unsupported) | `node16` | ✅ Fixed |
| Next.js version | `15.0.0` | `15.0.0` | ✅ Preserved |

---

## 2. Global / Layout Files

### `app/layout.tsx`
- **Title**: `RCCG The Envoys — We Are Sent To Nations` → `Ykay College & Leadership Academy — Excellence in Education`
- **Description**: Church mission → School mission (Sango Ota, JSS1–SS3, NERDC)
- **Keywords**: Church keywords → Education keywords (secondary school, Ogun State, admissions, WAEC, BECE)
- **OpenGraph**: `rccgtheenvoys.org` → `ykaycollege.com`
- **Image**: `/images/RCCG.png` → `/images/ykay-college-hero.jpg`
- **Fonts**: Same import (`Anton` + `DM Sans`)

### `app/globals.css`
- **No changes** to design tokens — preserved exactly
- Body styles (`bg-background`, `text-foreground`, `font-family`) unchanged
- Selection color (`rgba(194, 24, 91, 0.3)`) unchanged

---

## 3. Header Component (`components/Header.tsx`)

### Before (Church)
- Logo text: `THE ENVOYS`
- Navigation links: Home, About, Sermons, Giving, Churches, Wraps, Contact Us
- CTA button: `Become A Member`
- Mobile menu links: Same church links

### After (School)
- Logo text: `YKAY COLLEGE`
- Navigation links: Home, About, Academics, Admissions, Campus Life, Gallery, News, Contact, Portal
- CTA button: `Apply Now` → links to `/admissions`
- Mobile menu links: Same school links
- Tracking: `font-display text-2xl tracking-[3px]` adjusted for new branding

---

## 4. Footer Component (`components/Footer.tsx`)

### Before (Church)
- Brand: `RCCG THE ENVOYS`
- Description: Gospel mission text
- Links: Home, About (#about), Sermons, Giving, Churches (#churches), Wraps, Contact Us
- Address line: `6A Cocoa Industries Road, Ikeja, Lagos`
- Phone: `+2349062134890`
- Email: `hello@envoys.center`
- Copyright: `© {year} RCCG THE ENVOYS`

### After (School)
- Brand: `YKAY COLLEGE` + subtitle `& LEADERSHIP ACADEMY`
- Description: School mission (Sango Ota, day school, JSS1–SS3)
- Links: Home, About, Academics, Admissions, Campus Life, Gallery, News, Contact, Portal
- Address block: `Km 38, Lagos-Abeokuta Expressway, No 1 Iwalewa Street, Opposite Matrix Filling Station, Beside Alishiba Junction, Sango Ota, Ogun State`
- Phone: `0701 537 4411`
- Email: `info@ykaycollege.com`
- Website: `ykaycollege.com`
- Hours: `Monday — Friday: 7:30 AM — 2:30 PM` + `Admissions: 9:00 AM — 4:00 PM` + `Portal Support: 24/7`
- Copyright: `© {year} YKAY COLLEGE & LEADERSHIP ACADEMY`
- Three-column footer: Location | Contact | Hours

---

## 5. Loading Screen (`components/LoadingScreen.tsx`)

### Before (Church)
- Rotating ring: `RCCG THE ENVOYS · RCCG THE ENVOYS · RCCG THE ENVOYS ·`
- Logo icon: Purple send/arrow icon
- Reveal text: `THE SENT ONES`

### After (School)
- Rotating ring: `YKAY COLLEGE · EXCELLENCE · YKAY COLLEGE · EXCELLENCE ·`
- Logo icon: Graduation cap icon (`viewBox="0 0 24 24"` with cap paths)
- Reveal text: `EDUCATION EXCELLENCE`
- Fill color: `#CE93D8` (preserved purple accent)

---

## 6. Hero Section (`components/Hero.tsx`)

### Before (Church)
- Label: `RCCG THE ENVOYS`
- Title: `WE ARE SENT TO` / `SPREAD THE GOSPEL`
- Subtitle: Church mission text
- Service info: `Every Sunday · 1:00 PM · Upgrade Service` / `3:00 PM · Wisdom & Power Service`
- CTA: `Become A Member` (links to church member portal)
- Background image: Worship/concert image (`photo-1516450360452-9312f5e86fc7`)

### After (School)
- Label: `YKAY COLLEGE & LEADERSHIP ACADEMY`
- Title: `EXCELLENCE IN` / `EDUCATION`
- Subtitle: School mission (Sango Ota, JSS1–SS3, premium education)
- Info cards: `Location: Sango Ota, Ogun State` | `Programmes: Junior & Senior Secondary` | `Session: 2024 / 2025`
- CTAs: `Apply Now` (links `/admissions`) + `Student Portal` (links `/portal`)
- Background image: Classroom/students (`photo-1522202176988-66273c2fd55f`)
- Gradient overlay: Same structure preserved

---

## 7. ServiceInfo Banner (`components/ServiceInfo.tsx`)

### Before (Church)
- Title: `Come worship with us`
- Subtitle: `Every Sunday at The Envoys Center`
- Hours: `1:00 PM · Upgrade` / `3:00 PM · Wisdom`
- Address link: `6A Cocoa Industries Road, Ikeja, Lagos`

### After (School)
- Title: `School Hours & Location`
- Subtitle: `Ykay College & Leadership Academy — Sango Ota, Ogun State`
- Hours: `Monday — Friday` / `7:30 AM — 2:30 PM`
- Address link: `Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State`
- Icon preserved (`Clock`, `MapPin`)
- Card styling preserved (rounded-3xl, backdrop blur, dark bg)

---

## 8. Banner Section (`components/AdmissionsBanner.tsx`) — NEW

Replaced the `MercyConvention` component.

- Title: `ADMISSIONS OPEN`
- Subtitle tag: `2025 / 2026 Session — Now Open`
- Details: `JSS1 — SS3` | `Day Secondary School` | `Sango Ota, Ogun State`
- CTA: `Apply Now` → `/admissions`
- Gradient: Purple (`#4A148C`) → Crimson (`#C2185B`) preserved
- Decorative blur circles preserved

---

## 9. About Section (`components/About.tsx`)

### Before (Church)
- Label: `ABOUT US`
- Title: `A COMMUNITY ORIENTED FAMILY CHURCH`
- Text: Church mission (supernatural army, prayer, faith)
- Images: Pastors (`photo-1529070538774-1843cb3265df`, `photo-1544005313-94ddf0286df2`)
- Caption: `Pastor Daniel & Dr. Nifemi Olawande` / `Senior Pastors — RCCG The Envoys`
- Quote: `"We are the heart that embraces all with love..."`
- CTA: `Become A Member`

### After (School)
- Label: `ABOUT US`
- Title: `RAISING LEADERS THROUGH EXCELLENCE IN EDUCATION`
- Text: School mission (Sango Ota, JSS1–SS3, NERDC, leadership development)
- Tags: `NERDC Aligned`, `JSS1 — SS3`, `Day School`, `Digital Learning`, `Leadership Training`, `WAEC / BECE Ready`
- Images: Modern classroom (`photo-1497633762265-9d179a990aa6`) + Students (`photo-1503676260728-1c00da094a0b`)
- Caption: `Dr. Adeyemi Ogunlade` / `Director & Proprietor — Ykay College` / Quote: Education-focused
- Stats cards: Year Founded, Students Enrolled, WAEC Pass Rate, Programmes Offered
- Vision / Mission / Values cards: 3-column grid preserved

---

## 10. Services / Card Grid (`components/Services.tsx`)

### Before (Church)
- Section label: `OUR SERVICES`
- Title: `WHAT WE DO`
- 5 cards: Upgrade Service, Wisdom & Power, Envoys' Families, Giving, Become A Member

### After (School)
- Section label: `PROGRAMMES & SERVICES`
- Title: `WHAT WE OFFER`
- 5 cards: Academics (`/academics`), Admissions (`/admissions`), Campus Life (`/campus-life`), Portal Access (`/portal`), Student Wellbeing (`/contact`)
- Card structure preserved (title, subtitle, description, Learn More arrow, hover glow)
- Link in header: `Get In Touch` → `/contact`

---

## 11. Churches / Department Grid (`components/Churches.tsx` → renamed conceptually)

### Before (Church)
- Label: `ENVOYS' CHURCHES`
- Title: `A FAMILY ACROSS THE WORLD`
- 12 cards: Church branches across Lagos, Ogun, South Africa, USA, Virtual

### After (School) — Component file same, content changed
- Label: `DEPARTMENTS & PROGRAMMES`
- Title: `A COMPLETE EDUCATIONAL ECOSYSTEM`
- 9 cards: JSS (JSS1–JSS3), SS Science, SS Arts, SS Commercial, STEM & Digital Learning, Sports & PE, Library & E-Resources, Science Labs, Leadership & Character
- All links point to `/academics` or `/campus-life`
- ArrowUpRight icon preserved
- Grid layout preserved (`sm:grid-cols-2 lg:grid-cols-3`)

---

## 12. Groups / Clubs (`components/Groups.tsx`)

### Before (Church)
- Label: `NATURAL GROUPS`
- Title: `FELLOWSHIP GROUPS`
- 5 group cards with images: Solid Rock, Royal Diadem, Envoys Nest Hub, Mega Stars, The Haven

### After (School)
- Label: `CLUBS & SOCIETIES`
- Title: `CAMPUS LIFE`
- 5 club cards with images: Science & Technology Club, Debate & Public Speaking, Sports & Athletics, Music & Creative Arts, Leadership Council
- Subtitles: STEM Leadership, Communication, Physical Excellence, Arts & Expression, Student Governance
- Images updated to education/students/workshop photos (`photo-1509062522246-3755977927d7`, etc.)
- All links point to `/campus-life`
- Card layout preserved (image left, content right, hover translate)

---

## 13. Find Us & Sermon (`components/FindUs.tsx` → `FindUsAndNews` concept)

### Before (Church)
- Find Us: `RCCG THE ENVOYS`, address `6A Cocoa Industries`, map embed
- Sermon card: `LATEST SERMON` / `LIVING IN THE NEW` / `Watch Now` (YouTube link)
- Sermon image: `photo-1504052434569-70ad5836ab65`

### After (School)
- Find Us: `YKAY COLLEGE`, address `Km 38, Lagos-Abeokuta Expressway, Sango Ota`, updated map embed, updated contact card info
- Featured News: `LATEST FROM THE SCHOOL` / `Ykay College Opens 2025 / 2026 Admissions` / `Read More` (`/news-events`)
- News image: `photo-1524178232363-1fb2b075b655` (students/collaboration)
- Play icon preserved on video-style thumbnail
- Address card preserved with new school info
- Link: `View All News` → `/news-events`

---

## 14. Contact Page (`app/contact/page.tsx`)

### Before (Church)
- Email: `hello@envoys.center`
- Phone: `+2349062134890`
- WhatsApp: `+2349062134890`
- Address: `6a cocoa industries road, ikeja, lagos`
- Form labels: generic

### After (School)
- Email: `info@ykaycollege.com`
- Phone: `0701 537 4411`
- WhatsApp: `0701 537 4411`
- Address: `Km 38, Lagos-Abeokuta Expressway, Sango Ota, Ogun State`
- Header branding preserved (`GET IN TOUCH` / `CONTACT US`)
- Form fields preserved (First/Last Name, Email, Phone, Message)
- Reach Us cards preserved (Mail, Phone, WhatsApp, Address icons)
- Client directive: `"use client"` preserved (form interaction)

---

## 15. Subpages — Old (Still Exist, Unlinked from Header)

These pages remain in the file tree but are no longer linked from the main navigation. They can be removed or redirected later.

| Old Path | Content | Status |
|---|---|---|
| `/sermons` | Sermon archive | Unlinked |
| `/giving` | Giving/donation form | Unlinked |
| `/wraps` | Wraps overview | Unlinked |
| `/churches/[church]` | Church branch detail | Unlinked |
| `/groups/[group]` | Group/fellowship detail | Unlinked |

---

## 16. New Pages Created

| Path | Purpose | Design Pattern Used |
|---|---|---|
| `/about` | School story, vision, mission, stats | Two-column grid + quote banner (same as original About) |
| `/academics` | Programmes (JSS/SS tracks, curriculum) | Card grid + feature banner |
| `/admissions` | Admission process + requirements | Two-column (steps + info card) |
| `/campus-life` | Clubs, facilities, sports | Card grid + full-width photo banner |
| `/gallery` | Photo gallery grid | 3-column image grid with hover overlay |
| `/news-events` | School news list | Card list with category tags |
| `/contact` | Updated with school info | Original form preserved |
| `/portal` | 4 portal entry cards | Card grid with gradient hover effects |

---

## 17. Component Reuse Summary

Every reusable component was preserved. Only text, links, and branding were changed:

| Component | Reused? | What Changed |
|---|---|---|
| `Header` | ✅ Yes | Logo, nav links, CTA |
| `Footer` | ✅ Yes | Brand, links, address, hours |
| `Hero` | ✅ Yes | Title, subtitle, info cards, CTAs, background image |
| `ServiceInfo` | ✅ Yes | Title, subtitle, hours, address |
| `About` | ✅ Yes | All text, images, quote, stats |
| `Services` | ✅ Yes | Card titles, descriptions, links |
| `Churches` → `Departments` concept | ✅ Yes | Card content, links, labels |
| `Groups` → `Clubs` | ✅ Yes | Card titles, images, descriptions |
| `FindUs` + `Sermons` | ✅ Yes | Find Us info + Featured News card |
| `LoadingScreen` | ✅ Yes | Ring text, reveal text, icon |
| `Footer` links structure | ✅ Yes | All link labels updated |

---

## 18. Design System Integrity Check

- ✅ Typography hierarchy preserved (`font-display` for headings, `font-body` for body)
- ✅ Tracking and letter-spacing preserved (`tracking-[4px]` on display, `tracking-[0.15em]` on uppercase labels)
- ✅ Color tokens unchanged (no redesign required)
- ✅ Card styling identical (`rounded-[2rem]`, `bg-card-bg`, `border-white/5`)
- ✅ Animation timing preserved (0.5s–0.8s durations, ease-in-out easing)
- ✅ Responsive breakpoints preserved (`md:`, `lg:` prefixes same)
- ✅ Sticky header preserved with scroll state (`scrolled` boolean + transition)
- ✅ Mobile hamburger menu preserved with `AnimatePresence`
- ✅ Hover effects preserved (`hover:-translate-y-1`, `hover:scale-105`, `group-hover:text-white/90`)
- ✅ Gradient banner preserved (`from-[#4A148C] via-[#7B1FA2] to-[#C2185B]`)

---

## 19. Image Assets

| Component | Old Source | New Source | Theme |
|---|---|---|---|
| Hero background | Worship/concert (`photo-1516450360452-9312f5e86fc7`) | Modern classroom (`photo-1522202176988-66273c2fd55f`) | Education |
| About — image 1 | Pastor (`photo-1529070538774-1843cb3265df`) | Modern study (`photo-1497633762265-9d179a990aa6`) | Education |
| About — image 2 | Pastor (`photo-1544005313-94ddf0286df2`) | Student collaboration (`photo-1503676260728-1c00da094a0b`) | Education |
| Services cards — no image | N/A | N/A (text-only cards) | N/A |
| Churches → Departments — no image (icon only) | N/A | N/A | N/A |
| Groups → Clubs — image 1 | Brotherhood (`photo-1522202176988-66273c2fd55f`) | STEM club (`photo-1509062522246-3755977927d7`) | Education |
| Groups → Clubs — image 2 | Sisterhood (`photo-1517457373958-b7bdd4587205`) | Debate (`photo-1516321318423-f06f85e504b3`) | Education |
| Groups → Clubs — image 3 | Teens (`photo-1529156069898-49953e39b3ac`) | Sports (`photo-1517649763962-0c623066013b`) | Education |
| Groups → Clubs — image 4 | Children (`photo-1503676260728-1c00da094a0b`) | Arts (`photo-1511671782779-c97d3d27a1d4`) | Education |
| Groups → Clubs — image 5 | Marriage (`photo-1516589178581-6cd7833ae3b2`) | Leadership (`photo-1524178232363-1fb2b075b655`) | Education |
| Find Us — map | Ikeja, Lagos | Sango Ota, Ogun State | School location |
| Find Us — news image | Sermon (`photo-1504052434569-70ad5836ab65`) | School event (`photo-1524178232363-1fb2b075b655`) | Education |

---

## 20. Final Checklist (Per Page)

### ✅ Layout (`layout.tsx`)
- [x] Title, description, keywords, OG, Twitter updated
- [x] Font variables preserved

### ✅ Header (`components/Header.tsx`)
- [x] Brand: `YKAY COLLEGE`
- [x] Nav links: 9 items (Home → Portal)
- [x] CTA: `Apply Now`
- [x] Mobile menu links updated
- [x] Scroll state preserved

### ✅ Footer (`components/Footer.tsx`)
- [x] School branding
- [x] Address block (Sango Ota)
- [x] Contact (phone, email, WhatsApp, map)
- [x] Hours (school + admissions + portal)
- [x] Navigation links (9 items)
- [x] Back to top preserved

### ✅ Loading Screen (`components/LoadingScreen.tsx`)
- [x] Ring text: `YKAY COLLEGE · EXCELLENCE`
- [x] Icon: Graduation cap
- [x] Reveal: `EDUCATION EXCELLENCE`
- [x] Animation timing preserved

### ✅ Hero (`components/Hero.tsx`)
- [x] School branding
- [x] Background image: education
- [x] Info cards: location, programmes, session
- [x] Two CTAs: Apply Now + Student Portal

### ✅ ServiceInfo (`components/ServiceInfo.tsx`)
- [x] Title: School Hours & Location
- [x] Hours: Monday — Friday 7:30 AM — 2:30 PM
- [x] Address: Sango Ota

### ✅ Admissions Banner (`components/AdmissionsBanner.tsx`)
- [x] Title: ADMISSIONS OPEN
- [x] Subtitle: 2025 / 2026 Session
- [x] Details: JSS1 — SS3 / Day School / Sango Ota
- [x] CTA: Apply Now → `/admissions`
- [x] Gradient preserved

### ✅ About (`components/About.tsx`)
- [x] School mission, vision, values
- [x] Director quote
- [x] Stats cards
- [x] Education-appropriate images
- [x] Tags: NERDC, JSS, SS, Day School, Digital Learning, WAEC

### ✅ Services (`components/Services.tsx`)
- [x] 5 cards: Academics, Admissions, Campus Life, Portal Access, Student Wellbeing
- [x] Links point to `/academics`, `/admissions`, `/campus-life`, `/portal`, `/contact`
- [x] Card design preserved

### ✅ Departments (`components/Churches.tsx`)
- [x] 9 department/programme cards
- [x] Links to `/academics` or `/campus-life`
- [x] Grid layout preserved

### ✅ Clubs (`components/Groups.tsx`)
- [x] 5 clubs: STEM, Debate, Sports, Arts, Leadership
- [x] Education images
- [x] Links to `/campus-life`

### ✅ FindUs (`components/FindUs.tsx`)
- [x] School branding
- [x] Address: Sango Ota
- [x] Featured news card (not sermon)
- [x] Map embed preserved

### ✅ New Pages Created
- [x] `/about` — School story + vision/mission + stats
- [x] `/academics` — Programmes + curriculum info
- [x] `/admissions` — Multi-step admission info + fee structure
- [x] `/campus-life` — Clubs, sports, facilities, photo banner
- [x] `/gallery` — 6-image grid
- [x] `/news-events` — 4 news articles
- [x] `/contact` — Updated info
- [x] `/portal` — 4 portal cards with descriptions

---

## 21. What Was NOT Done (Per PRD Boundaries)
- ❌ No boarding/hostel module
- ❌ No transport/bus/GPS tracking
- ❌ No canteen module
- ❌ No nursery/primary modules
- ❌ No full general ledger accounting
- ❌ No WAEC/NECO official body API integration
- ❌ No biometric attendance hardware
- ❌ No barcode/QR ID printing system
- ❌ No iOS mobile app (Android Phase 1 only mentioned)
- ❌ No SSO (Google/Microsoft)
- ❌ No QuickBooks/Sage integration
- ❌ No websocket real-time notifications
- ❌ No full document/evidence upload for audit attachments
- ❌ No multi-language (English + Yoruba)

These are explicitly out of scope per the PRD and were not added.

---

This reference document confirms every design token, component, page, branding change, and content replacement completed for the transformation from `rccgtheenvoys.org` to `Ykay College & Leadership Academy`. The site maintains the premium dark aesthetic, motion design, responsive grid, and component architecture of the original — rebuilt entirely as an educational institution website.
