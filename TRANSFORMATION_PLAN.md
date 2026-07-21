# Ykay College & Leadership Academy — Transformation Plan

## Design System Preserved
- Dark theme: `#0D0D0D` background, `#FFFFFF` text
- Accent: crimson `#C2185B`, deep purple `#7B1FA2`
- Fonts: Anton (display), DM Sans (body)
- Cards: `rounded-[2rem]`, `bg-card-bg`, `border-white/5`
- Layout: `max-w-7xl`, responsive grids
- Animations: Framer Motion fade-in, loading ring, hover scale
- Header: sticky white backdrop-blur, mobile hamburger
- Footer: dark with navigation links

## Pages & Components Mapping

| Church (Current) | School (Target) | Action |
|---|---|---|
| Home (`/`) | Home (`/`) | Rewrite hero, service info, banners |
| `/contact` | `/contact` | Update with school info |
| `/sermons` | `/news-events` | Replace with news & events |
| `/giving` | `/admissions` | Replace with admissions |
| `/wraps` | `/gallery` | Replace with gallery |
| `/#about` | `/about` | Rewrite with school story |
| Services cards | Academics / Campus Life cards | Rename & replace content |
| Churches grid | Departments / Campuses (optional) | Replace or keep for campus info |
| Groups cards | Clubs & Societies / Campus Life | Replace with school groups |
| Sermons card | Featured News / Latest Event | Replace content |
| Find Us + Map | Find Us (same) | Update address, phone, email |
| Footer links | School footer links | Update links & branding |

## New Page: Portal Login (`/portal`)
- 4 cards: Admin Portal, Teacher Portal, Student Portal, Parent Portal
- Each card links to the appropriate portal URL
- Keeps the same card styling as Services/Gallery

## Branding Changes (All Pages)
- Title: "Ykay College & Leadership Academy — Excellence in Education"
- Logo text: "YKAY COLLEGE" (replaces "THE ENVOYS")
- Navigation: Home | About | Academics | Admissions | Campus Life | Gallery | News & Events | Contact | Portal Login
- Footer: Address: Km 38, Lagos-Abeokuta Expressway, No 1 Iwalewa street, Opposite Matrix filling Station, beside Alishiba Junction, Sango Ota. Phone: 0701 537 4411. Email: info@ykaycollege.com. Site: ykaycollege.com
- Loading screen text: "YKAY COLLEGE" (replaces "RCCG THE ENVOYS")
- All church text/images/icons replaced with school equivalents

## Sections to Modify

### Hero (`components/Hero.tsx`)
- Title: "Ykay College & Leadership Academy"
- Subtitle: "Excellence in Education · JSS1 to SS3 · Sango Ota, Ogun State"
- Service info: Day secondary school hours
- CTA: "Apply for Admission" and "Visit Our Campus"

### ServiceInfo (`components/ServiceInfo.tsx`)
- Update to show school hours: Monday–Friday 7:30 AM – 2:30 PM
- Address: Sango Ota location

### MercyConvention (`components/MercyConvention.tsx`)
- Replace with "Admissions Open" banner: 2025/2026 Session — Apply Now
- Purple/crimson gradient maintained

### About (`components/About.tsx`)
- School history, vision, mission, values
- Director's message
- Staff photo section
- Quote block: education-focused

### Services (`components/Services.tsx`)
- Rename cards to: Academics, Admissions, Campus Life, Portal Access, Student Wellbeing
- Keep 5-card grid layout

### Churches (`components/Churches.tsx`)
- Replace with Campus/Departments info or keep as Departments
- Update links to `/campus`

### Groups (`components/Groups.tsx`)
- Replace with Clubs & Societies: Science Club, Debate Society, Sports Club, Music & Arts, Leadership Council

### FindUs (`components/FindUs.tsx`)
- Update address, phone, email
- Keep Google Map embed
- Replace sermon card with Featured News card

### Footer (`components/Footer.tsx`)
- Update branding, links, copyright to Ykay College

### Subpages
- `/contact`: Update form and reach info
- `/admissions` (new, replaces giving): Admission form, requirements, fee info
- `/news-events` (new, replaces sermons): News articles and event listings
- `/gallery` (new, replaces wraps): Photo/video gallery
- `/about` (new page or redirect to section)
- `/portal` (new): 4 portal entry cards

## Implementation Sequence
1. Layout metadata + design tokens
2. Header + Footer branding
3. LoadingScreen branding
4. Hero rewrite
5. ServiceInfo update
6. Banner update
7. About rewrite
8. Services/Academics cards
9. Churches → Campus info
10. Groups → Clubs
11. FindUs + Sermon → FindUs + News
12. Gallery, News, Admissions, Portal pages
13. Subpage updates (contact, about, admissions, news, gallery, portal)
14. Final polish: images, icons, accessibility, responsive check

## Files to Read Before Modifying
- `/home/user/envoys-site/app/globals.css` (design tokens)
- `/home/user/envoys-site/app/layout.tsx` (fonts, metadata)
- `/home/user/envoys-site/components/Header.tsx` (nav structure)
- `/home/user/envoys-site/components/Hero.tsx` (hero layout)
- `/home/user/envoys-site/components/About.tsx` (about layout)
- `/home/user/envoys-site/components/Services.tsx` (card grid layout)
- `/home/user/envoys-site/components/FindUs.tsx` (map + sermon card layout)
