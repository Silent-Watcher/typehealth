# Performance

Performance is part of the implementation, not a later cleanup. The rules: benchmark before optimizing, document real numbers, never add speculative caching or parallelism.

## Current design choices (already performance-driven)

- **One `ts.Program` and one type checker per scan** — files are parsed once, reused by every rule.
- **One AST walk per file** for all core rules; a separate lightweight pass handles boundary heuristics.
- **Scope filtering before analysis** — `node_modules`, `dist`, `build`, `coverage` and `.d.ts` files are dropped before the program is built.
- **Static terminal report** — no redraws, no polling.

## Measured numbers

Self-scan of the TypeScope codebase (17 TypeScript files, 512 eligible coverage positions, strict tsconfig):

```text
Files 17   Duration ~0.5s   Coverage 99.8%
```

Measured with the built CLI on the development machine (Node 24, Linux); numbers are indicative, not a benchmark suite.

## Known heavier operations

- `checker.isTypeAssignableTo` for unrelated-type assertion detection (two calls per non-trivial assertion) — candidate for Phase 8 measurement.
- Suppression comment scanning touches every node's trivia ranges — candidate for measurement on large files.

## Phase 8 plan

1. Benchmark on a large real-world project before changing anything.
2. Measure, then optimize only proven hotspots (candidates: checker calls, trivia scanning, program creation).
3. Re-benchmark after each optimization and record results here.
4. Consider parallelization only with a measured win; worker threads are not free.

Per-file progress display will only be added if scans become slow enough to need one.
