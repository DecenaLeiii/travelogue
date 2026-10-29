-- Migration v4: add tourist feedback photos and homepage featuring
alter table destination_feedback
  add column if not exists photo_urls jsonb not null default '[]'::jsonb,
  add column if not exists featured boolean not null default false;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'destination_feedback'
      and column_name = 'photo_url'
  ) then
    execute $migration$
      update destination_feedback
      set photo_urls = jsonb_build_array(photo_url)
      where photo_url is not null and photo_url <> '' and photo_urls = '[]'::jsonb
    $migration$;
  end if;
end $$;

create index if not exists idx_destination_feedback_featured_created_at
  on destination_feedback(featured, created_at desc);
