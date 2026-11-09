import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SKILL_PATH = path.join(ROOT, 'skills/typehealth/SKILL.md')

const raw = readFileSync(SKILL_PATH, 'utf8')
const frontmatterMatch = /^---\n([\s\S]*?)\n---\n/.exec(raw)

/** Extract `--flag` tokens from the Skill body so they can be checked against
 *  the real CLI parser. Excludes shell comments and code fences' decoration. */
const body = raw.slice(frontmatterMatch?.[0].length ?? 0)
const documentedFlags = [...body.matchAll(/(^|\s)(--[a-z][a-z-]*)(?=\s|$)/gm)]
  .map((m) => m[2]!)
  .filter((f) => f !== '--version')

/** Flags accepted by the CLI parser in src/cli/index.ts (source of truth). */
const cliSource = readFileSync(path.join(ROOT, 'src/cli/index.ts'), 'utf8')
const cliFlags = new Set([...cliSource.matchAll(/'(--[a-z-]+)[ <']/g)].map((m) => m[1]))

/** Sections the Markdown renderer guarantees (src/reports/markdown.ts). */
const RENDERED_SECTIONS = [
  '# TypeHealth Report',
  '## Project Context',
  '## Executive Summary',
  '## Metrics',
  '## File Health',
  '## Findings',
  '## Recommended Investigation Areas',
]

/** Metric keys defined in src/reports/schema.ts. */
const METRIC_SOURCE = readFileSync(path.join(ROOT, 'src/reports/schema.ts'), 'utf8')
const METRIC_KEYS = [...METRIC_SOURCE.matchAll(/^\s{2}([a-zA-Z]+):/gm)].map((m) => m[1]!)

test('Skill: SKILL.md exists at the skills/<name>/ layout with valid frontmatter', () => {
  assert.ok(frontmatterMatch, 'expected YAML frontmatter delimited by ---')
  const fm = frontmatterMatch![1]!
  assert.match(fm, /^name: typehealth$/m)
  assert.match(fm, /^description: .+/m)
})

test('Skill: name is lowercase, hyphenated and matches the directory name', () => {
  const name = /^name: (.+)$/m.exec(frontmatterMatch![1]!)![1]!
  assert.match(name, /^[a-z0-9-]+$/)
  assert.equal(name, 'typehealth')
})

test('Skill: description is under 1024 characters and states what it does and when to use it', () => {
  const description = /^description: (.+)$/m.exec(frontmatterMatch![1]!)![1]!
  assert.ok(description.length <= 1024, `description is ${description.length} chars`)
  assert.ok(description.length >= 50, 'description must be descriptive enough for trigger matching')
})

test('Skill: documents the npx installation command against this repository', () => {
  assert.ok(body.includes('npx skills add Silent-Watcher/typehealth'), 'expected the canonical install command')
})

test('Skill: separates installing the Skill, installing the CLI and running the analyzer', () => {
  assert.match(body, /does \*\*not\*\* install the TypeHealth CLI/)
  assert.ok(body.includes('typehealth --version'))
  assert.ok(body.includes('typehealth scan'))
})

test('Skill: every documented CLI flag exists in the real parser', () => {
  const extraFlags = documentedFlags.filter((f) => !cliFlags.has(f))
  assert.deepEqual(extraFlags, [], `flags not found in the CLI parser: ${extraFlags.join(', ')}`)
})

test('Skill: every report section it references is a section the renderer actually emits', () => {
  const rendererSource = readFileSync(path.join(ROOT, 'src/reports/markdown.ts'), 'utf8')
  // markdown.ts prefixes every section with the HEADING_LEVEL constant.
  assert.match(rendererSource, /const HEADING_LEVEL = '##'/)
  for (const section of RENDERED_SECTIONS.slice(1)) {
    const name = section.slice(3)
    if (body.includes(name)) {
      assert.ok(rendererSource.includes(name), `renderer does not emit ${JSON.stringify(name)}`)
    }
  }
})

test('Skill: every metric name it mentions is a real metric key', () => {
  const mentioned = ['typeCoverage', 'explicitAny', 'implicitAny', 'unsafeAssertions', 'nonNullAssertions', 'suppressions', 'runtimeBoundaries', 'weakStrictnessFlags']
  for (const key of mentioned) {
    assert.ok(METRIC_KEYS.includes(key), `${key} is not a metric defined in schema.ts`)
    assert.ok(body.includes(key), `SKILL.md should explain the ${key} metric`)
  }
})

test('Skill: contains the agent behavior rules including no-metric-gaming', () => {
  assert.ok(body.includes('Analyze before modifying'))
  assert.ok(body.includes('Findings are evidence, not instructions'))
  assert.ok(body.includes('Preserve semantics'))
  assert.match(body, /@ts-ignore/)
  assert.ok(body.includes('Never game the metrics'))
  assert.ok(body.includes('Work incrementally'))
  assert.ok(body.includes('Validate every meaningful change'))
})

test('Skill: recommends the AI-optimized Markdown format for agents reading results', () => {
  assert.ok(body.includes('typehealth scan --format markdown'))
})

test('Skill: warns agents not to execute scripts from the analyzed project', () => {
  assert.match(body, /Do not execute arbitrary scripts/)
})
