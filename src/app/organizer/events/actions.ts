'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import {
  friendlyDbError, readEventForm, validateEvent,
  type EventFormState, type GuestInput,
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
  return { url: supabase.storage.from('posters').getPublicUrl(path).data.publicUrl }
}

// Replaces the event's guest list with the one from the form.
async function saveGuests(supabase: Supabase, eventId: number, guests: GuestInput[]) {
  const { error: delError } = await supabase.from('guests').delete().eq('event_id', eventId)
  if (delError) return delError
  if (guests.length === 0) return null
  const { error } = await supabase.from('guests').insert(
    guests.map((g) => ({
      event_id: eventId,
      name: g.name,
      designation: g.designation || null,
      organization: g.organization || null,
      guest_type: g.guest_type || null,
    })),
  )
  return error
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

  let id = eventId
  if (id === null) {
    // New event: save it as a draft first, add guests, then submit it if asked.
    const { data, error } = await supabase.from('events').insert({ ...row, status: 'draft' }).select('id').single()
    if (error || !data) return fail(friendlyDbError(error ?? {}))
    id = data.id
    const guestError = await saveGuests(supabase, id, values.guests)
    if (guestError) return fail('The event was saved, but the guest list could not be saved.')
    if (submitting) {
      const { error: submitError } = await supabase.from('events').update({ status: 'pending' }).eq('id', id)
      if (submitError) {
        // Keep the draft and show the problem on its edit page.
        redirect(`/organizer/events/${id}?error=${submitError.code === '23P01' ? 'clash' : 'submit'}`)
      }
    }
  } else {
    // Existing event: only drafts and rejected events can be edited (the database enforces this).
    const guestError = await saveGuests(supabase, id, values.guests)
    if (guestError) return fail('This event can no longer be edited.')
    const { data, error } = await supabase
      .from('events')
      .update({ ...row, status: submitting ? 'pending' : 'draft' })
      .eq('id', id)
      .select('id')
    if (error) return fail(friendlyDbError(error))
    if (!data?.length) return fail('This event can no longer be edited.')
  }

  revalidatePath('/organizer')
  redirect(`/organizer/events/${id}?saved=${submitting ? 'submitted' : 'draft'}`)
}

export async function deleteDraft(eventId: number) {
  await requireRole('organizer')
  const supabase = await createClient()
  // The database only lets organizers delete their own drafts.
  await supabase.from('events').delete().eq('id', eventId)
  revalidatePath('/organizer')
  redirect('/organizer')
}
