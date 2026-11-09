import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { calculateUrgency } from '../src/utils/urgencyScorer.js'

const { testMessages } = JSON.parse(readFileSync(new URL('../sample-messages.json', import.meta.url)))
const expected = ['High', 'Low', 'Low', 'Medium', 'Low', 'High', 'Low', 'Low']
for (const [index, { title, message }] of testMessages.entries()) {
  test(`supplied sample: ${title}`, () => {
    assert.equal(calculateUrgency(message), expected[index])
  })
}

const examples = [
  ['SERVER DOWN NOW!!!', 'High'],
  ['Please help, our production server is down. Thank you!', 'High'],
  ['Thanks, but the database connection is lost', 'High'],
  ['Is the website down?', 'High'],
  ['The service went offline', 'High'],
  ['Security breach detected', 'High'],
  ['We are losing customer data', 'High'],
  ["All users can't log in", 'High'],
  ['Please investigate immediately', 'High'],
  ['Urgent: payment failed', 'High'],
  ['No outage, but the database connection is lost', 'High'],
  ['Thank you!!!', 'Low'],
  ['THANK YOU FOR THE EXCELLENT HELP!!!', 'Low'],
  ['Happy with the download feature!', 'Low'],
  ['No outage, thank you!', 'Low'],
  ['This is not urgent, no rush. What are your hours?', 'Low'],
  ['The server is not down. Thanks!', 'Low'],
  ['Can I upgrade my subscription to the pro plan?', 'Low'],
  ['The dashboard is slow', 'Medium'],
  ["Thanks, but I can't access the dashboard", 'Medium'],
  ['My payment failed', 'Medium'],
  ["The dashboard won’t load", 'Medium'],
  ['Please review my account', 'Medium'],
  ['', 'Low'],
  ['   ', 'Low'],
  [null, 'Low'],
  [undefined, 'Low'],
]
for (const [message, urgency] of examples) {
  test(`new example: ${JSON.stringify(message)} → ${urgency}`, () => {
    assert.equal(calculateUrgency(message), urgency)
  })
}

test('same content keeps its urgency across business hours, nights and weekends', () => {
  mock.timers.enable({ apis: ['Date'], now: new Date('2026-11-09T12:00:00Z') })
  try {
    for (const now of ['2026-11-09T12:00:00Z', '2026-11-09T23:00:00Z', '2026-11-08T23:00:00Z']) {
      mock.timers.setTime(new Date(now).getTime())
      assert.equal(calculateUrgency('Server down now'), 'High')
      assert.equal(calculateUrgency('Thank you!!!'), 'Low')
      assert.equal(calculateUrgency('My payment failed'), 'Medium')
    }
  } finally {
    mock.timers.reset()
  }
})
