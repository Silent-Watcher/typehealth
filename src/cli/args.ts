export type OutputFormat = 'terminal' | 'json' | 'html'

export interface CliError {
  readonly kind: 'error'
  readonly message: string
}

export interface HelpRequest {
  readonly kind: 'help'
  readonly command?: 'scan'
}

export interface VersionRequest {
  readonly kind: 'version'
}

export interface ScanRequest {
  readonly kind: 'scan'
  readonly format: OutputFormat
  readonly cwd: string
  readonly config?: string
  readonly color: boolean
}

export type ParseResult = ScanRequest | HelpRequest | VersionRequest | CliError

function error(message: string): CliError {
  return { kind: 'error', message }
}

/** Split `--option=value` into two argv entries so the parser has one loop. */
function splitAssignments(argv: readonly string[]): string[] {
  const args: string[] = []
  for (const arg of argv) {
    const eq = arg.indexOf('=')
    if (arg.startsWith('--') && eq > 2) {
      args.push(arg.slice(0, eq), arg.slice(eq + 1))
    } else {
      args.push(arg)
    }
  }
  return args
}

export function parseArgs(argv: readonly string[]): ParseResult {
  const first = argv[0]
  if (first === undefined) return { kind: 'help' }
  if (first === '--help') return { kind: 'help' }
  if (first === '--version') return { kind: 'version' }
  if (first === 'scan') return parseScanArgs(argv.slice(1))
  return error(`Unknown command: ${first}. Run "typescope --help" for usage.`)
}

function parseScanArgs(argv: readonly string[]): ParseResult {
  const args = splitAssignments(argv)
  let format: OutputFormat = 'terminal'
  let cwd = '.'
  let config: string | undefined
  let color = true

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--help':
        return { kind: 'help', command: 'scan' }
      case '--no-color':
        color = false
        break
      case '--format':
      case '--cwd':
      case '--config': {
        const value = args[++i]
        if (value === undefined) return error(`Missing value for ${arg}.`)
        if (arg === '--format') {
          if (value !== 'terminal' && value !== 'json' && value !== 'html') {
            return error(`Invalid --format value: ${value}. Expected terminal, json or html.`)
          }
          format = value
        } else if (arg === '--cwd') {
          cwd = value
        } else {
          config = value
        }
        break
      }
      default:
        return error(`Unknown option: ${arg}. Run "typescope scan --help" for usage.`)
    }
  }
  return { kind: 'scan', format, cwd, config, color }
}
