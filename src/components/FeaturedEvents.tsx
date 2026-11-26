'use client'

import { useRef, useState, type PointerEvent } from 'react'
import Link from 'next/link'
import Icon from '@/components/workspace/Icon'
import type { LandingEvent } from '@/lib/landing-event'

export default function FeaturedEvents({ events, samples }: { events: LandingEvent[]; samples: boolean }) {
  const viewport = useRef<HTMLUListElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ x: number; scroll: number; moved: boolean } | null>(null)
  const suppressClick = useRef(false)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<LandingEvent>()

  function slideWidth(track: HTMLUListElement) {
    const first = track.children[0] as HTMLElement
    const second = track.children[1] as HTMLElement | undefined
    return second ? second.offsetLeft - first.offsetLeft : track.clientWidth
  }

  function currentSlide(track: HTMLUListElement) {
    return Math.max(0, Math.min(events.length - 1, Math.round(track.scrollLeft / slideWidth(track))))
  }

  function goTo(index: number) {
    const track = viewport.current
    if (!track) return
    const next = Math.max(0, Math.min(events.length - 1, index))
    track.scrollTo({ left: next * slideWidth(track), behavior: 'auto' })
  }

  function move(event: PointerEvent<HTMLUListElement>) {
    const track = event.currentTarget
    const gesture = drag.current
    if (!gesture) return
    const distance = event.clientX - gesture.x
    if (!gesture.moved && Math.abs(distance) < 6) return
    if (!gesture.moved) {
      gesture.moved = true
      suppressClick.current = true
      track.setPointerCapture(event.pointerId)
      track.dataset.dragging = 'true'
    }
    track.scrollLeft = gesture.scroll - distance
  }

  function finish(track: HTMLUListElement) {
    if (!drag.current) return
    const start = Math.round(drag.current.scroll / slideWidth(track))
    const delta = track.scrollLeft - drag.current.scroll
    const moved = drag.current.moved
    drag.current = null
    delete track.dataset.dragging
    if (moved) {
      const target = Math.abs(delta) > 45 ? start + Math.sign(delta) * Math.max(1, Math.round(Math.abs(delta) / slideWidth(track))) : start
      goTo(target)
    }
  }

  return (
    <section className="landing-feature" aria-labelledby="featured-events-title">
      <div className="landing-section-head">
        <div>
          <h2 id="featured-events-title">Featured events</h2>
          <p>{samples ? 'Sample lineup · Drag or swipe to explore' : 'Drag or swipe to explore upcoming events'}</p>
        </div>
        {events.length > 1 && (
          <div className="landing-carousel-controls">
            <span role="status" aria-atomic="true" className="landing-count">{String(active + 1).padStart(2, '0')} / {events.length}</span>
            <button type="button" aria-label="Previous event" disabled={active === 0} onClick={() => goTo(active - 1)}><Icon name="chevron-left" /></button>
            <button type="button" aria-label="Next event" disabled={active === events.length - 1} onClick={() => goTo(active + 1)}><Icon name="chevron-right" /></button>
          </div>
        )}
      </div>
      <ul ref={viewport} className="landing-track" tabIndex={0} aria-label="Browse featured events"
        data-single={events.length === 1 || undefined}
        onScroll={event => setActive(currentSlide(event.currentTarget))}
        onKeyDown={event => {
          if (event.target !== event.currentTarget) return
          const targets: Partial<Record<string, number>> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: events.length - 1 }
          const next = targets[event.key]
          if (next !== undefined) {
            event.preventDefault()
            goTo(next)
          }
        }}
        onPointerDown={event => {
          suppressClick.current = false
          if (event.pointerType === 'mouse' && event.button === 0 && events.length > 1 && !(event.target as HTMLElement).closest('a, button')) {
            drag.current = { x: event.clientX, scroll: event.currentTarget.scrollLeft, moved: false }
          }
        }}
        onPointerMove={move}
        onPointerUp={event => finish(event.currentTarget)}
        onPointerCancel={event => finish(event.currentTarget)}
        onPointerLeave={event => { if (!drag.current?.moved) finish(event.currentTarget) }}
        onLostPointerCapture={event => finish(event.currentTarget)}
        onClickCapture={event => {
          if (suppressClick.current && event.detail > 0) {
            event.preventDefault()
            event.stopPropagation()
            suppressClick.current = false
          }
        }}>
        {events.map((event, index) => (
          <li className="landing-slide" data-active={index === active || undefined} key={event.id}>
            {event.poster && (
              // The image may be a poster managed by an organiser.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.poster} alt="" loading={index < 2 ? 'eager' : 'lazy'} draggable={false} />
            )}
            <div className="landing-slide-copy">
              {event.category && <span className="landing-category">{event.category}</span>}
              <h3>{event.name}</h3>
              <p>{event.time}</p>
              {event.venue && <p>{event.venue}</p>}
              {event.href ? (
                <Link href={event.href} className="landing-slide-link" aria-label={`View event: ${event.name}`}>View event <Icon name="arrow-up-right" /></Link>
              ) : (
                <button type="button" className="landing-slide-link" aria-label={`Preview event: ${event.name}`} onClick={() => {
                  setSelected(event)
                  dialog.current?.showModal()
                }}>Preview event <Icon name="arrow-up-right" /></button>
              )}
            </div>
          </li>
        ))}
      </ul>
      {samples && (
        <dialog ref={dialog} className="landing-event-dialog" aria-labelledby="landing-dialog-title"
          onClick={event => { if (event.target === event.currentTarget) dialog.current?.close() }}>
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
    </section>
  )
}
