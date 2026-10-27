import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

// Next.js 16 calls this "Proxy" (it used to be "Middleware").
// It only does a quick "are you logged in?" check. The real permission checks
// happen in each page and, most importantly, in the database's security rules.
export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
