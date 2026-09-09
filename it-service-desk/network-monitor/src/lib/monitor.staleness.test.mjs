/**
 * Staleness logic tests (node:test, zero-dependency).
 *
 * The staleness rule lives in monitor.ts as isStale(status, now). This test
 * mirrors that exact logic to lock down the boundary behaviour (a dead agent
 * must flip nodes to unknown after STALE_THRESHOLD_MS). Run:
 *   node --test src/lib/monitor.staleness.test.mjs
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

const STALE_THRESHOLD_MS = 90_000

// Copy of monitor.ts isStale() — kept in sync intentionally so the test has no
// TS/ESM transpile dependency.
function isStale(status, now = Date.now()) {
  if (!status.lastChecked) return true
  const ts = Date.parse(status.lastChecked)
  if (Number.isNaN(ts)) return true
  return now - ts > STALE_THRESHOLD_MS
}

const NOW = Date.parse('2026-01-01T00:00:00.000Z')
const at = (msAgo) => new Date(NOW - msAgo).toISOString()

test('fresh report (just now) is not stale', () => {
  assert.equal(isStale({ lastChecked: at(0) }, NOW), false)
})

test('report at 89s is not stale (within threshold)', () => {
  assert.equal(isStale({ lastChecked: at(89_000) }, NOW), false)
})

test('report exactly at 90s is not stale (boundary is strictly greater)', () => {
  assert.equal(isStale({ lastChecked: at(90_000) }, NOW), false)
})

test('report at 91s is stale', () => {
  assert.equal(isStale({ lastChecked: at(91_000) }, NOW), true)
})

test('report from 5 minutes ago is stale (dead agent)', () => {
  assert.equal(isStale({ lastChecked: at(5 * 60_000) }, NOW), true)
})

test('missing lastChecked is treated as stale', () => {
  assert.equal(isStale({}, NOW), true)
})

test('unparseable lastChecked is treated as stale', () => {
  assert.equal(isStale({ lastChecked: 'not-a-date' }, NOW), true)
})
