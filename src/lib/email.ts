import 'server-only'
import { Resend } from 'resend'
import { formatRange } from '@/lib/format'

// Emails are optional: with no RESEND_API_KEY set, the app works normally and just skips sending.
// EMAIL_FROM must be an address on a domain verified in Resend. Until you verify one,
// Resend's test sender only delivers to the email address that owns the Resend account.
const apiKey = process.env.RESEND_API_KEY
const from = process.env.EMAIL_FROM ?? 'Lineup <onboarding@resend.dev>'
const resend = apiKey ? new Resend(apiKey) : null

export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

// Anything a user typed goes through this before it's put into an email.
function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    console.info(`[email skipped: no RESEND_API_KEY] ${subject} -> ${to}`)
    return
  }
  const { error } = await resend.emails.send({ from, to, subject, html })
  // An email failing must never break the action that triggered it, so we only log it.
  if (error) console.error('[email failed]', subject, to, error.message)
}

function layout(title: string, body: string, button?: { href: string; label: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:0 auto;padding:24px">
    <p style="font-size:18px;font-weight:bold;color:#4338ca;margin:0 0 16px">Lineup</p>
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px">
      <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
      ${body}
      ${button ? `<p style="margin:24px 0 0"><a href="${button.href}" style="background:#4f46e5;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;display:inline-block">${button.label}</a></p>` : ''}
    </div>
    <p style="font-size:12px;color:#71717a;margin:16px 0 0">You're receiving this because of activity on Lineup.</p>
  </div></body></html>`
}

type EventInfo = { id: number; name: string; starts_at: string; ends_at: string }

export async function sendDecisionEmail(opts: {
  to: string; organizerName: string; event: EventInfo; decision: 'approved' | 'rejected'; comments: string | null
}) {
  const { to, organizerName, event, decision, comments } = opts
  const approved = decision === 'approved'
  const body = `
    <p>Hi ${esc(organizerName || 'there')},</p>
    <p>Your event <strong>${esc(event.name)}</strong> (${esc(formatRange(event.starts_at, event.ends_at))})
      has been <strong style="color:${approved ? '#047857' : '#b91c1c'}">${approved ? 'approved' : 'rejected'}</strong>.</p>
    ${comments ? `<p style="background:#f4f4f5;border-radius:8px;padding:12px">Admin comment: ${esc(comments)}</p>` : ''}
    <p>${approved ? 'It is now listed publicly and people can register.' : 'You can edit the event and submit it again.'}</p>`
  await send(
    to,
    approved ? `Approved: ${event.name}` : `Changes needed: ${event.name}`,
    layout(approved ? 'Your event is approved' : 'Your event needs changes', body,
      approved
        ? { href: `${siteUrl()}/events/${event.id}`, label: 'View public page' }
        : { href: `${siteUrl()}/organizer/events/${event.id}`, label: 'Edit event' }),
  )
}

export async function sendTicketEmail(opts: {
  to: string; name: string; token: string; event: EventInfo; venue: string | null
}) {
  const { to, name, token, event, venue } = opts
  const body = `
    <p>Hi ${esc(name)},</p>
    <p>You're registered for <strong>${esc(event.name)}</strong>.</p>
    <p style="margin:0">${esc(formatRange(event.starts_at, event.ends_at))}</p>
    ${venue ? `<p style="margin:4px 0 0">${esc(venue)}</p>` : ''}
    <p>Open your ticket and show the QR code at the door.</p>`
  await send(to, `Your ticket: ${event.name}`,
    layout('You’re in!', body, { href: `${siteUrl()}/tickets/${token}`, label: 'Open my ticket' }))
}
