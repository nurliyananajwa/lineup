'use client'

import { useActionState } from 'react'
import type { VenueFormState } from '@/app/admin/venues/actions'
import type { Tables } from '@/lib/database.types'

type Props = {
  action: (prev: VenueFormState, formData: FormData) => Promise<VenueFormState>
  venue?: Tables<'venues'>
  submitLabel: string
}

export default function VenueForm({ action, venue, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, undefined)

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <label className="field sm:col-span-2">
        <span>Name</span>
        <input name="name" required defaultValue={venue?.name} placeholder="e.g. Main Hall" />
      </label>
      <label className="field sm:col-span-2">
        <span>Address</span>
        <input name="address" defaultValue={venue?.address ?? ''} placeholder="e.g. Block A, Level 2" />
      </label>
      <label className="field">
        <span>Type</span>
        <input name="type" defaultValue={venue?.type ?? ''} placeholder="e.g. Auditorium" />
      </label>
      <label className="field">
        <span>Capacity</span>
        <input name="capacity" type="number" min={1} required defaultValue={venue?.capacity} />
      </label>
      {state?.error && <p className="alert-error sm:col-span-2">{state.error}</p>}
      <div className="sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{pending ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  )
}
