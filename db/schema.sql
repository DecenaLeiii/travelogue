-- Schema for Travelogue (Supabase/Postgres)

create extension if not exists "uuid-ossp";

-- Admin users (linked to Supabase Auth via auth_user_id)
create table if not exists admins (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  name text,
  auth_user_id uuid unique,
  created_at timestamptz default now()
);

create or replace function public.sync_auth_user_to_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is null then
    return new;
  end if;

  update public.admins
  set email = new.email,
      name = coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name', name)
  where auth_user_id = new.id;

  if not found then
    insert into public.admins (email, name, auth_user_id)
    values (
      new.email,
      coalesce(new.raw_user_meta_data ->> 'name', new.raw_user_meta_data ->> 'full_name'),
      new.id
    )
    on conflict (email) do update
    set auth_user_id = excluded.auth_user_id,
        name = coalesce(excluded.name, public.admins.name);
  end if;

  return new;
end;
$$;

drop trigger if exists sync_auth_user_to_admin on auth.users;
create trigger sync_auth_user_to_admin
after insert or update on auth.users
for each row execute function public.sync_auth_user_to_admin();

-- Destinations
create table if not exists destinations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  region text,
  location text,
  short_description text,
  content text,
  best_time_to_visit text,
  highlights jsonb default '[]'::jsonb,
  travel_tips jsonb default '[]'::jsonb,
  images jsonb default '[]'::jsonb,
  local_foods jsonb not null default '[]'::jsonb,
  destination_categories jsonb not null default '[]'::jsonb,
  related_slugs jsonb default '[]'::jsonb,
  featured boolean default false,
  published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- QR codes (one or many). A QR can point to the travelogue root or a specific destination via destination_id.
create table if not exists qr_codes (
  id uuid default uuid_generate_v4() primary key,
  code text not null unique,
  destination_id uuid references destinations(id) on delete set null,
  label text,
  created_by uuid references admins(id),
  created_at timestamptz default now()
);

-- Scan sessions captured when an end-user scans a QR
create table if not exists scans (
  id uuid default uuid_generate_v4() primary key,
  qr_id uuid references qr_codes(id) on delete cascade,
  scanned_at timestamptz default now(),
  session_ended_at timestamptz,
  visitor_id text,
  user_agent text,
  ip_address text,
  referrer text
);

-- Engagement events (page views, time spent, scrolls, clicks)
create table if not exists engagements (
  id uuid default uuid_generate_v4() primary key,
  scan_id uuid references scans(id) on delete set null,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- Audit logs for admin edits and logins
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

create table if not exists destination_feedback (
  id uuid default uuid_generate_v4() primary key,
  destination_slug text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  comment text,
  photo_urls jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  created_at timestamptz default now()
);

create index if not exists idx_destination_feedback_destination_slug on destination_feedback(destination_slug);
create index if not exists idx_destination_feedback_created_at on destination_feedback(created_at desc);

create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_engagements_scan_id on engagements(scan_id);
create index if not exists idx_scans_scanned_at on scans(scanned_at desc);

-- Apply RLS policies (see db/migration_v2.sql for policy definitions on existing projects)
