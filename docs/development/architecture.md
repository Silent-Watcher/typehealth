# Architecture

TypeScope is deliberately small. This page describes the actual structure and the reasoning behind it. For the metrics themselves see [Metric Definitions](/reference/metric-definitions).

## Layering

```
CLI  →  core  →  reports
```

Dependencies point one way: the CLI orchestrates, core analyzes, reports render. Core never imports from CLI or reports; reports never import CLI. This keeps the analysis engine usable as a library (the public API exported from the package root) and testable without a terminal.

## Module map

| Module | Responsibility |
|--------|----------------|
| `src/cli/index.ts` | commander program, exit-code mapping, direct-execution guard |
| `src/cli/commands/scan.ts` | scan orchestration: validate paths → discover → analyze → render |
| `src/core/project.ts` | tsconfig discovery/parsing and scoped file listing (TypeScript API) |
| `src/core/analyzer.ts` | one AST walk per file over a shared `ts.Program`; metrics aggregation |
| `src/core/suppressions.ts` | suppression comment detection |
| `src/core/boundaries.ts` | runtime boundary heuristics ([concepts](/concepts/runtime-boundaries)) |
| `src/core/findings.ts` | Finding/Severity types, deterministic dedupe + ordering |
| `src/reports/terminal.ts` | static terminal report |
| `src/utils/colors.ts` | `node:util` styleText wrapper, progress bar primitive |

## Key decisions

- **One shared `ts.Program` per scan.** Every rule reads from the same program and type checker; files are parsed once. No rule module builds its own program.
- **One AST walk per file** (plus a separate cheap pass for boundary heuristics). Coverage positions are collected during the walk and classified afterwards, because distinguishing explicit from implicit `any` needs the full set of `any` keywords. Rules that can be evaluated immediately run inline. Separate rule modules would force multiple traversals — deliberately not done.
- **Independent metrics.** Metrics are computed and reported separately; no composite score exists.
- **Deterministic output.** Findings are deduplicated by `file:line:column:rule` and sorted by (file, line, column, rule), so identical input produces identical reports.
- **Established libraries for infrastructure.** commander for CLI parsing, tsdown for builds, the TypeScript Compiler API for analysis, native `node:util` styleText for colors. Custom code exists only for TypeScope-specific analysis and reporting.

## Error taxonomy

| Class | Behavior |
|-------|----------|
| Usage/config error (bad args, missing tsconfig, malformed tsconfig) | actionable stderr message, exit code 2 |
| Per-file analysis problem (syntax errors) | a `syntax-error` finding; the scan continues |
| Unexpected internal error | exit code 1 — always a bug worth reporting |

See [Exit Codes](/reference/exit-codes) and [Development Setup](/development/development-setup) to work on the codebase.
