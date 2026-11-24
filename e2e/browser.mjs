import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

if (process.env.LINEUP_LOCAL_E2E !== '1') throw new Error('Explicit local E2E mode is required.')
const fixtures = JSON.parse(await readFile('/tmp/lineup-browser-fixtures.json', 'utf8'))
assert.ok(['localhost', '127.0.0.1'].includes(new URL(fixtures.baseUrl).hostname))
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const browser = await chromium.launch({
  headless: true,
  args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
})
const contexts = []
const pageErrors = []

async function pageFor(role, viewport = { width: 1280, height: 800 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true, permissions: ['camera'] })
  contexts.push(context)
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.on('pageerror', error => pageErrors.push(error.message))
  if (role) {
    await page.goto(fixtures.baseUrl + '/login')
    await page.getByLabel('Email', { exact: true }).fill(fixtures.accounts[role].email)
    await page.getByLabel('Password', { exact: true }).fill(fixtures.accounts[role].password)
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await page.waitForURL(role === 'admin' ? '**/admin' : '**/organizer')
  }
  return page
}

try {
  const visitor = await pageFor()
  await visitor.goto(fixtures.baseUrl + '/organizer')
  await visitor.waitForURL('**/login?next=*')
  console.log('PASS anonymous access to private pages redirects to login')

  const signup = await pageFor()
  await signup.goto(fixtures.baseUrl + '/signup')
  await signup.getByLabel('Full name').fill('CI New Organizer')
  await signup.getByLabel('Email', { exact: true }).fill(fixtures.signup.email)
  await signup.getByLabel('Password', { exact: true }).fill(fixtures.signup.password)
  await signup.getByRole('button', { name: 'Sign up', exact: true }).click()
  await signup.waitForURL('**/organizer')
  await signup.goto(fixtures.baseUrl + '/admin')
  await signup.waitForURL('**/organizer')
  console.log('PASS signup creates an organizer and cannot open admin pages')

  const organizer = await pageFor('organizer')
  await organizer.goto(fixtures.baseUrl + '/organizer/events/new')
  await organizer.getByLabel('Event name', { exact: true }).fill(fixtures.eventName)
  await organizer.getByLabel('Starts (Malaysia time)', { exact: true }).fill(fixtures.starts)
  await organizer.getByLabel('Ends (Malaysia time)', { exact: true }).fill(fixtures.ends)
  await organizer.getByLabel('Venue', { exact: true }).selectOption(String(fixtures.venueId))
  await organizer.getByLabel('Objectives', { exact: true }).fill('Verify the complete event workflow.')
  await organizer.getByLabel('Phone', { exact: true }).fill('PRIVATE-CI-CONTACT')
  await organizer.getByRole('button', { name: 'Add guest', exact: true }).click()
  await organizer.getByLabel('Guest name', { exact: true }).fill('CI Speaker')
  await organizer.locator('input[name="poster"]').setInputFiles({
    name: 'fixture.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1cAAAAASUVORK5CYII=', 'base64'),
  })
  await organizer.getByRole('button', { name: 'Save as draft', exact: true }).click()
  await organizer.waitForURL(/\/organizer\/events\/\d+\?saved=draft/)
  const eventId = organizer.url().match(/\/events\/(\d+)/)[1]
  assert.equal(await organizer.getByLabel('Guest name', { exact: true }).inputValue(), 'CI Speaker')
  await organizer.getByText('A poster is already uploaded.', { exact: false }).waitFor()
  await organizer.getByRole('button', { name: 'Submit for approval', exact: true }).click()
  await organizer.waitForURL(`**/organizer/events/${eventId}?saved=submitted`)
  await organizer.getByText('Waiting for admin review.', { exact: false }).waitFor()
  console.log('PASS poster upload, draft persistence and event submission')

  const other = await pageFor('other')
  await other.goto(fixtures.baseUrl + '/organizer/events/' + eventId)
  await other.getByRole('heading', { name: '404', exact: true }).waitFor()
  assert.equal((await other.content()).includes('PRIVATE-CI-CONTACT'), false)
  console.log('PASS unrelated organizer cannot open the submitted event')

  const admin = await pageFor('admin')
  await admin.goto(fixtures.baseUrl + '/admin/events/' + eventId)
  await admin.getByRole('button', { name: 'Reject', exact: true }).click()
  await admin.getByText('Tell the organizer why it was rejected', { exact: false }).waitFor()
  await admin.getByRole('button', { name: 'Approve', exact: true }).click()
  await admin.waitForURL('**/admin/events?done=approved')
  console.log('PASS rejection requires a reason and admin approval succeeds')

  await visitor.goto(fixtures.baseUrl + '/events/' + eventId)
  await visitor.getByRole('heading', { name: fixtures.eventName, exact: true }).waitFor()
  assert.equal((await visitor.content()).includes('PRIVATE-CI-CONTACT'), false)
  await visitor.getByLabel('Your name', { exact: true }).fill('CI Attendee A')
  await visitor.getByLabel('Email', { exact: true }).fill('attendee.a@example.com')
  await visitor.getByRole('button', { name: 'Register and get my ticket', exact: true }).click()
  await visitor.waitForURL(/\/tickets\/[a-f0-9-]+/)
  await visitor.getByAltText('Ticket QR code', { exact: true }).waitFor()
  const ticketUrl = visitor.url()
  const token = ticketUrl.split('/').at(-1)
  const ticketResponse = await visitor.request.get(ticketUrl)
  assert.match(ticketResponse.headers()['x-robots-tag'], /noindex/)
  assert.equal(ticketResponse.headers()['referrer-policy'], 'no-referrer')
  console.log('PASS public registration, QR ticket and ticket privacy headers')

  const second = await pageFor()
  await second.goto(fixtures.baseUrl + '/events/' + eventId)
  await second.getByLabel('Your name', { exact: true }).fill('CI Duplicate')
  await second.getByLabel('Email', { exact: true }).fill('attendee.a@example.com')
  await second.getByRole('button', { name: 'Register and get my ticket', exact: true }).click()
  await second.getByText('This email is already registered for this event', { exact: false }).waitFor()
  await second.getByLabel('Your name', { exact: true }).fill('Élodie CI')
  await second.getByLabel('Email', { exact: true }).fill('attendee.b@example.com')
  await second.getByRole('button', { name: 'Register and get my ticket', exact: true }).click()
  await second.waitForURL(/\/tickets\/[a-f0-9-]+/)
  await visitor.goto(fixtures.baseUrl + '/events/' + eventId)
  await visitor.getByText('This event is full.', { exact: true }).waitFor()
  console.log('PASS duplicate registration is blocked and capacity is enforced')

  await organizer.goto(fixtures.baseUrl + '/check-in/' + eventId)
  const scanner = organizer.locator('section').filter({ has: organizer.getByRole('heading', { name: 'Scan tickets', exact: true }) })
  await scanner.getByRole('button', { name: 'Start camera', exact: true }).click()
  await scanner.getByRole('button', { name: 'Stop camera', exact: true }).waitFor()
  assert.ok(await organizer.locator('video').evaluate(video => video.srcObject?.getTracks().some(track => track.readyState === 'live')))
  await scanner.getByRole('button', { name: 'Stop camera', exact: true }).click()
  assert.ok(await organizer.locator('video').evaluate(video => !video.srcObject || video.srcObject.getTracks().every(track => track.readyState === 'ended')))
  await scanner.getByRole('button', { name: 'Start camera', exact: true }).click()
  await scanner.getByRole('button', { name: 'Stop camera', exact: true }).waitFor()
  await organizer.waitForFunction(started => performance.now() - started > 500, await organizer.evaluate(() => performance.now()))
  assert.ok(await organizer.locator('video').evaluate(video => video.srcObject?.getTracks().some(track => track.readyState === 'live')))
  await scanner.getByRole('button', { name: 'Stop camera', exact: true }).click()
  assert.ok(await organizer.locator('video').evaluate(video => !video.srcObject || video.srcObject.getTracks().every(track => track.readyState === 'ended')))
  console.log('PASS camera start, immediate stop and restart with a simulated camera')
  await scanner.getByLabel('Ticket code or link', { exact: true }).fill(token)
  await scanner.getByRole('button', { name: 'Check in', exact: true }).click()
  await scanner.getByText('CI Attendee A checked in', { exact: false }).waitFor()
  await scanner.getByLabel('Ticket code or link', { exact: true }).fill(ticketUrl)
  await scanner.getByRole('button', { name: 'Check in', exact: true }).click()
  await scanner.getByText('CI Attendee A is already checked in', { exact: false }).waitFor()
  const attendee = organizer.locator('li').filter({ hasText: 'CI Attendee A' })
  await attendee.getByRole('button', { name: 'Undo', exact: true }).click()
  await attendee.getByRole('button', { name: 'Check in', exact: true }).waitFor()
  const [download] = await Promise.all([
    organizer.waitForEvent('download'),
    organizer.getByRole('link', { name: 'Download CSV', exact: true }).click(),
  ])
  const csv = await readFile(await download.path(), 'utf8')
  assert.ok(csv.startsWith('\uFEFF'))
  assert.ok(csv.includes('CI Attendee A') && csv.includes('Élodie CI'))
  console.log('PASS ticket scan, duplicate scan, manual undo and CSV download')

  const mobile = await pageFor(undefined, { width: 375, height: 812 })
  await mobile.goto(fixtures.baseUrl)
  await mobile.getByRole('heading', { name: 'Upcoming events', exact: true }).waitFor()
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1))
  await organizer.getByRole('button', { name: 'Log out', exact: true }).click()
  await organizer.waitForURL(fixtures.baseUrl + '/')
  await organizer.goto(fixtures.baseUrl + '/organizer')
  await organizer.waitForURL('**/login?next=*')
  assert.deepEqual(pageErrors, [])
  console.log('PASS mobile homepage width, logout and browser error checks')
} finally {
  for (const context of contexts) await context.close()
  await browser.close()
}
