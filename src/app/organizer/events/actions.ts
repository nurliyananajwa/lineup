'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  friendlyDbError, readEventForm, validateEvent,
  type EventFormState,
} from '@/lib/events'

const POSTER_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
const POSTER_MAX_BYTES = 3 * 1024 * 1024

type Supabase = Awaited<ReturnType<typeof createClient>>

// Uploads the poster (if one was chosen) into the user's own folder and returns its public URL.
async function uploadPoster(supabase: Supabase, userId: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { url: undefined }
  const ext = POSTER_TYPES[file.type]
  if (!ext) return { error: 'The poster must be a JPG, PNG or WebP image.' }
  if (file.size > POSTER_MAX_BYTES) return { error: 'The poster must be 3 MB or smaller.' }

  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('posters').upload(path, file, { contentType: file.type })
  if (error) return { error: 'Could not upload the poster.' }
  return { url: supabase.storage.from('posters').getPublicUrl(path).data.publicUrl, path }
}

// One action for both "Save draft" and "Submit for approval" (the button's name="intent" says which).
// eventId is null when creating a new event.
export async function saveEvent(eventId: number | null, prev: EventFormState, formData: FormData): Promise<EventFormState> {
  const profile = await requireRole('organizer')
  const submitting = formData.get('intent') === 'submit'
  const values = readEventForm(formData)
  // Send the typed values back on error so the form doesn't lose them.
  const fail = (error: string): EventFormState => ({ error, values, attempt: (prev?.attempt ?? 0) + 1 })

  const checked = validateEvent(values, submitting)
  if ('error' in checked) return fail(checked.error!)

  const supabase = await createClient()
  const poster = await uploadPoster(supabase, profile.id, formData.get('poster'))
  if (poster.error) return fail(poster.error)
  const row = { ...checked.row, ...(poster.url ? { poster_url: poster.url } : {}) }

  const { data: id, error } = await supabase.rpc('save_event_with_guests', {
    p_event_id: eventId, p_event: row, p_guests: values.guests, p_submit: submitting,
  })
  if (error || !id) {
    // The database transaction rolls back the event and guests. Storage uploads
    // are separate, so remove this newly uploaded poster on a failed save.
    if (poster.path) await supabase.storage.from('posters').remove([poster.path])
    return fail(error?.message === 'This event can no longer be edited'
      ? 'This event can no longer be edited.' : friendlyDbError(error ?? {}))
  }

  revalidatePath('/organizer')
  redirect(`/organizer/events/${id}?saved=${submitting ? 'submitted' : 'draft'}`)
}

export async function deleteDraft(eventId: number) {
  await requireRole('organizer')
  const supabase = await createClient()
  // The database only lets organizers delete their own drafts.
  const { data, error } = await supabase.from('events').delete().eq('id', eventId).select('id')
  if (error || !data?.length) throw new Error('The draft could not be deleted. Please try again.')
  revalidatePath('/organizer')
  redirect('/organizer')
}
