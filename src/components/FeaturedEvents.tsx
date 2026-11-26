'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/workspace/Icon'
import type { LandingEvent } from '@/lib/landing-event'

export default function FeaturedEvents({ events, samples }: { events: LandingEvent[]; samples: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [category, setCategory] = useState<string | null>(null)
  const [selected, setSelected] = useState<LandingEvent>()
  const categories = new Map<string, number>()
  for (const event of events) {
    if (event.category) categories.set(event.category, (categories.get(event.category) ?? 0) + 1)
  }
  const shown = category === null ? events : events.filter(event => event.category === category)

  return (
    <>
      <section className="landing-gallery" id="featured-events" aria-labelledby="featured-events-title">
        <div className="landing-gallery-head">
          <div>
            <h2 id="featured-events-title">Featured events</h2>
            {samples && <p>Sample events in Kuala Lumpur</p>}
          </div>
          <a className="landing-list-jump" href="#events">Go to upcoming events <Icon name="arrow-up-right" /></a>
        </div>

        {categories.size > 1 && (
          <div className="landing-filters" role="group" aria-label="Filter events by category">
            <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)}>
              All <span>{events.length}</span>
            </button>
            {Array.from(categories, ([label, count]) => (
              <button type="button" key={label} aria-pressed={category === label} onClick={() => setCategory(label)}>
                {label} <span>{count}</span>
              </button>
            ))}
          </div>
        )}
        <p className="sr-only" role="status">{shown.length} {shown.length === 1 ? 'event' : 'events'} shown</p>
        <ul className="landing-poster-grid" role="list" aria-label="Featured event posters">
          {shown.map(event => (
            <li className="landing-poster-card" key={event.id}>
              <div className="landing-poster-viewport">
                <div className="landing-poster">
                  {event.poster && (
                    // Organisers may supply external event posters.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.poster} alt="" loading="lazy" />
                  )}
                </div>
              </div>
              <div className="landing-poster-caption">
                <div>
                  <h3>{event.href ? (
                    <Link className="landing-poster-link" href={event.href}>{event.name}</Link>
                  ) : (
                    <button type="button" className="landing-poster-link" aria-label={`Preview event: ${event.name}`} onClick={() => {
                      setSelected(event)
                      dialog.current?.showModal()
                    }}>{event.name}</button>
                  )}</h3>
                  <p>{[event.category, event.venue].filter(Boolean).join(' · ')}</p>
                  <p>{event.time}</p>
                </div>
                <Icon name="arrow-up-right" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      {samples && (
        <dialog ref={dialog} className="landing-event-dialog" aria-labelledby="landing-dialog-title"
          onClick={click => { if (click.target === click.currentTarget) dialog.current?.close() }}>
          <div>
            <div className="landing-dialog-head">
              <span>Sample event</span>
              <button type="button" onClick={() => dialog.current?.close()} aria-label="Close event preview"><Icon name="x" /></button>
            </div>
            <h2 id="landing-dialog-title">{selected?.name}</h2>
            <p>{selected?.time} · {selected?.venue}</p>
            <p>{selected?.description}</p>
          </div>
        </dialog>
      )}
    </>
  )
}
