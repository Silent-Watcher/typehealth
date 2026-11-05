import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = path.join(ROOT, 'src/cli/index.ts')

function runCli(args: readonly string[]): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return {
    status: result.status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

test('--version prints version and exits 0', () => {
  const result = runCli(['--version'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /^typescope v\d+\.\d+\.\d+\n$/)
})

test('--help prints usage and exits 0', () => {
  const result = runCli(['--help'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Usage: typescope/)
})

test('scan --help prints scan usage and exits 0', () => {
  const result = runCli(['scan', '--help'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Usage: typescope scan/)
  assert.match(result.stdout, /--format/)
})

test('scan prints analysis summary and exits 0', () => {
  const result = runCli(['scan'])
  assert.equal(result.status, 0)
  assert.match(result.stdout, /Project/)
  assert.match(result.stdout, /Files\s+\d+/)
  assert.match(result.stdout, /TYPE COVERAGE/)
  assert.match(result.stdout, /Findings/)
})

test('unknown command exits 2 with message on stderr', () => {
  const result = runCli(['deploy'])
  assert.equal(result.status, 2)
  assert.equal(result.stdout, '')
})

test('unknown option exits 2 with message on stderr', () => {
  const result = runCli(['scan', '--wat'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /--wat/)
  assert.equal(result.stdout, '')
})

test('invalid --format value exits 2', () => {
  const result = runCli(['scan', '--format', 'xml'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /--format/)
})

test('--format=html is accepted by the parser', () => {
  const result = runCli(['scan', '--format=html'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /--format html is not implemented yet/)
})

test('nonexistent --cwd exits 2', () => {
  const result = runCli(['scan', '--cwd', './no/such/dir'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /project directory does not exist/)
})

test('nonexistent --config exits 2', () => {
  const result = runCli(['scan', '--config', './no-such-tsconfig.json'])
  assert.equal(result.status, 2)
  assert.match(result.stderr, /tsconfig not found/)
})

test('directory without tsconfig exits 2 with actionable message', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'typescope-noconfig-'))
  try {
    const result = runCli(['scan', '--cwd', dir])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /No tsconfig\.json found/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
