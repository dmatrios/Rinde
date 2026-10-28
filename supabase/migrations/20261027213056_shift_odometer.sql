begin;

alter table public.work_shifts
  add column odometer_start numeric(12, 1),
  add column odometer_end numeric(12, 1),
  add constraint work_shifts_odometer_start_check
    check (odometer_start is null or (odometer_start >= 0 and odometer_start < 10000000)),
  add constraint work_shifts_odometer_end_check
    check (odometer_end is null or (odometer_end >= 0 and odometer_end < 10000000)),
  add constraint work_shifts_odometer_range_check
    check (
      odometer_end is null
      or (odometer_start is not null and odometer_end >= odometer_start)
    );

drop function public.start_work_shift(uuid);
drop function public.transition_work_shift(uuid, text);

create function public.start_work_shift(
  p_platform_id uuid,
  p_odometer_start numeric default null
)
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

  insert into public.work_shifts (user_id, platform_id, odometer_start)
  select (select auth.uid()), p_platform_id, p_odometer_start
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
  p_action text,
  p_odometer_end numeric default null
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

  if p_action <> 'finish' and p_odometer_end is not null then
    raise exception 'ending odometer is only allowed when finishing' using errcode = '22023';
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
      if current_shift.odometer_start is not null and p_odometer_end is null then
        raise exception 'ending odometer required' using errcode = '22023';
      end if;
      if current_shift.odometer_start is null and p_odometer_end is not null then
        raise exception 'starting odometer required' using errcode = '22023';
      end if;
      if p_odometer_end is not null and p_odometer_end < current_shift.odometer_start then
        raise exception 'ending odometer must not be lower than start' using errcode = '22023';
      end if;
      if current_shift.status = 'paused' then
        update public.shift_pauses
        set ended_at = now_at
        where shift_id = current_shift.id and ended_at is null;
        if not found then
          raise exception 'open pause not found' using errcode = 'P0001';
        end if;
      end if;
      update public.work_shifts
      set status = 'completed', ended_at = now_at, odometer_end = p_odometer_end
      where id = current_shift.id;
    else
      raise exception 'unsupported shift action' using errcode = '22023';
  end case;

  select * into current_shift from public.work_shifts where id = current_shift.id;
  return current_shift;
end;
$$;

revoke all on function public.start_work_shift(uuid, numeric) from public, anon, authenticated;
revoke all on function public.transition_work_shift(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.start_work_shift(uuid, numeric) to authenticated;
grant execute on function public.transition_work_shift(uuid, text, numeric) to authenticated;

comment on column public.work_shifts.odometer_start is 'Kilometraje opcional al iniciar la jornada.';
comment on column public.work_shifts.odometer_end is 'Kilometraje final de una jornada que registró inicio.';

commit;
