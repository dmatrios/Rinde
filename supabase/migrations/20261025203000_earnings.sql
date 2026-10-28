begin;

create table public.earnings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  platform_id uuid not null,
  date date not null,
  mode text not null check (mode in ('daily', 'shift')),
  shift_id uuid,
  reported_amount numeric(14, 2) not null check (reported_amount >= 0),
  tips numeric(14, 2) not null default 0 check (tips >= 0),
  bonuses numeric(14, 2) not null default 0 check (bonuses >= 0),
  tips_included boolean not null default true,
  bonuses_included boolean not null default true,
  orders integer check (orders is null or orders >= 0),
  notes text check (notes is null or char_length(notes) <= 500),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (
    (mode = 'daily' and shift_id is null)
    or (mode = 'shift' and shift_id is not null)
  ),
  constraint earnings_platform_owner_fkey
    foreign key (user_id, platform_id)
    references public.user_platforms (user_id, id)
    on delete restrict,
  constraint earnings_shift_owner_fkey
    foreign key (user_id, shift_id)
    references public.work_shifts (user_id, id)
    on delete restrict
);

create table public.earnings_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  earnings_id uuid not null,
  before_value jsonb not null,
  after_value jsonb not null,
  changed_at timestamptz not null default now(),
  constraint earnings_history_earning_owner_fkey
    foreign key (user_id, earnings_id)
    references public.earnings (user_id, id)
    on delete restrict
);

create unique index earnings_daily_user_platform_date_key
  on public.earnings (user_id, platform_id, date)
  where mode = 'daily';
create unique index earnings_shift_user_shift_key
  on public.earnings (user_id, shift_id)
  where mode = 'shift';
create index earnings_user_date_idx on public.earnings (user_id, date desc);
create index earnings_history_user_earning_changed_idx
  on public.earnings_history (user_id, earnings_id, changed_at desc);

create function public.validate_earning()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  shift_started_at timestamptz;
begin
  if new.mode = 'shift' then
    select started_at into shift_started_at
    from public.work_shifts
    where id = new.shift_id
      and user_id = new.user_id
      and platform_id = new.platform_id;

    if not found then
      raise exception 'shift does not belong to platform' using errcode = '23514';
    end if;

    if new.date <> (shift_started_at at time zone 'America/Lima')::date then
      raise exception 'shift earnings must use the shift start date' using errcode = '23514';
    end if;
  end if;

  if exists (
    select 1
    from public.earnings earning
    where earning.user_id = new.user_id
      and earning.platform_id = new.platform_id
      and earning.date = new.date
      and earning.id is distinct from new.id
      and earning.mode <> new.mode
  ) then
    raise exception 'daily and shift earnings cannot be mixed' using errcode = '23505';
  end if;

  return new;
end;
$$;

revoke all on function public.validate_earning() from public, anon, authenticated;

create trigger earnings_validate_before_write
before insert or update of user_id, platform_id, date, mode, shift_id
on public.earnings
for each row execute function public.validate_earning();

create trigger earnings_updated_at
before update on public.earnings
for each row execute function public.touch_updated_at();

alter table public.earnings enable row level security;
alter table public.earnings_history enable row level security;

create policy earnings_owner_read on public.earnings
for select to authenticated
using ((select auth.uid()) = user_id);

create policy earnings_history_owner_read on public.earnings_history
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.earnings, public.earnings_history from anon, authenticated;
grant usage on schema public to authenticated;
grant select on public.earnings, public.earnings_history to authenticated;

create function public.upsert_earning(
  p_earning_id uuid,
  p_platform_id uuid,
  p_date date,
  p_mode text,
  p_shift_id uuid,
  p_reported_amount numeric,
  p_tips numeric,
  p_bonuses numeric,
  p_tips_included boolean,
  p_bonuses_included boolean,
  p_orders integer,
  p_notes text,
  p_expected_revision integer default null
)
returns public.earnings
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_earning public.earnings;
  saved_earning public.earnings;
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;

  if p_mode not in ('daily', 'shift') then
    raise exception 'unsupported earnings mode' using errcode = '22023';
  end if;

  if p_reported_amount < 0 or p_tips < 0 or p_bonuses < 0 then
    raise exception 'amounts must be non-negative' using errcode = '22023';
  end if;

  if p_earning_id is null then
    insert into public.earnings (
      user_id, platform_id, date, mode, shift_id, reported_amount, tips, bonuses,
      tips_included, bonuses_included, orders, notes
    ) values (
      current_user_id, p_platform_id, p_date, p_mode, p_shift_id, p_reported_amount,
      p_tips, p_bonuses, p_tips_included, p_bonuses_included, p_orders, nullif(btrim(p_notes), '')
    ) returning * into saved_earning;

    return saved_earning;
  end if;

  select * into current_earning
  from public.earnings
  where id = p_earning_id and user_id = current_user_id
  for update;

  if not found then
    raise exception 'earning not found' using errcode = 'P0001';
  end if;

  if p_expected_revision is null or p_expected_revision <> current_earning.revision then
    raise exception 'earning was updated elsewhere' using errcode = 'P0001';
  end if;

  update public.earnings
  set platform_id = p_platform_id,
      date = p_date,
      mode = p_mode,
      shift_id = p_shift_id,
      reported_amount = p_reported_amount,
      tips = p_tips,
      bonuses = p_bonuses,
      tips_included = p_tips_included,
      bonuses_included = p_bonuses_included,
      orders = p_orders,
      notes = nullif(btrim(p_notes), ''),
      revision = current_earning.revision + 1
  where id = current_earning.id
  returning * into saved_earning;

  insert into public.earnings_history (
    user_id, earnings_id, before_value, after_value
  ) values (
    current_user_id, current_earning.id, to_jsonb(current_earning), to_jsonb(saved_earning)
  );

  return saved_earning;
end;
$$;

revoke all on function public.upsert_earning(uuid, uuid, date, text, uuid, numeric, numeric, numeric, boolean, boolean, integer, text, integer)
  from public, anon, authenticated;
grant execute on function public.upsert_earning(uuid, uuid, date, text, uuid, numeric, numeric, numeric, boolean, boolean, integer, text, integer)
  to authenticated;

comment on table public.earnings is 'Acumulados privados por día o jornada; no mezcla ambos modos por plataforma y fecha.';
comment on table public.earnings_history is 'Historial inmutable de ediciones de ingresos, visible sólo para su propietario.';

commit;
