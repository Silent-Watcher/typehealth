#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { parseArgs } from './args.ts'
import { runScan } from './commands/scan.ts'
import { name, version } from '../index.ts'

const USAGE = `Usage: typescope [command] [options]

Commands:
  scan        Analyze a TypeScript project's type safety

Options:
  --version   Print the version
  --help      Print this help

Run "typescope scan --help" for scan options.`

const SCAN_USAGE = `Usage: typescope scan [options]

Analyze a TypeScript project's type safety.

Options:
  --format <terminal|json|html>  Output format (default: terminal)
  --cwd <path>                   Project directory (default: current directory)
  --config <path>                Path to tsconfig.json (default: <cwd>/tsconfig.json)
  --no-color                     Disable colored output
  --help                         Print this help

Exit codes:
  0  Scan completed
  1  Unexpected error
  2  Usage or configuration error`

export function main(argv: readonly string[], stdout = process.stdout): number {
  const result = parseArgs(argv)
  switch (result.kind) {
    case 'help':
      stdout.write((result.command === 'scan' ? SCAN_USAGE : USAGE) + '\n')
      return 0
    case 'version':
      stdout.write(`${name} v${version}\n`)
      return 0
    case 'error':
      console.error(`typescope: ${result.message}`)
      return 2
    case 'scan':
      return runScan(result, stdout)
  }
}

// Only run when executed directly, not when imported by tests.
function isEntry(): boolean {
  try {
    const self = realpathSync(fileURLToPath(import.meta.url))
    return process.argv[1] !== undefined && realpathSync(process.argv[1]) === self
  } catch {
    return false
  }
}
if (isEntry()) {
  process.exit(main(process.argv.slice(2)))
}
