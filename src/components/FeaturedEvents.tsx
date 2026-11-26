'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import Icon from '@/components/workspace/Icon'
import type { LandingEvent } from '@/lib/landing-event'
import styles from '@/app/landing.module.css'

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
      <section className={styles.gallery} id="featured-events" aria-labelledby="featured-events-title">
        <div className={styles.galleryHead}>
          <div>
            <h2 id="featured-events-title">Featured events</h2>
            {samples && <p>Sample events in Kuala Lumpur</p>}
          </div>
          <a className={styles.listJump} href="#events">Go to upcoming events <Icon name="arrow-up-right" /></a>
        </div>

        {categories.size > 1 && (
          <div className={styles.filters} role="group" aria-label="Filter events by category">
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
        <ul className={styles.posterGrid} role="list" aria-label="Featured event posters">
          {shown.map(event => (
            <li className={styles.posterCard} key={event.id}>
              <div className={styles.posterViewport}>
                <div className={styles.poster} data-testid="landing-poster">
                  {event.poster && (
                    // Organisers may supply external event posters.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={event.poster} alt="" loading="lazy" />
                  )}
                </div>
              </div>
              <div className={styles.posterCaption}>
                <div>
                  <h3>{event.name}</h3>
                  <p>{[event.category, event.venue].filter(Boolean).join(' · ')}</p>
                  <p>{event.time}</p>
                </div>
                <Icon name="arrow-up-right" />
              </div>
              {event.href ? (
                <Link className={styles.posterLink} href={event.href} aria-label={`View event: ${event.name}`} />
              ) : (
                <button type="button" className={styles.posterLink} aria-label={`Preview event: ${event.name}`} onClick={() => {
                  setSelected(event)
                  dialog.current?.showModal()
                }} />
              )}
            </li>
          ))}
        </ul>
      </section>
      {samples && (
        <dialog ref={dialog} className={styles.eventDialog} aria-labelledby="landing-dialog-title"
          onClick={click => { if (click.target === click.currentTarget) dialog.current?.close() }}>
          <div>
            <div className={styles.dialogHead}>
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
