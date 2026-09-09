/**
 * Uptime computation tests (node:test, zero-dependency).
 *
 * Mirrors the backend's uptime math (server-simple.js GET /api/network-uptime):
 * reachable = count(status in up|slow); uptimePct = round(reachable/samples*1000)/10.
 * "slow" counts as reachable; only "down" counts against uptime.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

// Replicates the backend aggregation for a set of readings.
function computeUptime(statuses) {
  const samples = statuses.length
  const reachable = statuses.filter(s => s === 'up' || s === 'slow').length
  const uptimePct = samples > 0 ? Math.round((reachable / samples) * 1000) / 10 : null
  return { uptimePct, samples, reachable }
}

test('all up = 100%', () => {
  assert.deepEqual(computeUptime(['up', 'up', 'up']), { uptimePct: 100, samples: 3, reachable: 3 })
})

test('slow counts as reachable (still 100%)', () => {
  assert.equal(computeUptime(['up', 'slow', 'up']).uptimePct, 100)
})

test('one down out of four = 75%', () => {
  assert.equal(computeUptime(['up', 'up', 'up', 'down']).uptimePct, 75)
})

test('all down = 0%', () => {
  assert.equal(computeUptime(['down', 'down']).uptimePct, 0)
})

test('one decimal rounding: 2 down of 3 = 33.3%', () => {
  assert.equal(computeUptime(['up', 'down', 'down']).uptimePct, 33.3)
})

test('no samples yields null (no data, not 0%)', () => {
  assert.equal(computeUptime([]).uptimePct, null)
})
