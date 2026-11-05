import { readFileSync } from 'node:fs'

import type { AnalysisResult } from './analyzer.ts'
import type { Finding } from './findings.ts'
import { SCHEMA_VERSION } from '../reports/schema.ts'

export interface BaselineData {
  metrics: { typeCoverage: number | null }
  findings: Finding[]
}

export type BaselineResult = { ok: true; data: BaselineData } | { ok: false; message: string }

/**
 * Load a baseline produced by a previous `typescope scan --format json`
 * (redirected to a file). Only the fields needed for comparison are read;
 * the schema version is validated.
 */
export function loadBaseline(file: string): BaselineResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'))
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, message: `cannot read baseline ${file}: ${message}` }
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, message: `baseline ${file} is not a JSON object` }
  }
  const record = parsed as Record<string, unknown>
  if (record['schemaVersion'] !== SCHEMA_VERSION) {
    return {
      ok: false,
      message: `baseline ${file} has schemaVersion ${String(record['schemaVersion'])}, expected ${SCHEMA_VERSION}. Re-generate the baseline with the same typescope version.`,
    }
  }
  const metrics = record['metrics']
  const findings = record['findings']
  if (typeof metrics !== 'object' || metrics === null || !Array.isArray(findings)) {
    return { ok: false, message: `baseline ${file} does not look like a typescope JSON report (missing metrics/findings)` }
  }
  const coverage = (metrics as Record<string, unknown>)['typeCoverage']
  if (coverage !== null && typeof coverage !== 'number') {
    return { ok: false, message: `baseline ${file} has an invalid metrics.typeCoverage` }
  }
  return { ok: true, data: { metrics: { typeCoverage: coverage as number | null }, findings: findings as Finding[] } }
}

export interface BaselineComparison {
  coverageBefore: number | null
  coverageAfter: number | null
  /** New coverage minus baseline coverage, in percentage points. null when either side is null. */
  coverageDelta: number | null
  newFindings: Finding[]
  resolvedFindings: number
  /** True when coverage dropped or new findings appeared. */
  regressed: boolean
}

function findingKey(f: Finding): string {
  return `${f.file}:${f.line}:${f.column}:${f.rule}`
}

/** Compare an analysis against a baseline: coverage delta and findings that
 *  appeared (new) or disappeared (resolved). Keyed on file:line:column:rule,
 *  so moved code shows up as new findings — a known, documented imprecision. */
export function compareBaseline(baseline: BaselineData, analysis: AnalysisResult): BaselineComparison {
  const before = baseline.metrics.typeCoverage
  const after = analysis.project.typeCoverage
  const baseKeys = new Set(baseline.findings.map(findingKey))
  const nextKeys = new Set(analysis.findings.map(findingKey))
  const newFindings = analysis.findings.filter((f) => !baseKeys.has(findingKey(f)))
  const resolvedFindings = baseline.findings.filter((f) => !nextKeys.has(findingKey(f))).length
  const coverageDelta =
    before === null || after === null ? null : Math.round((after - before) * 10000) / 100
  return {
    coverageBefore: before,
    coverageAfter: after,
    coverageDelta,
    newFindings,
    resolvedFindings,
    regressed: (before !== null && after !== null && after < before) || newFindings.length > 0,
  }
}
