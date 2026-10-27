import { NextResponse, type NextRequest } from 'next/server'
import { getProfile } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { parseId } from '@/lib/queries'

// A spreadsheet cell starting with = + - @ can run as a formula when opened in Excel.
// Prefixing an apostrophe keeps attendee-typed text as plain text.
function cell(value: string | null | undefined) {
  let v = value ?? ''
  if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`
  return `"${v.replace(/"/g, '""')}"`
}

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
  const { data: event } = await supabase.from('events').select('id, name, organizer_id').eq('id', id).maybeSingle()
  if (!event || (profile.role !== 'admin' && event.organizer_id !== profile.id)) {
    return new NextResponse('Not found', { status: 404 })
  }

  const { data: tickets } = await supabase
    .from('tickets')
    .select('name, email, created_at, attended, checked_in_at')
    .eq('event_id', id)
    .order('name')

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
