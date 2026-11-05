// Benchmark: generates a synthetic TypeScript project and measures
// discovery + analysis wall time. Run: node scripts/benchmark.ts [fileCount]
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

import { loadProject } from '../src/core/project.ts'
import { analyzeProject } from '../src/core/analyzer.ts'

function generateFile(index: number): string {
  const lines: string[] = [
    `import path from 'node:path'`,
    '',
    `export interface Item${index} { id: number; name: string; meta?: Record<string, unknown> }`,
    '',
    'export const config: { retries: number } = { retries: 3 }',
    'export const legacy: any = null',
    '',
  ]
  for (let i = 0; i < 15; i++) {
    lines.push(`export function compute${i}_${index}(input: Item${index}, factor: number): number {`)
    lines.push(`  const scaled = input.id * factor + ${i}`)
    lines.push(`  if (scaled > ${i * 100}) { return scaled - ${i} }`)
    lines.push(`  return path.sep.length + scaled`)
    lines.push(`}`)
    lines.push('')
  }
  lines.push(`export function parse(raw: string) { return JSON.parse(raw) as Record<string, unknown> }`)
  lines.push(`export const risky = null!`)
  lines.push('')
  return lines.join('\n')
}

const fileCount = Number(process.argv[2] ?? 300)
if (!Number.isInteger(fileCount) || fileCount <= 0) {
  console.error('usage: node scripts/benchmark.ts [fileCount]')
  process.exit(2)
}

const dir = mkdtempSync(path.join(tmpdir(), 'typehealth-bench-'))
try {
  mkdirSync(path.join(dir, 'src'), { recursive: true })
  writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, target: 'es2022' }, include: ['src/**/*.ts'] }))
  for (let i = 0; i < fileCount; i++) {
    writeFileSync(path.join(dir, `src/module${i}.ts`), generateFile(i))
  }

  const t0 = performance.now()
  const project = loadProject({ projectDir: dir })
  const t1 = performance.now()
  if (!project.ok) throw new Error(project.message)
  const analysis = analyzeProject(project)
  const t2 = performance.now()

  console.log(`files:            ${project.fileNames.length}`)
  console.log(`discovery:        ${(t1 - t0).toFixed(0)} ms`)
  console.log(`program+analysis: ${(t2 - t1).toFixed(0)} ms`)
  console.log(`total:            ${(t2 - t0).toFixed(0)} ms`)
  console.log(`throughput:       ${(project.fileNames.length / ((t2 - t0) / 1000)).toFixed(1)} files/s`)
  console.log(`coverage:         ${((analysis.project.typeCoverage ?? 0) * 100).toFixed(1)}% (${analysis.project.eligiblePositions} positions)`)
  console.log(`findings:         ${analysis.findings.length}`)
} finally {
  rmSync(dir, { recursive: true, force: true })
}
