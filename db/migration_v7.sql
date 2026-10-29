-- Keep public admin records synchronized with Supabase Auth users.

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

update public.admins as admin
set email = auth_user.email,
    name = coalesce(auth_user.raw_user_meta_data ->> 'name', auth_user.raw_user_meta_data ->> 'full_name', admin.name),
    auth_user_id = auth_user.id
from auth.users as auth_user
where lower(admin.email) = lower(auth_user.email)
  and auth_user.email is not null
  and (admin.auth_user_id is null or admin.auth_user_id = auth_user.id);

insert into public.admins (email, name, auth_user_id)
select
  auth_user.email,
  coalesce(auth_user.raw_user_meta_data ->> 'name', auth_user.raw_user_meta_data ->> 'full_name'),
  auth_user.id
from auth.users as auth_user
where auth_user.email is not null
  and not exists (
    select 1
    from public.admins as admin
    where admin.auth_user_id = auth_user.id
       or lower(admin.email) = lower(auth_user.email)
  )
on conflict (email) do update
set auth_user_id = excluded.auth_user_id,
    name = coalesce(excluded.name, public.admins.name);
