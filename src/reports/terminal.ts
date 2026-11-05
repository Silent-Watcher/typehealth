import type { AnalysisResult, FileMetrics } from '../core/analyzer.ts'
import type { Finding, Severity } from '../core/findings.ts'
import { colorize, progressBar, type ColorName } from '../utils/colors.ts'

export interface ReportInfo {
  projectDir: string
  configPath: string
}

const SEVERITY_RANK: Record<Severity, number> = {
  info: 0,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

const SEVERITY_COLOR: Record<Severity, ColorName> = {
  info: 'gray',
  low: 'gray',
  medium: 'yellow',
  high: 'red',
  critical: 'red',
}

const MAX_FILE_HEALTH_ROWS = 5
const MAX_TOP_FINDINGS = 10
const BAR_WIDTH = 24
const FILE_BAR_WIDTH = 16

/** Render the full terminal report as a single string (newline-terminated).
 *  Static output only: no live-updating elements, safe for CI logs. */
export function renderTerminalReport(analysis: AnalysisResult, info: ReportInfo, color: boolean): string {
  const lines: string[] = []
  const c = (text: string, name: ColorName) => colorize(text, name, color)

  lines.push(...box(['TYPESCOPE', 'Type Safety Analyzer'], color))
  lines.push('')

  lines.push(`${c('Project', 'cyan')}  ${info.projectDir}`)
  lines.push(`${c('Config', 'cyan')}   ${info.configPath}`)
  lines.push(`${c('Files', 'cyan')}    ${analysis.project.files}`)
  lines.push(`${c('Duration', 'cyan')} ${(analysis.durationMs / 1000).toFixed(2)}s`)
  lines.push('')

  // Type coverage bar
  const coverage = analysis.project.typeCoverage
  const percentText = coverage === null ? 'n/a' : `${(coverage * 100).toFixed(1)}%`
  const coverageColor: ColorName = coverage === null ? 'gray' : coverage >= 0.8 ? 'green' : coverage >= 0.5 ? 'yellow' : 'red'
  const bar = coverage === null ? '░'.repeat(BAR_WIDTH) : progressBar(coverage, 1, BAR_WIDTH)
  lines.push(`${c('TYPE COVERAGE', 'bold')} ${c(bar, coverageColor)} ${c(percentText, coverageColor)} ${colorize(`(${analysis.project.eligiblePositions} positions)`, 'gray', color)}`)
  lines.push('')

  // Metrics
  lines.push(c('METRICS', 'bold'))
  const metricsRows: Array<[string, number]> = [
    ['Explicit any', analysis.project.explicitAny],
    ['Implicit any', analysis.project.implicitAny],
    ['Unsafe assertions', analysis.project.unsafeAssertions],
    ['Non-null assertions', analysis.project.nonNullAssertions],
    ['Suppressions', analysis.project.suppressions],
    ['Unvalidated boundaries', analysis.project.runtimeBoundaries],
    ['Weak strictness flags', analysis.project.weakStrictnessFlags],
  ]
  for (const [label, value] of metricsRows) {
    const valueText = value === 0 ? colorize('0', 'gray', color) : String(value)
    lines.push(`  ${c(label.padEnd(24), 'cyan')}${valueText}`)
  }
  lines.push('')

  // File health: worst files first
  const ranked = rankFiles(analysis.files)
  if (ranked.length > 0) {
    lines.push(c('FILE HEALTH', 'bold'))
    for (const file of ranked) {
      const ratio = file.typeCoverage ?? 0
      const name = shortenFileName(file.file, 30)
      const pct = `${(ratio * 100).toFixed(0)}%`
      const fileColor: ColorName = ratio >= 0.8 ? 'green' : ratio >= 0.5 ? 'yellow' : 'red'
      lines.push(`  ${name.padEnd(30)} ${c(progressBar(ratio, 1, FILE_BAR_WIDTH), fileColor)} ${c(pct, fileColor)}`)
    }
    lines.push('')
  }

  // Top findings
  const top = topFindings(analysis.findings)
  if (top.length > 0) {
    lines.push(c('TOP FINDINGS', 'bold'))
    for (const finding of top) {
      const tag = `[${finding.severity.toUpperCase()}]`
      lines.push(`  ${c(tag, SEVERITY_COLOR[finding.severity])} ${finding.file}:${finding.line} ${finding.message}`)
    }
    lines.push('')
  }

  lines.push(c('Analysis completed successfully.', 'green'))
  lines.push('')
  return lines.join('\n')
}

/** Worst files (lowest coverage) first; files without positions are excluded. */
function rankFiles(files: FileMetrics[]): FileMetrics[] {
  return files
    .filter((f) => f.typeCoverage !== null && f.eligiblePositions > 0)
    .sort((a, b) => (a.typeCoverage ?? 1) - (b.typeCoverage ?? 1) || a.file.localeCompare(b.file))
    .slice(0, MAX_FILE_HEALTH_ROWS)
}

function topFindings(findings: Finding[]): Finding[] {
  return [...findings]
    .sort(
      (a, b) =>
        SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
        a.file.localeCompare(b.file) ||
        a.line - b.line,
    )
    .slice(0, MAX_TOP_FINDINGS)
}

function shortenFileName(file: string, max: number): string {
  const base = file.split('/').slice(-2).join('/')
  if (base.length <= max) return base
  return '…' + base.slice(-(max - 1))
}

function box(lines: string[], color: boolean): string[] {
  const width = Math.max(...lines.map((l) => l.length)) + 2
  const border = '─'.repeat(width)
  const result = [`╭${border}╮`]
  lines.forEach((line, i) => {
    result.push(`│ ${colorize(line.padEnd(width - 2), i === 0 ? 'bold' : 'gray', color)} │`)
  })
  result.push(`╰${border}╯`)
  return result
}
