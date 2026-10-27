import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/VenueForm'
import { updateVenue } from '../actions'

export const metadata = { title: 'Edit venue · Lineup' }

async function EditVenuePageContent({ params }: PageProps<'/admin/venues/[id]'>) {
  await requireRole('admin')
  const { id } = await params
  const venueId = Number(id)
  if (!Number.isInteger(venueId)) notFound()

  const supabase = await createClient()
  const { data: venue } = await supabase.from('venues').select('*').eq('id', venueId).single()
  if (!venue) notFound()

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link href="/admin/venues" className="link text-sm">← Back to venues</Link>
      <div className="card space-y-4">
        <h1 className="text-xl font-semibold">Edit {venue.name}</h1>
        <VenueForm action={updateVenue.bind(null, venue.id)} venue={venue} submitLabel="Save changes" />
      </div>
    </div>
  )
}

// Reading the login cookie or the URL happens at request time, so it sits inside <Suspense>.
export default function EditVenuePage(props: PageProps<'/admin/venues/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <EditVenuePageContent {...props} />
    </Suspense>
  )
}
