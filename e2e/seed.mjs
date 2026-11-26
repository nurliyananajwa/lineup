import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const apiUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
if (process.env.LINEUP_LOCAL_E2E !== '1' || !apiUrl || !['localhost', '127.0.0.1'].includes(new URL(apiUrl).hostname)) {
  throw new Error('Browser fixtures may only be created in an explicitly enabled loopback test database.')
}
const client = createClient(apiUrl, process.env.TEST_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const fixtures = { baseUrl: 'http://localhost:3001', accounts: {} }
for (const role of ['admin', 'organizer', 'other']) {
  const email = `${role}.fixture@example.com`
  const password = randomUUID()
  const { data, error } = await client.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { name: `CI ${role}` },
  })
  if (error || !data.user) throw new Error('Could not create local test account: ' + (error?.message ?? role))
  if (role === 'admin') {
    const { error } = await client.from('profiles').update({ role: 'admin' }).eq('id', data.user.id)
    if (error) throw error
  }
  fixtures.accounts[role] = { id: data.user.id, email, password }
}
const { data: venue, error: venueError } = await client.from('venues')
  .insert({ name: 'CI Workshop Room', address: 'Local test venue', capacity: 2 }).select('id').single()
if (venueError) throw venueError
fixtures.venueId = venue.id
// Representative dashboard data stays inside this disposable loopback database.
const { data: dashboardVenue, error: dashboardVenueError } = await client.from('venues')
  .insert({ name: 'The Courtyard', address: 'Local fixture venue', capacity: 120 }).select('id').single()
if (dashboardVenueError) throw dashboardVenueError
const definitions = [
  ['Open-Air Cinema', 'approved', 3], ['The Makers’ Meet', 'approved', 9],
  ['Design for Everyone', 'pending', 5], ['Sunday Community Run', 'draft', 6],
  ['Photography Walk', 'rejected', 18], ['Creative Coding Lab', 'approved', -7],
]
fixtures.dashboardRegistrations = 0
fixtures.dashboardCheckedIn = 0
for (const [index, [name, status, days]] of definitions.entries()) {
  const starts = new Date(Date.now() + days * 86400000)
  starts.setUTCHours(12, 0, 0, 0)
  const ends = new Date(starts.getTime() + 3600000)
  const { data: event, error } = await client.from('events').insert({
    name, status, organizer_id: fixtures.accounts.organizer.id, venue_id: dashboardVenue.id,
    starts_at: starts.toISOString(), ends_at: ends.toISOString(), objectives: 'Local dashboard workflow fixture.',
    created_at: new Date(Date.now() - (15 - index) * 86400000).toISOString(),
    ...(status === 'approved' || status === 'rejected' ? { reviewed_by: fixtures.accounts.admin.id, reviewed_at: new Date(Date.now() - (13 - index) * 86400000).toISOString() } : {}),
    ...(status === 'rejected' ? { review_comments: 'Please confirm the venue and programme.' } : {}),
  }).select('id').single()
  if (error) throw error
  const count = index === 0 ? 48 : index === 5 ? 24 : 0
  if (count) {
    const rows = Array.from({ length: count }, (_, i) => ({
      event_id: event.id, name: `Local attendee ${i + 1}`, email: `attendee.${index}.${i}@example.com`,
      created_at: new Date(Date.now() - (index === 5 ? 9 + i % 5 : i % 7) * 86400000 - 3600000).toISOString(),
      attended: index === 5 && i < 12, checked_in_at: index === 5 && i < 12 ? starts.toISOString() : null,
    }))
    const { error } = await client.from('tickets').insert(rows)
    if (error) throw error
    fixtures.dashboardRegistrations += count
    fixtures.dashboardCheckedIn += index === 5 ? 12 : 0
  }
}
const { error: otherEventError } = await client.from('events').insert({
  name: 'PRIVATE OTHER EVENT', organizer_id: fixtures.accounts.other.id, status: 'draft',
  starts_at: new Date(Date.now() + 30 * 86400000).toISOString(), ends_at: new Date(Date.now() + 30 * 86400000 + 3600000).toISOString(),
})
if (otherEventError) throw otherEventError
const start = new Date(Date.now() + 14 * 86400000)
start.setUTCMinutes(0, 0, 0)
const end = new Date(start.getTime() + 3600000)
const local = date => new Date(date.getTime() + 8 * 3600000).toISOString().slice(0, 16)
fixtures.starts = local(start)
fixtures.ends = local(end)
fixtures.eventName = 'CI Browser Workshop ' + randomUUID().slice(0, 8)
fixtures.signup = { email: `signup.${randomUUID().slice(0, 8)}@example.com`, password: randomUUID() }
await writeFile('/tmp/lineup-browser-fixtures.json', JSON.stringify(fixtures), { mode: 0o600 })
console.log('Disposable local browser fixtures created.')
