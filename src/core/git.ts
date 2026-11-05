import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { realpathSync } from 'node:fs'

export type GitChangedResult = { ok: true; files: string[] } | { ok: false; message: string }

function git(projectDir: string, args: string[]): string {
  return execFileSync('git', ['-C', projectDir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
}

/**
 * Files changed in the project's git repository: against a reference
 * (`git diff --name-only <ref>`) or uncommitted (diff vs HEAD plus
 * untracked files). Absolute paths, restricted to files that still exist.
 * The git reference is validated before use.
 */
export function getChangedFiles(projectDir: string, ref?: string): GitChangedResult {
  try {
    git(projectDir, ['rev-parse', '--is-inside-work-tree'])
    const toplevel = git(projectDir, ['rev-parse', '--show-toplevel']).trim()
    if (ref !== undefined) {
      // Validate the reference first so failures are actionable.
      try {
        git(projectDir, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`])
      } catch {
        return { ok: false, message: `invalid git reference: ${ref}` }
      }
      return { ok: true, files: collect(toplevel, git(projectDir, ['diff', '--name-only', ref, '--', '.'])) }
    }
    let head: string
    try {
      head = git(projectDir, ['rev-parse', '--verify', '--quiet', 'HEAD'])
    } catch {
      return { ok: false, message: 'repository has no commits yet; --changed needs at least one commit' }
    }
    const diff = git(projectDir, ['diff', '--name-only', head.trim(), '--', '.'])
    const untracked = git(projectDir, ['ls-files', '--others', '--exclude-standard', '--', '.'])
    return { ok: true, files: collect(toplevel, diff, untracked) }
  } catch (error) {
    const message = error instanceof Error ? error.message.split('\n')[0] : String(error)
    return { ok: false, message: `git command failed: ${message}` }
  }
}

/** Convert repo-root-relative git output to existing absolute paths. */
function collect(toplevel: string, ...outputs: string[]): string[] {
  const files: string[] = []
  for (const output of outputs) {
    for (const line of output.split('\n')) {
      if (line.trim() === '') continue
      // Git output is relative to the repository root, not the cwd.
      const abs = path.resolve(toplevel, line)
      try {
        files.push(realpathSync(abs))
      } catch {
        // Deleted or vanished files cannot be analyzed — skip.
      }
    }
  }
  return files
}
