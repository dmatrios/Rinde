begin;

create table public.work_shifts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (
    (status in ('active', 'paused') and ended_at is null)
    or (status = 'completed' and ended_at is not null and ended_at >= started_at)
  ),
  constraint work_shifts_platform_owner_fkey
    foreign key (user_id, platform_id)
    references public.user_platforms (user_id, id)
    on delete restrict
);

create table public.shift_pauses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_id uuid not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, id),
  check (ended_at is null or ended_at >= started_at),
  constraint shift_pauses_shift_owner_fkey
    foreign key (user_id, shift_id)
    references public.work_shifts (user_id, id)
    on delete cascade
);

create index work_shifts_user_started_at_idx
  on public.work_shifts (user_id, started_at desc);
create unique index work_shifts_one_open_per_user_idx
  on public.work_shifts (user_id)
  where status in ('active', 'paused');
create index shift_pauses_user_shift_idx
  on public.shift_pauses (user_id, shift_id);
create unique index shift_pauses_one_open_per_shift_idx
  on public.shift_pauses (shift_id)
  where ended_at is null;

create trigger work_shifts_updated_at
before update on public.work_shifts
for each row execute function public.touch_updated_at();

alter table public.work_shifts enable row level security;
alter table public.shift_pauses enable row level security;

create policy work_shifts_owner on public.work_shifts
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy shift_pauses_owner on public.shift_pauses
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.work_shifts, public.shift_pauses from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update on public.work_shifts, public.shift_pauses to authenticated;

create function public.start_work_shift(p_platform_id uuid)
returns public.work_shifts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  created_shift public.work_shifts;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  insert into public.work_shifts (user_id, platform_id)
  select (select auth.uid()), p_platform_id
  where exists (
    select 1
    from public.user_platforms
    where id = p_platform_id
      and user_id = (select auth.uid())
      and active
  )
  returning * into created_shift;

  if not found then
    raise exception 'platform not available' using errcode = 'P0001';
  end if;

  return created_shift;
exception
  when unique_violation then
    raise exception 'an open shift already exists' using errcode = 'P0001';
end;
$$;

create function public.transition_work_shift(
  p_shift_id uuid,
  p_action text
)
returns public.work_shifts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_shift public.work_shifts;
  now_at timestamptz := now();
begin
  if (select auth.uid()) is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  select * into current_shift
  from public.work_shifts
  where id = p_shift_id
    and user_id = (select auth.uid())
  for update;

  if not found then
    raise exception 'shift not found' using errcode = 'P0001';
  end if;

  case p_action
    when 'pause' then
      if current_shift.status = 'paused' then return current_shift; end if;
      if current_shift.status <> 'active' then
        raise exception 'shift cannot be paused' using errcode = 'P0001';
      end if;
      insert into public.shift_pauses (user_id, shift_id, started_at)
      values ((select auth.uid()), current_shift.id, now_at);
      update public.work_shifts set status = 'paused' where id = current_shift.id;
    when 'resume' then
      if current_shift.status = 'active' then return current_shift; end if;
      if current_shift.status <> 'paused' then
        raise exception 'shift cannot be resumed' using errcode = 'P0001';
      end if;
      update public.shift_pauses
      set ended_at = now_at
      where shift_id = current_shift.id and ended_at is null;
      if not found then
        raise exception 'open pause not found' using errcode = 'P0001';
      end if;
      update public.work_shifts set status = 'active' where id = current_shift.id;
    when 'finish' then
      if current_shift.status = 'completed' then return current_shift; end if;
      if current_shift.status = 'paused' then
        update public.shift_pauses
        set ended_at = now_at
        where shift_id = current_shift.id and ended_at is null;
        if not found then
          raise exception 'open pause not found' using errcode = 'P0001';
        end if;
      end if;
      update public.work_shifts
      set status = 'completed', ended_at = now_at
      where id = current_shift.id;
    else
      raise exception 'unsupported shift action' using errcode = '22023';
  end case;

  select * into current_shift from public.work_shifts where id = current_shift.id;
  return current_shift;
end;
$$;

revoke all on function public.start_work_shift(uuid) from public, anon, authenticated;
revoke all on function public.transition_work_shift(uuid, text) from public, anon, authenticated;
grant execute on function public.start_work_shift(uuid) to authenticated;
grant execute on function public.transition_work_shift(uuid, text) to authenticated;

comment on table public.work_shifts is 'Jornadas privadas; una sola abierta por usuario.';
comment on table public.shift_pauses is 'Pausas privadas de jornadas, sin solapamientos abiertos.';

commit;
