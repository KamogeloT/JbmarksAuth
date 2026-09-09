/**
 * Agent backoff tests (node:test, zero-dependency).
 * Mirrors nextDelay() in agent.js: success resets to INTERVAL_MS; each
 * consecutive failure doubles the wait (2^n * interval), capped at MAX.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const INTERVAL_MS = 30000
const MAX_BACKOFF_MS = 300000

function makeBackoff() {
  let consecutiveFailures = 0
  return function nextDelay(ok) {
    if (ok) { consecutiveFailures = 0; return INTERVAL_MS }
    consecutiveFailures += 1
    return Math.min(INTERVAL_MS * Math.pow(2, consecutiveFailures), MAX_BACKOFF_MS)
  }
}

test('success returns the normal interval', () => {
  const nextDelay = makeBackoff()
  assert.equal(nextDelay(true), 30000)
})

test('failures back off exponentially', () => {
  const nextDelay = makeBackoff()
  assert.equal(nextDelay(false), 60000)   // 2^1 * 30s
  assert.equal(nextDelay(false), 120000)  // 2^2 * 30s
  assert.equal(nextDelay(false), 240000)  // 2^3 * 30s
})

test('backoff is capped at MAX_BACKOFF_MS', () => {
  const nextDelay = makeBackoff()
  let d = 0
  for (let i = 0; i < 10; i++) d = nextDelay(false)
  assert.equal(d, MAX_BACKOFF_MS) // never exceeds cap
})

test('a success after failures resets to the normal interval', () => {
  const nextDelay = makeBackoff()
  nextDelay(false); nextDelay(false)
  assert.equal(nextDelay(true), 30000)
  // and the next failure starts from the bottom again
  assert.equal(nextDelay(false), 60000)
})
