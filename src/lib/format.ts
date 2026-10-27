// All dates are stored in UTC and shown in Malaysia time.
const TZ = 'Asia/Kuala_Lumpur'

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat('en-MY', {
    timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

export function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const day = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d)
  const time = (d: Date) =>
    new Intl.DateTimeFormat('en-MY', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(d)
  return day(start) === day(end)
    ? `${formatDateTime(startIso)} – ${time(end)}`
    : `${formatDateTime(startIso)} – ${formatDateTime(endIso)}`
}

export const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-zinc-100 text-zinc-700',
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
}
