import test from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './load-module.mjs'

const { loadAttendees } = await loadModule('attendees')

function source(rows, failedPage = -1) {
  const calls = []
  return {
    calls,
    from(table) {
      assert.equal(table, 'tickets')
      return {
        select() { return this },
        eq(column, value) { assert.equal(column, 'event_id'); assert.equal(value, 42); return this },
        order(column) { assert.equal(column, 'id'); return this },
        async range(start, end) {
          calls.push([start, end])
          return calls.length === failedPage ? { data: null, error: { message: 'Unavailable' } }
            : { data: rows.slice(start, end + 1), error: null }
        },
      }
    },
  }
}

test('all 1,201 attendees are returned once, beyond the default API limit', async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id: id + 1, name: `Attendee ${id + 1}` }))
  const client = source(rows)
  assert.deepEqual(await loadAttendees(client, 42), rows)
  assert.equal(client.calls.length, 3)
})

test('a later failed page rejects the whole export rather than returning a partial list', async () => {
  const client = source(Array.from({ length: 1201 }, (_, id) => ({ id })), 2)
  await assert.rejects(loadAttendees(client, 42), /Could not load attendees/)
})

test('empty events and exact page boundaries terminate correctly', async () => {
  assert.deepEqual(await loadAttendees(source([]), 42), [])
  const rows = Array.from({ length: 500 }, (_, id) => ({ id }))
  const client = source(rows)
  assert.deepEqual(await loadAttendees(client, 42), rows)
  assert.equal(client.calls.length, 2)
})
