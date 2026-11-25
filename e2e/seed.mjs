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
