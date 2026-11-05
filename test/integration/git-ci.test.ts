import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

import { getChangedFiles } from '../../src/core/git.ts'
import { compareBaseline, type BaselineData } from '../../src/core/baseline.ts'
import type { AnalysisResult } from '../../src/core/analyzer.ts'
import type { Finding } from '../../src/core/findings.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const CLI = path.join(ROOT, 'src/cli/index.ts')

interface CliResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Spawn the CLI with `cwd` as the working directory (like a CI job would). */
function runCliIn(cwd: string, args: readonly string[]): CliResult {
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

const GIT_ENV = {
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t',
}

interface GitProject {
  /** Realpath of the project directory (git output paths are realpath'd too). */
  dir: string
  runGit(args: readonly string[]): string
  commit(message: string): void
}

/** Build a small TypeScript project under a fresh temp dir, then `git init` +
 *  an initial commit (unless `initialCommit: false`). */
function makeGitProject(
  files: Record<string, string>,
  options: { initialCommit?: boolean; tsconfig?: object } = {},
): GitProject {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), 'typehealth-git-')))
  const tsconfig = options.tsconfig ?? { compilerOptions: { strict: true } }
  mkdirSync(path.join(dir, 'src'), { recursive: true })
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig))
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(dir, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
  const runGit = (args: readonly string[]): string =>
    execFileSync(
      'git',
      ['-C', dir, '-c', 'user.email=t@t', '-c', 'user.name=t', ...args],
      { encoding: 'utf8', env: { ...process.env, ...GIT_ENV } },
    )
  runGit(['init', '-q'])
  if (options.initialCommit !== false) {
    runGit(['add', '-A'])
    runGit(['commit', '-q', '-m', 'initial commit'])
  }
  return { dir, runGit, commit: (message: string) => runGit(['commit', '-q', '-m', message]) }
}

/** A project whose coverage is 4/5 = 80% (one explicit `any`). */
const ANY_PROJECT = {
  'src/index.ts': [
    'const a: number = 1;',
    'const b = "inferred";',
    'const c: any = 3;',
    'function f(x: string) { return x.length; }',
  ].join('\n'),
}

/**
 * Call getChangedFiles as a library consumer inside the project directory.
 * git.ts resolves repo-relative git output with path.resolve(), i.e. against
 * the calling process's cwd, so the direct call needs cwd === project dir.
 * Tests in one file run sequentially; the cwd is always restored.
 */
function getChangedFilesFrom(dir: string, ref?: string): ReturnType<typeof getChangedFiles> {
  const prevCwd = process.cwd()
  process.chdir(dir)
  try {
    return getChangedFiles(dir, ref)
  } finally {
    process.chdir(prevCwd)
  }
}

// ---------------------------------------------------------------------------
// --fail-under
// ---------------------------------------------------------------------------

