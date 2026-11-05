# TypeScope Status

Snapshot: 2026-11-05

## Current Phase
Phase 5 — Runtime Boundary Analysis (complete)

## Environment
| Item | Value | Notes |
|------|-------|-------|
| Node.js | v24.20.0 | satisfies 22.18+ requirement |
| npm | 12.2.0 | ok |
| Global tsc | 7.0.2 (Go compiler) | not used; project pinned typescript 5.x (devDependency) |
| Local tsc | 5.x (see package.json) | Compiler API compatible |
| tsdown | 0.23.5 | ESM + dts, shebang preserved |
| VitePress | 1.6.4 | docs build passes |
| git | available | branch `master` |
| Working tree | src/, test/, docs/, commander + picocolors + typescript (runtime deps) | clean |

## Risks
- R1: TypeScript 7 global must not be used — resolved: local 5.x pin (D1/D12).
- R2: Node 24 vs spec's 22.18 baseline — engines declares `>=22.18`; fine.
- R3: Type Coverage definition — resolved: documented formulas in docs/reference/metric-definitions.md (D16).
- R4: npm allowScripts policy blocks esbuild postinstall; VitePress verified working without it. Monitor.
- R5: Empty-project edge — resolved: tsconfig error 18003 now treated as empty project (D17).
- R6: `isTypeAssignableTo` used for unrelated-type assertions is a heavier checker call; watch in Phase 8 benchmarks.
- R7: boundary heuristics are name-based (req/request/ctx, validator method names); false positives/negatives expected and documented. Revisit real-framework behavior (express/amqplib fixtures) if users report noise.

## Verification Log
- 2026-11-05: environment inspected, planning docs created, planning commit `de75e75`.
- 2026-11-05 Phase 1: build ✓, typecheck ✓, test ✓, docs:build ✓, bin executes.
- 2026-11-05 Phase 2 (pnpm 12.10.1): build ✓, typecheck ✓, 22/22 tests ✓, docs:build ✓, built CLI verified.
- 2026-11-05 Phase 3 (+ third-party policy: commander, picocolors→later replaced, typescript→runtime dep): typecheck ✓, 23/23 tests ✓, build ✓, docs:build ✓, discovery smoke ✓.
- 2026-11-05 Phase 4 (+ colors→node:util styleText): typecheck ✓, 35/35 tests ✓, build ✓, docs:build ✓, self-scan smoke ✓ (99.7% coverage, 332 positions, 0.53s).
- 2026-11-05 Phase 5 (boundary tests delegated to subagent, re-verified): typecheck ✓, 47/47 tests ✓, build ✓, docs:build ✓, self-scan smoke ✓ (0 boundaries in this repo).
