'use client'

import { useState, type CSSProperties, type KeyboardEvent } from 'react'

type Point = { date: string; count: number }

const formatDate = new Intl.DateTimeFormat('en-MY', { month: 'short', day: 'numeric', timeZone: 'UTC' })

export default function RegistrationChart({ points }: { points: Point[] }) {
  const [active, setActive] = useState(points.length - 1)
  const selected = points[active]
  const maximum = Math.max(1, ...points.map(point => point.count))

  function moveFocus(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number
    switch (event.key) {
      case 'ArrowLeft': next = Math.max(0, index - 1); break
      case 'ArrowRight': next = Math.min(points.length - 1, index + 1); break
      case 'Home': next = 0; break
      case 'End': next = points.length - 1; break
      default: return
    }
    event.preventDefault()
    const buttons = event.currentTarget.parentElement?.querySelectorAll('button')
    buttons?.[next]?.focus()
  }

  return (
    <div className="registration-area">
      <p className="chart-selection" aria-live="polite">
        <strong>{formatDate.format(new Date(selected.date))}</strong> · {selected.count} {selected.count === 1 ? 'registration' : 'registrations'}
      </p>
      <div className="chart-viewport">
        <div className="chart-plot" style={{ '--chart-days': points.length } as CSSProperties}>
          <div className="registration-scale" aria-hidden="true"><span>{maximum}</span><span>0</span></div>
          <div className="chart-days" role="group" aria-label="Daily registrations. Use left and right arrow keys to move between dates.">
            {points.map((point, index) => {
              const label = formatDate.format(new Date(point.date))
              return (
                <button type="button" key={point.date} tabIndex={active === index ? 0 : -1}
                  aria-label={`${label}: ${point.count} registrations`}
                  aria-pressed={active === index}
                  onKeyDown={event => moveFocus(event, index)}
                  onFocus={() => setActive(index)} onClick={() => setActive(index)}>
                  <span className="chart-bar" aria-hidden="true" style={{ height: `max(2px, ${point.count / maximum * 100}%)` }} />
                  {(points.length === 7 || index % 5 === 0 || index === points.length - 1) && <span className="chart-day-label" aria-hidden="true">{label}</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
