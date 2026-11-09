export type OutputFormat = 'terminal' | 'json' | 'html' | 'markdown'

/** Validated options for the scan command, as produced by the CLI parser. */
export interface ScanRequest {
  readonly format: OutputFormat
  readonly cwd: string
  readonly config?: string
  readonly color: boolean
  /** true = uncommitted changes; string = diff against that git reference. */
  readonly changed?: boolean | string
  /** Percentage 0-100; scan fails (exit 1) when coverage is below it. */
  readonly failUnder?: number
  /** Path to a previous JSON report used as baseline. */
  readonly baseline?: string
}
