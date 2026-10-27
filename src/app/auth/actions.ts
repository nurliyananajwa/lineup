'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FormState = { error?: string; message?: string } | undefined

// Only allow redirects back into this site, never to another domain.
function safeNext(next: FormDataEntryValue | null) {
  const value = typeof next === 'string' ? next : ''
  return value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!email || !password) return { error: 'Enter your email and password.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return {
      error: error.message === 'Email not confirmed'
        ? 'Please confirm your email first. Check your inbox for the link.'
        : 'Wrong email or password.',
    }
  }
  redirect(safeNext(formData.get('next')))
}

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get('name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!name || !email) return { error: 'Enter your name and email.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }

  const origin = (await headers()).get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const supabase = await createClient()
  // Only the name is sent. The role is always set to "organizer" by the database,
  // so nobody can sign themselves up as an admin.
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/callback` },
  })
  if (error) return { error: error.message }

  // If email confirmation is switched off in Supabase, the user is logged in straight away.
  if (data.session) redirect('/dashboard')
  return { message: 'Check your email for a confirmation link, then log in.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
