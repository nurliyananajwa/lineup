'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

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
    .select('id')
  if (error) return { error: 'Could not save the decision. Please try again.' }
  if (!data?.length) return { error: 'This event is no longer waiting for review.' }

  revalidatePath('/admin')
  revalidatePath('/admin/events')
  revalidatePath('/')
  redirect(`/admin/events?done=${decision}`)
}
