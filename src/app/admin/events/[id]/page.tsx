import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Loading from '@/components/Loading'
import EventDetails from '@/components/EventDetails'
import ReviewForm from '@/components/ReviewForm'
import { requireRole } from '@/lib/auth'
import { getEventWithGuests, parseId } from '@/lib/queries'
import { reviewEvent } from '../actions'

export const metadata = { title: 'Review event · Lineup' }

async function AdminEventContent({ params }: PageProps<'/admin/events/[id]'>) {
  await requireRole('admin')
  const id = parseId((await params).id)
  if (!id) notFound()
  const { event, guests } = await getEventWithGuests(id)
  if (!event || event.status === 'draft') notFound()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/admin/events" className="link text-sm">← Back to review list</Link>
      <EventDetails event={event} guests={guests} showStatus />

      {(event.submitter_name || event.submitter_phone) && (
        <section className="card text-sm">
          <h2 className="mb-1 font-semibold">Person in charge</h2>
          <p>{[event.submitter_name, event.submitter_position, event.submitter_phone].filter(Boolean).join(' · ')}</p>
        </section>
      )}

      {event.status === 'pending' && <ReviewForm action={reviewEvent.bind(null, event.id)} />}
    </div>
  )
}

export default function AdminEventPage(props: PageProps<'/admin/events/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminEventContent {...props} />
    </Suspense>
  )
}
