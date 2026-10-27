'use client'

import { useActionState, useState } from 'react'
import type { EventFormState, EventFormValues, GuestInput } from '@/lib/events'

type Venue = { id: number; name: string; capacity: number }
type Props = {
  action: (prev: EventFormState, formData: FormData) => Promise<EventFormState>
  venues: Venue[]
  initial?: EventFormValues
  posterUrl?: string | null
}

const EMPTY: EventFormValues = {
  name: '', venue_id: '', starts_at: '', ends_at: '', objectives: '', scope: '', content_type: '',
  submitter_name: '', submitter_position: '', submitter_phone: '', guests: [],
}

export default function EventForm({ action, venues, initial, posterUrl }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)
  // After a failed save, show what the user typed instead of the original values.
  const v = state?.values ?? initial ?? EMPTY

  return (
    // key changes after each failed attempt, so the inputs pick up the returned values.
    <form key={state?.attempt ?? 0} action={formAction} className="space-y-8">
      {state?.error && <p className="alert-error">{state.error}</p>}

      <section className="card grid gap-4 sm:grid-cols-2">
        <h2 className="text-lg font-semibold sm:col-span-2">Event details</h2>
        <label className="field sm:col-span-2">
          <span>Event name</span>
          <input name="name" required defaultValue={v.name} />
        </label>
        <label className="field">
          <span>Starts (Malaysia time)</span>
          <input name="starts_at" type="datetime-local" required defaultValue={v.starts_at} />
        </label>
        <label className="field">
          <span>Ends (Malaysia time)</span>
          <input name="ends_at" type="datetime-local" required defaultValue={v.ends_at} />
        </label>
        <label className="field">
          <span>Venue</span>
          <select name="venue_id" defaultValue={v.venue_id}>
            <option value="">Choose a venue…</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} (up to {venue.capacity.toLocaleString()})
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Type of event</span>
          <input name="content_type" defaultValue={v.content_type} placeholder="e.g. Talk, Workshop, Competition" />
        </label>
        <label className="field sm:col-span-2">
          <span>Objectives</span>
          <textarea name="objectives" rows={3} defaultValue={v.objectives} />
        </label>
        <label className="field sm:col-span-2">
          <span>Scope and audience</span>
          <textarea name="scope" rows={2} defaultValue={v.scope} placeholder="Who is it for, and what will happen?" />
        </label>
        <label className="field sm:col-span-2">
          <span>Poster (JPG, PNG or WebP, up to 3 MB)</span>
          <input name="poster" type="file" accept="image/jpeg,image/png,image/webp" />
          {posterUrl && <span className="text-xs font-normal text-muted">A poster is already uploaded. Choose a file only to replace it.</span>}
        </label>
      </section>

      <GuestsEditor initial={v.guests} />

      <section className="card grid gap-4 sm:grid-cols-3">
        <h2 className="text-lg font-semibold sm:col-span-3">Person in charge</h2>
        <label className="field"><span>Name</span><input name="submitter_name" defaultValue={v.submitter_name} /></label>
        <label className="field"><span>Position</span><input name="submitter_position" defaultValue={v.submitter_position} /></label>
        <label className="field"><span>Phone</span><input name="submitter_phone" type="tel" defaultValue={v.submitter_phone} /></label>
      </section>

      <div className="flex flex-wrap gap-3">
        <button name="intent" value="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Saving…' : 'Submit for approval'}
        </button>
        <button name="intent" value="draft" className="btn-secondary" disabled={pending}>Save as draft</button>
      </div>
    </form>
  )
}

// A small list editor. The rows live in React state and are sent as one JSON field.
function GuestsEditor({ initial }: { initial: GuestInput[] }) {
  const [guests, setGuests] = useState<GuestInput[]>(initial)
  const update = (i: number, field: keyof GuestInput, value: string) =>
    setGuests((gs) => gs.map((g, idx) => (idx === i ? { ...g, [field]: value } : g)))

  return (
    <section className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Guests and speakers</h2>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setGuests((gs) => [...gs, { name: '', designation: '', organization: '', guest_type: '' }])}
        >
          Add guest
        </button>
      </div>
      {guests.length === 0 && <p className="text-sm text-muted">No guests added.</p>}
      {guests.map((g, i) => (
        <div key={i} className="grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_1fr_1fr_8rem_auto]">
          <input aria-label="Guest name" placeholder="Name" value={g.name} onChange={(e) => update(i, 'name', e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <input aria-label="Designation" placeholder="Designation" value={g.designation} onChange={(e) => update(i, 'designation', e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <input aria-label="Organization" placeholder="Organization" value={g.organization} onChange={(e) => update(i, 'organization', e.target.value)} className="rounded-lg border border-zinc-300 px-3 py-2 text-sm" />
          <select aria-label="Guest type" value={g.guest_type} onChange={(e) => update(i, 'guest_type', e.target.value)} className="rounded-lg border border-zinc-300 px-2 py-2 text-sm">
            <option value="">Type</option>
            <option>Speaker</option>
            <option>VIP</option>
            <option>Judge</option>
            <option>Moderator</option>
          </select>
          <button type="button" className="btn-danger" onClick={() => setGuests((gs) => gs.filter((_, idx) => idx !== i))}>
            Remove
          </button>
        </div>
      ))}
      <input type="hidden" name="guests" value={JSON.stringify(guests)} />
    </section>
  )
}
