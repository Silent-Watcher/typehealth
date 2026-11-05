# TypeScope Status

Snapshot: 2026-11-05

## Current Phase
Phase 9 — Git and CI Integration (complete)

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
- R8: README/docs link to https://typescope.dev — domain not registered yet; decide before Phase 10 publication.
- R6 resolved: benchmark shows checker calls dwarfed by program creation; ~900 files/s at 1000 files. No optimization needed.
- R9: hardening verified on Linux only; chmod/symlink tests are POSIX-specific (skip/guarded on root, not Windows).

## Verification Log

## Verification Log
- 2026-11-05: environment inspected, planning docs created, planning commit `de75e75`.
- 2026-11-05 Phase 1: build ✓, typecheck ✓, test ✓, docs:build ✓, bin executes.
- 2026-11-05 Phase 2 (pnpm 12.10.1): build ✓, typecheck ✓, 22/22 tests ✓, docs:build ✓, built CLI verified.
- 2026-11-05 Phase 3 (+ third-party policy: commander, picocolors→later replaced, typescript→runtime dep): typecheck ✓, 23/23 tests ✓, build ✓, docs:build ✓, discovery smoke ✓.
- 2026-11-05 Phase 4 (+ colors→node:util styleText): typecheck ✓, 35/35 tests ✓, build ✓, docs:build ✓, self-scan smoke ✓ (99.7% coverage, 332 positions, 0.53s).
- 2026-11-05 Phase 5 (boundary tests delegated to subagent, re-verified): typecheck ✓, 47/47 tests ✓, build ✓, docs:build ✓, self-scan smoke ✓ (0 boundaries in this repo).
- 2026-11-05 Phase 6 (terminal-report tests delegated to subagent, re-verified): typecheck ✓, 69/69 tests ✓, build ✓, docs:build ✓; suppression heuristic tightened (D22); docs expansion + README.
- 2026-11-05 Phase 7 (report tests delegated to subagent, re-verified): typecheck ✓, 89/89 tests ✓, build ✓, docs:build ✓; subagent caught missing eligiblePositions/typedPositions definitions in METRIC_DEFINITIONS and a stale html test — both fixed before commit.
- 2026-11-05 Phase 8: benchmark baseline recorded (902 files/s @ 1000 files); large-file guard, realpath symlink handling, file-unreadable surfacing implemented; 6 hardening regression tests by subagent, re-verified: 95/95 ✓, build ✓, docs:build ✓, re-benchmark 505 files/s (no regression).
- 2026-11-05 Phase 9: --fail-under / --changed / --baseline implemented; git-output-vs-cwd bug fixed (subagent catch); 15 temp-repo tests by subagent, re-verified: 110/110 ✓, build ✓, docs:build ✓.
