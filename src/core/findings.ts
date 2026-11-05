export type Severity = 'info' | 'low' | 'medium' | 'high' | 'critical'

export const SEVERITY_ORDER: readonly Severity[] = ['info', 'low', 'medium', 'high', 'critical']

export interface Finding {
  /** Absolute path of the analyzed file, or the tsconfig path for config-level findings. */
  file: string
  line: number
  column: number
  /** Stable rule identifier, e.g. "explicit-any". */
  rule: string
  severity: Severity
  message: string
}

/** Deduplicate and order findings deterministically (file, line, column, rule). */
export function normalizeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  const unique: Finding[] = []
  for (const finding of findings) {
    const key = `${finding.file}:${finding.line}:${finding.column}:${finding.rule}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(finding)
  }
  return unique.sort((a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule),
  )
}
