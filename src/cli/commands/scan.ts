import path from 'node:path'
import { statSync } from 'node:fs'

import type { ScanRequest } from '../types.ts'
import { loadProject } from '../../core/project.ts'
import { analyzeProject } from '../../core/analyzer.ts'
import { colorize, supportsColor } from '../../utils/colors.ts'
import { name, version } from '../../index.ts'

/**
 * Run the scan command. Returns a process exit code.
 * Analysis itself lands in Phase 4; this phase reports discovery results.
 */
export function runScan(request: ScanRequest, stdout = process.stdout): number {
  if (request.format !== 'terminal') {
    console.error(`typescope: --format ${request.format} is not implemented yet (expected in Phase 7)`)
    return 2
  }

  const projectDir = path.resolve(request.cwd)
  if (!isDirectory(projectDir)) {
    console.error(`typescope: project directory does not exist: ${projectDir}`)
    return 2
  }

  const configPath = request.config !== undefined ? path.resolve(request.config) : undefined
  if (configPath !== undefined && !isFile(configPath)) {
    console.error(`typescope: tsconfig not found: ${configPath}`)
    return 2
  }

  const result = loadProject({ projectDir, configPath })
  if (!result.ok) {
    console.error(`typescope: ${result.message}`)
    return 2
  }

  const analysis = analyzeProject(result)
  const color = request.color && supportsColor(stdout)
  const dim = (text: string) => colorize(text, 'gray', color)

  console.log(colorize(`${name} v${version}`, 'bold', color))
  console.log()
  console.log(`${colorize('Project', 'cyan', color)} ${result.projectDir}`)
  console.log(`${colorize('Config', 'cyan', color)}  ${result.configPath}${request.config === undefined ? dim(' (default)') : ''}`)
  console.log(`${colorize('Files', 'cyan', color)}   ${result.fileNames.length}`)
  console.log()
  const coverage = analysis.project.typeCoverage
  const coverageText = coverage === null ? 'n/a' : `${(coverage * 100).toFixed(1)}%`
  const coverageColor = coverage === null ? 'gray' : coverage >= 0.8 ? 'green' : coverage >= 0.5 ? 'yellow' : 'red'
  console.log(`${colorize('TYPE COVERAGE', 'bold', color)} ${colorize(coverageText, coverageColor, color)} ${dim(`${analysis.project.eligiblePositions} positions`)}`)
  console.log(`${colorize('Explicit any', 'cyan', color)}        ${analysis.project.explicitAny}`)
  console.log(`${colorize('Implicit any', 'cyan', color)}        ${analysis.project.implicitAny}`)
  console.log(`${colorize('Unsafe assertions', 'cyan', color)}   ${analysis.project.unsafeAssertions}`)
  console.log(`${colorize('Non-null assertions', 'cyan', color)} ${analysis.project.nonNullAssertions}`)
  console.log(`${colorize('Suppressions', 'cyan', color)}        ${analysis.project.suppressions}`)
  console.log(`${colorize('Weak strictness flags', 'cyan', color)} ${analysis.project.weakStrictnessFlags}`)
  console.log(`${colorize('Findings', 'cyan', color)}            ${analysis.findings.length}`)
  console.log(`${colorize('Duration', 'cyan', color)}            ${(analysis.durationMs / 1000).toFixed(2)}s`)
  return 0
}

function isDirectory(p: string): boolean {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

function isFile(p: string): boolean {
  try {
    return statSync(p).isFile()
  } catch {
    return false
  }
}
