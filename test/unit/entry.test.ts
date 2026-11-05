import test from 'node:test'
import assert from 'node:assert/strict'

import { name, version } from '../../src/index.ts'

test('public entry exports package metadata', () => {
  assert.equal(name, 'typescope')
  assert.match(version, /^\d+\.\d+\.\d+/)
})
