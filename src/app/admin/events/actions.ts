'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { sendDecisionEmail } from '@/lib/email'

export type ReviewState = { error?: string } | undefined

export async function reviewEvent(eventId: number, _prev: ReviewState, formData: FormData): Promise<ReviewState> {
  await requireRole('admin')
  const decision = formData.get('decision')
  const comments = String(formData.get('comments') ?? '').trim()
  if (decision !== 'approved' && decision !== 'rejected') return { error: 'Choose approve or reject.' }
  if (decision === 'rejected' && !comments) return { error: 'Tell the organizer why it was rejected, so they can fix it.' }

  const supabase = await createClient()
  // Only pending events can be reviewed. The database records who reviewed it and when.
  const { data, error } = await supabase
    .from('events')
    .update({ status: decision, review_comments: comments || null })
    .eq('id', eventId)
    .eq('status', 'pending')
    .select('id, name, starts_at, ends_at')
  if (error) return { error: 'Could not save the decision. Please try again.' }
  const event = data?.[0]
  if (!event) return { error: 'This event is no longer waiting for review.' }

  // Look up the organizer's email now (while we're still inside the request),
  // then send the email after the response, so the admin isn't kept waiting.
  const { data: contact } = await supabase.rpc('event_organizer_contact', { p_event_id: eventId })
  const organizer = contact?.[0]
  if (organizer?.email) {
    after(() =>
      sendDecisionEmail({ to: organizer.email, organizerName: organizer.name, event, decision, comments: comments || null }),
    )
  }

  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/')
  redirect(`/admin/events?done=${decision}`)
}
