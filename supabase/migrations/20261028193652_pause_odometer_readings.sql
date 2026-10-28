begin;

alter table public.shift_pauses
  add column odometer_pause numeric(12, 1),
  add column odometer_resume numeric(12, 1),
  add constraint shift_pauses_odometer_pause_check
    check (odometer_pause is null or (odometer_pause >= 0 and odometer_pause < 10000000)),
  add constraint shift_pauses_odometer_resume_check
    check (odometer_resume is null or (odometer_resume >= 0 and odometer_resume < 10000000)),
  add constraint shift_pauses_odometer_range_check
    check (
      odometer_resume is null
      or (odometer_pause is not null and odometer_resume >= odometer_pause)
    );

create index shift_pauses_shift_started_at_idx
  on public.shift_pauses (shift_id, started_at desc);

drop function public.transition_work_shift(uuid, text, numeric);

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
  open_pause public.shift_pauses;
  last_reading numeric(12, 1);
  final_reading numeric(12, 1);
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

  if current_shift.odometer_start is null and p_odometer_end is not null then
    raise exception 'starting odometer required' using errcode = '22023';
  end if;

  select coalesce(odometer_resume, odometer_pause)
  into last_reading
  from public.shift_pauses
  where shift_id = current_shift.id
  order by started_at desc
  limit 1;
  last_reading := coalesce(last_reading, current_shift.odometer_start);

  case p_action
    when 'pause' then
      if current_shift.status = 'paused' then return current_shift; end if;
      if current_shift.status <> 'active' then
        raise exception 'shift cannot be paused' using errcode = 'P0001';
      end if;
      if current_shift.odometer_start is not null and p_odometer_end is null then
        raise exception 'odometer required before pausing' using errcode = '22023';
      end if;
      if p_odometer_end is not null and p_odometer_end < last_reading then
        raise exception 'odometer cannot be lower than previous reading' using errcode = '22023';
      end if;
      insert into public.shift_pauses (user_id, shift_id, started_at, odometer_pause)
      values ((select auth.uid()), current_shift.id, now_at, p_odometer_end);
      update public.work_shifts set status = 'paused' where id = current_shift.id;

    when 'resume' then
      if current_shift.status = 'active' then return current_shift; end if;
      if current_shift.status <> 'paused' then
        raise exception 'shift cannot be resumed' using errcode = 'P0001';
      end if;
      select * into open_pause
      from public.shift_pauses
      where shift_id = current_shift.id and ended_at is null
      for update;
      if not found then
        raise exception 'open pause not found' using errcode = 'P0001';
      end if;
      if current_shift.odometer_start is not null and p_odometer_end is null then
        raise exception 'odometer required before resuming' using errcode = '22023';
      end if;
      if p_odometer_end is not null
        and open_pause.odometer_pause is not null
        and p_odometer_end < open_pause.odometer_pause then
        raise exception 'odometer cannot be lower than pause reading' using errcode = '22023';
      end if;
      update public.shift_pauses
      set ended_at = now_at, odometer_resume = p_odometer_end
      where id = open_pause.id;
      update public.work_shifts set status = 'active' where id = current_shift.id;

    when 'finish' then
      if current_shift.status = 'completed' then return current_shift; end if;
      final_reading := p_odometer_end;
      if current_shift.status = 'paused' then
        select * into open_pause
        from public.shift_pauses
        where shift_id = current_shift.id and ended_at is null
        for update;
        if not found then
          raise exception 'open pause not found' using errcode = 'P0001';
        end if;
        final_reading := coalesce(p_odometer_end, open_pause.odometer_pause);
        update public.shift_pauses
        set ended_at = now_at
        where id = open_pause.id;
      end if;
      if current_shift.odometer_start is not null and final_reading is null then
        raise exception 'ending odometer required' using errcode = '22023';
      end if;
      if final_reading is not null and final_reading < last_reading then
        raise exception 'ending odometer must not be lower than start' using errcode = '22023';
      end if;
      update public.work_shifts
      set status = 'completed', ended_at = now_at, odometer_end = final_reading
      where id = current_shift.id;

    else
      raise exception 'unsupported shift action' using errcode = '22023';
  end case;

  select * into current_shift from public.work_shifts where id = current_shift.id;
  return current_shift;
end;
$$;

revoke all on function public.transition_work_shift(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.transition_work_shift(uuid, text, numeric) to authenticated;

comment on column public.shift_pauses.odometer_pause is 'Lectura opcional registrada al pausar una jornada con kilometraje.';
comment on column public.shift_pauses.odometer_resume is 'Lectura opcional registrada al reanudar una jornada con kilometraje.';

commit;
