import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import ts from 'typescript'

import { findBoundaryFindings } from '../../src/core/boundaries.ts'
import { loadProject } from '../../src/core/project.ts'
import { analyzeProject } from '../../src/core/analyzer.ts'
import type { Finding } from '../../src/core/findings.ts'

/** Parse a code string into a SourceFile with parent pointers (needed by the
 *  boundary heuristics, which look at node.parent for assignments). */
function parse(code: string): ts.SourceFile {
  return ts.createSourceFile('fixture.ts', code, ts.ScriptTarget.Latest, /*setParentNodes*/ true)
}

/** Run the boundary analyzer over an in-memory code string. Pure AST, no I/O. */
function boundariesOf(code: string): Finding[] {
  return findBoundaryFindings(parse(code))
}

function makeProject(baseline: string, tsconfig: object, files: Record<string, string>): string {
  const dir = mkdtempSync(path.join(baseline, 'typehealth-boundaries-'))
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

test('unvalidated JSON.parse assignment yields one medium unvalidated-boundary finding', () => {
  const findings = boundariesOf('const data = JSON.parse(rawInput);')
  assert.equal(findings.length, 1)
  const finding = first(findings)
  assert.equal(finding.rule, 'unvalidated-boundary')
  assert.equal(finding.severity, 'medium')
  assert.match(finding.message, /uncertain/)
  assert.match(finding.message, /JSON\.parse/)
  assert.equal(finding.file, 'fixture.ts')
  assert.equal(finding.line, 1)
})

test('JSON.parse passed directly into a validator call is not reported', () => {
  const findings = boundariesOf('const value = schema.parse(JSON.parse(rawInput));')
  assert.equal(findings.length, 0)
})

test('JSON.parse result assigned to a variable validated later in the file is not reported', () => {
  const code = [
    'const data = JSON.parse(rawInput);',
    'const value = schema.parse(data);',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 0)
})

test('multiple req.body uses are grouped into one finding, req.query is a separate group', () => {
  const code = [
    'app.get("/", (req, res) => {',
    '  const name = req.body.name;',
    '  const age = req.body.age;',
    '  res.send(req.query.q);',
    '});',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 2)
  assert.ok(findings.every((f) => f.rule === 'unvalidated-boundary'))
  assert.ok(findings.every((f) => f.severity === 'medium'))
  // First group site is the earliest req.body use on line 2; req.query on line 4.
  const byLine = new Set(findings.map((f) => f.line))
  assert.deepEqual([...byLine].sort((a, b) => a - b), [2, 4])
  assert.match(first(findings).message, /request data/)
})

test('req.body passed directly to a validator is not reported', () => {
  const code = [
    'app.post("/", (req, res) => {',
    '  const user = schema.parse(req.body);',
    '  res.json(user);',
    '});',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 0)
})

test('fetch() and res.json() each produce an http-response finding', () => {
  const code = [
    'async function load(): Promise<void> {',
    '  const response = await fetch("https://example.com");',
    '  const data = await response.json();',
    '  console.log(data);',
    '}',
  ].join('\n')
  const findings = boundariesOf(code)
  // fetch() and .json() are two distinct sites by design (name-based heuristic).
  assert.equal(findings.length, 2)
  const messages = findings.map((f) => f.message)
  for (const message of messages) {
    assert.match(message, /HTTP response/)
    assert.match(message, /uncertain/)
  }
  assert.deepEqual(findings.map((f) => f.line).sort((a, b) => a - b), [2, 3])
})

test('amqplib-style channel.consume marks the msg parameter as a queue-payload boundary', () => {
  const code = [
    'channel.consume("tasks", (msg) => {',
    '  console.log(msg?.content.toString());',
    '});',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 1)
  const finding = first(findings)
  assert.equal(finding.rule, 'unvalidated-boundary')
  assert.equal(finding.severity, 'medium')
  assert.match(finding.message, /Queue message payload/)
  assert.equal(finding.line, 1)
})

test('KafkaJS-style run({ eachMessage }) marks the destructured message parameter', () => {
  const code = [
    'await consumer.run({',
    '  eachMessage: async ({ topic, partition, message }) => {',
    '    await db.insert(message);',
    '  },',
    '});',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 1)
  const finding = first(findings)
  assert.match(finding.message, /Queue message payload/)
  assert.equal(finding.line, 2)
})

test('clean typed code without external boundaries produces no findings', () => {
  const code = [
    'function add(a: number, b: number): number {',
    '  return a + b;',
    '}',
    'const total = add(1, 2);',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 0)
})

test('property accesses on non-request objects are not treated as request data', () => {
  const code = [
    'const user = getUser();',
    'const torso = user.body;',
    'const rest = user.query;',
  ].join('\n')
  const findings = boundariesOf(code)
  assert.equal(findings.length, 0)
})

test('analyzeProject counts request-data boundaries in project.runtimeBoundaries', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/server.ts': [
      'app.get("/", (req, res) => {',
      '  const name = req.body.name;',
      '  const age = req.body.age;',
      '  res.send(req.query.q);',
      '});',
      'app.post("/users", (req, res) => {',
      '  const user = schema.parse(req.body);',
      '  res.json(user);',
      '});',
    ].join('\n'),
  })
  try {
    const { project, findings } = analyze(dir)
    // req.body (one grouped finding) + req.query = 2; schema.parse(req.body) is validated.
    assert.equal(project.runtimeBoundaries, 2)
    const boundary = findings.filter((f) => f.rule === 'unvalidated-boundary')
    assert.equal(boundary.length, 2)
    const firstBoundary = first(boundary)
    assert.equal(firstBoundary.file, path.join(dir, 'src/server.ts'))
    assert.equal(firstBoundary.severity, 'medium')
    assert.match(firstBoundary.message, /uncertain/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('analyzeProject counts http-response and queue-payload boundaries', () => {
  const dir = makeProject(tmpdir(), { compilerOptions: { strict: true } }, {
    'src/worker.ts': [
      'async function poll(): Promise<void> {',
      '  const response = await fetch("https://example.com/api");',
      '  const data = await response.json();',
      '  console.log(data);',
      '}',
      'channel.consume("tasks", (msg) => {',
      '  console.log(msg);',
      '});',
    ].join('\n'),
  })
  try {
    const { project, findings } = analyze(dir)
    // fetch() + response.json() + msg parameter = 3.
    assert.equal(project.runtimeBoundaries, 3)
    const boundary = findings.filter((f) => f.rule === 'unvalidated-boundary')
    assert.equal(boundary.length, 3)
    assert.equal(boundary.filter((f) => f.message.includes('HTTP response')).length, 2)
    assert.equal(boundary.filter((f) => f.message.includes('Queue message payload')).length, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
