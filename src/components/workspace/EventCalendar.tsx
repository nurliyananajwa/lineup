'use client'
import { useState } from 'react'
import Link from 'next/link'
import { malaysiaDateKey, type DashboardEvent } from '@/lib/dashboard-model'
import Icon from './Icon'
const dateLabel = (key: string) => new Intl.DateTimeFormat('en-MY', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(`${key}T04:00:00Z`))
export default function EventCalendar({ events, now }: { events: DashboardEvent[]; now: string }) {
  const today = malaysiaDateKey(now)
  const [year, month] = today.split('-').map(Number)
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const first = new Date(Date.UTC(year, month - 1 + offset, 1))
  const monthName = new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first)
  const days = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate()
  const prefix = first.toISOString().slice(0, 7)
  const scheduled = events.filter(e => e.status === 'approved')
  const monthEvents = scheduled.filter(e => malaysiaDateKey(e.startsAt).startsWith(prefix))
  const selectedEvents = selected ? monthEvents.filter(e => malaysiaDateKey(e.startsAt) === selected) : []
  const changeMonth = (delta: number) => { setOffset(n => n + delta); setSelected(null) }
  return <section className="dashboard-panel calendar-panel" id="calendar" aria-label="Event calendar">
    <div className="panel-heading"><h2>Event calendar</h2><Icon name="calendar" /></div>
    <div className="calendar-month"><strong aria-live="polite">{monthName}</strong><div><button className="workspace-icon-button" aria-label="Previous month" onClick={() => changeMonth(-1)}><Icon name="chevron-left" /></button><button className="workspace-icon-button" aria-label="Next month" onClick={() => changeMonth(1)}><Icon name="chevron-right" /></button></div></div>
    <div className="calendar-weekdays" aria-hidden="true">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
    <div className="calendar-days" role="group" aria-label={monthName}>
      {Array.from({ length: (first.getUTCDay() + 6) % 7 }, (_, i) => <span key={`blank-${i}`} />)}
      {Array.from({ length: days }, (_, i) => {
        const key = `${prefix}-${String(i + 1).padStart(2, '0')}`
        const count = monthEvents.filter(e => malaysiaDateKey(e.startsAt) === key).length
        return <button key={key} className={`${key === today ? 'is-today ' : ''}${selected === key ? 'is-selected ' : ''}${count ? 'has-event' : ''}`} aria-label={`${dateLabel(key)}${count ? `, ${count} ${count === 1 ? 'event' : 'events'}` : ''}`} aria-pressed={selected === key} aria-current={key === today ? 'date' : undefined} onClick={() => setSelected(key)}>{i + 1}{count > 0 && <span className="calendar-event-dot" />}</button>
      })}
    </div>
    <div className="calendar-agenda" aria-live="polite">{selected ? <><span className="eyebrow">{dateLabel(selected)}</span>{selectedEvents.length ? selectedEvents.map(e => <Link key={e.id} href={e.href}><span className="agenda-dot" /><span>{e.name}</span><Icon name="arrow-up-right" /></Link>) : <p>No approved events on this day.</p>}</> : <><span className="calendar-key"><span className="calendar-event-dot" />{monthEvents.length} approved {monthEvents.length === 1 ? 'event' : 'events'} this month</span><p>Select a date to see its events.</p></>}</div>
  </section>
}
