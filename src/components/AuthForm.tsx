'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { login, signup } from '@/app/auth/actions'

// One form for both login and signup. useActionState runs the server action
// and gives back its result (an error or a message) plus a "pending" flag.
export default function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const [state, action, pending] = useActionState(mode === 'login' ? login : signup, undefined)
  const isLogin = mode === 'login'

  return (
    <form action={action} className="card mx-auto mt-12 w-full max-w-sm space-y-4">
      <h1 className="text-2xl font-semibold">{isLogin ? 'Log in' : 'Create an account'}</h1>

      {!isLogin && (
        <label className="field">
          <span>Full name</span>
          <input name="name" required autoComplete="name" />
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={isLogin ? undefined : 8}
          autoComplete={isLogin ? 'current-password' : 'new-password'}
        />
      </label>
      {next && <input type="hidden" name="next" value={next} />}

      {state?.error && <p className="alert-error">{state.error}</p>}
      {state?.message && <p className="alert-success">{state.message}</p>}

      <button className="btn-primary w-full" disabled={pending}>
        {pending ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
      </button>

      <p className="text-sm text-muted">
        {isLogin ? (
          <>No account yet? <Link href="/signup" className="link">Sign up</Link></>
        ) : (
          <>Already have an account? <Link href="/login" className="link">Log in</Link></>
        )}
      </p>
    </form>
  )
}
