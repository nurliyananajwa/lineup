export type DashboardSourceEvent = {
  id: number; name: string; status: string; starts_at: string; ends_at: string
  poster_url: string | null; created_at: string; reviewed_at: string | null
  review_comments: string | null; venues: { name: string; address: string | null; capacity: number } | null
}
export type DashboardTicket = { event_id: number; attended: boolean; created_at: string; checked_in_at: string | null }
export type DashboardEvent = {
  id: number; name: string; status: string; startsAt: string; endsAt: string
  poster: string | null; venue: string; address: string; capacity: number
  registrations: number; checkedIn: number; reviewComment: string | null; href: string
}
export type DashboardActivity = { id: string; label: string; event: string; at: string; href: string; tone: string }
export function malaysiaDateKey(iso: string) {
  const parts = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso))
  const part = (type: string) => parts.find(p => p.type === type)?.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function buildDashboardModel(source: DashboardSourceEvent[], tickets: DashboardTicket[], role: 'admin' | 'organizer', now: string) {
  const prefix = role === 'admin' ? '/admin' : '/organizer'
  const totals = new Map<number, { registrations: number; checkedIn: number; latest: string }>()
  const allowedIds = new Set(source.map(e => e.id))
  const byDay = new Map<string, number>()
  for (const ticket of tickets) {
    if (!allowedIds.has(ticket.event_id)) continue
    const total = totals.get(ticket.event_id) ?? { registrations: 0, checkedIn: 0, latest: ticket.created_at }
    total.registrations++
    if (ticket.attended) total.checkedIn++
    if (ticket.created_at > total.latest) total.latest = ticket.created_at
    totals.set(ticket.event_id, total)
    const date = malaysiaDateKey(ticket.created_at)
    byDay.set(date, (byDay.get(date) ?? 0) + 1)
  }
  const events: DashboardEvent[] = source.map(event => ({
    id: event.id, name: event.name, status: event.status, startsAt: event.starts_at, endsAt: event.ends_at,
    poster: event.poster_url, venue: event.venues?.name || 'Venue to be confirmed', address: event.venues?.address || '',
    capacity: event.venues?.capacity ?? 0, registrations: totals.get(event.id)?.registrations ?? 0,
    checkedIn: totals.get(event.id)?.checkedIn ?? 0, reviewComment: event.status === 'rejected' ? event.review_comments : null,
    href: `${prefix}/events/${event.id}`,
  }))
  const [year, month, day] = malaysiaDateKey(now).split('-').map(Number)
  const trend = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(Date.UTC(year, month - 1, day - 29 + index)).toISOString().slice(0, 10)
    return { date, count: byDay.get(date) ?? 0 }
  })
  const activity: DashboardActivity[] = []
  for (const event of source) {
    const href = `${prefix}/events/${event.id}`
    activity.push({ id: `created-${event.id}`, label: 'Event created', event: event.name, at: event.created_at, href, tone: 'purple' })
    if (event.reviewed_at && ['approved', 'rejected'].includes(event.status)) activity.push({ id: `review-${event.id}`, label: event.status === 'approved' ? 'Event approved' : 'Changes requested', event: event.name, at: event.reviewed_at, href, tone: event.status === 'approved' ? 'green' : 'amber' })
    const total = totals.get(event.id)
    if (total) activity.push({ id: `registered-${event.id}`, label: 'Latest registration', event: event.name, at: total.latest, href, tone: 'blue' })
  }
  return {
    now, events, trend, activity: activity.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5),
    upcoming: events.filter(e => e.status === 'approved' && new Date(e.endsAt).getTime() >= new Date(now).getTime()).sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    pending: events.filter(e => e.status === 'pending').length,
    registrations: [...totals.values()].reduce((n, t) => n + t.registrations, 0),
    checkedIn: [...totals.values()].reduce((n, t) => n + t.checkedIn, 0),
    statuses: ['draft', 'pending', 'approved', 'rejected'].map(status => ({ status, count: events.filter(e => e.status === status).length })),
  }
}
export type DashboardModel = ReturnType<typeof buildDashboardModel>
