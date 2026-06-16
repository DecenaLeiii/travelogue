# Philippines Travelogue

Stack: Next.js (TypeScript) frontend, Supabase (Postgres) backend.

Quick start

1. Copy `.env.example` to `.env.local` and set your Supabase project values.

2. Install dependencies:

```bash
npm install
```

3. Run dev server:

```bash
npm run dev
```

Database

- Apply `db/schema.sql` to your Supabase database (SQL editor).
- Run `db/seed_destinations.sql` to add the 20 seed destinations.

CI / Deployment

- A GitHub Actions workflow is included at `.github/workflows/ci.yml` to build the project on push.
- For deployment to Vercel, connect the GitHub repo and set the environment variables from `.env.local` in Vercel's dashboard.
- `vercel.json` is included with basic routing.

Admin

- Admin credentials are stored locally in `.env.local` (prototype). For production use Supabase Auth and RLS.


QR flow

- Create one `qr_codes` row with `code` value (for example `travelogue`).
- Generate a QR that points to `https://your-site.com/r/travelogue`.
- Scanning that QR will hit the server-side route which logs a `scan` row and redirects to the public site.
