import path from 'node:path'
import { realpathSync, statSync } from 'node:fs'
import ts from 'typescript'

export interface LoadedProject {
  ok: true
  projectDir: string
  configPath: string
  compilerOptions: ts.CompilerOptions
  /** Canonical (realpath) paths of files to analyze; each real file appears once. */
  fileNames: string[]
  /** In-scope candidates excluded from analysis, with the reason. */
  skippedFiles: SkippedFile[]
}

export interface SkippedFile {
  file: string
  reason: 'too-large' | 'outside-scope' | 'unreadable'
}

export interface ProjectLoadError {
  ok: false
  message: string
}

export type LoadResult = LoadedProject | ProjectLoadError

/** Directories never analyzed unless a later phase adds opt-in handling. */
const DEFAULT_EXCLUDED_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage'])

/** Files larger than this are skipped: they are almost always generated code,
 *  and parsing them dominates runtime and memory. Overridable need has not
 *  come up yet; revisit if it does. */
export const MAX_SOURCE_FILE_BYTES = 4 * 1024 * 1024

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

  const fileNames: string[] = []
  const skippedFiles: SkippedFile[] = []
  const seenRealPaths = new Set<string>()
  for (const name of parsed.fileNames) {
    const resolved = path.resolve(name)
    if (!isAnalyzable(resolved, projectDir)) continue
    // Canonicalize: symlinks resolve to their target so each real file is
    // analyzed exactly once, and targets outside the project directory are
    // excluded — the symlink path being in-scope must not smuggle outside
    // content into the scan.
    let real: string
    try {
      real = realpathSync(resolved)
    } catch {
      skippedFiles.push({ file: resolved, reason: 'unreadable' })
      continue
    }
    const rel = path.relative(projectDir, real)
    if (path.isAbsolute(rel) || rel.startsWith('..')) {
      skippedFiles.push({ file: resolved, reason: 'outside-scope' })
      continue
    }
    if (!seenRealPaths.add(real)) continue
    if (statSync(real).size > MAX_SOURCE_FILE_BYTES) {
      skippedFiles.push({ file: resolved, reason: 'too-large' })
      continue
    }
    fileNames.push(real)
  }
  return { ok: true, projectDir, configPath, compilerOptions: parsed.options, fileNames, skippedFiles }
}

function isAnalyzable(file: string, projectDir: string): boolean {
  if (file.endsWith('.d.ts')) return false
  // Restrict discovery to the project scope.
  const rel = path.relative(projectDir, file)
  if (rel === '' || path.isAbsolute(rel) || rel.startsWith('..')) return false
  return !rel.split(path.sep).some((segment) => DEFAULT_EXCLUDED_DIRS.has(segment))
}
