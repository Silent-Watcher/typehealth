import test from 'node:test'
import assert from 'node:assert/strict'

import { MARKDOWN_FORMAT_VERSION, renderMarkdownReport } from '../../src/reports/markdown.ts'
import type { ReportInput } from '../../src/reports/json.ts'
import type { AnalysisResult, FileMetrics, ProjectMetrics } from '../../src/core/analyzer.ts'
import type { Finding, Severity } from '../../src/core/findings.ts'

const SECTIONS = [
  '# TypeHealth Report',
  '## Project Context',
  '## Executive Summary',
  '## Metrics',
  '## File Health',
  '## Findings',
  '## Recommended Investigation Areas',
]

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

function makeFinding(severity: Severity, file: string, line: number, message: string, rule = 'test-rule'): Finding {
  return { file, line, column: 1, rule, severity, message }
}

const INFO = {
  projectDir: '/tmp/demo-project',
  configPath: '/tmp/demo-project/tsconfig.json',
}

function makeInput(analysis: AnalysisResult): ReportInput {
  return { analysis, projectDir: INFO.projectDir, configPath: INFO.configPath }
}

test('Markdown report: contains all sections in stable order', () => {
  const output = renderMarkdownReport(makeInput(makeAnalysis()))
  const positions = SECTIONS.map((s) => output.indexOf(s))
  for (const [i, position] of positions.entries()) {
    assert.ok(position >= 0, `missing section ${JSON.stringify(SECTIONS[i])}`)
    if (i > 0) assert.ok(position > positions[i - 1]!, 'sections out of order')
  }
})

test('Markdown report: identifies tool, format version, root and config', () => {
  const output = renderMarkdownReport(makeInput(makeAnalysis()))
  assert.ok(output.includes('- Tool: typehealth v'))
  assert.ok(output.includes(`- Report format: markdown v${MARKDOWN_FORMAT_VERSION}`))
  assert.ok(output.includes('- Project root: /tmp/demo-project'))
  assert.ok(output.includes('- TypeScript config: /tmp/demo-project/tsconfig.json'))
  assert.ok(output.includes('- Files analyzed: 1'))
})

test('Markdown report: metrics table carries exact values', () => {
  const analysis = makeAnalysis({
    project: makeProjectMetrics({
      typeCoverage: 0.421,
      eligiblePositions: 50,
      typedPositions: 21,
      explicitAny: 1,
      implicitAny: 2,
      unsafeAssertions: 3,
      nonNullAssertions: 4,
      suppressions: 5,
      runtimeBoundaries: 6,
      weakStrictnessFlags: 7,
    }),
  })
  const output = renderMarkdownReport(makeInput(analysis))
  for (const row of [
    '| typeCoverage | 0.421 |',
    '| eligiblePositions | 50 |',
    '| typedPositions | 21 |',
    '| explicitAny | 1 |',
    '| implicitAny | 2 |',
    '| unsafeAssertions | 3 |',
    '| nonNullAssertions | 4 |',
    '| suppressions | 5 |',
    '| runtimeBoundaries | 6 |',
    '| weakStrictnessFlags | 7 |',
  ]) {
    assert.ok(output.includes(row), `missing metric row ${JSON.stringify(row)}`)
  }
})

test('Markdown report: zero metrics render as 0, missing coverage renders as n/a', () => {
  const analysis = makeAnalysis({
    project: makeProjectMetrics({ typeCoverage: null, eligiblePositions: 0, typedPositions: 0, explicitAny: 0 }),
    files: [],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('- Type coverage: n/a (no eligible positions)'))
  assert.ok(output.includes('| typeCoverage | n/a |'))
  assert.ok(output.includes('| explicitAny | 0 |'))
  assert.ok(output.includes('| eligiblePositions | 0 |'))
})

test('Markdown report: empty project (no files, no findings) renders placeholder rows', () => {
  const analysis = makeAnalysis({ files: [], findings: [] })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('No files were analyzed.'))
  assert.ok(output.includes('No findings. Type system looks clean.'))
  assert.ok(output.includes('None. No findings to investigate.'))
})

