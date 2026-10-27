import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'
import Loading from '@/components/Loading'
import EventDetails from '@/components/EventDetails'
import RegisterForm from '@/components/RegisterForm'
import { createClient } from '@/lib/supabase/server'
import { getEventWithGuests, parseId } from '@/lib/queries'
import { register } from './actions'

async function PublicEventContent({ params }: PageProps<'/events/[id]'>) {
  await connection() // "has it started yet?" depends on the current time
  const id = parseId((await params).id)
  if (!id) notFound()

  // Visitors only ever get approved events back. Organizers can preview their own.
  const { event, guests } = await getEventWithGuests(id)
  if (!event) notFound()

  const supabase = await createClient()
  const { data: seatsLeft } = await supabase.rpc('seats_left', { p_event_id: id })
  const started = new Date(event.starts_at) <= new Date()
  const open = event.status === 'approved' && !started && (seatsLeft ?? 0) > 0

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <Link href="/" className="link text-sm">← All events</Link>
        <div className="mt-4">
          <EventDetails event={event} guests={guests} showStatus={event.status !== 'approved'} />
        </div>
      </div>

      <aside className="card h-fit space-y-4 lg:sticky lg:top-6">
        {event.status !== 'approved' ? (
          <p className="text-sm text-muted">This is a preview. Registration opens once an admin approves the event.</p>
        ) : started ? (
          <p className="font-medium">This event has already started.</p>
        ) : (seatsLeft ?? 0) <= 0 ? (
          <p className="font-medium">This event is full.</p>
        ) : (
          <>
            <div>
              <p className="text-lg font-semibold">Register for free</p>
              <p className="text-sm text-muted">{seatsLeft} seats left</p>
            </div>
            {open && <RegisterForm action={register.bind(null, event.id)} />}
          </>
        )}
      </aside>
    </div>
  )
}

export default function PublicEventPage(props: PageProps<'/events/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <PublicEventContent {...props} />
    </Suspense>
  )
}
