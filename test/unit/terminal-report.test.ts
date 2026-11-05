import test from 'node:test'
import assert from 'node:assert/strict'

import { renderTerminalReport, type ReportInfo } from '../../src/reports/terminal.ts'
import type { AnalysisResult, FileMetrics, ProjectMetrics } from '../../src/core/analyzer.ts'
import type { Finding, Severity } from '../../src/core/findings.ts'

function first<T>(list: readonly T[]): T {
  assert.ok(list.length >= 1)
  return list[0] as T
}

/** Return the first line of `output` containing `needle`, failing if none does. */
function lineContaining(output: string, needle: string): string {
  const line = output.split('\n').find((l) => l.includes(needle))
  assert.ok(line !== undefined, `expected a line containing ${JSON.stringify(needle)}`)
  return line
}

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

const INFO: ReportInfo = {
  projectDir: '/tmp/demo-project',
  configPath: '/tmp/demo-project/tsconfig.json',
}

/** Render with color disabled (the default mode under test). */
function render(analysis: AnalysisResult): string {
  return renderTerminalReport(analysis, INFO, false)
}

/**
 * Render with color enabled even though the test runner's stdout is not a TTY.
 * colorize() delegates to styleText, which checks process.stdout (TTY, NO_COLOR,
 * TERM) at call time; those checks are dynamic, so they can be staged here and
 * restored afterwards.
 */
function renderColored(analysis: AnalysisResult): string {
  const hadNoColor = 'NO_COLOR' in process.env
  const prevNoColor = process.env.NO_COLOR
  const prevTerm = process.env.TERM
  const hadIsTTY = 'isTTY' in process.stdout
  const prevIsTTY = (process.stdout as { isTTY?: boolean }).isTTY
  delete process.env.NO_COLOR
  delete process.env.TERM
  ;(process.stdout as { isTTY?: boolean }).isTTY = true
  try {
    return renderTerminalReport(analysis, INFO, true)
  } finally {
    if (hadNoColor) process.env.NO_COLOR = prevNoColor
    if (prevTerm !== undefined) process.env.TERM = prevTerm
    if (hadIsTTY) (process.stdout as { isTTY?: boolean }).isTTY = prevIsTTY
    else delete (process.stdout as { isTTY?: boolean }).isTTY
  }
}

test('report opens with the box header and shows project info values', () => {
  const output = render(makeAnalysis())
  assert.ok(output.includes('╭'))
  assert.ok(output.includes('TYPEHEALTH'))
  assert.ok(output.includes('Type Safety Analyzer'))
  assert.ok(output.includes('╰'))
  assert.ok(output.includes('Project  /tmp/demo-project'))
  assert.ok(output.includes('Config   /tmp/demo-project/tsconfig.json'))
  assert.ok(output.includes('Files    1'))
  assert.ok(output.includes('Duration 1.23s'))
})

test('type coverage line shows the percentage when coverage is known', () => {
  const output = render(makeAnalysis({ project: makeProjectMetrics({ typeCoverage: 0.8 }) }))
  assert.ok(output.includes('80.0%'))
})

test('type coverage line shows n/a when coverage is null', () => {
  const output = render(
    makeAnalysis({ project: makeProjectMetrics({ typeCoverage: null, eligiblePositions: 0, typedPositions: 0 }) }),
  )
  assert.ok(output.includes('n/a'))
  assert.ok(output.includes('(0 positions)'))
})

test('metrics section lists all seven metric labels with their values', () => {
  const output = render(
    makeAnalysis({
      project: makeProjectMetrics({
        explicitAny: 3,
        implicitAny: 4,
        unsafeAssertions: 5,
        nonNullAssertions: 6,
        suppressions: 7,
        runtimeBoundaries: 8,
        weakStrictnessFlags: 9,
      }),
    }),
  )
  const expected: Array<[string, number]> = [
    ['Explicit any', 3],
    ['Implicit any', 4],
    ['Unsafe assertions', 5],
    ['Non-null assertions', 6],
    ['Suppressions', 7],
    ['Unvalidated boundaries', 8],
    ['Weak strictness flags', 9],
  ]
  for (const [label, value] of expected) {
    assert.ok(output.includes(label), `expected metric label ${JSON.stringify(label)}`)
    const row = lineContaining(output, label)
    assert.ok(
      row.trimEnd().endsWith(String(value)),
      `expected ${JSON.stringify(label)} row to end with ${value}, got ${JSON.stringify(row)}`,
    )
  }
})

test('FILE HEALTH section is absent when no file is eligible', () => {
  const output = render(
    makeAnalysis({
      files: [
        makeFile({ file: 'src/empty.ts', typeCoverage: null, eligiblePositions: 0, typedPositions: 0 }),
        makeFile({ file: 'src/zero-positions.ts', typeCoverage: 1, eligiblePositions: 0, typedPositions: 0 }),
      ],
    }),
  )
  assert.ok(!output.includes('FILE HEALTH'))
})

