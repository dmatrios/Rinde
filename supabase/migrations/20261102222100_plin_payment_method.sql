begin;

alter table public.expenses
  drop constraint expenses_payment_method_check,
  add constraint expenses_payment_method_check
    check (payment_method in ('cash', 'yape', 'plin', 'card'));

alter table public.fuel_refills
  drop constraint fuel_refills_payment_method_check,
  add constraint fuel_refills_payment_method_check
    check (payment_method in ('cash', 'yape', 'plin', 'card'));

alter table public.payment_receipts
  drop constraint payment_receipts_payment_method_check,
  add constraint payment_receipts_payment_method_check
    check (payment_method in ('cash', 'yape', 'plin', 'card'));

commit;
