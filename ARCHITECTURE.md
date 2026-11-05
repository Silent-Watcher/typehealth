# TypeScope Architecture

Initial architecture, Phase 0. Kept minimal; extended only when a phase demands it.

## Principles
- Simplicity over abstraction: plain functions and modules, no class hierarchies without need.
- Performance is part of implementation: reuse TypeScript Program/SourceFile, minimize filesystem ops, exclude node_modules/dist/build/coverage/.d.ts by default. Benchmark before caching or parallelization.
- Metrics are independent; no composite score.
- Analysis, metrics, reporting, and CLI stay separated.
- Security: analyzed projects are untrusted input. Never execute analyzed code, validate paths/args, escape all HTML output.

## Module Layout

```
src/
├── index.ts          # public API surface (kept small)
├── cli/
│   ├── index.ts      # entry, wiring
│   ├── args.ts       # parsing + validation (no framework)
│   └── commands/
│       └── scan.ts   # scan command orchestration
├── core/
│   ├── project.ts    # tsconfig + source file discovery
│   ├── analyzer.ts   # Compiler API driven analysis
│   ├── metrics.ts    # metric definitions + calculation
│   ├── findings.ts   # finding/severity types
│   └── rules/        # one module per rule group
├── reports/
│   ├── terminal.ts   # colored terminal report
│   ├── json.ts       # deterministic JSON report
│   └── html.ts       # self-contained HTML report
└── utils/
    ├── paths.ts      # safe path handling
    ├── colors.ts     # NO_COLOR / TTY aware coloring
    └── errors.ts     # error taxonomy (config vs analysis)
```

Not created until used. Layering: CLI → core → reports; reports never import CLI; core never imports reports or CLI.

## Data Flow
1. CLI parses/validates args → `ScanOptions`.
2. `core/project` resolves tsconfig, loads compiler options, discovers filtered source files.
3. One shared `ts.Program` is built once and reused by all rules.
4. Rules produce `Finding[]` (file, line, severity, rule, message).
5. `core/metrics` computes independent metrics from a single AST traversal pass where possible.
6. Selected report renderer emits terminal / JSON / HTML output.

## Error Handling
- Configuration errors (bad tsconfig, invalid args): actionable message, non-zero exit, no stack trace for CLI users.
- Analysis errors (unreadable file, malformed source): per-file diagnostics, scan continues where safe.
- Unexpected errors: never swallowed; logged; detailed diagnostics preserved behind a debug flag.

## Type Coverage Definition (working, to be finalized in Phase 4)
Numerator: eligible type positions (variable/property declarations, function parameters, return types, call-expression contexts) whose inferred or annotated type is not `any`-like.
Denominator: the same eligible positions.
Exclusions (documented in docs/reference/metric-definitions.md when implemented): nodes under `@ts-ignore`, unresolvable modules, and declaration files. No AST node counts as its own opportunity; identifiers and their declarations are counted once.
