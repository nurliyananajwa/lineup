'use client'

import { useActionState } from 'react'
import type { ReviewState } from '@/app/admin/events/actions'

export default function ReviewForm({ action }: { action: (prev: ReviewState, fd: FormData) => Promise<ReviewState> }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form action={formAction} className="card space-y-4">
      <h2 className="text-lg font-semibold">Your decision</h2>
      <label className="field">
        <span>Comments for the organizer (required when rejecting)</span>
        <textarea name="comments" rows={3} />
      </label>
      {state?.error && <p className="alert-error">{state.error}</p>}
      <div className="flex gap-3">
        <button name="decision" value="approved" className="btn-primary" disabled={pending}>Approve</button>
        <button name="decision" value="rejected" className="btn-danger px-4 py-2" disabled={pending}>Reject</button>
      </div>
    </form>
  )
}
