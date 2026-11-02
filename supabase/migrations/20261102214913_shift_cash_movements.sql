begin;

alter table public.work_shifts
  add column opening_cash numeric(14, 2) not null default 0
    check (opening_cash >= 0);

alter table public.expenses
  add column shift_id uuid,
  add column payment_method text
    check (payment_method in ('cash', 'yape', 'card')),
  add column cash_paid numeric(14, 2)
    check (cash_paid is null or (payment_method = 'cash' and cash_paid >= amount)),
  add constraint expenses_shift_owner_fkey
    foreign key (user_id, shift_id)
    references public.work_shifts (user_id, id) on delete set null (shift_id);

alter table public.fuel_refills
  add column shift_id uuid,
  add column payment_method text
    check (payment_method in ('cash', 'yape', 'card')),
  add column cash_paid numeric(14, 2)
    check (cash_paid is null or (payment_method = 'cash' and cash_paid >= amount)),
  add constraint fuel_refills_shift_owner_fkey
    foreign key (user_id, shift_id)
    references public.work_shifts (user_id, id) on delete set null (shift_id);

create index expenses_user_shift_idx on public.expenses (user_id, shift_id)
  where shift_id is not null;
create index fuel_refills_user_shift_idx on public.fuel_refills (user_id, shift_id)
  where shift_id is not null;

create table public.payment_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  shift_id uuid,
  platform_id uuid not null,
  occurred_at timestamptz not null default now(),
  amount numeric(14, 2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'yape', 'card')),
  cash_received numeric(14, 2),
  description text check (description is null or char_length(description) <= 120),
  created_at timestamptz not null default now(),
  constraint payment_receipts_cash_check check (
    (payment_method = 'cash' and cash_received is not null and cash_received >= amount)
    or (payment_method <> 'cash' and cash_received is null)
  ),
  constraint payment_receipts_shift_owner_fkey
    foreign key (user_id, shift_id)
    references public.work_shifts (user_id, id) on delete set null (shift_id),
  constraint payment_receipts_platform_owner_fkey
    foreign key (user_id, platform_id)
    references public.user_platforms (user_id, id) on delete restrict
);

create index payment_receipts_user_date_idx
  on public.payment_receipts (user_id, occurred_at desc);
create index payment_receipts_user_shift_idx
  on public.payment_receipts (user_id, shift_id, occurred_at desc)
  where shift_id is not null;

alter table public.payment_receipts enable row level security;
create policy payment_receipts_owner on public.payment_receipts
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create function public.payment_receipts_check_shift()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  shift_platform_id uuid;
begin
  if new.shift_id is not null then
    select platform_id into shift_platform_id
    from public.work_shifts
    where id = new.shift_id and user_id = new.user_id;
    if shift_platform_id is null or shift_platform_id <> new.platform_id then
      raise exception 'receipt platform must match shift' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.payment_receipts_check_shift() from public, anon, authenticated;
create trigger payment_receipts_check_shift
  before insert or update of shift_id, platform_id on public.payment_receipts
  for each row execute function public.payment_receipts_check_shift();

revoke all on public.payment_receipts from anon, authenticated;
grant select, insert, delete on public.payment_receipts to authenticated;
grant update (shift_id, platform_id, occurred_at, amount, payment_method, cash_received, description)
  on public.payment_receipts to authenticated;
grant update (shift_id, payment_method, cash_paid) on public.expenses to authenticated;
grant update (shift_id, payment_method, cash_paid) on public.fuel_refills to authenticated;

drop function public.start_work_shift(uuid, numeric);
create function public.start_work_shift(
  p_platform_id uuid,
  p_odometer_start numeric default null,
  p_opening_cash numeric default 0
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
  if p_opening_cash is null or p_opening_cash < 0 then
    raise exception 'invalid opening cash' using errcode = '22023';
  end if;
  insert into public.work_shifts (user_id, platform_id, odometer_start, opening_cash)
  select (select auth.uid()), p_platform_id, p_odometer_start, p_opening_cash
  where exists (
    select 1 from public.user_platforms
    where id = p_platform_id and user_id = (select auth.uid()) and active
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
revoke all on function public.start_work_shift(uuid, numeric, numeric)
  from public, anon, authenticated;
grant execute on function public.start_work_shift(uuid, numeric, numeric)
  to authenticated;

create function public.get_shift_cash_balance(p_shift_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = ''
as $$
  select s.opening_cash
    + coalesce((select sum(r.amount) from public.payment_receipts r
      where r.user_id = s.user_id and r.shift_id = s.id and r.payment_method = 'cash'), 0)
    - coalesce((select sum(e.amount) from public.expenses e
      where e.user_id = s.user_id and e.shift_id = s.id and e.payment_method = 'cash'), 0)
    - coalesce((select sum(f.amount) from public.fuel_refills f
      where f.user_id = s.user_id and f.shift_id = s.id and f.payment_method = 'cash'), 0)
  from public.work_shifts s
  where s.id = p_shift_id and s.user_id = (select auth.uid());
$$;
revoke all on function public.get_shift_cash_balance(uuid) from public, anon, authenticated;
grant execute on function public.get_shift_cash_balance(uuid) to authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
begin
  if current_user_id is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  delete from public.payment_receipts where user_id = current_user_id;
  delete from public.earnings_history where user_id = current_user_id;
  delete from public.earnings where user_id = current_user_id;
  delete from public.shift_pauses where user_id = current_user_id;
  delete from public.work_shifts where user_id = current_user_id;
  delete from public.expenses where user_id = current_user_id;
  delete from public.recurring_expenses where user_id = current_user_id;
  delete from public.fuel_refills where user_id = current_user_id;
  delete from public.expense_categories where user_id = current_user_id;
  delete from public.user_platforms where user_id = current_user_id;
  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'account not found' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;

commit;
