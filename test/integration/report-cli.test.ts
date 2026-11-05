import test from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = path.join(ROOT, 'src/cli/index.ts')

interface CliResult {
  status: number | null
  stdout: string
  stderr: string
}

function runCli(args: readonly string[], cwd: string): CliResult {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, NO_COLOR: '1' },
  })
  return {
    status: result.status,
    stdout: String(result.stdout ?? ''),
    stderr: String(result.stderr ?? ''),
  }
}

/** Create a small analyzable TypeScript project under `baseline` and return its directory. */
function makeProject(baseline: string, tsconfig: object, files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(baseline, 'typescope-report-'))
  mkdirSync(path.join(dir, 'src'), { recursive: true })
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig))
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(dir, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
  return dir
}

const PROJECT_FILES = {
  'src/index.ts': ['const a: number = 1;', 'const b: any = 2;', 'function f(x: string) { return x.length; }'].join(
    '\n',
  ),
}

function parseJsonReport(stdout: string): Record<string, unknown> {
  return JSON.parse(stdout) as Record<string, unknown>
}

/** Normalize the measured duration so two runs are comparable, then serialize. */
function normalizedText(report: Record<string, unknown>): string {
  const project = report.project as Record<string, unknown>
  project.durationMs = 0
  return JSON.stringify(report)
}

test('scan --format json exits 0 and prints a parseable v1 report', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typescope-json-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  try {
    const result = runCli(['scan', '--format', 'json', '--cwd', projectDir], workspace)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    const report = parseJsonReport(result.stdout)
    assert.equal(report.schemaVersion, 1)
    assert.ok(Array.isArray(report.files))
    assert.ok(Array.isArray(report.findings))
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format json is deterministic across runs after normalizing durationMs', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typescope-json-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  try {
    const runOne = runCli(['scan', '--format', 'json', '--cwd', projectDir], workspace)
    const runTwo = runCli(['scan', '--format', 'json', '--cwd', projectDir], workspace)
    assert.equal(runOne.status, 0)
    assert.equal(runTwo.status, 0)
    const first = normalizedText(parseJsonReport(runOne.stdout))
    const second = normalizedText(parseJsonReport(runTwo.stdout))
    assert.equal(first, second)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format html exits 0 and writes an escaped, script-free report into the spawning cwd', () => {
  // The workspace baseline contains '<' so projectDir must be HTML-escaped in
  // the report header; this exercises escapeHtml end-to-end.
  const workspace = mkdtempSync(path.join(tmpdir(), 'typescope-<html>-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  // The report is written to the invoking process's cwd, never into the
  // analyzed project, so spawn from a separate output directory.
  const outputDir = mkdtempSync(path.join(tmpdir(), 'typescope-html-out-'))
  try {
    const result = runCli(['scan', '--format', 'html', '--cwd', projectDir], outputDir)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    const reportPath = path.join(outputDir, 'typescope-report.html')
    assert.ok(existsSync(reportPath), `expected report at ${reportPath}`)
    const html = readFileSync(reportPath, 'utf8')
    assert.ok(html.startsWith('<!doctype html>'))
    assert.ok(html.includes('&lt;'), 'expected escaped HTML entities in the report')
    assert.ok(!/<script/i.test(html), 'expected no <script> tag in the HTML report')
    assert.ok(!html.includes('typescope-report.html</'), 'report must not be written into the analyzed project')
    assert.ok(!existsSync(path.join(projectDir, 'typescope-report.html')))
  } finally {
    rmSync(workspace, { recursive: true, force: true })
    rmSync(outputDir, { recursive: true, force: true })
  }
})
