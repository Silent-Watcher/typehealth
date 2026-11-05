# Project Structure

```
typescope/
├── src/
│   ├── index.ts              # public API surface (name, version)
│   ├── cli/
│   │   ├── index.ts          # commander program + exit-code mapping
│   │   ├── types.ts          # ScanRequest and shared CLI types
│   │   └── commands/
│   │       └── scan.ts       # scan orchestration
│   ├── core/
│   │   ├── project.ts        # tsconfig discovery + scoped file listing
│   │   ├── analyzer.ts       # shared-Program analysis, metrics
│   │   ├── findings.ts       # Finding/Severity, dedupe + ordering
│   │   ├── suppressions.ts   # @ts-ignore/-nocheck/-expect-error scan
│   │   └── boundaries.ts     # runtime boundary heuristics
│   ├── reports/
│   │   ├── terminal.ts       # static terminal report
│   │   ├── json.ts           # (Phase 7)
│   │   └── html.ts           # (Phase 7)
│   └── utils/
│       └── colors.ts         # styleText wrapper + progress bar
├── test/
│   ├── unit/                 # pure-function tests
│   ├── integration/          # analyzer/discovery/boundary fixtures
│   └── cli/                  # spawned-process CLI tests
├── docs/                     # VitePress site (this documentation)
├── dist/                     # tsdown build output (gitignored)
├── package.json
├── tsconfig.json
├── tsdown.config.ts
├── PROGRESS.md               # development tracker (source of truth)
├── ROADMAP.md                # phase goals + completion criteria
├── STATUS.md                 # environment, risks, verification log
└── ARCHITECTURE.md           # architecture summary
```

## Conventions

- ESM-only (`"type": "module"`), Node ≥ 22.18.
- Imports between source files use explicit `.ts` extensions — required by Node's native type stripping and allowed by `allowImportingTsExtensions` under `tsc --noEmit`; tsdown resolves them fine.
- Strict TypeScript with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`.
- Layering rule: CLI → core → reports, never the reverse (see [Architecture](/development/architecture)).
