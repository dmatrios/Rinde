begin;

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
