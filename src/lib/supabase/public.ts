import 'server-only'
import { createClient } from '@supabase/supabase-js'
import { connection } from 'next/server'
import type { Database } from '@/lib/database.types'

// Public discovery uses the anonymous role even when an organizer is signed in.
// That role can read approved event details, but never management/contact fields.
export async function createPublicClient() {
  await connection()
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  )
}
