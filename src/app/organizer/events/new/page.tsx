import { Suspense } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'
import EventForm from '@/components/EventForm'
import { requireRole } from '@/lib/auth'
import { getVenueOptions } from '@/lib/queries'
import { saveEvent } from '../actions'

export const metadata = { title: 'New event · Lineup' }

async function NewEventContent() {
  await requireRole('organizer')
  const venues = await getVenueOptions()
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/organizer" className="link text-sm">← Back to my events</Link>
      <h1 className="text-2xl font-semibold">New event</h1>
      {/* bind(null, null) = "this is a new event" */}
      <EventForm action={saveEvent.bind(null, null)} venues={venues} />
    </div>
  )
}

export default function NewEventPage() {
  return (
    <Suspense fallback={<Loading />}>
      <NewEventContent />
    </Suspense>
  )
}
