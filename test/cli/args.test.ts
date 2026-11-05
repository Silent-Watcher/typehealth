import test from 'node:test'
import assert from 'node:assert/strict'

import { parseArgs } from '../../src/cli/args.ts'

test('no arguments produces help', () => {
  assert.deepEqual(parseArgs([]), { kind: 'help' })
})

test('--help and --version are recognized', () => {
  assert.deepEqual(parseArgs(['--help']), { kind: 'help' })
  assert.deepEqual(parseArgs(['--version']), { kind: 'version' })
})

test('scan with no options uses defaults', () => {
  assert.deepEqual(parseArgs(['scan']), {
    kind: 'scan',
    format: 'terminal',
    cwd: '.',
    config: undefined,
    color: true,
  })
})

test('scan options are parsed', () => {
  assert.deepEqual(parseArgs(['scan', '--format', 'json', '--cwd', './proj', '--config', './proj/tsconfig.json', '--no-color']), {
    kind: 'scan',
    format: 'json',
    cwd: './proj',
    config: './proj/tsconfig.json',
    color: false,
  })
})

test('scan supports --option=value form', () => {
  assert.deepEqual(parseArgs(['scan', '--format=html']), {
    kind: 'scan',
    format: 'html',
    cwd: '.',
    config: undefined,
    color: true,
  })
})

test('scan --help is a help request', () => {
  assert.deepEqual(parseArgs(['scan', '--help']), { kind: 'help', command: 'scan' })
})

test('invalid format is rejected', () => {
  const result = parseArgs(['scan', '--format', 'xml'])
  assert.equal(result.kind, 'error')
  assert.match(result.message, /Invalid --format value: xml/)
})

test('missing option value is rejected', () => {
  const result = parseArgs(['scan', '--cwd'])
  assert.equal(result.kind, 'error')
  assert.match(result.message, /Missing value for --cwd/)
})

test('unknown scan option is rejected', () => {
  const result = parseArgs(['scan', '--wat'])
  assert.equal(result.kind, 'error')
  assert.match(result.message, /Unknown option: --wat/)
})

test('unknown command is rejected', () => {
  const result = parseArgs(['deploy'])
  assert.equal(result.kind, 'error')
  assert.match(result.message, /Unknown command: deploy/)
})
