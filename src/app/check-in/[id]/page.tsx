import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Loading from '@/components/Loading'
import CheckInScanner from '@/components/CheckInScanner'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseId } from '@/lib/queries'
import { formatRange } from '@/lib/format'
import { checkIn, setAttendance } from './actions'

export const metadata = { title: 'Check-in · Lineup' }

const time = (iso: string) =>
  new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))

async function CheckInContent({ params }: PageProps<'/check-in/[id]'>) {
  const profile = await requireRole()
  const id = parseId((await params).id)
  if (!id) notFound()

  const supabase = await createClient()
  const { data: event } = await supabase
    .from('events')
    .select('id, name, status, organizer_id, starts_at, ends_at, venues(name, capacity)')
    .eq('id', id)
    .maybeSingle()
  // Only this event's organizer or an admin can run check-in, and only for approved events.
  if (!event || event.status !== 'approved') notFound()
  if (profile.role !== 'admin' && event.organizer_id !== profile.id) notFound()

  const { data: tickets } = await supabase
    .from('tickets')
    .select('id, name, email, attended, checked_in_at')
    .eq('event_id', id)
    .order('attended')
    .order('name')
  const list = tickets ?? []
  const inCount = list.filter((t) => t.attended).length
  const back = profile.role === 'admin' ? `/admin/events/${id}` : `/organizer/events/${id}`

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={back} className="link text-sm">← Back to event</Link>
      <header>
        <h1 className="text-2xl font-semibold">Check-in: {event.name}</h1>
        <p className="text-muted">{formatRange(event.starts_at, event.ends_at)}{event.venues ? ` · ${event.venues.name}` : ''}</p>
      </header>

      <div className="card flex items-baseline gap-2">
        <span className="text-4xl font-bold text-emerald-700">{inCount}</span>
        <span className="text-muted">of {list.length} registered checked in</span>
      </div>

      <CheckInScanner checkIn={checkIn.bind(null, id)} />

      <section className="card p-0">
        <h2 className="border-b border-zinc-200 px-6 py-4 text-lg font-semibold">Attendees</h2>
        {list.length === 0 ? (
          <p className="px-6 py-6 text-center text-muted">Nobody has registered yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {list.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-6 py-3">
                <div className="flex-1">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted">{t.email}</p>
                </div>
                {t.attended ? (
                  <>
                    <span className="badge bg-emerald-100 text-emerald-800">
                      In{t.checked_in_at ? ` · ${time(t.checked_in_at)}` : ''}
                    </span>
                    <form action={setAttendance.bind(null, id, t.id, false)}>
                      <button className="text-sm text-muted hover:text-zinc-900 hover:underline">Undo</button>
                    </form>
                  </>
                ) : (
                  <form action={setAttendance.bind(null, id, t.id, true)}>
                    <button className="btn-secondary px-3 py-1.5">Check in</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function CheckInPage(props: PageProps<'/check-in/[id]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <CheckInContent {...props} />
    </Suspense>
  )
}
