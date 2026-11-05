import test from 'node:test'
import assert from 'node:assert/strict'

import { colorize, progressBar, supportsColor } from '../../src/utils/colors.ts'

test('colorize wraps in ANSI codes when enabled', () => {
  assert.equal(colorize('x', 'red', true), '\x1b[31mx\x1b[0m')
  assert.equal(colorize('x', 'red', false), 'x')
})

test('progressBar clamps values into [0, max]', () => {
  assert.equal(progressBar(5, 10, 10), '█████░░░░░')
  assert.equal(progressBar(0, 10, 10), '░░░░░░░░░░')
  assert.equal(progressBar(20, 10, 10), '██████████')
  assert.equal(progressBar(-5, 10, 10), '░░░░░░░░░░')
  assert.equal(progressBar(5, 0, 10), '░░░░░░░░░░')
})

test('supportsColor is false when NO_COLOR is set', () => {
  const wasSet = process.env.NO_COLOR !== undefined
  process.env.NO_COLOR = '1'
  assert.equal(supportsColor({ isTTY: true }), false)
  if (!wasSet) delete process.env.NO_COLOR
})

test('supportsColor is false for non-TTY streams', () => {
  const had = 'NO_COLOR' in process.env
  delete process.env.NO_COLOR
  assert.equal(supportsColor({ isTTY: false }), false)
  assert.equal(supportsColor({ isTTY: true }), true)
  if (had) process.env.NO_COLOR = '1'
})
