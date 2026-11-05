import test from 'node:test'
import assert from 'node:assert/strict'

import { buildJsonReport, serializeJsonReport, type ReportInput } from '../../src/reports/json.ts'
import { escapeHtml, renderHtmlReport } from '../../src/reports/html.ts'
import type { AnalysisResult, FileMetrics, ProjectMetrics } from '../../src/core/analyzer.ts'
import type { Finding, Severity } from '../../src/core/findings.ts'

function makeFile(overrides: Partial<FileMetrics> = {}): FileMetrics {
  return {
    file: 'src/index.ts',
    typeCoverage: 1,
    eligiblePositions: 10,
    typedPositions: 10,
    explicitAny: 0,
    implicitAny: 0,
    unsafeAssertions: 0,
    nonNullAssertions: 0,
    suppressions: 0,
    runtimeBoundaries: 0,
    ...overrides,
  }
}

function makeProjectMetrics(overrides: Partial<ProjectMetrics> = {}): ProjectMetrics {
  return {
    typeCoverage: 0.8,
    eligiblePositions: 100,
    typedPositions: 80,
    explicitAny: 0,
    implicitAny: 0,
    unsafeAssertions: 0,
    nonNullAssertions: 0,
    suppressions: 0,
    runtimeBoundaries: 0,
    files: 1,
    weakStrictnessFlags: 0,
    ...overrides,
  }
}

function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    files: [makeFile()],
    project: makeProjectMetrics(),
    findings: [],
    durationMs: 1234,
    ...overrides,
  }
}

function makeFinding(severity: Severity, file: string, line: number, message: string): Finding {
  return { file, line, column: 1, rule: 'test-rule', severity, message }
}

const INFO = {
  projectDir: '/tmp/demo-project',
  configPath: '/tmp/demo-project/tsconfig.json',
}

function makeInput(analysis: AnalysisResult): ReportInput {
  return { analysis, projectDir: INFO.projectDir, configPath: INFO.configPath }
}

const ALL_METRIC_KEYS = [
  'typeCoverage',
  'eligiblePositions',
  'typedPositions',
  'explicitAny',
  'implicitAny',
  'unsafeAssertions',
  'nonNullAssertions',
  'suppressions',
  'runtimeBoundaries',
  'weakStrictnessFlags',
] as const

test('JSON report: schemaVersion is 1 and tool identifies typescope with a semver version', () => {
  const report = buildJsonReport(makeInput(makeAnalysis()))
  assert.equal(report.schemaVersion, 1)
  const tool = report.tool as { name: string; version: string }
  assert.equal(tool.name, 'typescope')
  assert.match(tool.version, /^\d+\.\d+\.\d+/)
})

test('JSON report: metrics match the analysis project metrics exactly', () => {
  const analysis = makeAnalysis({
    project: makeProjectMetrics({
      typeCoverage: 0.42,
      eligiblePositions: 50,
      typedPositions: 21,
      explicitAny: 1,
      implicitAny: 2,
      unsafeAssertions: 3,
      nonNullAssertions: 4,
      suppressions: 5,
      runtimeBoundaries: 6,
      files: 2,
      weakStrictnessFlags: 7,
    }),
  })
  const report = buildJsonReport(makeInput(analysis))
  const metrics = report.metrics as Record<string, unknown>
  // The report's metrics object carries the ten per-metric values; the file
  // count lives separately at project.files, not inside metrics.
  assert.deepEqual(Object.keys(metrics).sort(), [...ALL_METRIC_KEYS].sort())
  for (const key of ALL_METRIC_KEYS) {
    assert.equal(metrics[key], analysis.project[key], `metric ${key} should match the input`)
  }
  const project = report.project as Record<string, unknown>
  assert.equal(project.files, 2)
})

test('JSON report: project section carries duration, file count and paths', () => {
  const report = buildJsonReport(makeInput(makeAnalysis()))
  const project = report.project as Record<string, unknown>
  assert.equal(project.durationMs, 1234)
  assert.equal(project.directory, INFO.projectDir)
  assert.equal(project.configPath, INFO.configPath)
})

test('JSON report: files and findings are passed through unchanged', () => {
  const analysis = makeAnalysis({
    files: [
      makeFile({ file: 'src/a.ts', typeCoverage: 0.5, explicitAny: 2 }),
      makeFile({ file: 'src/b.ts', typeCoverage: null, eligiblePositions: 0, typedPositions: 0 }),
    ],
    findings: [
      makeFinding('high', 'src/a.ts', 3, 'High issue.'),
      makeFinding('low', 'src/b.ts', 8, 'Low issue.'),
    ],
  })
  const report = buildJsonReport(makeInput(analysis))
  assert.deepEqual(report.files, analysis.files)
  assert.deepEqual(report.findings, analysis.findings)
})

test('JSON report: metricDefinitions cover every metric key', () => {
  const report = buildJsonReport(makeInput(makeAnalysis()))
  const metrics = report.metrics as Record<string, unknown>
  const definitions = report.metricDefinitions as Record<string, string>
  assert.equal(Object.keys(metrics).length, 10)
  for (const key of Object.keys(metrics)) {
    assert.ok(
      typeof definitions[key] === 'string' && definitions[key].length > 0,
      `expected a metric definition for ${JSON.stringify(key)}`,
    )
  }
})

test('JSON report: serialization round-trips and ends with a newline', () => {
  const text = serializeJsonReport(makeInput(makeAnalysis()))
  assert.ok(text.endsWith('\n'))
  const parsed = JSON.parse(text) as { schemaVersion: number }
  assert.equal(parsed.schemaVersion, 1)
})

