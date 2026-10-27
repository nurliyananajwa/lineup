import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRange, STATUS_STYLES } from '@/lib/format'

export const metadata = { title: 'My events · Lineup' }

async function OrganizerDashboardContent() {
  const profile = await requireRole('organizer')
  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, name, status, starts_at, ends_at, review_comments')
    .eq('organizer_id', profile.id)
    .order('starts_at', { ascending: false })

  const counts = (['draft', 'pending', 'approved', 'rejected'] as const).map((s) => ({
    status: s,
    n: events?.filter((e) => e.status === s).length ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My events</h1>
        <Link href="/organizer/events/new" className="btn-primary">New event</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        {counts.map((c) => (
          <div key={c.status} className="card">
            <span className={`badge ${STATUS_STYLES[c.status]}`}>{c.status}</span>
            <p className="mt-2 text-3xl font-bold">{c.n}</p>
          </div>
        ))}
      </div>

      {events && events.length > 0 ? (
        <ul className="card divide-y divide-zinc-100 p-0">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/organizer/events/${e.id}`} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-zinc-50">
              <div className="flex-1">
                <p className="font-medium">{e.name}</p>
                <p className="text-sm text-muted">{formatRange(e.starts_at, e.ends_at)}</p>
                {e.status === 'rejected' && e.review_comments && (
                  <p className="mt-1 text-sm text-rose-700">Admin: {e.review_comments}</p>
                )}
              </div>
              <span className={`badge ${STATUS_STYLES[e.status]}`}>{e.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card text-center text-muted">
          You haven&apos;t created any events yet. Click <strong>New event</strong> to start.
        </div>
      )}
    </div>
  )
}

// Reading the login cookie happens at request time, so it sits inside <Suspense>.
export default function OrganizerDashboard() {
  return (
    <Suspense fallback={<Loading />}>
      <OrganizerDashboardContent />
    </Suspense>
  )
}
