import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The confirmation email links here with a one-time ?code=...
// We swap the code for a login session, then send the user to their dashboard.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(`${origin}/dashboard`)
  }
  return NextResponse.redirect(`${origin}/login?error=confirm`)
}
