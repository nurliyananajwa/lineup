import type { createClient } from '@/lib/supabase/server'

export async function loadAttendees(supabase: Awaited<ReturnType<typeof createClient>>, eventId: number) {
  const attendees = []
  const pageSize = 500
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase.from('tickets')
      .select('id, name, email, created_at, attended, checked_in_at')
      .eq('event_id', eventId).order('id').range(offset, offset + pageSize - 1)
    if (error) throw new Error('Could not load attendees. Please try again.')
    attendees.push(...(data ?? []))
    if (!data || data.length < pageSize) return attendees
  }
}
