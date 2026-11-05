import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import {
  appendFileSync,
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'

import { loadProject } from '../../src/core/project.ts'
import { analyzeProject, type AnalysisResult } from '../../src/core/analyzer.ts'
import { renderHtmlReport } from '../../src/reports/html.ts'

function makeProject(baseline: string, tsconfig: object, files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(baseline, 'typescope-harden-'))
  mkdirSync(path.join(dir, 'src'), { recursive: true })
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig))
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(dir, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
  return dir
}

function loadOk(dir: string) {
  const project = loadProject({ projectDir: dir })
  assert.equal(project.ok, true, `expected loadProject to succeed: ${!project.ok ? project.message : ''}`)
  if (!project.ok) throw new Error('unreachable')
  return project
}

function analyze(dir: string): AnalysisResult {
  return analyzeProject(loadOk(dir))
}

/** True when `file` resolves inside `dir` (symlinks in the path aside). */
function insideDir(dir: string, file: string): boolean {
  const rel = path.relative(dir, file)
  return rel !== '' && !path.isAbsolute(rel) && !rel.startsWith('..')
}

test('files over MAX_SOURCE_FILE_BYTES are skipped, reported and excluded from metrics', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true }, include: ['src/*.ts'] }, {
    'src/normal.ts': 'const a: number = 1;\n',
  })
  const bigFile = path.join(dir, 'src/huge.ts')
  // Build the oversized file without holding more than ~1MiB in memory:
  // ~5200 comment lines of ~1KiB each is a bit over 5MiB > 4MiB limit.
  writeFileSync(bigFile, 'export const huge = 1;\n')
  const padLine = `// ${'p'.repeat(1020)}\n`
  for (let i = 0; i < 5200; i++) appendFileSync(bigFile, padLine)

  try {
    const project = loadOk(dir)
    assert.ok(project.fileNames.includes(path.join(dir, 'src/normal.ts')))
    assert.ok(!project.fileNames.includes(bigFile), 'oversized file must not be in fileNames')
    assert.deepEqual(project.skippedFiles, [{ file: bigFile, reason: 'too-large' }])

    const result = analyzeProject(project)
    const skipped = result.findings.filter((f) => f.rule === 'file-skipped')
    assert.equal(skipped.length, 1)
    const skippedFinding = skipped[0]
    if (skippedFinding) {
      assert.equal(skippedFinding.file, bigFile)
      assert.equal(skippedFinding.severity, 'info')
      assert.equal(skippedFinding.line, 1)
      assert.equal(skippedFinding.column, 1)
    }
    // The skipped file contributes no per-file metrics.
    assert.ok(result.files.every((f) => f.file !== bigFile))
    assert.ok(result.files.some((f) => f.file === path.join(dir, 'src/normal.ts')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('HTML-significant characters in real filenames are escaped in the HTML report', () => {
  const weirdName = 'we<b>ird".ts'
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true }, include: ['src/*.ts'] }, {
    [`src/${weirdName}`]: 'const a: any = 1;\n',
  })
  try {
    const project = loadOk(dir)
    assert.ok(project.fileNames.includes(path.join(dir, 'src', weirdName)))
    const result = analyzeProject(project)
    // The scan itself is unescaped data: findings reference the real on-disk name.
    assert.ok(result.findings.some((f) => f.file === path.join(dir, 'src', weirdName)))

    const html = renderHtmlReport({ analysis: result, projectDir: project.projectDir, configPath: project.configPath })
    const escaped = `src/we&lt;b&gt;ird&quot;.ts`
    assert.ok(html.includes(escaped), 'expected the odd filename to appear HTML-escaped in the report')
    assert.ok(!html.includes('<b>'), 'raw <b> tag must not leak into the report')
    assert.ok(!/<script/i.test(html), 'report must contain no script tag')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('symlink to a file inside the project: scan completes and stays in scope', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true }, include: ['src/*.ts'] }, {
    'src/real.ts': 'export const real: number = 1;\n',
  })
  symlinkSync(path.join(dir, 'src/real.ts'), path.join(dir, 'src/link.ts'))
  try {
    // Contract: no throw, whatever the per-file behavior turns out to be.
    const project = loadOk(dir)
    const result = analyzeProject(project)
    assert.ok(Array.isArray(result.files))
    for (const f of project.fileNames) {
      assert.ok(insideDir(project.projectDir, f), `expected ${f} to be inside the project`)
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('symlink to a file outside the project: scan completes and outside content stays out of scope', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true }, include: ['src/*.ts'] }, {
    'src/inside.ts': 'export const inside: number = 1;\n',
  })
  const outsideDir = mkdtempSync(path.join(tmpdir(), 'typescope-hardout-'))
  const outsideFile = path.join(outsideDir, 'evil.ts')
  writeFileSync(outsideFile, 'export const outside: any = 1;\n')
  symlinkSync(outsideFile, path.join(dir, 'src/link.ts'))
  try {
    const project = loadOk(dir)
    const result = analyzeProject(project) // must not throw
    // Nothing — not the symlink target's content — may be reported outside the project scope.
    for (const f of project.fileNames) {
      assert.ok(insideDir(project.projectDir, f), `fileNames entry ${f} escapes the project`)
    }
    for (const f of result.files) {
      assert.ok(insideDir(project.projectDir, f.file), `file metrics for ${f.file} escape the project`)
    }
    assert.ok(!result.files.some((f) => f.file === outsideFile), 'outside target must not get its own metrics entry')
  } finally {
    rmSync(dir, { recursive: true, force: true })
    rmSync(outsideDir, { recursive: true, force: true })
  }
})

