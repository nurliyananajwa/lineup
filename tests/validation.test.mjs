import test from 'node:test'
import assert from 'node:assert/strict'
import { loadModule } from './load-module.mjs'

const { safeNext } = await loadModule('navigation')
const { parseId } = await loadModule('ids')
const { malaysiaLocalToIso, isoToMalaysiaLocal, validateEvent } = await loadModule('events')
const { csvCell } = await loadModule('csv')

test('login return URLs stay on this site, including backslash and control-character attacks', () => {
  for (const value of ['https://example.com', '//example.com', '/\\example.com', '/\n/example.com', '/\t/example.com', '', null]) {
    assert.equal(safeNext(value), '/dashboard', String(value))
  }
  assert.equal(safeNext('/organizer?status=pending#event'), '/organizer?status=pending#event')
})

test('route IDs reject nondecimal, unsafe and nonpositive numbers', () => {
  for (const value of ['1e2', '1.0', '-1', '0', ' 1', '01', '9007199254740992', 'Infinity']) assert.equal(parseId(value), null, value)
  assert.equal(parseId('42'), 42)
})

test('Malaysia dates use UTC+08 and round-trip correctly', () => {
  assert.equal(malaysiaLocalToIso('2028-02-29T08:30'), '2028-02-29T00:30:00.000Z')
  assert.equal(isoToMalaysiaLocal('2028-02-29T00:30:00.000Z'), '2028-02-29T08:30')
})

test('impossible calendar days and normalized times are rejected', () => {
  for (const value of ['2026-02-30T10:00', '2027-02-29T10:00', '2026-04-31T10:00', '2026-11-24T24:00', '2026-13-01T10:00', '2026-11-24T10:60']) {
    assert.equal(malaysiaLocalToIso(value), null, value)
  }
})

test('draft and submission validation distinguish required submission fields', () => {
  const value = { name: 'Workshop', venue_id: '', starts_at: '2100-01-01T10:00', ends_at: '2100-01-01T11:00', objectives: '', scope: '', content_type: '', submitter_name: '', submitter_position: '', submitter_phone: '', guests: [] }
  assert.ok(validateEvent(value, false).row)
  assert.match(validateEvent(value, true).error, /venue/)
  assert.match(validateEvent({ ...value, venue_id: '1' }, true).error, /objectives/)
  assert.ok(validateEvent({ ...value, venue_id: '1', objectives: 'Learn' }, true).row)
  assert.match(validateEvent({ ...value, venue_id: '-1' }, false).error, /valid venue/)
})

test('CSV quoting preserves commas, quotes, unicode and line breaks', () => {
  assert.equal(csvCell('Najwa, "A"'), '"Najwa, ""A"""')
  assert.equal(csvCell('Élodie'), '"Élodie"')
  assert.equal(csvCell(null), '""')
})

test('CSV cells neutralize formulas, including leading whitespace and line breaks', () => {
  for (const value of ['=1+1', '+1+1', '-1+1', '@SUM(A1)', '\t=1', '\n=1', '  =1', '\r@SUM(A1)']) {
    assert.ok(csvCell(value).startsWith('"\''), JSON.stringify(value))
  }
})
