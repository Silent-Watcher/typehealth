import path from 'node:path'
import { statSync } from 'node:fs'

import type { ScanRequest } from '../args.ts'
import { colorize, supportsColor } from '../../utils/colors.ts'
import { name, version } from '../../index.ts'

/**
 * Run the scan command. Returns a process exit code.
 * Path validation here; actual project discovery lands in Phase 3.
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

  let configPath: string
  if (request.config !== undefined) {
    configPath = path.resolve(request.config)
    if (!isFile(configPath)) {
      console.error(`typescope: tsconfig not found: ${configPath}`)
      return 2
    }
  } else {
    // Default discovery (tsconfig search) is implemented in Phase 3.
    configPath = path.join(projectDir, 'tsconfig.json')
  }

  const color = request.color && supportsColor(stdout)
  const dim = (text: string) => colorize(text, 'gray', color)

  console.log(colorize(`${name} v${version}`, 'bold', color))
  console.log()
  console.log(`${colorize('Project', 'cyan', color)} ${projectDir}`)
  console.log(`${colorize('Config', 'cyan', color)}  ${configPath}${request.config === undefined ? dim(' (default)') : ''}`)
  console.log(`${colorize('Format', 'cyan', color)} ${request.format}`)
  console.log()
  console.log('Analysis is not implemented yet (expected in Phase 3).')
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
