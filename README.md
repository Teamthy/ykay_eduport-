# Ykay College EduPortal

A full-stack digital education platform for Ykay College & Leadership Academy — combining a polished public website, role-based school portals, IT education, and CBT exam preparation.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4, Framer Motion
- **Database:** PostgreSQL + Prisma ORM
- **Auth:** JWT (jose), bcrypt, HTTP-only cookies
- **Payments:** Paystack
- **Email:** Resend
- **Storage:** S3-compatible (AWS S3 / Cloudflare R2)
- **Rate Limiting:** Upstash Redis

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Generate Prisma client and run migrations
npx prisma generate
npx prisma migrate dev

# Seed initial admin account
npm run db:seed-admin

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
app/
  api/            # API routes (71 endpoints)
  admin/          # Admin portal pages
  teacher/        # Teacher portal pages
  student/        # Student portal pages
  parent/         # Parent portal pages
  it-education/   # Public IT education pages
  it-portal/      # IT student portal
  admissions/     # Public admissions flow
  login/          # Authentication pages
components/       # Shared UI components
lib/              # Business logic and services
prisma/           # Database schema and migrations
public/           # Static assets
scripts/          # Utility scripts
docs/             # Project documentation
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run db:seed-admin` | Create initial admin account |
| `npm run db:seed-it-courses` | Seed IT course catalog |
| `npm run test:e2e` | Run E2E smoke tests |

## Documentation

- [Deployment Guide](docs/deployment.md)
- [Backend Development](docs/backend-development-document.md)
- [Frontend Development](docs/frontend-development-document.md)
- [IT Education Strategy](docs/it-education-strategy.md)
- [Implementation Backlog](docs/prioritized-implementation-backlog.md)
- [User Flows](docs/userflow.md)

## Portals

| Portal | URL | Roles |
|--------|-----|-------|
| Admin | `/admin` | Admin, Director, Coordinator, Bursar |
| Teacher | `/teacher/dashboard` | Teacher, HOD |
| Student | `/student/dashboard` | Student |
| Parent | `/parent/dashboard` | Parent |
| IT Portal | `/it-portal/dashboard` | IT Student |
| Super Admin | `/super-admin` | Super Admin |

## License

Proprietary — Ykay College & Leadership Academy
