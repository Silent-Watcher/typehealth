import { name, version } from '../index.ts'
import type { AnalysisResult } from '../core/analyzer.ts'
import { METRIC_DEFINITIONS, SCHEMA_VERSION } from './schema.ts'

export interface ReportInput {
  analysis: AnalysisResult
  projectDir: string
  configPath: string
}

/** Build the report data structure. Arrays arrive already deterministically
 *  ordered from the analyzer (files and findings sorted); JSON.stringify
 *  preserves key insertion order, so the output is deterministic apart from
 *  the measured durationMs. */
export function buildJsonReport(input: ReportInput): Record<string, unknown> {
  const { analysis, projectDir, configPath } = input
  return {
    schemaVersion: SCHEMA_VERSION,
    tool: { name, version },
    project: {
      directory: projectDir,
      configPath,
      durationMs: Math.round(analysis.durationMs),
      files: analysis.project.files,
    },
    metrics: {
      typeCoverage: analysis.project.typeCoverage,
      eligiblePositions: analysis.project.eligiblePositions,
      typedPositions: analysis.project.typedPositions,
      explicitAny: analysis.project.explicitAny,
      implicitAny: analysis.project.implicitAny,
      unsafeAssertions: analysis.project.unsafeAssertions,
      nonNullAssertions: analysis.project.nonNullAssertions,
      suppressions: analysis.project.suppressions,
      runtimeBoundaries: analysis.project.runtimeBoundaries,
      weakStrictnessFlags: analysis.project.weakStrictnessFlags,
    },
    files: analysis.files,
    findings: analysis.findings,
    metricDefinitions: METRIC_DEFINITIONS,
  }
}

export function serializeJsonReport(input: ReportInput): string {
  return JSON.stringify(buildJsonReport(input), null, 2) + '\n'
}
