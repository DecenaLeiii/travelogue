# Philippines Travelogue

Stack: Next.js (TypeScript) frontend, Supabase (Postgres) backend.

## Quick start

1. Copy `.env.example` to `.env.local` and set your Supabase project values plus admin credentials.

2. Install dependencies:

```bash
npm install
```

3. Apply database schema in Supabase SQL editor:
   - `db/schema.sql` (fresh install)
   - `db/migration_v2.sql` (existing projects — adds columns, audit logs, RLS)

4. Seed destinations and QR code:

```bash
npm run seed
```

5. Run dev server:

```bash
npm run dev
```

## Features

- **Public travelogue** — 18+ Philippines destinations with rich content (overview, highlights, tips, gallery, related destinations)
- **QR access flow** — `/r/[code]` logs scans and redirects; invalid codes show `/qr-invalid`
- **Engagement tracking** — page views, time on page, scroll depth, clicks (linked to scan sessions)
- **Admin dashboard** — analytics with date/destination filters, activity log, CSV export
- **Admin CRUD** — create, edit, archive destinations at `/admin/destinations`
- **Auth** — Supabase Auth (preferred) or env-based admin fallback

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/qr/scan` | POST | Record QR scan, return session |
| `/api/engagement/event` | POST | Record engagement event |
| `/api/destinations` | GET | List published destinations |
| `/api/destinations/[slug]` | GET | Single destination |
| `/api/admin/login` | POST | Admin login |
| `/api/admin/analytics` | GET | Analytics dashboard data |
| `/api/admin/destinations` | GET/POST | List/create destinations |
| `/api/admin/destinations/[id]` | GET/PUT/DELETE | Read/update/archive destination |

## QR flow

- Seed creates a `travelogue` QR code.
- Generate SVG: `npm run generate-qr`
- Scan URL: `https://your-site.com/r/travelogue`

## Admin

- Login at `/admin/login`
- For production: create a user in Supabase Auth and use those credentials
- Fallback: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`

## CI / Deployment

- GitHub Actions workflow at `.github/workflows/ci.yml`
- Deploy to Vercel with environment variables from `.env.local`
