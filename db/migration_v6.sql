-- Migration v6: add flexible destination content categories.
-- Existing local_foods entries are preserved as a "Local food to try" category.
alter table destinations
  add column if not exists destination_categories jsonb not null default '[]'::jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'destinations'
      and column_name = 'local_foods'
  ) then
    execute $migration$
      update destinations
      set destination_categories = jsonb_build_array(
        jsonb_build_object('title', 'Local food to try', 'items', local_foods)
      )
      where local_foods is not null
        and local_foods <> '[]'::jsonb
        and destination_categories = '[]'::jsonb
    $migration$;
  end if;
end $$;
