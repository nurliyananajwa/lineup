import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import Loading from '@/components/Loading'
import { createClient } from '@/lib/supabase/server'
import { formatRange } from '@/lib/format'

export const metadata = { title: 'Your ticket · Lineup' }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The ticket link itself is the proof: its token is long and random, so it can't be guessed.
async function TicketContent({ params }: PageProps<'/tickets/[token]'>) {
  const { token } = await params
  if (!UUID.test(token)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.rpc('get_ticket', { p_token: token })
  const ticket = data?.[0]
  if (!ticket) notFound()

  // The QR code holds the token. In v2, organizers scan it at the door to mark attendance.
  const qr = await QRCode.toDataURL(token, { width: 280, margin: 1 })

  return (
    <div className="mx-auto max-w-sm space-y-4">
      <div className="card space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-indigo-700">Your ticket</p>
        <h1 className="text-2xl font-bold">{ticket.event_name}</h1>
        <p className="text-sm text-muted">{formatRange(ticket.starts_at, ticket.ends_at)}</p>
        {ticket.venue_name && (
          <p className="text-sm text-muted">{ticket.venue_name}{ticket.venue_address ? ` · ${ticket.venue_address}` : ''}</p>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="Ticket QR code" width={280} height={280} className="mx-auto" />
        <div>
          <p className="font-semibold">{ticket.ticket_name}</p>
          <p className="text-sm text-muted">{ticket.ticket_email}</p>
        </div>
        {ticket.attended && <p className="alert-success">Checked in. Enjoy the event!</p>}
      </div>
      <p className="text-center text-sm text-muted">Bookmark this page or screenshot the QR code to show at the door.</p>
      <p className="text-center"><Link href={`/events/${ticket.event_id}`} className="link text-sm">Back to the event</Link></p>
    </div>
  )
}

export default function TicketPage(props: PageProps<'/tickets/[token]'>) {
  return (
    <Suspense fallback={<Loading />}>
      <TicketContent {...props} />
    </Suspense>
  )
}
