'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendTicketEmail } from '@/lib/email'

export type RegisterState = { error?: string } | undefined

// Public registration. All the checks (approved, not started, seats left,
// one ticket per email) happen inside the register_for_event database function.
export async function register(eventId: number, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  if (!name || !email) return { error: 'Enter your name and email.' }

  const supabase = await createClient()
  const { data: token, error } = await supabase.rpc('register_for_event', {
    p_event_id: eventId, p_name: name, p_email: email,
  })
  // The database's error messages are written for people, so show them as they are.
  if (error || !token) return { error: error?.message ?? 'Registration failed. Please try again.' }

  // Email the ticket link after the response, so registration feels instant.
  const { data: event } = await supabase
    .from('events')
    .select('id, name, starts_at, ends_at, venues(name, address)')
    .eq('id', eventId)
    .maybeSingle()
  if (event) {
    const venue = event.venues ? [event.venues.name, event.venues.address].filter(Boolean).join(', ') : null
    after(() => sendTicketEmail({ to: email, name, token, event, venue }))
  }

  redirect(`/tickets/${token}`)
}