test('FILE HEALTH section is absent for an empty file list', () => {
  const output = render(makeAnalysis({ files: [] }))
  assert.ok(!output.includes('FILE HEALTH'))
})

test('FILE HEALTH section appears when at least one file has coverage and positions', () => {
  const output = render(makeAnalysis())
  assert.ok(output.includes('FILE HEALTH'))
  assert.ok(output.includes('src/index.ts'))
})

test('FILE HEALTH orders files worst (lowest coverage) first, ties broken by filename', () => {
  const output = render(
    makeAnalysis({
      files: [
        makeFile({ file: 'src/gamma.ts', typeCoverage: 0.9 }),
        makeFile({ file: 'src/alpha.ts', typeCoverage: 0.2 }),
        makeFile({ file: 'src/bbb.ts', typeCoverage: 0.5 }),
        makeFile({ file: 'src/aaa.ts', typeCoverage: 0.5 }),
      ],
    }),
  )
  const alpha = lineContaining(output, 'src/alpha.ts')
  const aaa = lineContaining(output, 'src/aaa.ts')
  const bbb = lineContaining(output, 'src/bbb.ts')
  const gamma = lineContaining(output, 'src/gamma.ts')
  assert.ok(output.indexOf(alpha) < output.indexOf(aaa))
  assert.ok(output.indexOf(aaa) < output.indexOf(bbb))
  assert.ok(output.indexOf(bbb) < output.indexOf(gamma))
})

test('FILE HEALTH shows at most 5 rows', () => {
  const files = Array.from({ length: 7 }, (_, i) =>
    makeFile({ file: `src/f${String(i)}.ts`, typeCoverage: 0.1 * (i + 1) }),
  )
  const output = render(makeAnalysis({ files, project: makeProjectMetrics({ files: 7 }) }))
  const header = lineContaining(output, 'FILE HEALTH')
  const rows = output
    .split('\n')
    .slice(output.split('\n').indexOf(header) + 1)
    .filter((l) => l.startsWith('  ') && l.trim().length > 0)
  assert.equal(rows.length, 5)
  for (let i = 0; i <= 4; i++) {
    assert.ok(output.includes(`src/f${String(i)}.ts`))
  }
  assert.ok(!output.includes('src/f5.ts'))
  assert.ok(!output.includes('src/f6.ts'))
})

test('FILE HEALTH excludes files with null coverage', () => {
  const output = render(
    makeAnalysis({
      files: [
        makeFile({ file: 'src/nocoverage.ts', typeCoverage: null, eligiblePositions: 0, typedPositions: 0 }),
        makeFile({ file: 'src/good.ts', typeCoverage: 1 }),
      ],
    }),
  )
  assert.ok(output.includes('src/good.ts'))
  assert.ok(!output.includes('src/nocoverage.ts'))
})

test('file names longer than 30 chars are shortened with an ellipsis prefix', () => {
  const longName = 'src/really-long-directory-name/this-is-a-very-long-file-name.ts'
  const output = render(makeAnalysis({ files: [makeFile({ file: longName })] }))
  const row = lineContaining(output, 'very-long-file-name.ts')
  const name = row.trimStart().split(' ')[0] as string
  assert.ok(name.startsWith('…'), `expected shortened name to start with ellipsis, got ${JSON.stringify(name)}`)
  assert.ok(!output.includes('really-long-directory-name'))
})

test('short file names are shown as-is (last two path segments)', () => {
  const output = render(makeAnalysis({ files: [makeFile({ file: '/abs/project/src/index.ts' })] }))
  const row = lineContaining(output, 'src/index.ts')
  assert.ok(row.trimStart().startsWith('src/index.ts'))
})

test('TOP FINDINGS are sorted by severity descending', () => {
  const findings = [
    makeFinding('low', 'src/low.ts', 1, 'Low issue.'),
    makeFinding('high', 'src/high.ts', 3, 'High issue.'),
    makeFinding('info', 'src/info.ts', 5, 'Info issue.'),
    makeFinding('critical', 'src/critical.ts', 4, 'Critical issue.'),
    makeFinding('medium', 'src/medium.ts', 2, 'Medium issue.'),
  ]
  const output = render(makeAnalysis({ findings }))
  const tags = ['[CRITICAL]', '[HIGH]', '[MEDIUM]', '[LOW]', '[INFO]']
  const indices = tags.map((tag) => output.indexOf(tag))
  for (const index of indices) assert.ok(index >= 0, `expected tag from ${JSON.stringify(tags)} in output`)
  for (let i = 1; i < indices.length; i++) {
    const prev = indices[i - 1]
    const cur = indices[i]
    assert.ok(prev !== undefined && cur !== undefined && prev < cur)
  }
})

