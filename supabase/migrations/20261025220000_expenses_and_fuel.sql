begin;

create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 50),
  kind text not null check (kind in ('operational', 'personal')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create unique index expense_categories_user_name_key
  on public.expense_categories (user_id, lower(btrim(name)));
create index expense_categories_user_active_idx
  on public.expense_categories (user_id, active, name);

create table public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null,
  description text not null check (char_length(btrim(description)) between 2 and 120),
  amount numeric(14, 2) not null check (amount > 0),
  cadence text not null check (cadence in ('weekly', 'monthly')),
  anchor_date date not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  constraint recurring_expenses_category_owner_fkey
    foreign key (user_id, category_id)
    references public.expense_categories (user_id, id)
    on delete restrict
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  category_id uuid not null,
  occurred_at timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  description text not null check (char_length(btrim(description)) between 2 and 120),
  notes text check (notes is null or char_length(notes) <= 500),
  recurring_rule_id uuid,
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  check (
    (recurring_rule_id is null and due_date is null)
    or (recurring_rule_id is not null and due_date is not null)
  ),
  constraint expenses_category_owner_fkey
    foreign key (user_id, category_id)
    references public.expense_categories (user_id, id)
    on delete restrict,
  constraint expenses_recurring_owner_fkey
    foreign key (user_id, recurring_rule_id)
    references public.recurring_expenses (user_id, id)
    on delete restrict
);

create table public.fuel_refills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  occurred_at timestamptz not null,
  amount numeric(14, 2) not null check (amount > 0),
  liters numeric(10, 3) check (liters is null or liters > 0),
  odometer_km numeric(12, 1) check (odometer_km is null or odometer_km >= 0),
  full_tank boolean not null default false,
  notes text check (notes is null or char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create index recurring_expenses_user_active_idx
  on public.recurring_expenses (user_id, active, anchor_date);
create index expenses_user_occurred_at_idx
  on public.expenses (user_id, occurred_at desc);
create index expenses_user_category_occurred_at_idx
  on public.expenses (user_id, category_id, occurred_at desc);
create unique index expenses_recurring_due_key
  on public.expenses (user_id, recurring_rule_id, due_date)
  where recurring_rule_id is not null;
create index fuel_refills_user_occurred_at_idx
  on public.fuel_refills (user_id, occurred_at desc);

create trigger expense_categories_updated_at
before update on public.expense_categories
for each row execute function public.touch_updated_at();
create trigger recurring_expenses_updated_at
before update on public.recurring_expenses
for each row execute function public.touch_updated_at();
create trigger expenses_updated_at
before update on public.expenses
for each row execute function public.touch_updated_at();
create trigger fuel_refills_updated_at
before update on public.fuel_refills
for each row execute function public.touch_updated_at();

alter table public.expense_categories enable row level security;
alter table public.recurring_expenses enable row level security;
alter table public.expenses enable row level security;
alter table public.fuel_refills enable row level security;

create policy expense_categories_owner on public.expense_categories
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy recurring_expenses_owner on public.recurring_expenses
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy expenses_owner on public.expenses
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy fuel_refills_owner on public.fuel_refills
for all to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

revoke all on public.expense_categories, public.recurring_expenses, public.expenses, public.fuel_refills from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert on public.expense_categories, public.recurring_expenses, public.expenses, public.fuel_refills to authenticated;
grant update (name, kind, active) on public.expense_categories to authenticated;
grant update (category_id, description, amount, cadence, anchor_date, active) on public.recurring_expenses to authenticated;
grant update (category_id, occurred_at, amount, description, notes) on public.expenses to authenticated;
grant update (occurred_at, amount, liters, odometer_km, full_tank, notes) on public.fuel_refills to authenticated;
grant delete on public.expenses, public.fuel_refills to authenticated;

comment on table public.expense_categories is 'Categorías privadas que se archivan al desactivarse; no se eliminan con historial.';
comment on table public.expenses is 'Gastos privados; combustible se registra sólo en fuel_refills para evitar duplicados.';
comment on table public.fuel_refills is 'Recargas privadas de combustible, separadas de gastos operativos.';

commit;
