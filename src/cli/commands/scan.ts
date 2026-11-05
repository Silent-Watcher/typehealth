import path from 'node:path'
import { statSync } from 'node:fs'

import type { ScanRequest } from '../types.ts'
import { loadProject } from '../../core/project.ts'
import { analyzeProject } from '../../core/analyzer.ts'
import { renderTerminalReport } from '../../reports/terminal.ts'
import { supportsColor } from '../../utils/colors.ts'

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

  stdout.write(renderTerminalReport(analysis, { projectDir: result.projectDir, configPath: result.configPath }, color))
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
