import type { AnalysisResult } from '../core/analyzer.ts'
import { SEVERITY_ORDER, type Finding } from '../core/findings.ts'
import { name, version } from '../index.ts'
import type { ReportInput } from './json.ts'

/** Version of the Markdown report format. Bump on any breaking shape change. */
export const MARKDOWN_FORMAT_VERSION = 1

const HEADING_LEVEL = '##'

/** Escape a source-derived string so it cannot alter the Markdown structure:
 *  no cell breaks, no code-span toggles, no raw HTML tags, no line breaks. */
export function escapeMarkdown(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\|/g, '\\|')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r\n|\n|\r/g, '\\n')
}

/** Repository-relative path when the file lives inside the analyzed project. */
function displayPath(file: string, projectDir: string): string {
  const prefix = projectDir.endsWith('/') ? projectDir : `${projectDir}/`
  return file.startsWith(prefix) ? file.slice(prefix.length) : file
}

/** Severity-descending, then the same (file, line, column, rule) order the
 *  analyzer guarantees. Returns a new array; the input is left untouched. */
function findingsBySeverity(findings: Finding[]): Finding[] {
  return [...findings].sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity) ||
      a.file.localeCompare(b.file) ||
      a.line - b.line ||
      a.column - b.column ||
      a.rule.localeCompare(b.rule),
  )
}

function metricRow(label: string, value: number | null): string {
  return `| ${label} | ${value === null ? 'n/a' : String(value)} |`
}

/** Render the AI-optimized Markdown report (newline-terminated, deterministic,
 *  no ANSI codes, no truncation). Optimized for machine consumption: stable
 *  headings, compact tables, severity-ordered findings. */
export function renderMarkdownReport(input: ReportInput): string {
  const { analysis, projectDir, configPath } = input
  const project = analysis.project
  const lines: string[] = []

  lines.push('# TypeHealth Report', '')
  lines.push(`${HEADING_LEVEL} Project Context`, '')
  lines.push(`- Tool: ${name} v${version}`)
  lines.push(`- Report format: markdown v${MARKDOWN_FORMAT_VERSION}`)
  lines.push(`- Project root: ${escapeMarkdown(projectDir)}`)
  lines.push(`- TypeScript config: ${escapeMarkdown(configPath)}`)
  lines.push(`- Files analyzed: ${project.files}`)
  lines.push('')

  lines.push(`${HEADING_LEVEL} Executive Summary`, '')
  const coverage = project.typeCoverage
  const coverageText =
    coverage === null
      ? 'n/a (no eligible positions)'
      : `${(coverage * 100).toFixed(1)}% (${project.typedPositions}/${project.eligiblePositions} eligible positions)`
  lines.push(`- Type coverage: ${coverageText}`)
  const counts = new Map<string, number>()
  for (const finding of analysis.findings) {
    counts.set(finding.severity, (counts.get(finding.severity) ?? 0) + 1)
  }
  const total = analysis.findings.length
  const breakdown = SEVERITY_ORDER.map((s) => `${s}: ${counts.get(s) ?? 0}`).join(', ')
  lines.push(`- Findings: ${total} total (${breakdown})`)
  lines.push('- Limitations: runtimeBoundaries is a heuristic estimate of unvalidated external data, not a taint analysis; file-skipped findings mark files excluded from analysis.')
  lines.push('')

  lines.push(`${HEADING_LEVEL} Metrics`, '')
  lines.push('| Metric | Value |', '| --- | --- |')
  lines.push(metricRow('typeCoverage', coverage === null ? null : Math.round(coverage * 1000) / 1000))
  lines.push(metricRow('eligiblePositions', project.eligiblePositions))
  lines.push(metricRow('typedPositions', project.typedPositions))
  lines.push(metricRow('explicitAny', project.explicitAny))
  lines.push(metricRow('implicitAny', project.implicitAny))
  lines.push(metricRow('unsafeAssertions', project.unsafeAssertions))
  lines.push(metricRow('nonNullAssertions', project.nonNullAssertions))
  lines.push(metricRow('suppressions', project.suppressions))
  lines.push(metricRow('runtimeBoundaries', project.runtimeBoundaries))
  lines.push(metricRow('weakStrictnessFlags', project.weakStrictnessFlags))
  lines.push('')

  lines.push(`${HEADING_LEVEL} File Health`, '')
  if (analysis.files.length > 0) {
    lines.push('| File | Coverage | Eligible | Typed | Explicit any | Implicit any | Unsafe assertions | Non-null assertions | Suppressions | Runtime boundaries |', '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
    for (const file of analysis.files) {
      const cells = [
        escapeMarkdown(displayPath(file.file, projectDir)),
        file.typeCoverage === null ? 'n/a' : `${(file.typeCoverage * 100).toFixed(1)}%`,
        String(file.eligiblePositions),
        String(file.typedPositions),
        String(file.explicitAny),
        String(file.implicitAny),
        String(file.unsafeAssertions),
        String(file.nonNullAssertions),
        String(file.suppressions),
        String(file.runtimeBoundaries),
      ]
      lines.push(`| ${cells.join(' | ')} |`)
    }
  } else {
    lines.push('No files were analyzed.')
  }
  lines.push('')

  lines.push(`${HEADING_LEVEL} Findings`, '')
  const ordered = findingsBySeverity(analysis.findings)
  if (ordered.length > 0) {
    for (const finding of ordered) {
      const where = `${displayPath(finding.file, projectDir)}:${finding.line}:${finding.column}`
      lines.push(`- [${finding.severity.toUpperCase()}] ${escapeMarkdown(where)} ${escapeMarkdown(finding.rule)}: ${escapeMarkdown(finding.message)}`)
    }
  } else {
    lines.push('No findings. Type system looks clean.')
  }
  lines.push('')

  lines.push(`${HEADING_LEVEL} Recommended Investigation Areas`, '')
  if (ordered.length > 0) {
    const top = ordered.slice(0, 5)
    for (const finding of top) {
      lines.push(`- ${escapeMarkdown(displayPath(finding.file, projectDir))}:${finding.line} (${finding.severity}, ${finding.rule})`)
    }
  } else {
    lines.push('None. No findings to investigate.')
  }
  lines.push('')

  return lines.join('\n')
}
