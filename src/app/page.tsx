import { Suspense } from 'react'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { formatRange } from '@/lib/format'

export const metadata = { title: 'Upcoming events · Lineup' }

// Public home page: upcoming approved events.
// No "status = approved" filter is needed for safety: the database only ever
// returns approved events to visitors. The filter is here so a logged-in
// organizer doesn't see their own drafts mixed into the public list.
async function HomePageContent() {
  const supabase = await createClient()
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, starts_at, ends_at, poster_url, venues(name)')
    .eq('status', 'approved')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-3xl font-bold tracking-tight">Upcoming events</h1>
        <p className="mt-2 text-muted">Find an event, register in seconds, and get your QR ticket.</p>
      </section>

      {error && <p className="alert-error">Couldn&apos;t load events. Please try again.</p>}

      {events && events.length === 0 && (
        <div className="card text-center text-muted">No upcoming events yet. Check back soon.</div>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events?.map((e) => (
          <li key={e.id}>
            <Link href={`/events/${e.id}`} className="card block h-full p-0 transition hover:shadow-md">
              {e.poster_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={e.poster_url} alt="" className="h-40 w-full rounded-t-xl object-cover" />
              ) : (
                <div className="h-40 rounded-t-xl bg-gradient-to-br from-indigo-500 to-violet-500" />
              )}
              <div className="space-y-1 p-4">
                <h2 className="font-semibold">{e.name}</h2>
                <p className="text-sm text-muted">{formatRange(e.starts_at, e.ends_at)}</p>
                {e.venues?.name && <p className="text-sm text-muted">{e.venues.name}</p>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

// Reading the login cookie happens at request time, so it sits inside <Suspense>.
export default function HomePage() {
  return (
    <Suspense fallback={<Loading />}>
      <HomePageContent />
    </Suspense>
  )
}
