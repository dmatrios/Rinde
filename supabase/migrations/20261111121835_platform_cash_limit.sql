-- Optional cash collection limit for each platform. This is separate from earnings.
alter table public.user_platforms
  add column cash_limit numeric(14, 2)
  constraint user_platforms_cash_limit_nonnegative check (cash_limit >= 0);

grant update (cash_limit) on public.user_platforms to authenticated;
