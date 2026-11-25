-- Compatible with the currently deployed application. The separate privacy
-- change must wait for the corresponding public-client application release.

-- These capabilities are not protected by row-level policies and the app never
-- needs them. Keep the existing CRUD grants and RLS policies.
revoke truncate, references, trigger on public.events, public.guests,
  public.profiles, public.tickets, public.venues from anon, authenticated;
create index if not exists events_reviewed_by_idx on public.events (reviewed_by);
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

create or replace function public.validate_event_submission()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if trim(new.name) = '' then raise exception 'Give the event a name'; end if;
  if tg_op = 'INSERT' and (select auth.uid()) is not null and not public.is_admin()
     and (new.reviewed_by is not null or new.reviewed_at is not null or new.review_comments is not null) then
    raise exception 'Only admins can set review fields';
  end if;
  if new.status in ('pending','approved') then
    if new.venue_id is null or coalesce(trim(new.objectives),'') = '' then
      raise exception 'A submitted event needs a venue and objectives';
    end if;
    if new.status = 'pending' and (tg_op = 'INSERT' or old.status is distinct from 'pending')
       and new.starts_at <= now() then
      raise exception 'The start time must be in the future';
    end if;
  end if;
  return new;
end; $$;
create trigger validate_event_submission before insert or update on public.events
  for each row execute function public.validate_event_submission();
revoke execute on function public.validate_event_submission() from public, anon, authenticated;

-- A single invoker transaction saves the event and guests. RLS still applies.
-- A clash or guest error rolls everything back, including the existing guest list.
create or replace function public.save_event_with_guests(
  p_event_id bigint, p_event jsonb, p_guests jsonb, p_submit boolean
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare
  v_id bigint;
  v_owner uuid;
  v_status text;
begin
  if (select auth.uid()) is null then raise exception 'Please log in'; end if;
  if coalesce(jsonb_typeof(p_event),'') <> 'object'
     or coalesce(jsonb_typeof(p_guests),'') <> 'array' then
    raise exception 'Invalid event details';
  end if;
  if jsonb_array_length(p_guests) > 50 then raise exception 'Use at most 50 guests'; end if;
  if exists (select 1 from jsonb_array_elements(p_guests) g
    where coalesce(trim(g->>'name'),'') = '' or jsonb_typeof(g) <> 'object') then
    raise exception 'Each guest needs a name';
  end if;
  if p_event_id is null then
    insert into public.events (name, venue_id, starts_at, ends_at, objectives, scope,
      content_type, submitter_name, submitter_position, submitter_phone, poster_url, status)
    values (trim(p_event->>'name'), nullif(p_event->>'venue_id','')::bigint,
      (p_event->>'starts_at')::timestamptz, (p_event->>'ends_at')::timestamptz,
      nullif(trim(p_event->>'objectives'),''), nullif(p_event->>'scope',''),
      nullif(p_event->>'content_type',''), nullif(p_event->>'submitter_name',''),
      nullif(p_event->>'submitter_position',''), nullif(p_event->>'submitter_phone',''),
      nullif(p_event->>'poster_url',''), 'draft') returning id into v_id;
  else
    select organizer_id, status into v_owner, v_status from public.events
      where id = p_event_id for update;
    if not found or v_owner <> (select auth.uid()) or v_status not in ('draft','rejected') then
      raise exception 'This event can no longer be edited';
    end if;
    v_id := p_event_id;
    update public.events set name = trim(p_event->>'name'),
      venue_id = nullif(p_event->>'venue_id','')::bigint,
      starts_at = (p_event->>'starts_at')::timestamptz, ends_at = (p_event->>'ends_at')::timestamptz,
      objectives = nullif(trim(p_event->>'objectives'),''), scope = nullif(p_event->>'scope',''),
      content_type = nullif(p_event->>'content_type',''), submitter_name = nullif(p_event->>'submitter_name',''),
      submitter_position = nullif(p_event->>'submitter_position',''),
      submitter_phone = nullif(p_event->>'submitter_phone',''),
      poster_url = case when p_event ? 'poster_url' then nullif(p_event->>'poster_url','') else poster_url end,
      status = 'draft'
    where id = v_id;
  end if;
  delete from public.guests where event_id = v_id;
  insert into public.guests (event_id, name, designation, organization, guest_type)
    select v_id, trim(g->>'name'), nullif(g->>'designation',''),
      nullif(g->>'organization',''), nullif(g->>'guest_type','')
    from jsonb_array_elements(p_guests) g;
  if p_submit then update public.events set status = 'pending' where id = v_id; end if;
  return v_id;
end; $$;
revoke execute on function public.save_event_with_guests(bigint,jsonb,jsonb,boolean) from public, anon;
grant execute on function public.save_event_with_guests(bigint,jsonb,jsonb,boolean) to authenticated;

create or replace function public.guard_ticket_changes()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if (select auth.uid()) is not null then
    if new.id is distinct from old.id or new.event_id is distinct from old.event_id
      or new.name is distinct from old.name or new.email is distinct from old.email
      or new.token is distinct from old.token or new.created_at is distinct from old.created_at
      or (new.attended = old.attended and new.checked_in_at is distinct from old.checked_in_at) then
      raise exception 'Only attendance can be changed on a ticket';
    end if;
    if not exists (select 1 from public.events e where e.id = old.event_id and e.status = 'approved') then
      raise exception 'Check-in is only available for approved events';
    end if;
  end if;
  if new.attended and not old.attended then new.checked_in_at := now();
  elsif not new.attended then new.checked_in_at := null;
  end if;
  return new;
end; $$;
