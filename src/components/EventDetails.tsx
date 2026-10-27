import { formatRange, STATUS_STYLES } from '@/lib/format'

type Props = {
  event: {
    name: string
    status: string
    starts_at: string
    ends_at: string
    objectives: string | null
    scope: string | null
    content_type: string | null
    poster_url: string | null
    review_comments?: string | null
    venues: { name: string; address: string | null; capacity: number } | null
  }
  guests: { id: number; name: string; designation: string | null; organization: string | null; guest_type: string | null }[]
  showStatus?: boolean
}

// Read-only view of an event, used by the organizer, admin and public pages.
export default function EventDetails({ event, guests, showStatus = false }: Props) {
  return (
    <article className="space-y-6">
      {event.poster_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.poster_url} alt={`Poster for ${event.name}`} className="max-h-96 w-full rounded-xl object-cover" />
      ) : (
        <div className="h-40 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500" />
      )}

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{event.name}</h1>
          {showStatus && <span className={`badge ${STATUS_STYLES[event.status]}`}>{event.status}</span>}
        </div>
        <p className="text-muted">{formatRange(event.starts_at, event.ends_at)}</p>
        {event.venues && (
          <p className="text-muted">
            {event.venues.name}
            {event.venues.address ? ` · ${event.venues.address}` : ''}
          </p>
        )}
        {event.content_type && <p className="text-sm text-muted">{event.content_type}</p>}
      </header>

      {showStatus && event.review_comments && (
        <p className={event.status === 'rejected' ? 'alert-error' : 'alert-success'}>
          Admin comment: {event.review_comments}
        </p>
      )}

      {event.objectives && (
        <section className="space-y-1">
          <h2 className="font-semibold">Objectives</h2>
          <p className="whitespace-pre-line text-zinc-700">{event.objectives}</p>
        </section>
      )}
      {event.scope && (
        <section className="space-y-1">
          <h2 className="font-semibold">Scope and audience</h2>
          <p className="whitespace-pre-line text-zinc-700">{event.scope}</p>
        </section>
      )}

      {guests.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Guests and speakers</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {guests.map((g) => (
              <li key={g.id} className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <p className="font-medium">{g.name}{g.guest_type ? <span className="ml-2 text-xs text-muted">{g.guest_type}</span> : null}</p>
                <p className="text-sm text-muted">{[g.designation, g.organization].filter(Boolean).join(', ')}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
