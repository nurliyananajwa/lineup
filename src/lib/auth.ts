import { redirect } from 'next/navigation'
import { connection } from 'next/server'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

export type Role = 'organizer' | 'admin'

// The logged-in user's profile, or null. cache() means several components
// on the same page can call this without hitting the database twice.
export const getProfile = cache(async () => {
  // Checking the login session reads the clock (is it expired?), so it must run per request.
  await connection()
  const supabase = await createClient()
  const { data: claims } = await supabase.auth.getClaims()
  const userId = claims?.claims?.sub
  if (!userId) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, username, role')
    .eq('id', userId)
    .single()
  return profile ? { ...profile, role: profile.role as Role } : null
})

// Use at the top of a private page. Sends the visitor away if they
// aren't logged in or don't have the right role.
// This is for a friendly redirect only: the database enforces the real rules.
export async function requireRole(role?: Role) {
  const profile = await getProfile()
  if (!profile) redirect('/login')
  if (role && profile.role !== role) redirect('/dashboard')
  return profile
}
