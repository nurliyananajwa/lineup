-- Run after system_reliability.sql and event_contact_privacy.sql, in the SAME transaction. The caller must end
-- with ROLLBACK. Fixtures use existing demo identities but change no user data.
create temp table lineup_review_context (key text primary key, value text);
grant select on lineup_review_context to anon, authenticated;
do $$
declare v_organizer uuid; v_other uuid; v_admin uuid; v_venue bigint; v_event bigint;
begin
  select id into strict v_organizer from public.profiles where role='organizer' order by id limit 1;
  select id into strict v_other from public.profiles where role='organizer' and id<>v_organizer order by id limit 1;
  select id into strict v_admin from public.profiles where role='admin' order by id limit 1;
  insert into public.venues(name,capacity) values ('Review fixture '||gen_random_uuid(),1) returning id into v_venue;
  insert into public.events(organizer_id,venue_id,name,starts_at,ends_at,objectives,status,submitter_phone)
    values(v_organizer,v_venue,'Review approved fixture',now()+interval '30 days',now()+interval '30 days 1 hour',
      'Permission checks','approved','private-fixture-phone') returning id into v_event;
  insert into lineup_review_context values ('organizer',v_organizer::text),('other',v_other::text),
    ('admin',v_admin::text),('venue',v_venue::text),('event',v_event::text);
end; $$;

set local role anon;
do $$
declare v_event bigint := (select value::bigint from lineup_review_context where key='event'); v_token uuid;
begin
  assert exists(select 1 from public.events where id=v_event), 'Public approved event visibility';
  assert not exists(select 1 from public.events where status <> 'approved'), 'Public cannot read drafts or pending events';
  begin
    perform submitter_phone from public.events where id=v_event;
    raise exception 'FAIL: public contact data is readable';
  exception when insufficient_privilege then null; end;
  begin
    perform public.save_event_with_guests(null,'{}','[]',false);
    raise exception 'FAIL: public event write RPC is callable';
  exception when insufficient_privilege then null; end;
  v_token := public.register_for_event(v_event,'Review Attendee','review-fixture@example.com');
  assert exists(select 1 from public.get_ticket(v_token)), 'Token ticket lookup';
  assert public.seats_left(v_event)=0, 'Last seat consumed';
  begin
    perform public.register_for_event(v_event,'Second Attendee','second-fixture@example.com');
    raise exception 'FAIL: event was oversold';
  exception when raise_exception then
    if sqlerrm <> 'Sorry, this event is full' then raise; end if;
  end;
  begin
    perform * from public.tickets;
    if found then raise exception 'FAIL: public tickets are readable'; end if;
  exception when insufficient_privilege then null; end;
end; $$;

