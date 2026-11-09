import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
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
  const dir = mkdtempSync(path.join(baseline, 'typehealth-report-'))
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
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-json-'))
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
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-json-'))
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
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-<html>-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  // The report is written to the invoking process's cwd, never into the
  // analyzed project, so spawn from a separate output directory.
  const outputDir = mkdtempSync(path.join(tmpdir(), 'typehealth-html-out-'))
  try {
    const result = runCli(['scan', '--format', 'html', '--cwd', projectDir], outputDir)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    const reportPath = path.join(outputDir, 'typehealth-report.html')
    assert.ok(existsSync(reportPath), `expected report at ${reportPath}`)
    const html = readFileSync(reportPath, 'utf8')
    assert.ok(html.startsWith('<!doctype html>'))
    assert.ok(html.includes('&lt;'), 'expected escaped HTML entities in the report')
    assert.ok(!/<script/i.test(html), 'expected no <script> tag in the HTML report')
    assert.ok(!html.includes('typehealth-report.html</'), 'report must not be written into the analyzed project')
    assert.ok(!existsSync(path.join(projectDir, 'typehealth-report.html')))
  } finally {
    rmSync(workspace, { recursive: true, force: true })
    rmSync(outputDir, { recursive: true, force: true })
  }
})

test('scan --format markdown exits 0 and prints a sectioned Markdown report to stdout', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-md-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  try {
    const result = runCli(['scan', '--format', 'markdown', '--cwd', projectDir], workspace)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.ok(result.stdout.startsWith('# TypeHealth Report\n'))
    assert.ok(result.stdout.includes('## Executive Summary'))
    assert.ok(result.stdout.includes('## Metrics'))
    assert.ok(result.stdout.includes('## Findings'))
    assert.ok(!/\x1b\[/.test(result.stdout), 'expected no ANSI escapes in Markdown output')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format markdown accepts the --format=markdown form and is deterministic', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-md-eq-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  try {
    const space = runCli(['scan', '--format', 'markdown', '--cwd', projectDir], workspace)
    const equals = runCli(['scan', '--format=markdown', '--cwd', projectDir], workspace)
    assert.equal(space.status, 0)
    assert.equal(equals.status, 0)
    assert.equal(space.stdout, equals.stdout)
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format markdown still gates: --fail-under exits 1 while printing the report', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-md-gate-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  try {
    const result = runCli(['scan', '--format', 'markdown', '--cwd', projectDir, '--fail-under', '100'], workspace)
    assert.equal(result.status, 1, `expected exit 1, stderr: ${result.stderr}`)
    assert.ok(result.stdout.includes('# TypeHealth Report'), 'report must still be printed on gate failure')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format markdown works with --changed and reports repo-relative paths', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-md-changed-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, PROJECT_FILES)
  execFileSync('git', ['init'], { cwd: projectDir })
  execFileSync('git', ['add', '-A'], { cwd: projectDir })
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-m', 'init'], { cwd: projectDir })
  // Leave an uncommitted modification so `--changed` (diff vs HEAD) selects it.
  writeFileSync(path.join(projectDir, 'src/index.ts'), `${readFileSync(path.join(projectDir, 'src/index.ts'), 'utf8')}const c = 1;\n`)
  try {
    const result = runCli(['scan', '--format', 'markdown', '--cwd', projectDir, '--changed'], workspace)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.ok(result.stdout.includes('src/index.ts'), 'expected repo-relative file paths')
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})

test('scan --format markdown escapes hostile content coming from analyzed files', () => {
  const workspace = mkdtempSync(path.join(tmpdir(), 'typehealth-md-evil-'))
  const projectDir = makeProject(workspace, { compilerOptions: { strict: true } }, {
    'src/evil.ts': 'const a: any = JSON.parse("| fake | row |\n# heading"); // @ts-ignore',
  })
  try {
    const result = runCli(['scan', '--format', 'markdown', '--cwd', projectDir], workspace)
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    for (const line of result.stdout.split('\n')) {
      assert.ok(!line.startsWith('# heading'), 'message content escaped into a heading')
      assert.ok(!line.startsWith('| fake |'), 'message content escaped into a table row')
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true })
  }
})
