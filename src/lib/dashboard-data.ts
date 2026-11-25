import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { buildDashboardModel, type DashboardSourceEvent, type DashboardTicket } from './dashboard-model'
export async function getDashboardData(profile: { id: string; role: 'admin' | 'organizer' }) {
  const supabase = await createClient()
  // Page complete datasets; totals and charts must not silently stop at 1,000 rows.
  async function loadEvents() {
    const rows: DashboardSourceEvent[] = []
    for (let offset = 0; ; offset += 500) {
      let query = supabase.from('events').select('id,name,status,starts_at,ends_at,poster_url,created_at,reviewed_at,review_comments,venues(name,address,capacity)').order('id').range(offset, offset + 499)
      if (profile.role === 'organizer') query = query.eq('organizer_id', profile.id)
      const { data, error } = await query
      if (error) throw new Error('Could not load your event overview. Please try again.')
      rows.push(...(data ?? []))
      if (!data || data.length < 500) return rows
    }
  }
  async function loadTickets() {
    const rows: DashboardTicket[] = []
    for (let offset = 0; ; offset += 500) {
      const { data, error } = await supabase.from('tickets').select('event_id,attended,created_at,checked_in_at').order('id').range(offset, offset + 499)
      if (error) throw new Error('Could not load registration totals. Please try again.')
      rows.push(...(data ?? []))
      if (!data || data.length < 500) return rows
    }
  }
  const [events, tickets] = await Promise.all([loadEvents(), loadTickets()])
  // Existing RLS scopes rows. Only aggregates reach the browser, without attendee identities or tokens.
  return buildDashboardModel(events, tickets, profile.role, new Date().toISOString())
}
