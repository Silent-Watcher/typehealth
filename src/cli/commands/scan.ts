import path from 'node:path'
import { statSync, writeFileSync } from 'node:fs'

import type { ScanRequest } from '../types.ts'
import { loadProject } from '../../core/project.ts'
import { analyzeProject } from '../../core/analyzer.ts'
import { getChangedFiles } from '../../core/git.ts'
import { compareBaseline, loadBaseline } from '../../core/baseline.ts'
import { renderTerminalReport } from '../../reports/terminal.ts'
import { serializeJsonReport } from '../../reports/json.ts'
import { renderMarkdownReport } from '../../reports/markdown.ts'
import { renderHtmlReport } from '../../reports/html.ts'
import { supportsColor } from '../../utils/colors.ts'

/**
 * Run the scan command. Returns a process exit code.
 * Analysis itself lands in Phase 4; this phase reports discovery results.
 */
export function runScan(request: ScanRequest, stdout = process.stdout): number {
  const projectDir = path.resolve(request.cwd)
  if (!isDirectory(projectDir)) {
    console.error(`typehealth: project directory does not exist: ${projectDir}`)
    return 2
  }

  const configPath = request.config !== undefined ? path.resolve(request.config) : undefined
  if (configPath !== undefined && !isFile(configPath)) {
    console.error(`typehealth: tsconfig not found: ${configPath}`)
    return 2
  }

  const result = loadProject({ projectDir, configPath })
  if (!result.ok) {
    console.error(`typehealth: ${result.message}`)
    return 2
  }

  let scoped = result
  let changedFiles: number | undefined
  if (request.changed !== undefined) {
    const ref = typeof request.changed === 'string' ? request.changed : undefined
    const changed = getChangedFiles(result.projectDir, ref)
    if (!changed.ok) {
      console.error(`typehealth: ${changed.message}`)
      return 2
    }
    const changedSet = new Set(changed.files)
    scoped = { ...result, fileNames: result.fileNames.filter((f) => changedSet.has(f)) }
    changedFiles = scoped.fileNames.length
  }
  const discoveredFiles = result.fileNames.length

  const analysis = analyzeProject(scoped)

  // CI gating: exit 1 on threshold miss or baseline regression, in any format.
  let exitCode = 0
  let baselineComparison: ReturnType<typeof compareBaseline> | undefined
  if (request.baseline !== undefined) {
    const baseline = loadBaseline(request.baseline)
    if (!baseline.ok) {
      console.error(`typehealth: ${baseline.message}`)
      return 2
    }
    baselineComparison = compareBaseline(baseline.data, analysis)
    if (baselineComparison.regressed) exitCode = 1
  }
  if (request.failUnder !== undefined) {
    const coverage = analysis.project.typeCoverage
    if (coverage !== null && coverage * 100 < request.failUnder) {
      exitCode = 1
    }
  }
  const color = request.color && supportsColor(stdout)
  const input = { analysis, projectDir: result.projectDir, configPath: result.configPath }

  if (request.format === 'json') {
    stdout.write(serializeJsonReport(input))
    return exitCode
  }

  if (request.format === 'markdown') {
    stdout.write(renderMarkdownReport(input))
    return exitCode
  }

  if (request.format === 'html') {
    // Written to the invoking user's cwd, never into the analyzed project.
    const outputPath = path.join(process.cwd(), 'typehealth-report.html')
    try {
      writeFileSync(outputPath, renderHtmlReport(input))
    } catch (error) {
      console.error(`typehealth: cannot write report to ${outputPath}: ${error instanceof Error ? error.message : error}`)
      return 2
    }
    stdout.write(`Report written to ${outputPath}\n`)
    return exitCode
  }

  stdout.write(
    renderTerminalReport(
      analysis,
      {
        projectDir: result.projectDir,
        configPath: result.configPath,
        changedFiles,
        discoveredFiles,
        baseline: baselineComparison,
      },
      color,
    ),
  )
  return exitCode
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
