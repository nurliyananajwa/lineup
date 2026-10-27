-- Emails live in auth.users, which the app can't read. Admins need the organizer's
-- email to send approval/rejection notices, so this function hands it over to admins only.
create or replace function public.event_organizer_contact(p_event_id bigint)
returns table (email text, name text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can look up organizer contact details';
  end if;
  return query
    select u.email::text, p.name
    from public.events e
    join auth.users u on u.id = e.organizer_id
    join public.profiles p on p.id = e.organizer_id
    where e.id = p_event_id;
end; $$;
revoke execute on function public.event_organizer_contact(bigint) from public, anon;
grant execute on function public.event_organizer_contact(bigint) to authenticated;