test('unreadable file (mode 000): scan completes without crashing', (t) => {
  if (process.getuid?.() === 0) return t.skip('running as root: file permissions are not enforced')
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true }, include: ['src/*.ts'] }, {
    'src/readable.ts': 'const a: number = 1;\n',
    'src/secret.ts': 'const b: any = 2;\n',
  })
  chmodSync(path.join(dir, 'src/secret.ts'), 0o000)
  try {
    // Contract: no crash, no unhandled error — whether the file yields a
    // diagnostic, is dropped, or produces zero metrics is left to the impl.
    const project = loadOk(dir)
    const result = analyzeProject(project)
    const secretFile = path.join(dir, 'src/secret.ts')
    const hasMetrics = result.files.some((f) => f.file === secretFile)
    const hasDiagnostic = result.findings.some((f) => f.file === secretFile)
    assert.ok(
      !hasMetrics || hasDiagnostic,
      'unreadable file should either surface a diagnostic or be absent from metrics',
    )
    // The readable sibling is still analyzed normally.
    assert.ok(result.files.some((f) => f.file === path.join(dir, 'src/readable.ts')))
  } finally {
    chmodSync(path.join(dir, 'src/secret.ts'), 0o644)
    rmSync(dir, { recursive: true, force: true })
  }
})

test('tsconfig string value containing HTML/script content: parse and scan do not crash', () => {
  const dir = makeProject(
    tmpdir(),
    {
      compilerOptions: { strict: true, paths: { '<script>x</script>': ['./src'] } },
      include: ['src/*.ts'],
    },
    { 'src/index.ts': 'const a: number = 1;\n' },
  )
  try {
    // The paths value only surfaces in output via config diagnostics, if at all;
    // the contract is simply that nothing throws.
    const project = loadProject({ projectDir: dir })
    assert.equal(project.ok, true, `expected tsconfig parse to succeed: ${!project.ok ? project.message : ''}`)
    if (!project.ok) return
    const result = analyzeProject(project)
    assert.ok(Array.isArray(result.findings))
    const html = renderHtmlReport({ analysis: result, projectDir: project.projectDir, configPath: project.configPath })
    // If the hostile string ever surfaces in the report it must be escaped.
    assert.ok(!/<script/i.test(html), 'report must contain no script tag')
    assert.ok(!html.includes('<script>x</script>'), 'raw script content from config must not appear')
    // The tsconfig path is rendered in the report header (escaped by construction).
    assert.ok(html.includes(path.basename(project.configPath)))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
