import { Suspense } from 'react'
import FeaturedEvents from '@/components/FeaturedEvents'
import Icon from '@/components/workspace/Icon'
import { sampleLandingEvents } from '@/lib/landing-preview'
import type { LandingEvent } from '@/lib/landing-event'
import './landing.css'
import Loading from '@/components/Loading'
import Link from 'next/link'
import { connection } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { formatRange } from '@/lib/format'

export const metadata = { title: 'Discover events · Lineup' }

// Public home page: upcoming approved events.
// No "status = approved" filter is needed for safety: the database only ever
// returns approved events to visitors. The filter is here so a logged-in
// organizer doesn't see their own drafts mixed into the public list.
async function HomePageContent() {
  // "Upcoming" depends on the current time, so tell Next.js to work it out per request.
  await connection()
  const supabase = await createPublicClient()
  const { data: events, error } = await supabase
    .from('events')
    .select('id, name, starts_at, ends_at, poster_url, venues(name)')
    .eq('status', 'approved')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')

  const live: (LandingEvent & { href: string })[] = (events ?? []).map(event => ({
    id: String(event.id), name: event.name, time: formatRange(event.starts_at, event.ends_at),
    venue: event.venues?.name ?? '', poster: event.poster_url, href: `/events/${event.id}`,
  }))
  const samples = process.env.NODE_ENV === 'development'
  const featured = samples ? sampleLandingEvents() : live.slice(0, 8)

  return (
    <div className="landing-home">
      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <h1 id="landing-title">Find your next event.</h1>
          <p>Discover events, reserve your spot, and get your QR ticket with Lineup.</p>
          <a className="landing-primary" href={featured.length ? '#featured-events' : '#events'}>Explore events <Icon name="arrow-right" /></a>
        </div>
      </section>

      {featured.length > 0 && <FeaturedEvents events={featured} samples={samples} />}

      <section className="landing-list" id="events" aria-labelledby="upcoming-events-title">
        <div className="landing-section-head">
          <h2 id="upcoming-events-title">Upcoming events</h2>
        </div>
        {error && <p className="alert-error">Couldn&apos;t load upcoming events. Please try again.</p>}
        {!error && live.length === 0 && <p className="landing-empty">No upcoming events yet. Check back soon.</p>}
        {live.length > 0 && (
          <ul className="landing-event-grid">
            {live.map(event => (
              <li key={event.id}>
                <Link href={event.href} className="landing-event-card">
                  <div className="landing-event-poster">
                    {event.poster && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={event.poster} alt="" loading="lazy" />
                    )}
                  </div>
                  <div>
                    <h3>{event.name}</h3>
                    <p>{event.time}</p>
                    {event.venue && <p>{event.venue}</p>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
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
