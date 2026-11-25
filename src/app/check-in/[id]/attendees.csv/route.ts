import { NextResponse, type NextRequest } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseId } from '@/lib/queries'
import { loadAttendees } from '@/lib/attendees'
import { csvCell as cell } from '@/lib/csv'

// A spreadsheet cell starting with = + - @ can run as a formula when opened in Excel.
// Prefixing an apostrophe keeps attendee-typed text as plain text.
const myt = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kuala_Lumpur', dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso))
    : ''

// GET /check-in/12/attendees.csv  →  downloads the attendee list for event 12.
export async function GET(_req: NextRequest, ctx: RouteContext<'/check-in/[id]/attendees.csv'>) {
  const profile = await getProfile()
  if (!profile) return new NextResponse('Please log in.', { status: 401 })
  const id = parseId((await ctx.params).id)
  if (!id) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const { data: event, error: eventError } = await supabase.from('events').select('id, name, organizer_id').eq('id', id).maybeSingle()
  if (eventError) return new NextResponse('Could not load the event. Please try again.', { status: 503 })
  if (!event || (profile.role !== 'admin' && event.organizer_id !== profile.id)) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Fetch every page: Supabase limits an unpaginated response to 1,000 rows.
  let tickets: Awaited<ReturnType<typeof loadAttendees>>
  try { tickets = await loadAttendees(supabase, id) }
  catch { return new NextResponse('Could not export attendees. Please try again.', { status: 503 }) }
  tickets.sort((a, b) => a.name.localeCompare(b.name))

  const rows = [
    ['Name', 'Email', 'Registered', 'Checked in', 'Check-in time'].map(cell).join(','),
    ...(tickets ?? []).map((t) =>
      [t.name, t.email, myt(t.created_at), t.attended ? 'Yes' : 'No', myt(t.checked_in_at)].map(cell).join(','),
    ),
  ]
  const fileName = `${event.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'}-attendees.csv`

  // The ﻿ at the start tells Excel the file is UTF-8, so names with accents display correctly.
  return new NextResponse('﻿' + rows.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}
