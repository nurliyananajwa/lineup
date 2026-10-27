# Lineup

Organizers submit events, admins approve them, and anyone can register and get a QR ticket.

A rebuild of an earlier CakePHP project on a modern stack, with the security rules enforced by the database itself.

## Live demo

**https://lineup-gilt.vercel.app**

| Role | Email | Password |
| --- | --- | --- |
| Admin | admin.demo@example.com | Demo1234! |
| Organizer | organizer.demo@example.com | Demo1234! |
| Organizer | organizer2.demo@example.com | Demo1234! |

Attendees don't need an account: open any event on the home page and register.

## Stack

- **Next.js 16** (App Router, Server Actions, TypeScript) with Tailwind CSS
- **Supabase**: PostgreSQL, Auth, Storage, Row Level Security
- **Vercel** for hosting

## How the rules are enforced

All permissions live in Postgres (`supabase/migrations/`), not only in page code:

| Rule | How |
| --- | --- |
| Nobody can sign up as an admin | A trigger creates every profile as `organizer`; only an admin can change roles |
| Organizers can't approve their own events | RLS + a trigger block status/review changes by non-admins |
| The public only sees approved events | RLS policy on `events` |
| No double-booked venues | Postgres exclusion constraint on venue + time range |
| No overselling seats | `register_for_event()` locks the event row, checks capacity, one ticket per email |

## Run it locally

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable key
3. Apply `supabase/migrations/*.sql` to your Supabase project
4. `npm run dev` and open http://localhost:3000

To make yourself an admin, sign up, then run in the Supabase SQL editor:

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

## Status

v1 live: accounts and roles, venues, event submission with guests and posters, admin review, public event pages, registration and QR tickets.

v2 in progress: done so far are QR check-in at the door (camera scanner, manual fallback, live attendee count), CSV export of attendees, and emails (approval/rejection to organizers, ticket to attendees; enabled when RESEND_API_KEY is set). Next: PDF export and supporting documents.
