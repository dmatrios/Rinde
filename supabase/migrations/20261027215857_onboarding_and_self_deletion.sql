begin;

alter table public.user_settings
  add column onboarding_completed boolean not null default false;

update public.user_settings set onboarding_completed = true;

create function public.delete_own_account()
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

  delete from auth.users where id = current_user_id;
  if not found then
    raise exception 'account not found' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function public.delete_own_account() from public, anon, authenticated;
grant execute on function public.delete_own_account() to authenticated;

comment on column public.user_settings.onboarding_completed is 'Indica que la cuenta terminó su bienvenida inicial.';

commit;
