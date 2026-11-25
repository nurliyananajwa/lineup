import { createClient } from '@/lib/supabase/server'
import { createPublicClient } from '@/lib/supabase/public'
export { parseId } from '@/lib/ids'

export async function getPublicEventWithGuests(eventId: number) {
  const supabase = await createPublicClient()
  const [{ data: event, error: eventError }, { data: guests, error: guestsError }] = await Promise.all([
    supabase.from('events')
      .select('id, name, status, starts_at, ends_at, objectives, scope, content_type, poster_url, venues(name, address, capacity)')
      .eq('id', eventId).eq('status', 'approved').maybeSingle(),
    supabase.from('guests').select('id, name, designation, organization, guest_type').eq('event_id', eventId).order('id'),
  ])
  if (eventError || guestsError) throw new Error('Could not load the event. Please try again.')
  return { event, guests: guests ?? [] }
}

// One place for "load an event with its venue and guests".
// What comes back depends on who is asking: the database's rules decide.
export async function getEventWithGuests(eventId: number) {
  const supabase = await createClient()
  const [{ data: event, error: eventError }, { data: guests, error: guestsError }] = await Promise.all([
    supabase
      .from('events')
      .select('*, venues(name, address, capacity)')
      .eq('id', eventId)
      .maybeSingle(),
    supabase.from('guests').select('id, name, designation, organization, guest_type').eq('event_id', eventId).order('id'),
  ])
  if (eventError || guestsError) throw new Error('Could not load the event. Please try again.')
  return { event, guests: guests ?? [] }
}

export async function getVenueOptions() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('venues').select('id, name, capacity').order('name')
  if (error) throw new Error('Could not load venues. Please try again.')
  return data ?? []
}