test('JSON report is byte-identical across builds with equal durationMs (determinism + key order)', () => {
  const analysis = makeAnalysis({
    files: [makeFile({ file: 'src/a.ts', typeCoverage: 0.4 }), makeFile({ file: 'src/b.ts', typeCoverage: 0.7 })],
    findings: [makeFinding('high', 'src/a.ts', 3, 'High issue.'), makeFinding('low', 'src/b.ts', 8, 'Low issue.')],
  })
  const clone = JSON.parse(JSON.stringify(analysis)) as AnalysisResult
  clone.durationMs = 999

  /** Zero out the measured duration and return the canonical serialized form. */
  const canonical = (report: Record<string, unknown>): string => {
    const copy = JSON.parse(JSON.stringify(report)) as Record<string, unknown>
    const project = copy.project as Record<string, unknown>
    project.durationMs = 0
    return JSON.stringify(copy)
  }

  const firstRun = canonical(buildJsonReport(makeInput(analysis)))
  const secondRun = canonical(buildJsonReport(makeInput(clone)))
  assert.equal(firstRun, secondRun)
})

test('escapeHtml escapes all five HTML-significant characters', () => {
  assert.equal(escapeHtml('a & b'), 'a &amp; b')
  assert.equal(escapeHtml('<c>'), '&lt;c&gt;')
  assert.equal(escapeHtml('"quoted"'), '&quot;quoted&quot;')
  assert.equal(escapeHtml("it's"), 'it&#39;s')
  assert.equal(escapeHtml('& < > " \''), '&amp; &lt; &gt; &quot; &#39;')
})

test('escapeHtml leaves ordinary text unchanged', () => {
  const text = 'plain text 123 ./src-file_name.ts (ok) [ok] {ok}'
  assert.equal(escapeHtml(text), text)
})

test('escapeHtml neutralizes classic XSS payloads', () => {
  assert.equal(escapeHtml('<script>alert(1)</script>'), '&lt;script&gt;alert(1)&lt;/script&gt;')
  assert.equal(escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;')
})

test('HTML report is a full document with inline styles, no scripts and no remote assets', () => {
  const output = renderHtmlReport(makeInput(makeAnalysis()))
  assert.ok(output.startsWith('<!doctype html>'))
  assert.ok(output.includes('<style>'))
  assert.ok(output.includes('</style>'))
  assert.ok(!/<script/i.test(output), 'expected no <script> tag in the HTML report')
  assert.ok(!/src=["']https?:/.test(output), 'expected no remote src= asset references')
  assert.ok(!/href=["']https?:/.test(output), 'expected no remote href= asset references')
})

test('HTML report shows all seven metric labels', () => {
  const output = renderHtmlReport(
    makeInput(
      makeAnalysis({
        project: makeProjectMetrics({
          explicitAny: 1,
          implicitAny: 2,
          unsafeAssertions: 3,
          nonNullAssertions: 4,
          suppressions: 5,
          runtimeBoundaries: 6,
          weakStrictnessFlags: 7,
        }),
      }),
    ),
  )
  for (const label of [
    'Explicit any',
    'Implicit any',
    'Unsafe assertions',
    'Non-null assertions',
    'Suppressions',
    'Unvalidated boundaries',
    'Weak strictness flags',
  ]) {
    assert.ok(output.includes(label), `expected metric label ${JSON.stringify(label)}`)
  }
})

test('HTML report groups findings by file with per-file counts', () => {
  const output = renderHtmlReport(
    makeInput(
      makeAnalysis({
        findings: [
          makeFinding('high', 'src/alpha.ts', 2, 'First issue.'),
          makeFinding('medium', 'src/alpha.ts', 5, 'Second issue.'),
          makeFinding('low', 'src/beta.ts', 9, 'Third issue.'),
        ],
      }),
    ),
  )
  assert.ok(output.includes('src/alpha.ts'))
  assert.ok(output.includes('src/beta.ts'))
  assert.equal((output.match(/<details open>/g) ?? []).length, 2)
  assert.ok(output.includes('<span class="badge-count">2</span>'))
  assert.ok(output.includes('<span class="badge-count">1</span>'))
})

test('HTML report escapes finding messages and file paths derived from the project', () => {
  const output = renderHtmlReport(
    makeInput(
      makeAnalysis({
        findings: [makeFinding('high', '/tmp/demo-project/<b>/evil.ts', 1, '<script>alert(1)</script>')],
      }),
    ),
  )
  assert.ok(output.includes('&lt;script&gt;'))
  assert.ok(output.includes('&lt;b&gt;/evil.ts'))
  assert.ok(!output.includes('<script>alert(1)</script>'))
  assert.ok(!/<script/i.test(output))
})

test('HTML report renders the no-findings message when there are no findings', () => {
  const output = renderHtmlReport(makeInput(makeAnalysis({ findings: [] })))
  assert.ok(output.includes('No findings. Type system looks clean.'))
})

test('HTML report shows n/a when project type coverage is null', () => {
  const output = renderHtmlReport(
    makeInput(
      makeAnalysis({
        project: makeProjectMetrics({ typeCoverage: null, eligiblePositions: 0, typedPositions: 0 }),
        files: [makeFile({ file: 'src/empty.ts', typeCoverage: null, eligiblePositions: 0, typedPositions: 0 })],
      }),
    ),
  )
  assert.ok(output.includes('n/a'))
})

test('HTML report rendering is deterministic for identical input', () => {
  const analysis = makeAnalysis({
    files: [makeFile({ file: 'src/a.ts', typeCoverage: 0.4 })],
    findings: [makeFinding('high', 'src/a.ts', 3, 'High issue.')],
  })
  const clone = JSON.parse(JSON.stringify(analysis)) as AnalysisResult
  const firstRun = renderHtmlReport(makeInput(analysis))
  const secondRun = renderHtmlReport(makeInput(clone))
  assert.equal(firstRun, secondRun)
})
