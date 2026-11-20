-- Destination trash: recovery is allowed for 30 days, then pg_cron purges it.
begin;

alter table public.destinations
  add column if not exists deleted_at timestamptz,
  add column if not exists published_before_delete boolean;

create index if not exists idx_destinations_deleted_at
  on public.destinations (deleted_at) where deleted_at is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.destinations'::regclass
      and conname = 'destinations_trash_unpublished'
  ) then
    alter table public.destinations
      add constraint destinations_trash_unpublished
      check (deleted_at is null or published is false);
  end if;
end
$$;

create or replace function public.trash_destination(destination_id uuid)
returns setof public.destinations
language sql
set search_path = ''
as $$
  update public.destinations
  set published_before_delete = published,
      published = false,
      deleted_at = now(),
      updated_at = now()
  where id = destination_id and deleted_at is null
  returning *;
$$;

create or replace function public.restore_destination(destination_id uuid)
returns setof public.destinations
language sql
set search_path = ''
as $$
  update public.destinations
  set published = published_before_delete,
      published_before_delete = null,
      deleted_at = null,
      updated_at = now()
  where id = destination_id
    and deleted_at > now() - interval '720 hours'
  returning *;
$$;

revoke all on function public.trash_destination(uuid) from public, anon, authenticated;
revoke all on function public.restore_destination(uuid) from public, anon, authenticated;
grant execute on function public.trash_destination(uuid) to service_role;
grant execute on function public.restore_destination(uuid) to service_role;

create extension if not exists pg_cron;
select cron.schedule(
  'travelogue-purge-destination-trash',
  '* * * * *',
  $cron$delete from public.destinations where deleted_at <= now() - interval '720 hours'$cron$
);

commit;
