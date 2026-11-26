'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import Link from 'next/link'
import Icon from '@/components/workspace/Icon'
import type { LandingEvent } from '@/lib/landing-event'

export default function FeaturedEvents({ events, samples }: { events: LandingEvent[]; samples: boolean }) {
  const gallery = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const drag = useRef<{ x: number; position: number } | null>(null)
  const progress = useRef(0)
  const [active, setActive] = useState(0)
  const [selected, setSelected] = useState<LandingEvent>()
  const event = events[active] ?? events[0]
  const last = events.length - 1

  useEffect(() => {
    const region = gallery.current
    const scene = stage.current
    if (!region || !scene) return

    let frame = 0
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function paint() {
      if (!region || !scene) return
      const distance = region.offsetHeight - scene.offsetHeight
      const position = distance > 0 ? Math.max(0, Math.min(last, -region.getBoundingClientRect().top / distance * last)) : 0
      const index = Math.round(position)
      progress.current = position
      scene.style.setProperty('--gallery-position', String(motion.matches ? index : position))
      setActive(index)
    }
    function schedule() {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(paint)
    }
    paint()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    motion.addEventListener('change', schedule)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      motion.removeEventListener('change', schedule)
      cancelAnimationFrame(frame)
    }
  }, [last])

  function seek(position: number, behavior: ScrollBehavior = 'smooth') {
    const region = gallery.current
    const scene = stage.current
    if (!region || !scene || last < 1) return
    const start = window.scrollY + region.getBoundingClientRect().top
    const distance = region.offsetHeight - scene.offsetHeight
    const target = Math.max(0, Math.min(last, position))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    window.scrollTo({ top: start + (target / last) * distance, behavior: reduce ? 'instant' : behavior })
  }

  function startDrag(pointer: PointerEvent<HTMLDivElement>) {
    if (pointer.pointerType !== 'mouse' || pointer.button !== 0 || last < 1) return
    drag.current = { x: pointer.clientX, position: progress.current }
    pointer.currentTarget.setPointerCapture(pointer.pointerId)
    pointer.currentTarget.dataset.dragging = 'true'
  }

  function finishDrag(pointer: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    drag.current = null
    delete pointer.currentTarget.dataset.dragging
    seek(Math.round(progress.current))
  }

  return (
    <>
      <section ref={gallery} className="landing-gallery" id="featured-events" aria-labelledby="featured-events-title"
        style={{ '--gallery-steps': last } as CSSProperties}>
        <div ref={stage} className="landing-stage"
          onKeyDown={key => {
            if (last < 1 || key.target !== key.currentTarget) return
            const targets: Partial<Record<string, number>> = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: last }
            const next = targets[key.key]
            if (next !== undefined) {
              key.preventDefault()
              seek(next)
            }
          }}
          tabIndex={last > 0 ? 0 : undefined} aria-label="Browse featured events">
          <div className="landing-gallery-head">
            <h2 id="featured-events-title">Featured events</h2>
            <a href="#events">Skip to event listings <Icon name="arrow-up-right" /></a>
          </div>
          <div className="landing-gallery-scene" aria-hidden="true"
            onPointerDown={startDrag}
            onPointerMove={pointer => { if (drag.current) seek(drag.current.position + (drag.current.x - pointer.clientX) / 220, 'instant') }}
            onPointerUp={finishDrag} onPointerCancel={finishDrag} onLostPointerCapture={finishDrag}>
            {events.map((item, index) => (
              <div className="landing-poster" key={item.id} style={{ '--poster-index': index } as CSSProperties}
                data-active={index === active || undefined} data-in-view={Math.abs(index - active) < 4 || undefined}>
                {item.poster && Math.abs(index - active) < 4 && (
                  // Event photos can be provided by organisers.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.poster} alt="" draggable={false} />
                )}
              </div>
            ))}
          </div>
          <div className="landing-gallery-footer">
            <div className="landing-gallery-copy">
              <p className="landing-gallery-category">{[samples && 'Sample event', event.category].filter(Boolean).join(' · ') || 'Upcoming event'}</p>
              <h3>{event.name}</h3>
              <p>{event.time}{event.venue && ` · ${event.venue}`}</p>
              {event.href ? (
                <Link href={event.href} className="landing-slide-link">View event <Icon name="arrow-up-right" /></Link>
              ) : (
                <button type="button" className="landing-slide-link" aria-label={`Preview event: ${event.name}`} onClick={() => {
                  setSelected(event)
                  dialog.current?.showModal()
                }}>Preview event <Icon name="arrow-up-right" /></button>
              )}
            </div>
            {last > 0 && (
              <div className="landing-gallery-nav">
                <p>Scroll to explore{samples && ' the sample lineup'}</p>
                <div className="landing-carousel-controls">
                  <span role="status" aria-atomic="true" className="landing-count">
                    {String(active + 1).padStart(2, '0')} / {events.length}<span className="sr-only"> · {event.name}</span>
                  </span>
                  <button type="button" aria-label="Previous event" disabled={active === 0} onClick={() => seek(active - 1)}><Icon name="chevron-left" /></button>
                  <button type="button" aria-label="Next event" disabled={active === last} onClick={() => seek(active + 1)}><Icon name="chevron-right" /></button>
                </div>
              </div>
            )}
          </div>
        </div>
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
