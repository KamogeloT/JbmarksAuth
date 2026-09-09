/**
 * Outage alert transition-detection tests (node:test, zero-dependency).
 *
 * Mirrors the edge logic in server-simple.js POST /api/network-status:
 *   - alert 'down'      when prev != 'down' and new == 'down'
 *   - alert 'recovered' when prev == 'down' and new in ('up','slow')
 *   - otherwise no alert (steady state, or non-outage changes like up<->slow)
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

function transition(prevStatus, newStatus) {
  if (newStatus === 'down' && prevStatus !== 'down') return 'down'
  if (prevStatus === 'down' && (newStatus === 'up' || newStatus === 'slow')) return 'recovered'
  return null
}

test('up -> down triggers a down alert', () => {
  assert.equal(transition('up', 'down'), 'down')
})

test('first-ever reading of down (no prev) triggers a down alert', () => {
  assert.equal(transition(undefined, 'down'), 'down')
})

test('slow -> down triggers a down alert', () => {
  assert.equal(transition('slow', 'down'), 'down')
})

test('down -> up triggers a recovered alert', () => {
  assert.equal(transition('down', 'up'), 'recovered')
})

test('down -> slow triggers a recovered alert (reachable again)', () => {
  assert.equal(transition('down', 'slow'), 'recovered')
})

test('down -> down does NOT re-alert (steady outage)', () => {
  assert.equal(transition('down', 'down'), null)
})

test('up -> up does NOT alert', () => {
  assert.equal(transition('up', 'up'), null)
})

test('up -> slow does NOT alert (not an outage edge)', () => {
  assert.equal(transition('up', 'slow'), null)
})

test('slow -> up does NOT alert', () => {
  assert.equal(transition('slow', 'up'), null)
})
