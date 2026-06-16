-- Schema for Travelogue (Supabase/Postgres)

create extension if not exists "uuid-ossp";

-- Admin users
create table if not exists admins (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  name text,
  created_at timestamptz default now()
);

-- Destinations
create table if not exists destinations (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  slug text not null unique,
  region text,
  short_description text,
  content text,
  images jsonb default '[]'::jsonb,
  featured boolean default false,
  created_at timestamptz default now()
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

-- Scans/events captured when an end-user scans a QR
create table if not exists scans (
  id uuid default uuid_generate_v4() primary key,
  qr_id uuid references qr_codes(id) on delete cascade,
  scanned_at timestamptz default now(),
  user_agent text,
  ip_address text,
  referrer text
);

-- Engagement events (page views, time spent, clicks). Admin can aggregate by scan or anonymous id.
create table if not exists engagements (
  id uuid default uuid_generate_v4() primary key,
  scan_id uuid references scans(id) on delete set null,
  event_type text not null,
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
