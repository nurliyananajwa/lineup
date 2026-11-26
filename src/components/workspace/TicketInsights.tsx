'use client'

import { useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import type { DashboardEvent } from '@/lib/dashboard-model'
import Icon from './Icon'

const formatCount = (value: number) => value.toLocaleString('en-MY')

export default function TicketInsights({ total, checkedIn, events, preview }: {
  total: number
  checkedIn: number
  events: DashboardEvent[]
  preview: boolean
}) {
  const [metric, setMetric] = useState<'registrations' | 'checkedIn'>('registrations')
  const percent = total ? Math.round((checkedIn / total) * 100) : 0
  const ranked = events
    .filter(event => event[metric] > 0)
    .sort((a, b) => b[metric] - a[metric] || a.name.localeCompare(b.name))
    .slice(0, 3)

  return (
    <section className="dashboard-panel ticket-insights" aria-labelledby="ticket-insights-title">
      <div className="panel-heading">
        <h2 id="ticket-insights-title">Ticket &amp; attendance</h2>
        <Icon name="ticket" />
      </div>
      <div className="ticket-rank-toggle" role="group" aria-label="Rank events by">
        <button type="button" aria-pressed={metric === 'registrations'} onClick={() => setMetric('registrations')}>Registrations</button>
        <button type="button" aria-pressed={metric === 'checkedIn'} onClick={() => setMetric('checkedIn')}>Check-ins</button>
      </div>
      <div aria-live="polite">
        <h3 className="ticket-ranking-title">Top events by {metric === 'registrations' ? 'registrations' : 'check-ins'}</h3>
        {ranked.length ? (
          <ol className="ticket-ranking">
            {ranked.map(event => {
              const max = metric === 'registrations' ? event.capacity : event.registrations
              const value = event[metric]
              const share = max > 0 ? Math.round(value / max * 100) : null
              return (
                <li className="ticket-ranked-event" key={event.id}>
                  <span className="ticket-ranked-photo">
                    {event.poster ? <Image src={event.poster} alt="" width={36} height={36} unoptimized /> : <Icon name="calendar-event" />}
                  </span>
                  <div className="ticket-ranked-details">
                    <strong>{preview ? event.name : <Link href={event.href}>{event.name}</Link>}</strong>
                    <span>{formatCount(value)} {metric === 'registrations' ? 'registered' : 'checked in'}</span>
                    {share !== null && (
                      <div className="ticket-ranked-progress">
                        <progress max={max} value={Math.min(value, max)} aria-label={`${event.name}: ${metric === 'registrations' ? 'venue capacity filled' : 'registered attendees checked in'}`} />
                        <span>{share}%</span>
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        ) : <p className="ticket-ranking-empty">{metric === 'registrations' ? 'No registrations yet.' : 'No check-ins yet.'}</p>}
      </div>
      <div className="ticket-attendance-summary">
        <div className="attendance-ring" style={{ '--attendance-sweep': `${percent}%` } as CSSProperties}>
          <div><strong>{total ? `${percent}%` : '—'}</strong><span>checked in</span></div>
        </div>
        <dl className="attendance-legend">
          <div><dt><span />Checked in</dt><dd>{formatCount(checkedIn)}</dd></div>
          <div><dt><span />Awaiting check-in</dt><dd>{formatCount(Math.max(0, total - checkedIn))}</dd></div>
        </dl>
      </div>
    </section>
  )
}