test('Markdown report: findings are ordered by severity descending, then file and line', () => {
  const analysis = makeAnalysis({
    findings: [
      makeFinding('info', 'src/a.ts', 1, 'Info a.'),
      makeFinding('critical', 'src/z.ts', 9, 'Critical z.'),
      makeFinding('medium', 'src/m.ts', 5, 'Medium m.'),
      makeFinding('critical', 'src/a.ts', 2, 'Critical a.'),
      makeFinding('high', 'src/a.ts', 2, 'High a.'),
    ],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  const order = ['CRITICAL', 'CRITICAL', 'HIGH', 'MEDIUM', 'INFO']
  let cursor = output.indexOf('## Findings')
  for (const expected of order) {
    const at = output.indexOf(`- [${expected}]`, cursor)
    assert.ok(at >= 0, `expected a ${expected} finding after position ${cursor}`)
    cursor = at + 1
  }
  // Same-severity findings sorted by file then line: critical a.ts:2 before z.ts:9.
  assert.ok(output.indexOf('src/a.ts:2:1') < output.indexOf('src/z.ts:9:1'))
})

test('Markdown report: summary counts findings per severity', () => {
  const analysis = makeAnalysis({
    findings: [
      makeFinding('critical', 'src/a.ts', 1, 'a.'),
      makeFinding('high', 'src/b.ts', 1, 'b.'),
      makeFinding('high', 'src/c.ts', 1, 'c.'),
    ],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('- Findings: 3 total (info: 0, low: 0, medium: 0, high: 2, critical: 1)'))
})

test('Markdown report: file paths are relative to the project root', () => {
  const analysis = makeAnalysis({
    files: [makeFile({ file: '/tmp/demo-project/src/deep/module.ts' })],
    findings: [makeFinding('low', '/tmp/demo-project/src/deep/module.ts', 4, 'msg')],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('| src/deep/module.ts |'))
  assert.ok(output.includes('- [LOW] src/deep/module.ts:4:1'))
  assert.ok(!output.includes('/tmp/demo-project/src/deep'))
})

test('Markdown report: escapes backticks, pipes and newlines in finding messages', () => {
  const analysis = makeAnalysis({
    findings: [
      makeFinding('medium', 'src/a.ts', 1, 'use `as const` here | breaks table\nsecond line'),
    ],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('use \\`as const\\` here \\| breaks table\\nsecond line'))
  // The whole finding stays on a single physical line.
  const findingsSection = output.slice(output.indexOf('## Findings'), output.indexOf('## Recommended'))
  assert.equal(findingsSection.split('\n').filter((l) => l.startsWith('- [')).length, 1)
})

test('Markdown report: HTML injection in messages and filenames is neutralized', () => {
  const analysis = makeAnalysis({
    files: [makeFile({ file: '/tmp/demo-project/<img src=x onerror=alert(1)>.ts' })],
    findings: [makeFinding('high', '/tmp/demo-project/<script>alert(1)</script>.ts', 1, '<b>bold</b> claim')],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(!output.includes('<script>'))
  assert.ok(!output.includes('<img '))
  assert.ok(!output.includes('<b>bold</b>'))
  assert.ok(output.includes('&lt;script&gt;'))
})

test('Markdown report: markdown structure injection via pipes and headings is contained', () => {
  const analysis = makeAnalysis({
    findings: [
      makeFinding('low', 'src/a.ts', 1, '| fake | table | row |\n# injected heading'),
      makeFinding('low', 'src/a.md', 1, '![x](https://evil.example/payload)'),
    ],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  // No line starting with a heading or a pipe cell that came from the message.
  for (const line of output.split('\n')) {
    assert.ok(!line.startsWith('# injected'), 'message injected a heading')
    if (line.startsWith('| ')) {
      assert.ok(
        !line.includes(' fake | table '),
        'message injected a fake table row',
      )
    }
  }
  assert.ok(output.includes('\\| fake \\| table \\| row \\|'))
})

test('Markdown report: unicode content passes through unchanged', () => {
  const analysis = makeAnalysis({
    findings: [makeFinding('info', 'src/ünïcødé.ts', 3, '变量类型为 any — 🐛')],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  assert.ok(output.includes('src/ünïcødé.ts:3:1'))
  assert.ok(output.includes('变量类型为 any — 🐛'))
})

test('Markdown report: file health table includes every file without truncation', () => {
  const files: FileMetrics[] = Array.from({ length: 30 }, (_, i) => makeFile({ file: `src/file${i}.ts` }))
  const analysis = makeAnalysis({ files, project: makeProjectMetrics({ files: 30 }) })
  const output = renderMarkdownReport(makeInput(analysis))
  for (let i = 0; i < 30; i++) {
    assert.ok(output.includes(`| src/file${i}.ts |`), `missing file${i}.ts row`)
  }
})

test('Markdown report: recommended areas reference the top severity findings only', () => {
  const analysis = makeAnalysis({
    findings: [
      makeFinding('critical', 'src/a.ts', 1, 'a.', 'explicit-any'),
      makeFinding('high', 'src/b.ts', 2, 'b.', 'ts-ignore'),
      makeFinding('low', 'src/c.ts', 3, 'c.'),
      makeFinding('low', 'src/d.ts', 4, 'd.'),
      makeFinding('low', 'src/e.ts', 5, 'e.'),
      makeFinding('low', 'src/f.ts', 6, 'f.'),
    ],
  })
  const output = renderMarkdownReport(makeInput(analysis))
  const section = output.slice(output.indexOf('## Recommended Investigation Areas'))
  assert.equal((section.match(/^- /gm) ?? []).length, 5)
  assert.ok(section.includes('src/a.ts:1 (critical, explicit-any)'))
  assert.ok(!section.includes('src/f.ts:6'))
})

test('Markdown report: rendering is deterministic for identical input (ignoring durationMs)', () => {
  const analysis = makeAnalysis({
    files: [makeFile({ file: 'src/a.ts', typeCoverage: 0.4 }), makeFile({ file: 'src/b.ts', typeCoverage: null })],
    findings: [makeFinding('high', 'src/a.ts', 3, 'High.'), makeFinding('low', 'src/b.ts', 8, 'Low.')],
  })
  const clone = JSON.parse(JSON.stringify(analysis)) as AnalysisResult
  clone.durationMs = 999
  assert.equal(
    renderMarkdownReport(makeInput(analysis)),
    renderMarkdownReport(makeInput(clone)),
  )
})

test('Markdown report: output has no ANSI escape sequences and no trailing tabular noise', () => {
  const output = renderMarkdownReport(makeInput(makeAnalysis()))
  assert.ok(!/\x1b\[/.test(output), 'expected no ANSI escapes')
  assert.ok(output.endsWith('\n'))
})
