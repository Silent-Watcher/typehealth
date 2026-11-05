# TypeScope

A lightweight TypeScript **type safety analyzer**. TypeScope analyzes your TypeScript project and shows you — in plain numbers, not vibes — how effectively the type system is actually being used.

```text
╭──────────────────────╮
│ TYPESCOPE            │
│ Type Safety Analyzer │
╰──────────────────────╯

Project  /tmp/demo-api
Config   /tmp/demo-api/tsconfig.json
Files    2
Duration 0.19s

TYPE COVERAGE ██████████░░░░░░░░░░░░░░ 40.0% (10 positions)

METRICS
  Explicit any            4
  Implicit any            3
  Unsafe assertions       1
  Non-null assertions     1
  Suppressions            0
  Unvalidated boundaries  4
  Weak strictness flags   9

FILE HEALTH
  src/webhook.controller.ts      █████░░░░░░░░░░░ 33%
  src/payment.service.ts         ████████░░░░░░░░ 50%

TOP FINDINGS
  [HIGH] /tmp/demo-api/src/webhook.controller.ts:7 Type assertion to any.
  [MEDIUM] /tmp/demo-api/src/payment.service.ts:1 Explicit any type usage.
  [MEDIUM] /tmp/demo-api/src/payment.service.ts:4 JSON.parse result used without recognized runtime validation (uncertain).
  ...

Analysis completed successfully.
```

## Why TypeScope

Most tools count keywords. TypeScope answers questions you actually ask:

- **Where is type checking not happening?** Type coverage measures the share of eligible type positions that resolve to a real type — with the absolute position count shown, because a percentage without its denominator is meaningless.
- **Where does `any` sneak in silently?** Explicit and implicit `any` are reported separately — a deliberate `any` is a decision; a silent one is an accident.
- **Which assertions are dangerous?** `as any`, double assertions and casts between unrelated types are flagged; legitimate casts are not.
- **Where does untrusted data enter the program?** HTTP inputs, `JSON.parse` results, HTTP responses and queue payloads are reported as *potentially* unvalidated — clearly labeled uncertain, because static analysis cannot prove runtime safety.
- **Is the compiler even helping?** Disabled strictness options are listed per project.

Metrics are **independent** — no arbitrary composite score. Each has a documented formula: [Metric Definitions](https://typescope.dev/reference/metric-definitions).

## Features

- 📊 **Type coverage** with per-file health ranking (worst files first)
- 🔍 **Explicit / implicit `any`**, unsafe assertions, non-null assertions
- 🚫 **Suppression detection** — `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- 🌐 **Runtime boundary heuristics** for express/fastify/koa, fetch, JSON.parse, amqplib, KafkaJS, bullmq
- ⚙️ **Strictness audit** of your tsconfig
- 🖥️ **Beautiful static terminal report** — CI-safe, `NO_COLOR` aware
- 📄 **Deterministic JSON report** — versioned schema, embedded metric definitions, diff-friendly
- 🌗 **Self-contained HTML report** — zero JavaScript, no remote assets, works offline
- 🔒 **Security-first**: analyzed code is never executed, file discovery is scoped to your project
- ⚡ **Fast**: one shared TypeScript program, one AST walk per file
- 📦 **Zero-config**: finds and honors your existing tsconfig (`include`/`exclude` respected)

Planned: `--fail-under` and CI baseline comparison (Phase 9).

## Requirements

- Node.js ≥ 22.18

## Install

The npm package is not published yet (development in progress). Until then:

```sh
git clone <repository-url>
cd typescope
pnpm install
pnpm run build
node dist/cli/index.js scan
```

## Usage

```sh
typescope scan                          # analyze current directory
typescope scan --cwd ./my-project       # analyze another directory
typescope scan --config ./tsconfig.json # explicit tsconfig
typescope scan --no-color               # plain output
typescope scan --help
typescope --version
```

| Option | Default | Description |
|--------|---------|-------------|
| `--format <terminal\|json\|html>` | `terminal` | `json` → stdout, `html` → `typescope-report.html` in cwd |
| `--cwd <path>` | `.` | Project directory |
| `--config <path>` | `<cwd>/tsconfig.json` | tsconfig path |
| `--no-color` | off | Disable colors (also automatic in CI / with `NO_COLOR`) |

**Exit codes:** `0` success · `1` unexpected error (a bug) · `2` usage/config error.

A `tsconfig.json` must be resolvable — via `--config` or in the directory tree. Discovery honors your `include`/`exclude` and additionally skips `node_modules`, `dist`, `build`, `coverage` and `*.d.ts`.

## Documentation

Full documentation at **[typescope.dev](https://typescope.dev)** (built with VitePress, sources in [`docs/`](./docs)):

- [Introduction](https://typescope.dev/guide/introduction) — what TypeScope measures and why
- [CLI Reference](https://typescope.dev/guide/cli-reference) — every option and exit code
- [Type Safety Metrics](https://typescope.dev/concepts/type-safety-metrics) — the measurement model
- [Metric Definitions](https://typescope.dev/reference/metric-definitions) — exact formulas
- [Terminal / JSON / HTML reports](https://typescope.dev/features/terminal-report) — output formats
- [Runtime Boundaries](https://typescope.dev/concepts/runtime-boundaries) — what the boundary heuristics can and cannot tell you
- [Security Model](https://typescope.dev/security/security-model) — the untrusted-input contract

## Development

```sh
pnpm install
pnpm run build        # tsdown → dist/
pnpm test             # node --test (native runner, no Jest)
pnpm run typecheck    # tsc --noEmit, strict
pnpm run docs:dev     # documentation dev server
```

Architecture, testing conventions and performance notes: [Development docs](https://typescope.dev/development/architecture). Development progress is tracked openly in [`PROGRESS.md`](./PROGRESS.md).

## Security

TypeScope treats analyzed projects as untrusted input: your code is never executed, discovery never leaves your project directory, and all report content is escaped. Details: [Security Model](https://typescope.dev/security/security-model). Found a security issue? Please open a private security advisory instead of a public issue.

## License

MIT
