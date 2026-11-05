import path from 'node:path'
import ts from 'typescript'

export interface LoadedProject {
  ok: true
  projectDir: string
  configPath: string
  compilerOptions: ts.CompilerOptions
  fileNames: string[]
}

export interface ProjectLoadError {
  ok: false
  message: string
}

export type LoadResult = LoadedProject | ProjectLoadError

/** Directories never analyzed unless a later phase adds opt-in handling. */
const DEFAULT_EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage'])

const DIAGNOSTIC_FORMAT_HOST: ts.FormatDiagnosticsHost = {
  getCurrentDirectory: () => process.cwd(),
  getCanonicalFileName: (f) => f,
  getNewLine: () => '\n',
}

/**
 * Discover and load a TypeScript project: resolve tsconfig, parse compiler
 * options and list analyzable source files via the TypeScript Compiler API.
 * File discovery is restricted to the project directory.
 */
export function loadProject(options: { projectDir: string; configPath?: string }): LoadResult {
  const projectDir = path.resolve(options.projectDir)
  const configPath =
    options.configPath ?? ts.findConfigFile(projectDir, ts.sys.fileExists, 'tsconfig.json')
  if (configPath === undefined) {
    return {
      ok: false,
      message: `No tsconfig.json found in ${projectDir}. Pass --config to point at one.`,
    }
  }

  const read = ts.readConfigFile(configPath, ts.sys.readFile)
  if (read.error !== undefined) {
    return { ok: false, message: ts.formatDiagnostics([read.error], DIAGNOSTIC_FORMAT_HOST).trim() }
  }

  const parsed = ts.parseJsonConfigFileContent(
    read.config ?? {},
    ts.sys,
    path.dirname(configPath),
    /*existingOptions*/ undefined,
    configPath,
  )
  // Code 18003 ("no inputs were found") is treated as an empty project, not a config error.
  const errors = parsed.errors.filter(
    (d) => d.category === ts.DiagnosticCategory.Error && d.code !== 18003,
  )
  if (errors.length > 0) {
    return { ok: false, message: ts.formatDiagnostics(errors, DIAGNOSTIC_FORMAT_HOST).trim() }
  }

  const fileNames = parsed.fileNames.map((f) => path.resolve(f)).filter((f) => isAnalyzable(f, projectDir))
  return { ok: true, projectDir, configPath, compilerOptions: parsed.options, fileNames }
}

function isAnalyzable(file: string, projectDir: string): boolean {
  if (file.endsWith('.d.ts')) return false
  // Restrict discovery to the project scope.
  const rel = path.relative(projectDir, file)
  if (rel === '' || path.isAbsolute(rel) || rel.startsWith('..')) return false
  return !rel.split(path.sep).some((segment) => DEFAULT_EXCLUDED_DIRS.has(segment))
}
