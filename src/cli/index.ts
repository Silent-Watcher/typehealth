#!/usr/bin/env node
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { Command, CommanderError, Option } from 'commander'

import { runScan } from './commands/scan.ts'
import { name, version } from '../index.ts'

export function main(argv: readonly string[], stdout = process.stdout): number {
  let exitCode = 0
  const program = new Command()
  program
    .name(name)
    .description('Lightweight TypeScript type safety analyzer')
    .version(`${name} v${version}`, '--version')
    .exitOverride()

  program
    .command('scan')
    .description("Analyze a TypeScript project's type safety")
    .addOption(
      new Option('--format <format>', 'Output format')
        .choices(['terminal', 'json', 'html'])
        .default('terminal'),
    )
    .option('--cwd <path>', 'Project directory to analyze', '.')
    .option('--config <path>', 'Path to tsconfig.json')
    .option('--no-color', 'Disable colored output')
    .action((opts) => {
      exitCode = runScan(opts, stdout)
    })

  try {
    program.parse(argv, { from: 'user' })
  } catch (err) {
    if (err instanceof CommanderError) {
      const isHelpOrVersion = err.code === 'commander.helpDisplayed' || err.code === 'commander.version'
      return isHelpOrVersion ? 0 : 2
    }
    throw err
  }
  return exitCode
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
