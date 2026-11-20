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
- **Admin CRUD** — create, edit, archive, and delete or restore destinations at `/admin/destinations`
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
| `/api/admin/destinations/[id]` | GET/PUT/DELETE/PATCH | Read, update, move to Trash, or restore a destination; use `DELETE ?archive=true` to archive |

## QR flow

- Seed creates a `travelogue` QR code.
- Generate SVG: `npm run generate-qr`
- Scan URL: `https://your-site.com/r/travelogue`

## Admin

- Login at `/admin/login`
- For production: create a user in Supabase Auth and use those credentials
- Fallback: set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`
- Only the verified Supabase Auth account `dot.admin@dotadmin.ph` can delete or recover sub-admin accounts created in Admin accounts. Delete disables admin access and retains the account indefinitely for recovery; it does not permanently erase the account. Supabase Auth bans sign-in for 100 years, and the retained disabled flag continues to block application admin access until recovery. Existing sessions are rejected by the application's admin authorization checks.
- Dashboard start and end dates filter analytics automatically, inclusive of both UTC dates; blank dates leave that side of the range open. The chart selector switches between recorded QR openings and tracked page views (including repeat visits and admin pages). The page-view total covers all tracked pages, while its breakdown covers destination pages only; a destination filter limits page views to that destination. QR scans are grouped by their QR code's linked destination, with main and unassigned QR scans grouped separately. Ranges longer than 31 days are grouped into intervals, and the breakdown chart uses the same colors as the engagement donut.
- Activity loads the 50 most recent scans and audit records separately from the dashboard's full analytics.
- Admin image and video uploads use Supabase Storage. Create a public bucket named `travelogue-media` in Supabase, or set `SUPABASE_STORAGE_BUCKET` to another public bucket. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in Render.
- In the destination editor, click the map or enter latitude and longitude to set a precise pin. Save the destination to publish it. If no pin is chosen, coordinates are looked up automatically when possible. Existing Supabase projects need `db/migration_v9.sql` for the coordinate columns.
- Apply `db/migration_v10.sql` in the Supabase SQL editor to enable destination Trash and its `pg_cron` cleanup job. Deleted destinations can be restored to their previous published status for 30 days; after that, the scheduled job permanently deletes the destination within approximately one minute. Check the Supabase Cron job history for cleanup failures. Feedback, uploaded media, and scan history are not deleted by this job; existing QR foreign keys follow the database's `ON DELETE` behavior.

## CI / Deployment

- GitHub Actions workflow at `.github/workflows/ci.yml`
- Deploy with environment variables from `.env.local`
