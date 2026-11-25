import { buildDashboardModel, type DashboardSourceEvent, type DashboardTicket } from './dashboard-model'

// Sample data for the development-only route. No Supabase client or credentials.
export function getPreviewDashboard(role: 'admin' | 'organizer', now = new Date().toISOString()) {
  const daysFromNow = (days: number, hour = 12) => {
    const value = new Date(new Date(now).getTime() + days * 86400000)
    value.setUTCHours(hour, 0, 0, 0)
    return value.toISOString()
  }
  const definitions: [string, string, number][] = [
    ['Open-Air Cinema', 'approved', 3], ['The Makers’ Meet', 'approved', 9],
    ['Design for Everyone', 'pending', 5], ['Sunday Community Run', 'draft', 6],
    ['Photography Walk', 'rejected', 18], ['Creative Coding Lab', 'approved', -7],
  ]
  const events: DashboardSourceEvent[] = definitions.map(([name, status, days], index) => ({
    id: index + 1, name, status, starts_at: daysFromNow(days), ends_at: daysFromNow(days, 14),
    poster_url: null, created_at: daysFromNow(-15 + index),
    reviewed_at: ['approved', 'rejected'].includes(status) ? daysFromNow(-13 + index) : null,
    review_comments: status === 'rejected' ? 'Please confirm the venue and programme.' : null,
    venues: { name: index % 2 ? 'Perdana Botanical Garden' : 'KLCC Park', address: 'Kuala Lumpur, Malaysia', capacity: 120 },
  }))
  const tickets: DashboardTicket[] = []
  for (const [eventId, count, attended] of [[1, 48, 0], [6, 24, 18]]) {
    for (let i = 0; i < count; i++) tickets.push({ event_id: eventId, attended: i < attended, created_at: new Date(new Date(now).getTime() - (eventId === 6 ? 9 + i % 5 : i % 7) * 86400000 - 3600000).toISOString(), checked_in_at: i < attended ? daysFromNow(-7) : null })
  }
  return buildDashboardModel(events, tickets, role, now)
}
