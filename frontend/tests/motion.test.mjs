import assert from 'node:assert/strict'
import test from 'node:test'
import { easeOutCubic, gaugePoint, tween } from '../src/lib/motion.ts'

test('easing starts at zero, ends at one and never leaves that range', () => {
  assert.equal(easeOutCubic(0), 0)
  assert.equal(easeOutCubic(1), 1)
  assert.equal(easeOutCubic(-3), 0)
  assert.equal(easeOutCubic(7), 1)
  assert.ok(easeOutCubic(0.5) > 0.5, 'decelerates: more than half the distance by half time')
})

test('a tween lands exactly on its target, including when it retargets downward', () => {
  assert.equal(tween(0, 0.67, 0, 1000), 0)
  assert.equal(tween(0, 0.67, 1000, 1000), 0.67)
  assert.equal(tween(0, 0.67, 5000, 1000), 0.67)
  assert.equal(tween(0.9, 0.2, 400, 0), 0.2)
  const midway = tween(0.9, 0.2, 500, 1000)
  assert.ok(midway < 0.9 && midway > 0.2)
})

test('the gauge runs left to right over the top and clamps out-of-range scores', () => {
  const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} vs ${expected}`)
  const start = gaugePoint(0, 130, 132, 108), top = gaugePoint(0.5, 130, 132, 108), end = gaugePoint(1, 130, 132, 108)
  close(start.x, 22); close(start.y, 132)
  close(top.x, 130); close(top.y, 24)
  close(end.x, 238); close(end.y, 132)
  assert.deepEqual(gaugePoint(1.4, 130, 132, 108), end)
  assert.deepEqual(gaugePoint(-0.2, 130, 132, 108), start)
})
