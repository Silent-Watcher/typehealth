# TypeScope Roadmap

Ten phases, implemented strictly in order. One commit per completed phase. No future-phase features land early. Completion criteria are mandatory; a phase is not complete if any fail.

## Phase 0 — Planning and Progress Tracking
**Goal:** environment inspected, plan and tracking system established.
**Criteria:** PROGRESS.md / ROADMAP.md / STATUS.md / architecture doc exist; phase checklists defined; initial commit created.

## Phase 1 — Project Initialization
**Goal:** working ESM TypeScript project skeleton with build, tests, docs — no analysis yet.
**Criteria:** `npm run build` (tsdown) passes; `npm run test` (node --test) passes with at least a smoke test; `npm run typecheck` passes; `npm run docs:build` (VitePress) passes; package.json exports + bin configured; `.gitignore` present; committed.

## Phase 2 — CLI Foundation
**Goal:** `typescope scan` parses and validates args, prints help/version, correct exit codes; rendering primitives separate from analysis.
**Criteria:** tests for every supported argument; --format json/html placeholders route correctly; NO_COLOR / --no-color / non-TTY handled; committed.

## Phase 3 — TypeScript Project Discovery
**Goal:** reliable, safe discovery of project source files via TypeScript Compiler API.
**Criteria:** tsconfig discovery/parsing incl. malformed-config errors; include/exclude respected; default excludes (node_modules, dist, build, coverage, .d.ts); path traversal and symlink handling safe; fixtures + integration tests; committed.

## Phase 4 — Core Type Safety Analyzer
**Goal:** the eight core metrics with precise, documented definitions.
**Criteria:** explicit/implicit any, unsafe assertions, non-null assertions, suppressions, type coverage, strictness config; file + project metrics; findings with severity; no duplicate findings; documented formulas; comprehensive unit + integration tests; committed.

## Phase 5 — Runtime Boundary Analysis
**Goal:** limited static detection of unsafe external data boundaries.
**Criteria:** HTTP inputs, query/route params, JSON.parse, external HTTP responses, queue payloads; validation-pattern recognition; uncertain findings labeled; limitations documented; tests; committed.

## Phase 6 — Terminal Reporting UI
**Goal:** attractive, readable terminal report matching the visual design spec.
**Criteria:** header, colored bars, percentages, file rankings, severity, findings, duration, summary; real progress only; CI/TTY fallbacks; NO_COLOR; docs with real output examples; committed.

## Phase 7 — JSON and HTML Reports
**Goal:** deterministic JSON schema and self-contained secure HTML report.
**Criteria:** versioned stable schema; deterministic ordering; self-contained responsive HTML with metric cards/findings/remediation; all source-derived content escaped; injection + determinism tests; committed.

## Phase 8 — Performance and Security Hardening
**Goal:** measured, documented performance and audited security.
**Criteria:** benchmark results recorded before and after any optimization; Program reuse verified; large files, symlinks, traversal, HTML injection, error handling reviewed; security regression tests; no speculative changes; committed.

## Phase 9 — Git and CI Integration
**Goal:** CI-friendly usage: --fail-under, --changed, baseline comparison.
**Criteria:** exit codes CI-correct; baseline/finding comparison works; temporary-repo integration tests; GitHub Actions documented; Git integration optional; committed.

## Phase 10 — npm Release Preparation
**Goal:** publishable package.
**Criteria:** npm pack verified; clean-install smoke test in a temporary project; tests pass against built output; publint + Are The Types Wrong clean or issues fixed; VitePress production build passes; release checklist complete; committed.
