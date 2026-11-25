-- Organizers/admins may only change attendance on a ticket, never who it belongs to or its secret token.
create or replace function public.guard_ticket_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (
       new.event_id is distinct from old.event_id
    or new.name     is distinct from old.name
    or new.email    is distinct from old.email
    or new.token    is distinct from old.token
    or new.created_at is distinct from old.created_at) then
    raise exception 'Only attendance can be changed on a ticket';
  end if;
  -- keep the check-in time in step with the attended flag
  if new.attended and not old.attended then
    new.checked_in_at := now();
  elsif not new.attended then
    new.checked_in_at := null;
  end if;
  return new;
end; $$;
create trigger guard_ticket_changes before update on public.tickets
  for each row execute function public.guard_ticket_changes();
