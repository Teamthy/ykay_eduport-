# RCCG The Envoys — Recreated Website

A production-quality recreation of the RCCG The Envoys church website, built with Next.js 15, React 19, TypeScript, Tailwind CSS, and Framer Motion.

## Features

- **Loading Screen** — Animated rotating ring text and "The Sent Ones" reveal
- **Sticky Header** — White backdrop blur header with navigation and mobile menu
- **Hero Section** — Full-viewport dark hero with large typography, service times, and call-to-action
- **Service Info** — Floating info card with worship times and location
- **Mercy Convention Banner** — Gradient event banner with decorative glow effects
- **About Section** — Mission statement, pastor images, and quote block
- **Services Cards** — Interactive cards for Upgrade Service, Wisdom & Power, Churches, Giving, and Membership
- **Churches Grid** — 12 church locations with hover animations
- **Natural Groups** — Fellowship group cards with images and descriptions
- **Find Us** — Embedded Google Map and location info
- **Latest Sermon** — Video card with play button and sermon details
- **Footer** — Navigation links, back-to-top button, and copyright

## Subpages

- `/contact` — Contact form and reach details
- `/sermons` — Sermon archive
- `/giving` — Giving form
- `/wraps` — Wraps overview
- `/churches/[church]` — Individual church pages
- `/groups/[group]` — Individual group pages

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Fonts**: Anton (display), DM Sans (body) via `next/font`

## Installation

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view.

## Deployment

```bash
npm run build
npm start
```

Optimized for production with server components where appropriate.
