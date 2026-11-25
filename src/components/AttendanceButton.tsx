'use client'

import { useActionState } from 'react'
import type { AttendanceState } from '@/app/check-in/[id]/actions'

export default function AttendanceButton({ action, undo }: {
  action: (previous: AttendanceState, formData: FormData) => Promise<AttendanceState>
  undo: boolean
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form action={formAction} className="space-y-1">
      <button disabled={pending} className="btn-secondary px-3 py-1.5">
        {pending ? 'Saving…' : undo ? 'Undo' : 'Check in'}
      </button>
      {state?.error && <p role="alert" className="text-sm text-rose-700">{state.error}</p>}
    </form>
  )
}
