import { createClient } from '@/lib/supabase/server'

// One place for "load an event with its venue and guests".
// What comes back depends on who is asking: the database's rules decide.
export async function getEventWithGuests(eventId: number) {
  const supabase = await createClient()
  const [{ data: event }, { data: guests }] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name, address, capacity)')
      .eq('id', eventId)
      .maybeSingle(),
    supabase.from('guests').select('id, name, designation, organization, guest_type').eq('event_id', eventId).order('id'),
  ])
  return { event, guests: guests ?? [] }
}

export async function getVenueOptions() {
  const supabase = await createClient()
  const { data } = await supabase.from('venues').select('id, name, capacity').order('name')
  return data ?? []
}

export function parseId(raw: string) {
  const id = Number(raw)
  return Number.isInteger(id) && id > 0 ? id : null
}
