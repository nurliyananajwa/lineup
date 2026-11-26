import test from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './load-module.mjs'
const { buildDashboardModel, malaysiaDateKey } = await loadModule('dashboard-model')
const now = '2026-11-25T02:00:00Z'
const event = (id, status = 'approved', extra = {}) => ({ id, status, name: 'Event ' + id, starts_at: '2026-12-05T12:00:00Z', ends_at: '2026-12-05T14:00:00Z', created_at: '2026-11-20T03:00:00Z', reviewed_at: null, poster_url: null, review_comments: null, venues: { name: 'Courtyard', address: null, capacity: 100 }, ...extra })
const ticket = (event_id, attended = false, created_at = '2026-11-25T01:00:00Z') => ({ event_id, attended, created_at, checked_in_at: null })
test('dashboard totals include only tickets belonging to the visible event set', () => {
  const model = buildDashboardModel([event(1)], [ticket(1), ticket(1, true), ticket(2, true)], 'organizer', now)
  assert.equal(model.registrations, 2)
  assert.equal(model.checkedIn, 1)
  assert.equal(model.events[0].registrations, 2)
  assert.equal(model.events[0].href, '/organizer/events/1')
  assert.equal(model.trend.at(-1).count, 2)
})
test('daily buckets follow Malaysia midnight and the 30-day window crosses months', () => {
  assert.equal(malaysiaDateKey('2026-11-24T16:01:00Z'), '2026-11-25')
  const model = buildDashboardModel([event(1)], [ticket(1, false, '2026-11-24T15:59:00Z'), ticket(1, false, '2026-11-24T16:01:00Z'), ticket(1, false, '2026-10-01T00:00:00Z')], 'admin', now)
  assert.equal(model.trend.length, 30)
  assert.equal(model.trend[0].date, '2026-10-27')
  assert.equal(model.trend.at(-2).count, 1)
  assert.equal(model.trend.at(-1).count, 1)
  assert.equal(model.registrations, 3)
})
test('upcoming includes ongoing approved events and excludes past or unapproved events', () => {
  const model = buildDashboardModel([event(1, 'pending'), event(2, 'approved', { starts_at: '2026-11-25T01:00:00Z', ends_at: '2026-11-25T03:00:00Z' }), event(3, 'approved', { ends_at: '2026-11-24T00:00:00Z' })], [], 'admin', now)
  assert.deepEqual(model.upcoming.map(e => e.id), [2])
  assert.equal(model.pending, 1)
})
test('empty accounts have truthful zero totals, a full zero trend and no invented updates', () => {
  const model = buildDashboardModel([], [], 'organizer', now)
  assert.equal(model.registrations, 0)
  assert.deepEqual(model.activity, [])
  assert.deepEqual(model.upcoming, [])
  assert.ok(model.trend.every(p => p.count === 0))
})
test('client model omits ticket identities, tokens and private submitter fields', () => {
  const model = buildDashboardModel([event(1, 'approved', { submitter_phone: 'PRIVATE', organizer_id: 'PRIVATE' })], [{ ...ticket(1), token: 'SECRET', email: 'PRIVATE@example.com' }], 'admin', now)
  assert.doesNotMatch(JSON.stringify(model), /PRIVATE|SECRET|submitter_phone|organizer_id|email/)
})
