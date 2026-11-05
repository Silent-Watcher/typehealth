import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { loadProject } from '../../src/core/project.ts'
import { analyzeProject } from '../../src/core/analyzer.ts'

function makeProject(baseline: string, tsconfig: object, files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(baseline, 'typehealth-analyze-'))
  mkdirSync(path.join(dir, 'src'), { recursive: true })
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify(tsconfig))
  for (const [name, contents] of Object.entries(files)) {
    const file = path.join(dir, name)
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, contents)
  }
  return dir
}

function analyze(dir: string) {
  const project = loadProject({ projectDir: dir })
  assert.equal(project.ok, true)
  if (!project.ok) throw new Error('unreachable')
  return analyzeProject(project)
}

/** Assert the list is non-empty and return its first element. */
function first<T>(list: readonly T[]): T {
  assert.ok(list.length >= 1)
  return list[0] as T
}

test('type coverage counts annotated, inferred and any positions', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/index.ts': [
      'const a: number = 1;',
      'const b = "inferred";',
      'const c: any = 3;',
      'function f(x: string) { return x.length; }',
    ].join('\n'),
  })
  try {
    const { project } = analyze(dir)
    // positions: a, b, c, param x, return of f = 5; any: c -> 4 typed
    assert.equal(project.eligiblePositions, 5)
    assert.equal(project.typedPositions, 4)
    assert.ok(Math.abs((project.typeCoverage ?? 0) - 0.8) < 1e-9)
    assert.equal(project.explicitAny, 1)
    assert.equal(project.implicitAny, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('implicit any is detected in non-strict code without annotations', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: {} }, {
    'src/loose.ts': 'function f(x) { return x; }\nconst y = f(1);\n',
  })
  try {
    const { project, findings } = analyze(dir)
    // Implicit any at: parameter x, f's return type, and const y inferred from f(1).
    assert.equal(project.implicitAny, 3)
    const implicit = findings.filter((f) => f.rule === 'implicit-any')
    assert.equal(implicit.length, 3)
    assert.ok(implicit.every((f) => f.severity === 'medium'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('as any, double and unrelated assertions are reported with distinct severities', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/asserts.ts': [
      'const a = {} as any;',
      'const b = 1 as unknown as string;',
      'const c = ({ x: 1 }) as { y: number };',
      'const d = "text" as string;',
    ].join('\n'),
  })
  try {
    const { project, findings } = analyze(dir)
    assert.equal(project.unsafeAssertions, 3) // d is a legitimate assertion
    const unsafe = findings.filter((f) => f.rule === 'unsafe-assertion')
    assert.ok(unsafe.some((f) => f.severity === 'high' && f.message.includes('any')))
    assert.ok(unsafe.some((f) => f.severity === 'medium' && f.message.includes('Double')))
    assert.ok(unsafe.some((f) => f.severity === 'medium' && f.message.includes('unrelated')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('non-null assertions are counted with low severity', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/nonnull.ts': 'const el = [1].map((n) => n)!;\nconst x = el[0]!;\n',
  })
  try {
    const { project, findings } = analyze(dir)
    assert.equal(project.nonNullAssertions, 2)
    const nonNull = findings.filter((f) => f.rule === 'non-null-assertion')
    assert.equal(nonNull.length, 2)
    assert.ok(nonNull.every((f) => f.severity === 'low'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('suppression comments are detected by kind and severity', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/suppress.ts': [
      '// @ts-nocheck',
      'const a: number = "x" as unknown as number;',
      '// @ts-ignore',
      'const b: string = 1;',
      '// @ts-expect-error',
      'const c: string = 2;',
    ].join('\n'),
  })
  try {
    const { project, findings } = analyze(dir)
    assert.equal(project.suppressions, 3)
    const byRule = (rule: string) => findings.filter((f) => f.rule === rule)
    assert.equal(byRule('ts-nocheck').length, 1)
    assert.equal(first(byRule('ts-nocheck')).severity, 'high')
    assert.equal(byRule('ts-ignore').length, 1)
    assert.equal(first(byRule('ts-ignore')).severity, 'medium')
    assert.equal(byRule('ts-expect-error').length, 1)
    assert.equal(first(byRule('ts-expect-error')).severity, 'low')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('suppression text inside string literals is not reported', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/strings.ts': 'const s = "// @ts-ignore not a comment";\n',
  })
  try {
    const { project } = analyze(dir)
    assert.equal(project.suppressions, 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('disabled strictness options produce a config-level finding', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: false, noImplicitAny: true } }, {
    'src/index.ts': 'export const a = 1;\n',
  })
  try {
    const { project, findings } = analyze(dir)
    assert.equal(project.weakStrictnessFlags, 8)
    const strictFindings = findings.filter((f) => f.rule === 'weak-strictness')
    assert.equal(strictFindings.length, 1)
    assert.match(first(strictFindings).message, /strictNullChecks/)
    assert.equal(first(strictFindings).file, path.join(dir, 'tsconfig.json'))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('strict tsconfig reports no weak flags', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/index.ts': 'export const a = 1;\n',
  })
  try {
    const { project, findings } = analyze(dir)
    assert.equal(project.weakStrictnessFlags, 0)
    const strictFindings = findings.filter((f) => f.rule === 'weak-strictness')
    assert.equal(strictFindings.length, 1)
    const strictFinding = strictFindings[0]
    if (strictFinding === undefined) return
    assert.equal(strictFinding.severity, 'info')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('empty project yields zero metrics and null coverage', () => {
  const dir = makeProject(tmpdir(), { include: [] }, {})
  try {
    const { project, files } = analyze(dir)
    assert.equal(files.length, 0)
    assert.equal(project.eligiblePositions, 0)
    assert.equal(project.typeCoverage, null)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('invalid syntax produces a syntax-error finding instead of crashing', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/broken.ts': 'const a = {{{;\n',
  })
  try {
    const { findings } = analyze(dir)
    const syntax = findings.filter((f) => f.rule === 'syntax-error')
    assert.ok(syntax.length >= 1)
    const firstSyntax = syntax[0]
    if (firstSyntax === undefined) return
    assert.equal(firstSyntax.severity, 'high')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('findings are deduplicated and ordered deterministically', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/index.ts': 'const a: any = 1;\nconst b: any = 2;\n',
  })
  try {
    const { findings } = analyze(dir)
    for (let i = 1; i < findings.length; i++) {
      const prev = findings[i - 1]
      const cur = findings[i]
      if (prev === undefined || cur === undefined) continue
      const order =
        prev.file.localeCompare(cur.file) ||
        prev.line - cur.line ||
        prev.column - cur.column ||
        prev.rule.localeCompare(cur.rule)
      assert.ok(order <= 0)
    }
    const keys = new Set(findings.map((f) => `${f.file}:${f.line}:${f.column}:${f.rule}`))
    assert.equal(keys.size, findings.length)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('file metrics are computed per file and sorted', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/aaa.ts': 'const a: any = 1;\n',
    'src/zzz.ts': 'const b: number = 2;\n',
  })
  try {
    const { files } = analyze(dir)
    assert.equal(files.length, 2)
    const aaa = files[0]
    const zzz = files[1]
    if (aaa === undefined || zzz === undefined) return
    assert.ok(aaa.file < zzz.file)
    assert.equal(aaa.explicitAny, 1)
    assert.ok(aaa.typeCoverage !== null && aaa.typeCoverage < 1)
    assert.equal(zzz.typeCoverage, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