test('--fail-under gates on measured type coverage', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const tooLow = runCliIn(project.dir, ['scan', '--fail-under', '100'])
    assert.equal(tooLow.status, 1, `expected exit 1, stderr: ${tooLow.stderr}`)

    const trivial = runCliIn(project.dir, ['scan', '--fail-under', '0'])
    assert.equal(trivial.status, 0, `expected exit 0, stderr: ${trivial.stderr}`)

    // Consistency: derive the expectation from a JSON run of the same repo.
    const jsonRun = runCliIn(project.dir, ['scan', '--format', 'json'])
    assert.equal(jsonRun.status, 0)
    const report = JSON.parse(jsonRun.stdout) as { metrics: { typeCoverage: number | null } }
    const coverage = report.metrics.typeCoverage
    assert.ok(coverage !== null)
    const expected = coverage * 100 < 60 ? 1 : 0
    const thresholdRun = runCliIn(project.dir, ['scan', '--fail-under', '60'])
    assert.equal(
      thresholdRun.status,
      expected,
      `coverage ${(coverage * 100).toFixed(1)}% vs threshold 60: expected exit ${expected}`,
    )
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--fail-under above 100 is rejected by argument validation (exit 2)', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const result = runCliIn(project.dir, ['scan', '--fail-under', '150'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /--fail-under/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--fail-under gate also applies with --format json', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const result = runCliIn(project.dir, ['scan', '--format', 'json', '--fail-under', '100'])
    assert.equal(result.status, 1)
    // The report itself must still be emitted as valid JSON.
    const report = JSON.parse(result.stdout) as { schemaVersion: number }
    assert.equal(report.schemaVersion, 1)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// --changed
// ---------------------------------------------------------------------------

test('--changed scopes the scan to modified and untracked files', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    // Modify one tracked file, leave one new file untracked.
    writeFileSync(path.join(project.dir, 'src/index.ts'), 'const a: any = 1;\nconst b: any = 2;\n')
    writeFileSync(path.join(project.dir, 'src/extra.ts'), 'export const extra = 1;\n')

    const result = runCliIn(project.dir, ['scan', '--changed'])
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.match(result.stdout, /Changed\s+2 \(of \d+ discovered\)/)

    // Cross-check against the core function.
    const changed = getChangedFilesFrom(project.dir)
    assert.equal(changed.ok, true)
    if (!changed.ok) return
    const expected = new Set([
      realpathSync(path.join(project.dir, 'src/index.ts')),
      realpathSync(path.join(project.dir, 'src/extra.ts')),
    ])
    assert.equal(changed.files.length, 2)
    assert.deepEqual(new Set(changed.files), expected)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--changed with an invalid git reference exits 2', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const result = runCliIn(project.dir, ['scan', '--changed', 'no-such-ref'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /invalid git reference/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--changed in a repository without commits exits 2', () => {
  const project = makeGitProject(ANY_PROJECT, { initialCommit: false })
  try {
    const result = runCliIn(project.dir, ['scan', '--changed'])
    assert.equal(result.status, 2)
    assert.match(result.stderr, /no commits/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--changed HEAD~1 after a second commit reports the newly added file', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    writeFileSync(path.join(project.dir, 'src/new.ts'), 'export const added = 1;\n')
    project.runGit(['add', '-A'])
    project.commit('add new file')

    // Core function: the file added by the second commit is in the changed set.
    const changed = getChangedFilesFrom(project.dir, 'HEAD~1')
    assert.equal(changed.ok, true)
    if (!changed.ok) return
    const changedSet = new Set(changed.files)
    assert.ok(changedSet.has(realpathSync(path.join(project.dir, 'src/new.ts'))))

    // Only the changed file is analyzed; the report shows it scoped
    // against the full discovery (2 files in this project).
    const result = runCliIn(project.dir, ['scan', '--changed', 'HEAD~1'])
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.match(result.stdout, /Changed\s+1 \(of 2 discovered\)/)
    assert.match(result.stdout, /Files\s+1\b/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// --baseline
// ---------------------------------------------------------------------------

/** Write a baseline JSON report for the project, as `scan --format json > file`. */
function writeBaselineFile(projectDir: string, file: string): void {
  const result = runCliIn(projectDir, ['scan', '--format', 'json'])
  assert.equal(result.status, 0, `expected exit 0 while generating baseline, stderr: ${result.stderr}`)
  writeFileSync(file, result.stdout)
}

test('--baseline against an unchanged project exits 0 with no new findings', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const baselinePath = path.join(project.dir, 'baseline.json')
    writeBaselineFile(project.dir, baselinePath)

    const result = runCliIn(project.dir, ['scan', '--baseline', baselinePath])
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.match(result.stdout, /BASELINE/)
    assert.match(result.stdout, /New findings\s+0\b/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--baseline flags a regression when a new `any` is introduced', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const baselinePath = path.join(project.dir, 'baseline.json')
    writeBaselineFile(project.dir, baselinePath)

    const indexPath = path.join(project.dir, 'src/index.ts')
    writeFileSync(indexPath, readFileSync(indexPath, 'utf8') + 'const x: any = 1;\n')

    const result = runCliIn(project.dir, ['scan', '--baseline', baselinePath])
    assert.equal(result.status, 1, `expected exit 1, stderr: ${result.stderr}`)
    assert.match(result.stdout, /Regression detected/)
    const match = /New findings\s+(\d+)/.exec(result.stdout)
    assert.ok(match, `expected a New findings line in:\n${result.stdout}`)
    assert.ok(Number(match[1]) > 0)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--baseline rejects invalid baseline files with exit 2', () => {
  const project = makeGitProject(ANY_PROJECT)
  try {
    const missing = runCliIn(project.dir, ['scan', '--baseline', path.join(project.dir, 'no-such-baseline.json')])
    assert.equal(missing.status, 2)
    assert.match(missing.stderr, /cannot read baseline/)

    const wrongSchema = path.join(project.dir, 'wrong-schema.json')
    writeFileSync(wrongSchema, '{"schemaVersion":99}')
    const schemaResult = runCliIn(project.dir, ['scan', '--baseline', wrongSchema])
    assert.equal(schemaResult.status, 2)
    assert.match(schemaResult.stderr, /schemaVersion/)

    const notJson = path.join(project.dir, 'not-json.json')
    writeFileSync(notJson, 'this is not json')
    const jsonResult = runCliIn(project.dir, ['scan', '--baseline', notJson])
    assert.equal(jsonResult.status, 2)
    assert.match(jsonResult.stderr, /cannot read baseline/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
  }
})

test('--baseline accepts an absolute path from a different spawning cwd', () => {
  const project = makeGitProject(ANY_PROJECT)
  const outDir = mkdtempSync(path.join(tmpdir(), 'typehealth-git-out-'))
  try {
    const baselinePath = path.join(project.dir, 'baseline.json')
    writeBaselineFile(project.dir, baselinePath)

    const result = runCliIn(outDir, ['scan', '--baseline', baselinePath, '--cwd', project.dir])
    assert.equal(result.status, 0, `expected exit 0, stderr: ${result.stderr}`)
    assert.match(result.stdout, /BASELINE/)
    assert.match(result.stdout, /New findings\s+0\b/)
  } finally {
    rmSync(project.dir, { recursive: true, force: true })
    rmSync(outDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// compareBaseline (unit)
// ---------------------------------------------------------------------------

function findingAt(line: number): Finding {
  return {
    file: '/proj/src/a.ts',
    line,
    column: 7,
    rule: 'explicit-any',
    severity: 'medium',
    message: "Explicit 'any' type",
  }
}

function analysisOf(coverage: number | null, findings: Finding[]): AnalysisResult {
  return { project: { typeCoverage: coverage }, findings } as unknown as AnalysisResult
}

function baselineOf(coverage: number | null, findings: Finding[]): BaselineData {
  return { metrics: { typeCoverage: coverage }, findings }
}

test('compareBaseline: coverage drop is a regression', () => {
  const comparison = compareBaseline(baselineOf(0.9, []), analysisOf(0.8, []))
  assert.equal(comparison.regressed, true)
  assert.equal(comparison.coverageBefore, 0.9)
  assert.equal(comparison.coverageAfter, 0.8)
  assert.equal(comparison.coverageDelta, -10)
  assert.equal(comparison.newFindings.length, 0)
})

test('compareBaseline: new findings are a regression even without a coverage drop', () => {
  const baseline = baselineOf(0.8, [findingAt(1)])
  const comparison = compareBaseline(baseline, analysisOf(0.8, [findingAt(1), findingAt(5)]))
  assert.equal(comparison.regressed, true)
  assert.equal(comparison.newFindings.length, 1)
  assert.equal(comparison.newFindings[0]?.line, 5)
  assert.equal(comparison.coverageDelta, 0)
})

test('compareBaseline: improvement (better coverage, fewer findings) is not a regression', () => {
  const baseline = baselineOf(0.7, [findingAt(1), findingAt(5)])
  const comparison = compareBaseline(baseline, analysisOf(0.8, [findingAt(1)]))
  assert.equal(comparison.regressed, false)
  assert.equal(comparison.coverageDelta, 10)
  assert.equal(comparison.newFindings.length, 0)
  assert.equal(comparison.resolvedFindings, 1)
})

test('compareBaseline: null coverage on either side yields a null delta', () => {
  const nullBefore = compareBaseline(baselineOf(null, []), analysisOf(0.8, []))
  assert.equal(nullBefore.coverageDelta, null)
  assert.equal(nullBefore.regressed, false)

  const nullAfter = compareBaseline(baselineOf(0.8, []), analysisOf(null, []))
  assert.equal(nullAfter.coverageDelta, null)
  assert.equal(nullAfter.regressed, false)
})
