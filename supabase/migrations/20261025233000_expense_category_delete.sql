begin;

-- La política de propietario ya limita las filas eliminables; este permiso
-- permite borrar únicamente categorías que no tengan historial referenciado.
grant delete on public.expense_categories to authenticated;

commit;
