-- Migration v2: extended destination fields, audit logs, session end, RLS

-- Extended destination content fields
alter table destinations add column if not exists location text;
alter table destinations add column if not exists best_time_to_visit text;
alter table destinations add column if not exists highlights jsonb default '[]'::jsonb;
alter table destinations add column if not exists travel_tips jsonb default '[]'::jsonb;
alter table destinations add column if not exists related_slugs jsonb default '[]'::jsonb;
alter table destinations add column if not exists published boolean default true;
alter table destinations add column if not exists updated_at timestamptz default now();

-- Session end timestamp for scan sessions
alter table scans add column if not exists session_ended_at timestamptz;
alter table scans add column if not exists visitor_id text;

-- Link admins to Supabase Auth users
alter table admins add column if not exists auth_user_id uuid unique;

-- Audit logs for admin actions
create table if not exists audit_logs (
  id uuid default uuid_generate_v4() primary key,
  admin_id uuid references admins(id) on delete set null,
  admin_email text,
  action text not null,
  entity_type text,
  entity_id uuid,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_engagements_scan_id on engagements(scan_id);
create index if not exists idx_engagements_event_type on engagements(event_type);
create index if not exists idx_scans_scanned_at on scans(scanned_at desc);
create index if not exists idx_destinations_published on destinations(published);

-- Row Level Security
alter table destinations enable row level security;
alter table scans enable row level security;
alter table engagements enable row level security;
alter table audit_logs enable row level security;
alter table qr_codes enable row level security;

-- Public read for published destinations
drop policy if exists "Public read published destinations" on destinations;
create policy "Public read published destinations" on destinations
  for select using (published = true);

-- Service role bypasses RLS; anon can read published destinations only
drop policy if exists "Anon insert scans" on scans;
create policy "Anon insert scans" on scans
  for insert with check (true);

drop policy if exists "Anon insert engagements" on engagements;
create policy "Anon insert engagements" on engagements
  for insert with check (true);

drop policy if exists "Authenticated read audit logs" on audit_logs;
create policy "Authenticated read audit logs" on audit_logs
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated insert audit logs" on audit_logs;
create policy "Authenticated insert audit logs" on audit_logs
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "Public read qr codes" on qr_codes;
create policy "Public read qr codes" on qr_codes
  for select using (true);
