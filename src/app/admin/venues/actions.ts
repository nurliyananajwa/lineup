'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export type VenueFormState = { error?: string } | undefined

function readVenue(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim()
  const address = String(formData.get('address') ?? '').trim() || null
  const type = String(formData.get('type') ?? '').trim() || null
  const capacity = Number(formData.get('capacity'))
  if (!name) return { error: 'Venue name is required.' } as const
  if (!Number.isInteger(capacity) || capacity < 1) return { error: 'Capacity must be a whole number above 0.' } as const
  return { venue: { name, address, type, capacity } } as const
}

export async function createVenue(_prev: VenueFormState, formData: FormData): Promise<VenueFormState> {
  await requireRole('admin')
  const parsed = readVenue(formData)
  if ('error' in parsed) return { error: parsed.error }

  const supabase = await createClient()
  const { error } = await supabase.from('venues').insert(parsed.venue)
  if (error) return { error: 'Could not save the venue.' }
  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function updateVenue(id: number, _prev: VenueFormState, formData: FormData): Promise<VenueFormState> {
  await requireRole('admin')
  const parsed = readVenue(formData)
  if ('error' in parsed) return { error: parsed.error }

  const supabase = await createClient()
  const { error } = await supabase.from('venues').update(parsed.venue).eq('id', id)
  if (error) return { error: 'Could not save the venue.' }
  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}

export async function deleteVenue(id: number) {
  await requireRole('admin')
  const supabase = await createClient()
  const { error } = await supabase.from('venues').delete().eq('id', id)
  // A venue that already has events can't be deleted (the database blocks it).
  if (error) redirect('/admin/venues?error=in-use')
  revalidatePath('/admin/venues')
  redirect('/admin/venues')
}
