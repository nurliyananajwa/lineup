import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import VenueForm from '@/components/VenueForm'
import { createVenue, deleteVenue } from './actions'

export const metadata = { title: 'Venues · Lineup' }

async function VenuesPageContent({ searchParams }: PageProps<'/admin/venues'>) {
  await requireRole('admin')
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: venues } = await supabase.from('venues').select('*').order('name')

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Venues</h1>
      {error === 'in-use' && (
        <p className="alert-error">That venue has events booked, so it can&apos;t be deleted.</p>
      )}

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 text-muted">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Type</th>
              <th className="px-6 py-3 font-medium">Capacity</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {venues?.map((v) => (
              <tr key={v.id}>
                <td className="px-6 py-3">
                  <p className="font-medium">{v.name}</p>
                  {v.address && <p className="text-muted">{v.address}</p>}
                </td>
                <td className="px-6 py-3">{v.type ?? '—'}</td>
                <td className="px-6 py-3">{v.capacity.toLocaleString()}</td>
                <td className="px-6 py-3">
                  <div className="flex justify-end gap-2">
                    <Link href={`/admin/venues/${v.id}`} className="btn-secondary px-3 py-1.5">Edit</Link>
                    {/* bind() fills in the venue id, so the button only needs to submit */}
                    <form action={deleteVenue.bind(null, v.id)}>
                      <button className="btn-danger">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {venues?.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-6 text-center text-muted">No venues yet. Add one below.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <section className="card space-y-4">
        <h2 className="text-lg font-semibold">Add a venue</h2>
        <VenueForm action={createVenue} submitLabel="Add venue" />
      </section>
    </div>
  )
}

// Reading the login cookie or the URL happens at request time, so it sits inside <Suspense>.
export default function VenuesPage(props: PageProps<'/admin/venues'>) {
  return (
    <Suspense fallback={<Loading />}>
      <VenuesPageContent {...props} />
    </Suspense>
  )
}
