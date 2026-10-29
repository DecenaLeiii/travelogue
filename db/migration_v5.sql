-- Migration v5: add destination-specific local food recommendations
alter table destinations
  add column if not exists local_foods jsonb not null default '[]'::jsonb;