reset role;
select set_config('request.jwt.claims',json_build_object('sub',(select value from lineup_review_context where key='other'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare v_event bigint := (select value::bigint from lineup_review_context where key='event');
begin
  assert not exists(select 1 from public.events where id=v_event), 'Unrelated organizer cannot read management row';
  assert not exists(select 1 from public.tickets where event_id=v_event), 'Unrelated organizer cannot read attendees';
  begin
    perform public.event_organizer_contact(v_event);
    raise exception 'FAIL: organizer can read admin contact RPC';
  exception when raise_exception then
    if sqlerrm <> 'Only admins can look up organizer contact details' then raise; end if;
  end;
  begin
    update public.profiles set role='admin' where id=auth.uid();
    raise exception 'FAIL: role escalation succeeded';
  exception when raise_exception then
    if sqlerrm <> 'Only admins can change roles' then raise; end if;
  end;
end; $$;

reset role;
select set_config('request.jwt.claims',json_build_object('sub',(select value from lineup_review_context where key='organizer'),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare
  v_event bigint := (select value::bigint from lineup_review_context where key='event');
  v_venue bigint := (select value::bigint from lineup_review_context where key='venue');
  v_id bigint; v_ticket bigint; v_row jsonb;
begin
  assert (select submitter_phone='private-fixture-phone' from public.events where id=v_event), 'Owner can read private contact';
  v_row := jsonb_build_object('name','Atomic draft fixture','venue_id',v_venue,
    'starts_at',now()+interval '30 days','ends_at',now()+interval '30 days 1 hour','objectives','Atomic test');
  v_id := public.save_event_with_guests(null,v_row,'[{"name":"Original guest"}]',false);
  assert exists(select 1 from public.guests where event_id=v_id and name='Original guest'), 'Draft saves guests';
  begin
    perform public.save_event_with_guests(v_id,v_row||'{"name":"Should roll back"}', '[{"name":"Replacement guest"}]',true);
    raise exception 'FAIL: overlapping venue accepted';
  exception when exclusion_violation then null; end;
  assert (select name='Atomic draft fixture' and status='draft' from public.events where id=v_id), 'Failed save restores event';
  assert exists(select 1 from public.guests where event_id=v_id and name='Original guest'), 'Failed save restores guests';
  assert not exists(select 1 from public.guests where event_id=v_id and name='Replacement guest'), 'No partial guest save';
  v_row := v_row || jsonb_build_object('starts_at',now()+interval '31 days','ends_at',now()+interval '31 days 1 hour');
  perform public.save_event_with_guests(v_id,v_row,'[{"name":"Submitted guest"}]',true);
  assert (select status='pending' from public.events where id=v_id), 'Submit transitions to pending';
  assert exists(select 1 from public.guests where event_id=v_id and name='Submitted guest'), 'Submission saves guests atomically';
  perform set_config('lineup_review.pending_id',v_id::text,true);
  begin
    update public.events set status='approved' where id=v_id;
    if found then raise exception 'FAIL: organizer self-approved event'; end if;
  exception when insufficient_privilege then null; end;
  begin
    insert into public.events(name,starts_at,ends_at,review_comments)
      values ('Forged review',now()+interval '32 days',now()+interval '32 days 1 hour','forged');
    raise exception 'FAIL: organizer forged review fields';
  exception when raise_exception then
    if sqlerrm <> 'Only admins can set review fields' then raise; end if;
  end;
  select id into strict v_ticket from public.tickets where event_id=v_event;
  update public.tickets set attended=true where id=v_ticket;
  assert (select attended and checked_in_at is not null from public.tickets where id=v_ticket), 'Attendance timestamp';
  begin
    update public.tickets set checked_in_at=now()-interval '1 day' where id=v_ticket;
    raise exception 'FAIL: check-in timestamp tampering';
  exception when raise_exception then
    if sqlerrm <> 'Only attendance can be changed on a ticket' then raise; end if;
  end;
  begin
    update public.tickets set email='tampered@example.com' where id=v_ticket;
    raise exception 'FAIL: ticket identity tampering';
  exception when raise_exception then
    if sqlerrm <> 'Only attendance can be changed on a ticket' then raise; end if;
  end;
  update public.tickets set attended=false where id=v_ticket;
  assert (select not attended and checked_in_at is null from public.tickets where id=v_ticket), 'Undo clears timestamp';
end; $$;

reset role;
select set_config('request.jwt.claims',json_build_object('sub',(select value from lineup_review_context where key='admin'),'role','authenticated')::text,true);
set local role authenticated;
do $$
begin
  assert exists(select 1 from public.events where id=(select value::bigint from lineup_review_context where key='event')
    and submitter_phone='private-fixture-phone'), 'Admin management access';
  update public.events set status='approved',review_comments='Reviewed fixture'
    where id=current_setting('lineup_review.pending_id')::bigint;
  assert (select status='approved' and reviewed_by=auth.uid() and reviewed_at is not null
    from public.events where id=current_setting('lineup_review.pending_id')::bigint), 'Admin review records reviewer and time';
  assert not has_table_privilege('authenticated','public.events','TRUNCATE'), 'No authenticated TRUNCATE';
  assert not has_table_privilege('anon','public.events','TRUNCATE'), 'No public TRUNCATE';
end; $$;
reset role;
