begin;

alter table public.user_settings
  add column ruc text check (ruc is null or ruc ~ '^[0-9]{11}$');

alter table public.expenses
  add column paid_with_ruc boolean not null default false;

grant update (ruc) on public.user_settings to authenticated;
grant update (paid_with_ruc) on public.expenses to authenticated;

comment on column public.user_settings.ruc is 'RUC opcional del propietario, usado para identificar gastos pagados con RUC.';
comment on column public.expenses.paid_with_ruc is 'Indica que el gasto fue pagado usando el RUC configurado por su propietario.';

commit;
