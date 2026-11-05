# Performance

Performance is part of the implementation, not a later cleanup. The rules: benchmark before optimizing, document real numbers, never add speculative caching or parallelism.

## Current design choices (already performance-driven)

- **One `ts.Program` and one type checker per scan** — files are parsed once, reused by every rule.
- **One AST walk per file** for all core rules; a separate lightweight pass handles boundary heuristics.
- **Scope filtering before analysis** — `node_modules`, `dist`, `build`, `coverage` and `.d.ts` files are dropped before the program is built.
- **Static terminal report** — no redraws, no polling.

## Measured numbers

Benchmark (`node scripts/benchmark.ts <fileCount>`, synthetic project: 17 typed functions + JSON.parse + assertions per file, strict tsconfig, Node 24, Linux):

| Scale | Discovery | Program + analysis | Total | Throughput |
|-------|-----------|--------------------|-------|------------|
| 300 files / 19,500 positions | 9 ms | 618 ms | 627 ms | ~479 files/s |
| 1000 files / 65,000 positions | 13 ms | 1096 ms | 1108 ms | ~902 files/s |

Self-scan of the TypeHealth codebase (17 files, 512 positions): ~0.5 s. Numbers are indicative, not a certified benchmark suite.

## Phase 8 verdict

**No optimization.** At 1000 files the whole scan finishes in about a second; caching, parallelism or worker threads would add complexity for no measurable user benefit. The two suspects from the code review (`checker.isTypeAssignableTo`, suppression trivia scanning) are dwarfed by `ts.createProgram` — if this ever changes on real projects, the benchmark script will show it before any code is touched.

## Large file guard

Files larger than 4 MB (`MAX_SOURCE_FILE_BYTES` in `src/core/project.ts`) are skipped before the program is built — they are almost always generated code, and parsing them dominates runtime and memory. Each skipped file produces an info-level `file-skipped` finding so nothing disappears silently.
