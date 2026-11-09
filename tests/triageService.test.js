import { test } from 'node:test'
import assert from 'node:assert/strict'
import { analyzeCustomerMessage } from '../src/services/triageservice.js'

for (const [message, priority] of [['Server down now', 'High'], ['Thank you!!!', 'Low'], ['My payment failed', 'Medium']]) {
  test(`active service uses scorer on AI success and failure: ${message}`, async t => {
    const fetch = t.mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: JSON.stringify({
        category: 'Technical', priority: 'Urgent', routingQueue: 'Support'
      }) } }] })
    }))
    const success = await analyzeCustomerMessage(message, 'test-placeholder', 0)
    assert.equal(success.priority, priority)
    assert.equal(success.isFallback, false)
    t.mock.method(console, 'warn', () => {})
    t.mock.method(console, 'error', () => {})
    for (const fail of [
      async () => { throw new Error('Offline') },
      async () => ({ ok: false, status: 503 }),
      async () => ({ ok: true, json: async () => ({ choices: [] }) })
    ]) {
      fetch.mock.mockImplementation(fail)
      const fallback = await analyzeCustomerMessage(message, 'test-placeholder', 0)
      assert.equal(fallback.priority, priority)
      assert.equal(fallback.isFallback, true)
    }
  })
}

test('no key uses local scoring without network access', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network call') })
  for (const key of [undefined, '', '   ']) {
    const result = await analyzeCustomerMessage('Server down now', key)
    assert.equal(result.priority, 'High')
    assert.equal(result.isFallback, true)
  }
  assert.equal(fetch.mock.callCount(), 0)
})

test('empty input is rejected before any request', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Unexpected network call') })
  for (const message of ['', ' ', null, undefined]) {
    await assert.rejects(analyzeCustomerMessage(message, ''), /Message content cannot be empty/)
  }
  assert.equal(fetch.mock.callCount(), 0)
})
