'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type CheckInResult =
  | { status: 'ok'; name: string }
  | { status: 'already'; name: string; at: string | null }
  | { status: 'wrong_event' | 'invalid' | 'error'; message: string }

export type AttendanceState = { error?: string } | undefined

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

// Called with whatever the camera read (or what was typed). The QR code holds the
// ticket token; a pasted ticket link works too, because we pull the token out of it.
export async function checkIn(eventId: number, scanned: string): Promise<CheckInResult> {
  const profile = await requireRole()
  const token = scanned.match(UUID)?.[0]?.toLowerCase()
  if (!token) return { status: 'invalid', message: 'That code is not a Lineup ticket.' }

  const supabase = await createClient()
  const { data: event, error: eventError } = await supabase.from('events')
    .select('id, organizer_id, status').eq('id', eventId).maybeSingle()
  if (eventError) return { status: 'error', message: 'Could not load the event. Please try again.' }
  if (!event || event.status !== 'approved' || (profile.role !== 'admin' && event.organizer_id !== profile.id)) {
    return { status: 'invalid', message: 'Check-in is not available for this event.' }
  }
  // The database only returns tickets for events this user organizes (or all, for admins).
  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .select('id, name, event_id, attended, checked_in_at')
    .eq('token', token)
    .maybeSingle()

  if (ticketError) return { status: 'error', message: 'Could not look up the ticket. Please try again.' }
  if (!ticket) return { status: 'invalid', message: 'Ticket not found, or it belongs to an event you don’t manage.' }
  if (ticket.event_id !== eventId) return { status: 'wrong_event', message: `${ticket.name}’s ticket is for a different event.` }
  if (ticket.attended) return { status: 'already', name: ticket.name, at: ticket.checked_in_at }

  // ".eq('attended', false)" means two phones scanning the same ticket can't both succeed.
  const { data: updated, error: updateError } = await supabase
    .from('tickets')
    .update({ attended: true })
    .eq('id', ticket.id)
    .eq('event_id', eventId)
    .eq('attended', false)
    .select('id')
  if (updateError) return { status: 'error', message: 'Check-in could not be saved. Please scan again.' }
  if (!updated?.length) {
    const { data: current, error: currentError } = await supabase.from('tickets')
      .select('attended, checked_in_at').eq('id', ticket.id).eq('event_id', eventId).maybeSingle()
    if (currentError || !current?.attended) return { status: 'error', message: 'Check-in could not be confirmed. Please scan again.' }
    return { status: 'already', name: ticket.name, at: current.checked_in_at }
  }

  revalidatePath(`/check-in/${eventId}`)
  return { status: 'ok', name: ticket.name }
}

// Manual check-in (or undo) from the attendee list, for when a phone can't show the QR code.
export async function setAttendance(eventId: number, ticketId: number, attended: boolean): Promise<AttendanceState> {
  const profile = await requireRole()
  const supabase = await createClient()
  const { data: event, error: eventError } = await supabase.from('events')
    .select('id, organizer_id, status').eq('id', eventId).maybeSingle()
  if (eventError) return { error: 'Could not load the event. Please try again.' }
  if (!event || event.status !== 'approved' || (profile.role !== 'admin' && event.organizer_id !== profile.id)) {
    return { error: 'You cannot change attendance for this event.' }
  }
  const { data, error } = await supabase.from('tickets').update({ attended })
    .eq('id', ticketId).eq('event_id', eventId).select('id')
  if (error || !data?.length) return { error: 'Attendance was not saved. Please try again.' }
  revalidatePath(`/check-in/${eventId}`)
  return undefined
}
