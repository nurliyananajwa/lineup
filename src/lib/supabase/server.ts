import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

// Supabase client for Server Components, Server Actions and Route Handlers.
// It reads the logged-in user's session from cookies, so every query runs
// as that user and the database's security rules (RLS) apply to it.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // Safe to ignore: proxy.ts refreshes the session on every request.
          }
        },
      },
    },
  )
}
