begin;

create table public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  currency text not null default 'PEN' check (currency = 'PEN'),
  timezone text not null default 'America/Lima' check (timezone = 'America/Lima'),
  earnings_mode text not null default 'daily' check (earnings_mode in ('daily', 'shift')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_platforms (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 50),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);
-- El índice compuesto sirve para las consultas por usuario y evita duplicados por mayúsculas.
create unique index user_platforms_user_name_key on public.user_platforms(user_id, lower(btrim(name)));

create table public.vehicles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 100),
  odometer_km numeric(12, 1) check (odometer_km >= 0 and odometer_km < 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_updated_at() from public;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.touch_updated_at();
create trigger user_settings_updated_at before update on public.user_settings for each row execute function public.touch_updated_at();
create trigger user_platforms_updated_at before update on public.user_platforms for each row execute function public.touch_updated_at();
create trigger vehicles_updated_at before update on public.vehicles for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.user_platforms enable row level security;
alter table public.vehicles enable row level security;

create policy profiles_owner on public.profiles for all to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy user_settings_owner on public.user_settings for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy user_platforms_owner on public.user_platforms for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy vehicles_owner on public.vehicles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.profiles, public.user_settings, public.user_platforms, public.vehicles from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, delete on public.profiles, public.user_settings, public.user_platforms, public.vehicles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant update (earnings_mode) on public.user_settings to authenticated;
grant update (name, active) on public.user_platforms to authenticated;
grant update (name, odometer_km) on public.vehicles to authenticated;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  initial_name text;
begin
  initial_name := left(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80);
  if char_length(initial_name) < 2 then initial_name := 'Mi perfil'; end if;
  insert into public.profiles (id, display_name) values (new.id, initial_name) on conflict (id) do nothing;
  insert into public.user_settings (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Usuarios que ya existieran antes de aplicar esta migración.
insert into public.profiles (id, display_name)
select id, case when char_length(btrim(coalesce(raw_user_meta_data ->> 'display_name', ''))) >= 2
  then left(btrim(raw_user_meta_data ->> 'display_name'), 80) else 'Mi perfil' end from auth.users
on conflict (id) do nothing;
insert into public.user_settings (user_id) select id from auth.users on conflict (user_id) do nothing;

comment on table public.profiles is 'Perfil privado por usuario de Supabase Auth; sin email duplicado.';
comment on table public.vehicles is 'Un vehículo principal por usuario en el MVP.';
commit;
