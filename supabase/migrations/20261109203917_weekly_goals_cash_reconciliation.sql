begin;

alter table public.work_shifts
  add column cash_counted numeric(14, 2),
  add column cash_counted_at timestamptz,
  add constraint work_shifts_cash_counted_check check (
    (cash_counted is null and cash_counted_at is null)
    or (cash_counted is not null and cash_counted >= 0
      and cash_counted_at is not null and status = 'completed')
  );

create table public.goals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  weekly_income numeric(14, 2) not null check (weekly_income > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger goals_updated_at
before update on public.goals
for each row execute function public.touch_updated_at();

alter table public.goals enable row level security;

create policy goals_owner on public.goals
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.goals from anon, authenticated;
grant select, insert, delete on public.goals to authenticated;
grant update (weekly_income) on public.goals to authenticated;

commit;
