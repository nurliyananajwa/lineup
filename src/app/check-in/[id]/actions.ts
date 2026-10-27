'use server'

import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type CheckInResult =
  | { status: 'ok'; name: string }
  | { status: 'already'; name: string; at: string | null }
  | { status: 'wrong_event' | 'invalid'; message: string }

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i

// Called with whatever the camera read (or what was typed). The QR code holds the
// ticket token; a pasted ticket link works too, because we pull the token out of it.
export async function checkIn(eventId: number, scanned: string): Promise<CheckInResult> {
  await requireRole()
  const token = scanned.match(UUID)?.[0]?.toLowerCase()
  if (!token) return { status: 'invalid', message: 'That code is not a Lineup ticket.' }

  const supabase = await createClient()
  // The database only returns tickets for events this user organizes (or all, for admins).
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, name, event_id, attended, checked_in_at')
    .eq('token', token)
    .maybeSingle()

  if (!ticket) return { status: 'invalid', message: 'Ticket not found, or it belongs to an event you don’t manage.' }
  if (ticket.event_id !== eventId) return { status: 'wrong_event', message: `${ticket.name}’s ticket is for a different event.` }
  if (ticket.attended) return { status: 'already', name: ticket.name, at: ticket.checked_in_at }

  // ".eq('attended', false)" means two phones scanning the same ticket can't both succeed.
  const { data: updated } = await supabase
    .from('tickets')
    .update({ attended: true })
    .eq('id', ticket.id)
    .eq('attended', false)
    .select('id')
  if (!updated?.length) return { status: 'already', name: ticket.name, at: null }

  revalidatePath(`/check-in/${eventId}`)
  return { status: 'ok', name: ticket.name }
}

// Manual check-in (or undo) from the attendee list, for when a phone can't show the QR code.
export async function setAttendance(eventId: number, ticketId: number, attended: boolean) {
  await requireRole()
  const supabase = await createClient()
  await supabase.from('tickets').update({ attended }).eq('id', ticketId).eq('event_id', eventId)
  revalidatePath(`/check-in/${eventId}`)
}
