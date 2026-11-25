'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatRange } from '@/lib/format'
import { type DashboardModel, type DashboardEvent } from '@/lib/dashboard-model'
import Icon, { type IconName } from './Icon'
import EventCalendar from './EventCalendar'
import RegistrationChart from './RegistrationChart'
import TicketInsights from './TicketInsights'
import VenueMap from './VenueMap'

const number = (n: number) => n.toLocaleString('en-MY')
const date = (iso: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('en-MY', { timeZone: 'Asia/Kuala_Lumpur', ...options }).format(new Date(iso))
const eventFilters = [
  { value: 'all', label: 'All events' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'pending', label: 'Pending' },
  { value: 'draft', label: 'Drafts' },
  { value: 'rejected', label: 'Changes requested' },
] as const

const statusLabel: Record<string, string> = { draft: 'Draft', pending: 'Pending review', approved: 'Approved', rejected: 'Changes requested' }
function Status({ value }: { value: string }) { return <span className={`event-status status-${value}`}><span />{statusLabel[value] || value}</span> }

export default function Dashboard({ profile, data, preview = false }: { profile: { name: string; role: 'admin' | 'organizer' }; data: DashboardModel; preview?: boolean }) {
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
  const featured = data.upcoming[0]
  const [latestUpdate, ...earlierUpdates] = data.activity
  const needsAttention = admin ? [] : data.events.filter(event => event.status === 'rejected')
  const isUpcoming = filter === 'upcoming'
  const attendanceRate = data.registrations ? Math.round(data.checkedIn / data.registrations * 100) : 0
  const stats: { label: string; value: number; note: string; icon: IconName; tone: string }[] = [
    { label: 'Upcoming events', value: data.upcoming.length, note: 'Approved & on the calendar', icon: 'calendar-event', tone: 'purple' },
    { label: 'Draft events', value: data.statuses.find(status => status.status === 'draft')?.count ?? 0, note: 'Still in preparation', icon: 'file-pencil', tone: 'amber' },
    { label: 'All-event registrations', value: data.registrations, note: 'Across all your events', icon: 'ticket', tone: 'blue' },
    { label: 'Checked in', value: data.checkedIn, note: data.registrations ? `${attendanceRate}% of registered attendees` : 'No registered attendees yet', icon: 'circle-check', tone: 'green' },
  ]
  const filtered = data.events.filter(e => (filter === 'all' || (filter === 'upcoming' ? data.upcoming.some(u => u.id === e.id) : e.status === filter)) && `${e.name} ${e.venue}`.toLowerCase().includes(search.trim().toLowerCase())).sort((a, b) => {
    if (admin && filter === 'all' && (a.status === 'pending') !== (b.status === 'pending')) return a.status === 'pending' ? -1 : 1
    return isUpcoming ? a.startsAt.localeCompare(b.startsAt) : b.startsAt.localeCompare(a.startsAt)
  })
  function chooseFilter(value: string) { setFilter(value); setLimit(5) }
  return <div className="dashboard" data-testid="dashboard">
    <header className="dashboard-masthead">
      <div>
        <h1>{admin ? 'Dashboard' : 'My workspace'}</h1>
        <p>{greeting}, {firstName}.</p>
      </div>
      <Link href={admin ? '/admin/events' : '/organizer/events/new'} className="workspace-primary">
        <Icon name={admin ? 'clipboard-check' : 'plus'} />
        {admin ? 'Review events' : 'Create event'}
      </Link>
    </header>

    {needsAttention.length > 0 && (
      <section className="needs-attention" aria-labelledby="needs-attention-title">
        <h2 id="needs-attention-title">Needs attention</h2>
        <ul>
          {needsAttention.slice(0, 2).map(event => (
            <li key={event.id}>
              <div><strong>{event.name}</strong><p>{event.reviewComment || 'The reviewer requested changes to this event.'}</p></div>
              {preview ? (
                <a href="#events" className="workspace-text-link" onClick={() => { setSearch(event.name); chooseFilter('rejected') }}>
                  Review requested changes <Icon name="arrow-right" />
                </a>
              ) : (
                <Link href={event.href} className="workspace-text-link">Review requested changes <Icon name="arrow-right" /></Link>
              )}
            </li>
          ))}
        </ul>
        {needsAttention.length > 2 && (
          <a href="#events" className="workspace-text-link" onClick={() => { setSearch(''); chooseFilter('rejected') }}>
            View all {needsAttention.length} events that need changes <Icon name="arrow-right" />
          </a>
        )}
      </section>
    )}
    <div className="dashboard-columns">
      <div className="dashboard-primary-column">
        <section className="dashboard-stats" aria-label="Event summary">
          {stats.map(stat => (
            <div className="dashboard-stat" key={stat.label}>
              <div className="stat-heading">
                <span>{stat.label}</span>
                <span className={`stat-icon tone-${stat.tone}`}><Icon name={stat.icon} /></span>
              </div>
              <strong data-testid={`metric-${stat.icon}`}>{number(stat.value)}</strong>
              <p>{stat.note}</p>
            </div>
          ))}
        </section>
      <div className="dashboard-analytics">
        <TicketInsights total={data.registrations} checkedIn={data.checkedIn} events={data.events} preview={preview} />
        <section className="dashboard-panel registration-panel" id="registrations" aria-label="Registration trend">
          <div className="panel-heading">
            <h2>Registration trend</h2>
            <select aria-label="Registration period" value={period} onChange={event => setPeriod(Number(event.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
          <div className="trend-total">
            <strong>{number(recentCount)}</strong><span>registrations in the last {period} days</span>
          </div>
          <RegistrationChart key={period} points={points} />
          <div className="chart-caption"><span className="legend-dot" />Daily registrations<span>Malaysia time</span></div>
          <details className="chart-data">
            <summary>View chart data</summary>
            <table>
              <caption>Registrations by day</caption>
              <thead><tr><th scope="col">Date</th><th scope="col">Registrations</th></tr></thead>
              <tbody>{points.map(point => <tr key={point.date}><th scope="row">{point.date}</th><td>{point.count}</td></tr>)}</tbody>
            </table>
          </details>
        </section>
      </div>
      <section className="dashboard-panel status-panel" aria-label="Event status breakdown"><div className="panel-heading"><h2>Event overview</h2><Icon name="chart-bar" /></div><div className="status-total"><strong>{number(data.events.length)}</strong><span>total events</span></div><div className="status-breakdown">{data.statuses.map(s => <div key={s.status}><div className="status-breakdown-label"><span><span className={`status-dot dot-${s.status}`} />{s.status === 'pending' ? 'Pending' : statusLabel[s.status]}</span><strong>{s.count}</strong></div><div className="status-track"><span className={`fill-${s.status}`} style={{ width: `${data.events.length ? s.count / data.events.length * 100 : 0}%` }} /></div></div>)}</div></section>
      {data.upcoming.length > 1 && (
        <section className="dashboard-panel upcoming-schedule" aria-labelledby="schedule-title">
          <div className="panel-heading">
            <h2 id="schedule-title">Coming up after next</h2>
            <a href="#events" className="workspace-text-link" onClick={() => { setSearch(''); chooseFilter('upcoming') }}>
              View upcoming events <Icon name="arrow-right" />
            </a>
          </div>
          <ul>
            {data.upcoming.slice(1, 4).map(event => (
              <li key={event.id}>
                <time dateTime={event.startsAt}>{date(event.startsAt, { day: 'numeric', month: 'short' })}</time>
                <div>
                  <strong>{preview ? event.name : <Link href={event.href}>{event.name}</Link>}</strong>
                  <p>{event.venue}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      <VenueMap events={data.upcoming} preview={preview} />
      <section className="dashboard-panel events-panel" id="events" tabIndex={-1} aria-label={admin ? 'Event management' : 'My events'}>
        <div className="panel-heading events-heading">
          <h2>{admin ? 'Event management' : 'My events'}<span className="quiet-count">{data.events.length}</span></h2>
          <Link href={admin ? '/admin/events' : '/organizer/events/new'} className="workspace-text-link">
            {admin ? 'Review queue' : 'New event'} <Icon name={admin ? 'arrow-up-right' : 'plus'} />
          </Link>
        </div>
        <div className="event-tools">
          <div className="event-tabs" role="group" aria-label="Filter events">
            {eventFilters.map(tab => (
              <button key={tab.value} type="button" className={filter === tab.value ? 'is-selected' : ''}
                aria-pressed={filter === tab.value} onClick={() => chooseFilter(tab.value)}>{tab.label}</button>
            ))}
          </div>
          <label className="event-search">
            <Icon name="search" />
            <input type="search" aria-label="Search your events" placeholder="Search events…"
              value={search} onChange={event => { setSearch(event.target.value); setLimit(5) }} />
          </label>
        </div>
        {filtered.length > 0 ? (
          <>
            <p className="event-sort">{isUpcoming ? 'Date: soonest first' : admin && filter === 'all' ? 'Pending first, then latest event date' : 'Date: latest first'}</p>
            <div className="events-table-wrapper">
              <table className="events-table">
                <thead><tr><th scope="col">Event</th><th scope="col">Status</th><th scope="col">Registrations</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>
                  {filtered.slice(0, limit).map(event => {
                    const approved = event.status === 'approved'
                    return (
                      <tr key={event.id}>
                        <td>
                          <div className="event-name-cell">
                            <EventThumbnail event={event} />
                            <div>
                              <Link href={event.href} className="event-title">{event.name}</Link>
                              <p>{date(event.startsAt, { day: 'numeric', month: 'short', year: 'numeric' })}<span>·</span>{event.venue}</p>
                              {event.reviewComment && <p className="event-review-note">{event.reviewComment}</p>}
                            </div>
                          </div>
                        </td>
                        <td><Status value={event.status} /></td>
                        <td>
                          <div className="table-registrations">
                            <span><strong>{number(event.registrations)}</strong>{event.capacity > 0 && ` / ${number(event.capacity)}`}</span>
                            {event.capacity > 0 && (
                              <progress value={Math.min(event.registrations, event.capacity)} max={event.capacity}
                                aria-label={`${event.name}: ${event.registrations} of ${event.capacity} places registered`} />
                            )}
                          </div>
                        </td>
                        <td>
                          <Link href={approved ? `/check-in/${event.id}` : event.href} className="event-action">
                            {approved ? 'Check in' : admin ? 'Review' : 'Manage'}<span className="sr-only"> {event.name}</span><Icon name="arrow-up-right" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="events-footer">
              <span>Showing {Math.min(limit, filtered.length)} of {filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span>
              {limit < filtered.length && <button type="button" className="workspace-text-link" onClick={() => setLimit(n => n + 5)}>Show more<Icon name="arrow-right" /></button>}
            </div>
          </>
        ) : (
          <div className="dashboard-empty">
            <Icon name={search ? 'search' : 'calendar-event'} />
            <h3>{data.events.length ? 'No matching events' : 'No events yet'}</h3>
            <p>{data.events.length ? 'Try a different search or filter.' : admin ? 'Submitted events will appear here for review.' : 'Create an event, add the details and send it for approval.'}</p>
            {data.events.length ? (
              <button type="button" className="workspace-text-link" onClick={() => { setSearch(''); chooseFilter('all') }}>Reset filters<Icon name="arrow-right" /></button>
            ) : !admin && <Link className="workspace-primary" href="/organizer/events/new"><Icon name="plus" />Create event</Link>}
          </div>
        )}
      </section>
    </div>
    <aside className="dashboard-secondary-column" aria-label="Schedule">
      <div className="dashboard-updates-stack">
        <section className="dashboard-panel featured-event" aria-labelledby="spotlight-title">
          <div className="panel-heading"><h2 id="spotlight-title">Upcoming event</h2><Icon name="calendar-event" /></div>
          {featured ? (
            <>
              <div className="featured-event-image">
                {featured.poster && <Image src={featured.poster} alt="" fill unoptimized sizes="(max-width: 760px) 100vw, 340px" />}
                <span>{date(featured.startsAt, { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="featured-event-body">
                <h3>{featured.name}</h3>
                <p><Icon name="map-pin" />{featured.venue}</p>
                <p><Icon name="clock" />{formatRange(featured.startsAt, featured.endsAt)}</p>
                {preview ? (
                  <a className="workspace-text-link" href="#events" onClick={() => { setSearch(''); chooseFilter('upcoming') }}>
                    View upcoming events <Icon name="arrow-right" />
                  </a>
                ) : (
                  <Link className="workspace-text-link" href={admin ? featured.href : `/check-in/${featured.id}`}>
                  {admin ? 'View event details' : 'Open check-in'} <Icon name="arrow-right" />
                </Link>
                )}
              </div>
            </>
          ) : <p className="featured-event-empty">No upcoming events.</p>}
        </section>
        <section className="dashboard-panel activity-panel" aria-labelledby="workspace-activity-title">
          <div className="panel-heading">
            <h2 id="workspace-activity-title">Recent updates</h2>
          </div>
          {latestUpdate ? (
            <article className="latest-update" aria-labelledby="latest-update-title">
              <span className="latest-update-label">Latest update</span>
              <h3 id="latest-update-title">
                {preview ? `${latestUpdate.label} for ${latestUpdate.event}` : (
                  <Link href={latestUpdate.href}>
                    {latestUpdate.label} for {latestUpdate.event}<Icon name="arrow-up-right" />
                  </Link>
                )}
              </h3>
              <time dateTime={latestUpdate.at}>{date(latestUpdate.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
            </article>
          ) : <p className="activity-empty">Your event updates and registrations will appear here.</p>}
          {earlierUpdates.length > 0 && (
            <ol className="activity-list workspace-timeline">
              {earlierUpdates.map(activity => (
                <li key={activity.id}>
                  <span className={`activity-icon tone-${activity.tone}`}>
                    <Icon name={activity.label === 'New registration' ? 'ticket' : activity.label === 'Event approved' ? 'circle-check' : 'file-pencil'} />
                  </span>
                  <div>
                    <strong>{activity.label}</strong>
                    {preview ? <span className="activity-event">{activity.event}</span> : <Link href={activity.href}>{activity.event}</Link>}
                    <time dateTime={activity.at}>{date(activity.at, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
      <EventCalendar events={data.events} now={data.now} />
      <section className="dashboard-panel review-summary" aria-labelledby="event-queue-title">
        <div className="panel-heading">
          <h2 id="event-queue-title">{admin ? 'Approval queue' : 'Pending review'}</h2>
          <Icon name="clock" />
        </div>
        <div className="review-summary-body">
          <strong>{number(data.pending)}</strong>
          <p>{data.pending === 1 ? 'Event awaiting review' : 'Events awaiting review'}</p>
          {data.pending > 0 && (
            <a className="workspace-text-link" href="#events" onClick={() => { setSearch(''); chooseFilter('pending') }}>
              Show pending events <Icon name="arrow-right" />
            </a>
          )}
        </div>
      </section>
    </aside></div>
  </div>
}

function EventThumbnail({ event }: { event: DashboardEvent }) {
  return <span className="event-thumbnail">{event.poster ? <Image src={event.poster} alt="" width={48} height={48} unoptimized /> : <><strong>{date(event.startsAt, { day: '2-digit' })}</strong><span>{date(event.startsAt, { month: 'short' })}</span></>}</span>
}
