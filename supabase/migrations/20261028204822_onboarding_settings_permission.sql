begin;

grant update (onboarding_completed) on public.user_settings to authenticated;

comment on column public.user_settings.onboarding_completed is 'Indica que la cuenta terminó su bienvenida inicial.';

commit;
