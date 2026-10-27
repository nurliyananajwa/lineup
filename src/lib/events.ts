// Helpers shared by the event forms and server actions.

export type GuestInput = { name: string; designation: string; organization: string; guest_type: string }

export type EventFormValues = {
  name: string
  venue_id: string
  starts_at: string // "YYYY-MM-DDTHH:MM" in Malaysia time, as the date picker gives it
  ends_at: string
  objectives: string
  scope: string
  content_type: string
  submitter_name: string
  submitter_position: string
  submitter_phone: string
  guests: GuestInput[]
}

export type EventFormState = { error?: string; values?: EventFormValues; attempt?: number } | undefined

// The date picker gives "2026-11-03T14:00" with no timezone. We treat it as Malaysia time (+08:00).
export function malaysiaLocalToIso(local: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) return null
  const d = new Date(`${local}:00+08:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// The reverse, for filling the date picker when editing.
export function isoToMalaysiaLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 16)
}

export function readEventForm(formData: FormData): EventFormValues {
  const text = (key: string) => String(formData.get(key) ?? '').trim()
  let guests: GuestInput[] = []
  try {
    const parsed = JSON.parse(String(formData.get('guests') ?? '[]'))
    if (Array.isArray(parsed)) {
      guests = parsed
        .map((g) => ({
          name: String(g?.name ?? '').trim(),
          designation: String(g?.designation ?? '').trim(),
          organization: String(g?.organization ?? '').trim(),
          guest_type: String(g?.guest_type ?? '').trim(),
        }))
        .filter((g) => g.name)
        .slice(0, 50)
    }
  } catch {
    guests = []
  }
  return {
    name: text('name'),
    venue_id: text('venue_id'),
    starts_at: text('starts_at'),
    ends_at: text('ends_at'),
    objectives: text('objectives'),
    scope: text('scope'),
    content_type: text('content_type'),
    submitter_name: text('submitter_name'),
    submitter_position: text('submitter_position'),
    submitter_phone: text('submitter_phone'),
    guests,
  }
}

// Checks the form and builds the row to save. Submitting needs more than a draft does.
export function validateEvent(v: EventFormValues, submitting: boolean) {
  if (!v.name) return { error: 'Give the event a name.' } as const
  const starts = malaysiaLocalToIso(v.starts_at)
  const ends = malaysiaLocalToIso(v.ends_at)
  if (!starts || !ends) return { error: 'Choose a start and end date and time.' } as const
  if (new Date(ends) <= new Date(starts)) return { error: 'The event must end after it starts.' } as const
  if (submitting) {
    if (new Date(starts) <= new Date()) return { error: 'The start time must be in the future.' } as const
    if (!v.venue_id) return { error: 'Choose a venue before submitting.' } as const
    if (!v.objectives) return { error: 'Add the event objectives before submitting.' } as const
  }
  const venueId = v.venue_id ? Number(v.venue_id) : null
  if (venueId !== null && !Number.isInteger(venueId)) return { error: 'Choose a valid venue.' } as const

  return {
    row: {
      name: v.name,
      venue_id: venueId,
      starts_at: starts,
      ends_at: ends,
      objectives: v.objectives || null,
      scope: v.scope || null,
      content_type: v.content_type || null,
      submitter_name: v.submitter_name || null,
      submitter_position: v.submitter_position || null,
      submitter_phone: v.submitter_phone || null,
    },
  } as const
}

// Turn database errors into messages a person can act on.
export function friendlyDbError(error: { code?: string; message?: string }) {
  if (error.code === '23P01') return 'That venue is already booked at an overlapping time. Pick another time or venue.'
  if (error.code === '23514') return 'Please check the dates: the event must end after it starts.'
  return 'Something went wrong while saving. Please try again.'
}
