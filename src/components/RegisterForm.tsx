'use client'

import { useActionState } from 'react'
import type { RegisterState } from '@/app/events/[id]/actions'

export default function RegisterForm({ action }: { action: (prev: RegisterState, fd: FormData) => Promise<RegisterState> }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form action={formAction} className="space-y-3">
      <label className="field"><span>Your name</span><input name="name" required autoComplete="name" /></label>
      <label className="field"><span>Email</span><input name="email" type="email" required autoComplete="email" /></label>
      {state?.error && <p className="alert-error">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>{pending ? 'Registering…' : 'Register and get my ticket'}</button>
      <p className="text-xs text-muted">Your ticket opens on the next page. Save the link or take a screenshot of the QR code.</p>
    </form>
  )
}