test('TOP FINDINGS with equal severity are ordered by file, then line', () => {
  const output = render(
    makeAnalysis({
      findings: [
        makeFinding('high', 'src/zzz.ts', 9, 'Later file.'),
        makeFinding('high', 'src/aaa.ts', 5, 'Second line.'),
        makeFinding('high', 'src/aaa.ts', 2, 'First line.'),
      ],
    }),
  )
  const aaaFirst = lineContaining(output, 'src/aaa.ts:2')
  const aaaSecond = lineContaining(output, 'src/aaa.ts:5')
  const zzz = lineContaining(output, 'src/zzz.ts:9')
  assert.ok(output.indexOf(aaaFirst) < output.indexOf(aaaSecond))
  assert.ok(output.indexOf(aaaSecond) < output.indexOf(zzz))
})

test('TOP FINDINGS lines are formatted as [SEVERITY] file:line message', () => {
  const output = render(
    makeAnalysis({ findings: [makeFinding('high', 'src/bad.ts', 10, 'Explicit any type usage.')] }),
  )
  assert.ok(output.includes('TOP FINDINGS'))
  assert.ok(output.includes('  [HIGH] src/bad.ts:10 Explicit any type usage.'))
})

test('TOP FINDINGS shows at most 10 rows', () => {
  const findings = [
    ...Array.from({ length: 5 }, (_, i) => makeFinding('high', `src/h${String(i)}.ts`, i + 1, 'High issue.')),
    ...Array.from({ length: 4 }, (_, i) => makeFinding('medium', `src/m${String(i)}.ts`, i + 1, 'Medium issue.')),
    ...Array.from({ length: 3 }, (_, i) => makeFinding('low', `src/l${String(i)}.ts`, i + 1, 'Low issue.')),
  ]
  const output = render(makeAnalysis({ findings, project: makeProjectMetrics({ files: 12 }) }))
  const findingRows = output.split('\n').filter((l) => /^\s{2}\[(CRITICAL|HIGH|MEDIUM|LOW|INFO)\]/.test(l))
  assert.equal(findingRows.length, 10)
  // The two lowest-severity, latest-file findings are cut off.
  assert.ok(!output.includes('src/l1.ts'))
  assert.ok(!output.includes('src/l2.ts'))
  assert.ok(output.includes('src/l0.ts'))
})

test('TOP FINDINGS section is absent when there are no findings', () => {
  const output = render(makeAnalysis({ findings: [] }))
  assert.ok(!output.includes('TOP FINDINGS'))
})

test('report ends with the success footer', () => {
  const output = render(makeAnalysis())
  const nonEmptyLines = output.split('\n').filter((l) => l.trim().length > 0)
  assert.equal(first(nonEmptyLines.slice(-1)), 'Analysis completed successfully.')
  assert.ok(output.endsWith('Analysis completed successfully.\n'))
})

test('rendering is deterministic for identical input', () => {
  const analysis = makeAnalysis({
    files: [
      makeFile({ file: 'src/a.ts', typeCoverage: 0.4 }),
      makeFile({ file: 'src/b.ts', typeCoverage: 0.7 }),
    ],
    findings: [
      makeFinding('high', 'src/a.ts', 3, 'High issue.'),
      makeFinding('low', 'src/b.ts', 8, 'Low issue.'),
    ],
  })
  const copy = JSON.parse(JSON.stringify(analysis)) as AnalysisResult
  const firstRun = render(analysis)
  const secondRun = render(copy)
  assert.equal(firstRun, secondRun)
  assert.equal(render(copy), firstRun)
})

test('color=false output contains no ANSI escape sequences', () => {
  const output = render(
    makeAnalysis({
      files: [makeFile({ file: 'src/a.ts', typeCoverage: 0.4 })],
      findings: [makeFinding('high', 'src/a.ts', 3, 'High issue.')],
    }),
  )
  assert.ok(!output.includes('\x1b'))
})

test('color=true output contains ANSI escape sequences', () => {
  const output = renderColored(makeAnalysis())
  assert.ok(output.includes('\x1b['), 'expected ANSI escape sequences in colored output')
})

test('bars: coverage 1.0 renders a full 16-char bar, coverage 0 renders all dim blocks', () => {
  const output = render(
    makeAnalysis({
      files: [
        makeFile({ file: 'src/perfect.ts', typeCoverage: 1, eligiblePositions: 10, typedPositions: 10 }),
        makeFile({ file: 'src/awful.ts', typeCoverage: 0, eligiblePositions: 10, typedPositions: 0 }),
      ],
    }),
  )
  const perfectRow = lineContaining(output, 'src/perfect.ts')
  assert.ok(perfectRow.includes('█'.repeat(16)), `expected full bar in ${JSON.stringify(perfectRow)}`)
  assert.ok(!perfectRow.includes('░'))
  assert.ok(perfectRow.includes('100%'))

  const awfulRow = lineContaining(output, 'src/awful.ts')
  assert.ok(awfulRow.includes('░'.repeat(16)), `expected empty bar in ${JSON.stringify(awfulRow)}`)
  assert.ok(!awfulRow.includes('█'))
  assert.ok(awfulRow.includes('0%'))
})
