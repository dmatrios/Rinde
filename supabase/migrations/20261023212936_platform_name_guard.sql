begin;

create function public.normalize_platform_name(value text)
returns text
language sql
immutable
strict
set search_path = ''
as $$
  select regexp_replace(lower(btrim(value)), '[[:space:]]+', '', 'g');
$$;

revoke all on function public.normalize_platform_name(text) from public, anon, authenticated;

create function public.prevent_duplicate_platform_name()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.user_platforms platform
    where platform.user_id = new.user_id
      and platform.id is distinct from new.id
      and public.normalize_platform_name(platform.name) = public.normalize_platform_name(new.name)
  ) then
    raise exception 'duplicate platform name' using errcode = '23505';
  end if;

  return new;
end;
$$;

revoke all on function public.prevent_duplicate_platform_name() from public, anon, authenticated;

create trigger user_platforms_prevent_duplicate_name
before insert or update of name, user_id on public.user_platforms
for each row execute function public.prevent_duplicate_platform_name();

comment on function public.normalize_platform_name(text) is
  'Normaliza espacios y mayúsculas de nombres de plataforma para evitar duplicados.';

commit;
