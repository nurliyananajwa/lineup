import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Loading from '@/components/Loading'
import EventForm from '@/components/EventForm'
import EventDetails from '@/components/EventDetails'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { getEventWithGuests, getVenueOptions, parseId } from '@/lib/queries'
import { isoToMalaysiaLocal } from '@/lib/events'
import { STATUS_STYLES } from '@/lib/format'
import { deleteDraft, saveEvent } from '../actions'

export const metadata = { title: 'Event · Lineup' }

const MESSAGES: Record<string, { text: string; tone: 'success' | 'error' }> = {
  draft: { text: 'Draft saved.', tone: 'success' },
  submitted: { text: 'Submitted. An admin will review it soon.', tone: 'success' },
  clash: { text: 'Saved as a draft, but not submitted: the venue is already booked at that time.', tone: 'error' },
  submit: { text: 'Saved as a draft, but it could not be submitted. Please try again.', tone: 'error' },
}

async function OrganizerEventContent({ params, searchParams }: PageProps<'/organizer/events/[id]'>) {
  const profile = await requireRole('organizer')
  const id = parseId((await params).id)
  if (!id) notFound()
  const query = await searchParams
  const notice = MESSAGES[String(query.saved ?? query.error ?? '')]

  const { event, guests } = await getEventWithGuests(id)
  if (!event || event.organizer_id !== profile.id) notFound()

  const editable = event.status === 'draft' || event.status === 'rejected'

  // How many people registered (only meaningful once approved).
  let registered = 0
  if (event.status === 'approved') {
    const supabase = await createClient()
    registered = (await supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('event_id', id)).count ?? 0
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/organizer" className="link text-sm">← Back to my events</Link>
      {notice && <p className={notice.tone === 'success' ? 'alert-success' : 'alert-error'}>{notice.text}</p>}

      {editable ? (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Edit event</h1>
            <span className={`badge ${STATUS_STYLES[event.status]}`}>{event.status}</span>
          </div>
          {event.status === 'rejected' && event.review_comments && (
            <p className="alert-error">Admin comment: {event.review_comments}. Make changes and submit again.</p>
          )}
          <EventForm
            action={saveEvent.bind(null, event.id)}
            venues={await getVenueOptions()}
            posterUrl={event.poster_url}
            initial={{
              name: event.name,
              venue_id: event.venue_id ? String(event.venue_id) : '',
              starts_at: isoToMalaysiaLocal(event.starts_at),
              ends_at: isoToMalaysiaLocal(event.ends_at),
              objectives: event.objectives ?? '',
              scope: event.scope ?? '',
              content_type: event.content_type ?? '',
              submitter_name: event.submitter_name ?? '',
              submitter_position: event.submitter_position ?? '',
              submitter_phone: event.submitter_phone ?? '',
              guests: guests.map((g) => ({
                name: g.name, designation: g.designation ?? '', organization: g.organization ?? '', guest_type: g.guest_type ?? '',
              })),
            }}
          />
          {event.status === 'draft' && (
            <form action={deleteDraft.bind(null, event.id)} className="border-t border-zinc-200 pt-6">
              <button className="btn-danger">Delete this draft</button>
            </form>
          )}
        </>
      ) : (
        <>
          {event.status === 'pending' && (
            <p className="alert-success">Waiting for admin review. You can&apos;t edit it while it&apos;s being reviewed.</p>
          )}
          {event.status === 'approved' && (
            <div className="card flex flex-wrap items-center justify-between gap-3">
              <p><span className="text-2xl font-bold">{registered}</span> <span className="text-muted">registered{event.venues ? ` of ${event.venues.capacity}` : ''}</span></p>
              <div className="flex gap-2">
                <Link href={`/check-in/${event.id}`} className="btn-primary">Check-in</Link>
                <Link href={`/events/${event.id}`} className="btn-secondary">View public page</Link>
              </div>
            </div>
          )}
          <EventDetails event={event} guests={guests} showStatus />
        </>
      )}
    </div>
  )
}

export default function OrganizerEventPage(props: PageProps<'/organizer/events/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <OrganizerEventContent {...props} />
    </Suspense>
  )
}
