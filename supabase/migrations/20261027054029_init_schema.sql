-- Lineup v1 schema. Applied to Supabase project "lineup" on 2026-10-27.
-- Tables, the venue-clash rule, the ticket functions, and every Row Level Security policy.

create extension if not exists btree_gist with schema extensions;

-- ===== profiles =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  username text unique,
  role text not null default 'organizer' check (role in ('organizer','admin')),
  avatar_url text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

-- every new signup gets a profile with the organizer role; role can never come from signup data
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- only admins can change roles (the SQL editor / service role bypasses this for the first admin)
create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role and (select auth.uid()) is not null and not public.is_admin() then
    raise exception 'Only admins can change roles';
  end if;
  return new;
end; $$;
create trigger protect_profile_role before update on public.profiles
  for each row execute function public.protect_profile_role();

-- ===== venues =====
create table public.venues (
  id bigint generated always as identity primary key,
  name text not null,
  address text,
  type text,
  capacity int not null check (capacity > 0),
  created_at timestamptz not null default now()
);

-- ===== events =====
create table public.events (
  id bigint generated always as identity primary key,
  organizer_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  venue_id bigint references public.venues(id) on delete restrict,
  name text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  objectives text,
  scope text,
  content_type text,
  poster_url text,
  status text not null default 'draft' check (status in ('draft','pending','approved','rejected')),
  reviewed_by uuid references public.profiles(id),
  review_comments text,
  reviewed_at timestamptz,
  submitter_name text,
  submitter_position text,
  submitter_phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_time_order check (ends_at > starts_at),
  -- no two pending/approved events in the same venue at overlapping times (fixes the old same-day bug)
  constraint events_no_venue_clash exclude using gist (
    venue_id with =, tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pending','approved') and venue_id is not null)
);
create index on public.events (organizer_id);
create index on public.events (status, starts_at);

-- organizers can't approve, can't touch review fields, can't hand events to someone else
create or replace function public.guard_event_changes()
returns trigger language plpgsql set search_path = '' as $$
begin
  if public.is_admin() then
    if new.status in ('approved','rejected') and new.status is distinct from old.status then
      new.reviewed_by := (select auth.uid());
      new.reviewed_at := now();
    end if;
  elsif (select auth.uid()) is not null then
    if new.status not in ('draft','pending')
       or new.organizer_id is distinct from old.organizer_id
       or new.reviewed_by is distinct from old.reviewed_by
       or new.review_comments is distinct from old.review_comments
       or new.reviewed_at is distinct from old.reviewed_at then
      raise exception 'Only admins can review events';
    end if;
  end if;
  new.updated_at := now();
  return new;
end; $$;
create trigger guard_event_changes before update on public.events
  for each row execute function public.guard_event_changes();

-- ===== guests =====
create table public.guests (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  name text not null,
  designation text,
  organization text,
  guest_type text
);
create index on public.guests (event_id);

-- ===== tickets =====
create table public.tickets (
  id bigint generated always as identity primary key,
  event_id bigint not null references public.events(id) on delete cascade,
  name text not null,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  attended boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index tickets_one_per_email on public.tickets (event_id, lower(email));

-- registration: the only way to create a ticket. Locks the event row so two people can't take the last seat.
create or replace function public.register_for_event(p_event_id bigint, p_name text, p_email text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_event public.events;
  v_capacity int;
  v_taken int;
  v_token uuid;
begin
  if coalesce(trim(p_name),'') = '' or p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please enter your name and a valid email';
  end if;
  select * into v_event from public.events where id = p_event_id for update;
  if not found or v_event.status <> 'approved' then
    raise exception 'This event is not open for registration';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'This event has already started';
  end if;
  select capacity into v_capacity from public.venues where id = v_event.venue_id;
  select count(*) into v_taken from public.tickets where event_id = p_event_id;
  if v_capacity is not null and v_taken >= v_capacity then
    raise exception 'Sorry, this event is full';
  end if;
  insert into public.tickets (event_id, name, email)
  values (p_event_id, trim(p_name), lower(trim(p_email)))
  returning token into v_token;
  return v_token;
exception when unique_violation then
  raise exception 'This email is already registered for this event';
end; $$;

-- ticket page: look up one ticket by its secret token
create or replace function public.get_ticket(p_token uuid)
returns table (ticket_name text, ticket_email text, attended boolean, event_id bigint, event_name text,
               starts_at timestamptz, ends_at timestamptz, venue_name text, venue_address text)
language sql stable security definer set search_path = '' as $$
  select t.name, t.email, t.attended, e.id, e.name, e.starts_at, e.ends_at, v.name, v.address
  from public.tickets t
  join public.events e on e.id = t.event_id
  left join public.venues v on v.id = e.venue_id
  where t.token = p_token;
$$;

-- seats left, readable by anyone for approved events
create or replace function public.seats_left(p_event_id bigint)
returns int language sql stable security definer set search_path = '' as $$
  select greatest(v.capacity - (select count(*) from public.tickets t where t.event_id = e.id), 0)::int
  from public.events e join public.venues v on v.id = e.venue_id
  where e.id = p_event_id and e.status = 'approved';
$$;

revoke execute on function public.register_for_event(bigint,text,text) from public;
revoke execute on function public.get_ticket(uuid) from public;
revoke execute on function public.seats_left(bigint) from public;
grant execute on function public.register_for_event(bigint,text,text) to anon, authenticated;
grant execute on function public.get_ticket(uuid) to anon, authenticated;
grant execute on function public.seats_left(bigint) to anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ===== Row Level Security =====
alter table public.profiles enable row level security;
alter table public.venues enable row level security;
alter table public.events enable row level security;
alter table public.guests enable row level security;
alter table public.tickets enable row level security;

-- profiles
create policy "read own profile or admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());
create policy "update own profile or admin" on public.profiles for update to authenticated
  using (id = (select auth.uid()) or public.is_admin())
  with check (id = (select auth.uid()) or public.is_admin());

-- venues
create policy "anyone reads venues" on public.venues for select to anon, authenticated using (true);
create policy "admins insert venues" on public.venues for insert to authenticated with check (public.is_admin());
create policy "admins update venues" on public.venues for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete venues" on public.venues for delete to authenticated using (public.is_admin());

-- events
create policy "public reads approved events" on public.events for select to anon
  using (status = 'approved');
create policy "users read approved, own, or all if admin" on public.events for select to authenticated
  using (status = 'approved' or organizer_id = (select auth.uid()) or public.is_admin());
create policy "organizers create own events" on public.events for insert to authenticated
  with check (organizer_id = (select auth.uid()) and status in ('draft','pending'));
create policy "organizers edit own draft/rejected, admins edit any" on public.events for update to authenticated
  using ((organizer_id = (select auth.uid()) and status in ('draft','rejected')) or public.is_admin())
  with check ((organizer_id = (select auth.uid()) and status in ('draft','pending')) or public.is_admin());
create policy "organizers delete own drafts, admins delete any" on public.events for delete to authenticated
  using ((organizer_id = (select auth.uid()) and status = 'draft') or public.is_admin());

-- guests (visibility follows the event)
create policy "read guests of visible events" on public.guests for select to anon, authenticated
  using (exists (select 1 from public.events e where e.id = event_id));
create policy "manage guests of own editable events" on public.guests for all to authenticated
  using (public.is_admin() or exists (select 1 from public.events e where e.id = event_id
           and e.organizer_id = (select auth.uid()) and e.status in ('draft','rejected')))
  with check (public.is_admin() or exists (select 1 from public.events e where e.id = event_id
           and e.organizer_id = (select auth.uid()) and e.status in ('draft','rejected')));

-- tickets: no direct inserts (use register_for_event); organizers see tickets for their own events
create policy "organizer or admin reads tickets" on public.tickets for select to authenticated
  using (public.is_admin() or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = (select auth.uid())));
create policy "organizer or admin marks attendance" on public.tickets for update to authenticated
  using (public.is_admin() or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = (select auth.uid())))
  with check (public.is_admin() or exists (select 1 from public.events e where e.id = event_id and e.organizer_id = (select auth.uid())));

-- ===== poster storage =====
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('posters', 'posters', true, 3145728, array['image/jpeg','image/png','image/webp']);
create policy "users upload posters to own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users replace own posters" on storage.objects for update to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own posters" on storage.objects for delete to authenticated
  using (bucket_id = 'posters' and (storage.foldername(name))[1] = (select auth.uid())::text);
