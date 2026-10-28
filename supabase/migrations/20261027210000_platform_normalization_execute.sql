begin;

grant execute on function public.normalize_platform_name(text) to authenticated;

commit;
