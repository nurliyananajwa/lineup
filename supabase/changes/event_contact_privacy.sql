-- RELEASE COORDINATION REQUIRED: apply after deploying the public-client changes.
-- The old application uses a public SELECT * and will fail after this restriction.
-- Public readers receive event details; authenticated management rows require
-- ownership/admin rights. No contact data is copied or deleted.
revoke select on public.events from public, anon;
grant select (id, name, starts_at, ends_at, venue_id, objectives, scope,
  content_type, poster_url, status) on public.events to anon;
alter policy "users read approved, own, or all if admin" on public.events
  using (organizer_id = (select auth.uid()) or (select public.is_admin()));
