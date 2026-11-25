-- When a ticket was scanned at the door (null = not checked in yet)
alter table public.tickets add column checked_in_at timestamptz;
update public.tickets set checked_in_at = created_at where attended and checked_in_at is null;
create index on public.tickets (event_id);
