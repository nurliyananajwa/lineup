'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatRange } from '@/lib/format'
import { type DashboardModel, type DashboardEvent } from '@/lib/dashboard-model'
import Icon, { type IconName } from './Icon'
import EventCalendar from './EventCalendar'

const number = (n: number) => n.toLocaleString('en-MY')
const date = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options }).format(new Date(iso))
const statusLabel: Record<string, string> = { draft: 'Draft', pending: 'Pending review', approved: 'Approved', rejected: 'Changes requested' }
function Status({ value }: { value: string }) { return <span className={`event-status status-${value}`}><span />{statusLabel[value] || value}</span> }

export default function Dashboard({ profile, data }: { profile: { name: string; role: 'admin' | 'organizer' }; data: DashboardModel }) {
  const admin = profile.role === 'admin'
  const [period, setPeriod] = useState(7)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [limit, setLimit] = useState(5)
  const firstName = profile.name.trim().split(/\s+/)[0] || 'there'
  const hour = Number(date(data.now, { hour: 'numeric', hourCycle: 'h23' }))
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const points = data.trend.slice(-period)
  const recentCount = points.reduce((n, p) => n + p.count, 0)
  const maximum = Math.max(1, ...points.map(p => p.count))
  const featured = data.upcoming[0]
  const attendanceRate = data.registrations ? Math.round(data.checkedIn / data.registrations * 100) : 0
  const stats: { label: string; value: number; note: string; icon: IconName; tone: string }[] = [
    { label: 'Upcoming events', value: data.upcoming.length, note: 'Approved & on the calendar', icon: 'calendar-event', tone: 'purple' },
    { label: admin ? 'Awaiting approval' : 'Pending review', value: data.pending, note: admin ? 'Ready for your review' : 'With the admin team', icon: 'clock', tone: 'amber' },
    { label: 'Registrations', value: data.registrations, note: 'Across all your events', icon: 'ticket', tone: 'blue' },
    { label: 'Checked in', value: data.checkedIn, note: data.registrations ? `${attendanceRate}% of registered attendees` : 'Attendance starts with a ticket', icon: 'circle-check', tone: 'green' },
  ]
  const filtered = data.events.filter(e => (filter === 'all' || (filter === 'upcoming' ? data.upcoming.some(u => u.id === e.id) : e.status === filter)) && `${e.name} ${e.venue}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => {
    if (admin && filter === 'all' && (a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
    return b.startsAt.localeCompare(a.startsAt)
  })
  function chooseFilter(value: string) { setFilter(value); setLimit(5) }
  return <div className="dashboard" data-testid="dashboard">
    <div className="dashboard-welcome"><div><span className="eyebrow">THE BIG PICTURE</span><h1>Overview<span className="heading-dot">.</span></h1><p>{greeting}, {firstName}. {admin ? 'Here’s what’s happening across Lineup.' : 'Let’s make your next event a good one.'}</p></div><Link href={admin ? '/admin/events' : '/organizer/events/new'} className="workspace-primary"><Icon name={admin ? 'clipboard-check' : 'plus'} />{admin ? 'Review events' : 'Create event'}{admin && data.pending > 0 && <span className="button-count">{data.pending}</span>}</Link></div>

    <section className="dashboard-stats" aria-label="Event summary">{stats.map(stat => <div className="dashboard-stat" key={stat.label}><div className="stat-heading"><span>{stat.label}</span><span className={`stat-icon tone-${stat.tone}`}><Icon name={stat.icon} /></span></div><strong data-testid={`metric-${stat.icon}`}>{number(stat.value)}</strong><p>{stat.note}</p></div>)}</section>

    <div className="dashboard-columns"><div className="dashboard-primary-column">
      <div className="dashboard-analytics">
        <section className="dashboard-panel registration-panel" id="registrations" aria-label="Registration trend"><div className="panel-heading"><h2>Registration trend</h2><select aria-label="Registration period" value={period} onChange={event => setPeriod(Number(event.target.value))}><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select></div><div className="trend-total"><strong>{number(recentCount)}</strong><span>registrations in this period</span></div>
          <div className={`registration-chart ${period === 30 ? 'chart-month' : ''}`} role="img" aria-label={`${recentCount} registrations over the last ${period} days. ${points.map(p => `${p.date}: ${p.count}`).join('; ')}`}><div className="chart-y-label">{maximum}</div><div className="chart-zero-label">0</div><div className="chart-grid"><span /><span /><span /><span /></div><div className="chart-bars">{points.map((point, index) => <div className="chart-column" key={point.date}><div className={`chart-bar ${index === points.length - 1 ? 'bar-today' : ''}`} style={{ height: `${point.count / maximum * 100}%` }} title={`${point.date}: ${point.count} registrations`}><span className="chart-tooltip">{date(`${point.date}T04:00:00Z`, { day: 'numeric', month: 'short' })}: {point.count}</span></div><span className="chart-day">{period === 7 ? date(`${point.date}T04:00:00Z`, { weekday: 'short' }) : index % 5 === 0 || index === 29 ? Number(point.date.slice(-2)) : ''}</span></div>)}</div></div>
          <div className="chart-caption"><span className="legend-dot" />Daily registrations<span>Malaysia time</span></div>
          <details className="chart-data"><summary>View chart data</summary><table><caption>Registrations by day</caption><thead><tr><th>Date</th><th>Registrations</th></tr></thead><tbody>{points.map(p => <tr key={p.date}><th scope="row">{p.date}</th><td>{p.count}</td></tr>)}</tbody></table></details>
        </section>
        <section className="dashboard-panel status-panel" aria-label="Event status breakdown"><div className="panel-heading"><h2>Event overview</h2><Icon name="chart-bar" /></div><div className="status-total"><strong>{number(data.events.length)}</strong><span>total events</span></div><div className="status-breakdown">{data.statuses.map(s => <div key={s.status}><div className="status-breakdown-label"><span><span className={`status-dot dot-${s.status}`} />{s.status === 'pending' ? 'Pending' : statusLabel[s.status]}</span><strong>{s.count}</strong></div><div className="status-track"><span className={`fill-${s.status}`} style={{ width: `${data.events.length ? s.count / data.events.length * 100 : 0}%` }} /></div></div>)}</div></section>
      </div>

      <section className="dashboard-panel events-panel" id="events" aria-label={admin ? 'Event management' : 'My events'}><div className="panel-heading events-heading"><div><h2>{admin ? 'Event management' : 'My events'}<span className="quiet-count">{data.events.length}</span></h2><p>{admin ? 'A clear view of every submission.' : 'From the first draft to the final guest.'}</p></div><Link href={admin ? '/admin/events' : '/organizer/events/new'} className="workspace-text-link">{admin ? 'Review queue' : 'New event'}<Icon name={admin ? 'arrow-up-right' : 'plus'} /></Link></div>
        <div className="event-tools"><div className="event-tabs" role="group" aria-label="Filter events">{[{ value: 'all', label: 'All events' }, { value: 'upcoming', label: 'Upcoming' }, { value: 'pending', label: 'Pending' }, { value: 'draft', label: 'Drafts' }].map(tab => <button key={tab.value} className={filter === tab.value ? 'is-selected' : ''} aria-pressed={filter === tab.value} onClick={() => chooseFilter(tab.value)}>{tab.label}</button>)}</div><label className="event-search"><Icon name="search" /><input type="search" aria-label="Search your events" placeholder="Search events…" value={search} onChange={event => { setSearch(event.target.value); setLimit(5) }} /></label></div>
        {filtered.length ? <div className="events-table-wrapper"><table className="events-table"><thead><tr><th scope="col">EVENT</th><th scope="col">STATUS</th><th scope="col">REGISTRATIONS</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filtered.slice(0, limit).map(event => <tr key={event.id}><td><div className="event-name-cell"><EventThumbnail event={event} /><div><Link href={event.href} className="event-title">{event.name}</Link><p>{date(event.startsAt, { day: 'numeric', month: 'short', year: 'numeric' })}<span>·</span>{event.venue}</p>{event.reviewComment && <p className="event-review-note">{event.reviewComment}</p>}</div></div></td><td><Status value={event.status} /></td><td><div className="table-registrations"><span><strong>{number(event.registrations)}</strong>{event.capacity > 0 && ` / ${number(event.capacity)}`}</span>{event.capacity > 0 && <progress value={Math.min(event.registrations, event.capacity)} max={event.capacity} aria-label={`${event.name}: ${event.registrations} of ${event.capacity} places registered`} />}</div></td><td><Link href={event.status === 'approved' ? `/check-in/${event.id}` : event.href} className="event-action">{event.status === 'approved' ? 'Check in' : admin ? 'Review' : 'Manage'}<Icon name="arrow-up-right" /></Link></td></tr>)}</tbody></table></div> : <div className="dashboard-empty"><Icon name={search ? 'search' : 'calendar-event'} /><h3>{data.events.length ? 'No matching events' : 'Your next event starts here'}</h3><p>{data.events.length ? 'Try a different search or filter.' : admin ? 'Submitted events will appear here for review.' : 'Create an event, add the details and send it for approval.'}</p>{data.events.length ? <button className="workspace-text-link" onClick={() => { setSearch(''); chooseFilter('all') }}>Reset filters<Icon name="arrow-right" /></button> : !admin && <Link className="workspace-primary" href="/organizer/events/new"><Icon name="plus" />Create event</Link>}</div>}
        {filtered.length > 0 && <div className="events-footer"><span>Showing {Math.min(limit, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span>{limit < filtered.length && <button className="workspace-text-link" onClick={() => setLimit(n => n + 5)}>Show more<Icon name="arrow-right" /></button>}</div>}
      </section>

      <section className="dashboard-panel activity-panel" aria-label="Recent updates"><div className="panel-heading"><div><h2>Recent updates</h2><p>The latest in your workspace.</p></div><span className="activity-updated">As of {date(data.now, { hour: 'numeric', minute: '2-digit' })}</span></div>{data.activity.length ? <ol className="activity-list">{data.activity.slice(0, 4).map(activity => <li key={activity.id}><span className={`activity-icon tone-${activity.tone}`}><Icon name={activity.label === 'Latest registration' ? 'ticket' : activity.label === 'Event approved' ? 'circle-check' : 'file-pencil'} /></span><div><strong>{activity.label}</strong><Link href={activity.href}>{activity.event}</Link></div><time dateTime={activity.at}>{date(activity.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time></li>)}</ol> : <p className="activity-empty">Your event updates and registrations will appear here.</p>}</section>
    </div>
    <aside className="dashboard-secondary-column" aria-label="Schedule"><section className="dashboard-panel next-event-panel"><div className="panel-heading"><h2>Next on the calendar</h2><span className="small-live-dot" /></div>{featured ? <><Link href={featured.href} className={`featured-visual ${featured.poster ? 'has-poster' : ''}`}>{featured.poster ? <Image src={featured.poster} alt="" width={640} height={360} unoptimized /> : <div className="featured-date"><span>{date(featured.startsAt, { month: 'long', year: 'numeric' })}</span><strong>{date(featured.startsAt, { day: '2-digit' })}</strong><span>{date(featured.startsAt, { weekday: 'long' })}</span></div>}<span className="featured-tag">{new Date(featured.startsAt) <= new Date(data.now) ? 'Happening now' : 'Coming up'}</span></Link><div className="featured-content"><Link href={featured.href}><h3>{featured.name}</h3></Link><p className="featured-venue"><Icon name="map-pin" />{featured.venue}</p><p className="featured-time"><Icon name="clock" />{formatRange(featured.startsAt, featured.endsAt)}</p><div className="featured-capacity"><span><strong>{featured.registrations}</strong> registered</span><span>{featured.capacity > 0 ? `${Math.max(0, featured.capacity - featured.registrations)} places left` : 'Capacity to be confirmed'}</span></div>{featured.capacity > 0 && <progress value={Math.min(featured.registrations, featured.capacity)} max={featured.capacity} aria-label="Next event registrations" />}<Link href={featured.href} className="featured-link">View event details<Icon name="arrow-right" /></Link></div></> : <div className="next-event-empty"><span className="empty-calendar-icon"><Icon name="calendar-event" /></span><h3>Room for something great.</h3><p>{admin ? 'Your next approved event will appear here.' : 'Once your event is approved, you’ll find it here.'}</p><Link href={admin ? '/admin/events' : '/organizer/events/new'} className="workspace-text-link">{admin ? 'View submissions' : 'Plan an event'}<Icon name="arrow-right" /></Link></div>}</section>
      <EventCalendar events={data.events} now={data.now} />
      <div className="workspace-small-note"><Icon name="circle-check" /><p><strong>One place. Every detail.</strong>Keep your events, registrations and check-ins together.</p></div>
    </aside></div>
  </div>
}

function EventThumbnail({ event }: { event: DashboardEvent }) {
  return <span className="event-thumbnail">{event.poster ? <Image src={event.poster} alt="" width={48} height={48} unoptimized /> : <><strong>{date(event.startsAt, { day: '2-digit' })}</strong><span>{date(event.startsAt, { month: 'short' })}</span></>}</span>
}
