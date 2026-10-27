import { Suspense } from 'react'
import Link from 'next/link'
import Loading from '@/components/Loading'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { formatRange, STATUS_STYLES } from '@/lib/format'

export const metadata = { title: 'Review events · Lineup' }

const TABS = ['pending', 'approved', 'rejected'] as const

async function AdminEventsContent({ searchParams }: PageProps<'/admin/events'>) {
  await requireRole('admin')
  const query = await searchParams
  const tab = TABS.find((t) => t === query.status) ?? 'pending'

  const supabase = await createClient()
  const { data: events } = await supabase
    .from('events')
    .select('id, name, status, starts_at, ends_at, submitter_name, venues(name)')
    .eq('status', tab)
    .order('starts_at')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Review events</h1>
      {query.done === 'approved' && <p className="alert-success">Event approved. It&apos;s now on the public page.</p>}
      {query.done === 'rejected' && <p className="alert-success">Event rejected. The organizer can see your comments.</p>}

      <nav className="flex gap-2">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/events?status=${t}`} className={t === tab ? 'btn-primary capitalize' : 'btn-secondary capitalize'}>
            {t}
          </Link>
        ))}
      </nav>

      {events && events.length > 0 ? (
        <ul className="card divide-y divide-zinc-100 p-0">
          {events.map((e) => (
            <li key={e.id}>
              <Link href={`/admin/events/${e.id}`} className="flex flex-wrap items-center gap-3 px-6 py-4 hover:bg-zinc-50">
                <div className="flex-1">
                  <p className="font-medium">{e.name}</p>
                  <p className="text-sm text-muted">
                    {formatRange(e.starts_at, e.ends_at)}
                    {e.venues?.name ? ` · ${e.venues.name}` : ''}
                    {e.submitter_name ? ` · by ${e.submitter_name}` : ''}
                  </p>
                </div>
                <span className={`badge ${STATUS_STYLES[e.status]}`}>{e.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="card text-center text-muted">No {tab} events.</div>
      )}
    </div>
  )
}

export default function AdminEventsPage(props: PageProps<'/admin/events'>) {
  return (
    <Suspense fallback={<Loading />}>
      <AdminEventsContent {...props} />
    </Suspense>
  )
}
