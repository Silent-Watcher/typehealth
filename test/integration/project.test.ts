import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'

import { loadProject } from '../../src/core/project.ts'

function makeDir(root: string, ...segments: string[]): string {
  const dir = path.join(root, ...segments)
  mkdirSync(dir, { recursive: true })
  return dir
}

function makeFile(root: string, relative: string, contents = ''): string {
  const file = path.join(root, relative)
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, contents)
  return file
}

interface SampleOptions {
  tsconfig?: object
  extraFiles?: string[]
}

function makeSampleProject(baseline: string, options: SampleOptions = {}): string {
  const dir = mkdtempSync(path.join(baseline, 'typehealth-sample-'))
  writeFileSync(
    path.join(dir, 'tsconfig.json'),
    JSON.stringify(options.tsconfig ?? {
      compilerOptions: { strict: true },
      include: ['src/**/*.ts'],
    }),
  )
  makeFile(dir, 'src/index.ts', 'export const a = 1\n')
  makeFile(dir, 'src/util.ts', 'export const b = 2\n')
  // Files that must never be analyzed:
  makeFile(dir, 'src/types.d.ts', 'declare const c: number\n')
  makeFile(dir, 'node_modules/dep/index.ts', 'export const d = 4\n')
  makeFile(dir, 'dist/bundle.ts', 'export const e = 5\n')
  for (const extra of options.extraFiles ?? []) makeFile(dir, extra)
  return dir
}

test('discovers source files and excludes d.ts, node_modules and dist', () => {
  const dir = makeSampleProject(tmpdir())
  try {
    const result = loadProject({ projectDir: dir })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.fileNames, [path.join(dir, 'src/index.ts'), path.join(dir, 'src/util.ts')])
    assert.equal(result.compilerOptions.strict, true)
    assert.equal(result.configPath, path.join(dir, 'tsconfig.json'))
    assert.equal(result.projectDir, dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('respects tsconfig include and exclude patterns', () => {
  const dir = makeSampleProject(tmpdir(), {
    tsconfig: {
      include: ['src/**/*.ts'],
      exclude: ['src/util.ts', 'src/ignored'],
    },
    extraFiles: ['src/ignored/secret.ts'],
  })
  try {
    const result = loadProject({ projectDir: dir })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.fileNames, [path.join(dir, 'src/index.ts')])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('missing tsconfig is an actionable error', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'typehealth-empty-'))
  try {
    const result = loadProject({ projectDir: dir })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.match(result.message, /No tsconfig\.json found/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('malformed tsconfig is an error with position info', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'typehealth-badconfig-'))
  try {
    writeFileSync(path.join(dir, 'tsconfig.json'), '{ not json ,,')
    const result = loadProject({ projectDir: dir })
    assert.equal(result.ok, false)
    if (result.ok) return
    assert.match(result.message, /tsconfig\.json/)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('files outside the project directory are filtered out', () => {
  const baseline = mkdtempSync(path.join(tmpdir(), 'typehealth-scope-'))
  try {
    const projectDir = makeDir(baseline, 'project')
    writeFileSync(
      path.join(projectDir, 'tsconfig.json'),
      JSON.stringify({ include: ['../outside/**/*.ts', 'src/**/*.ts'] }),
    )
    makeFile(baseline, 'outside/external.ts')
    makeFile(projectDir, 'src/inside.ts')
    const result = loadProject({ projectDir })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.fileNames, [path.join(projectDir, 'src/inside.ts')])
  } finally {
    rmSync(baseline, { recursive: true, force: true })
  }
})

test('explicit --config path is used instead of discovery', () => {
  const baseline = mkdtempSync(path.join(tmpdir(), 'typehealth-explicit-'))
  try {
    const projectDir = makeDir(baseline, 'project')
    const config = makeFile(baseline, 'configs/tsconfig.json', JSON.stringify({
      compilerOptions: { strict: true },
      include: ['../project/src/**/*.ts'],
    }))
    makeFile(projectDir, 'src/index.ts')
    const result = loadProject({ projectDir, configPath: config })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.equal(result.configPath, config)
  } finally {
    rmSync(baseline, { recursive: true, force: true })
  }
})

test('build and coverage directories are excluded by default', () => {
  const dir = makeSampleProject(tmpdir(), {
    tsconfig: { include: ['**/*.ts'] },
    extraFiles: ['build/out.ts', 'coverage/instrumented.ts'],
  })
  try {
    const result = loadProject({ projectDir: dir })
    assert.equal(result.ok, true)
    if (!result.ok) return
    assert.deepEqual(result.fileNames.sort(), [path.join(dir, 'src/index.ts'), path.join(dir, 'src/util.ts')])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
