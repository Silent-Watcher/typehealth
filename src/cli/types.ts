export type OutputFormat = 'terminal' | 'json' | 'html'

/** Validated options for the scan command, as produced by the CLI parser. */
export interface ScanRequest {
  readonly format: OutputFormat
  readonly cwd: string
  readonly config?: string
  readonly color: boolean
}
