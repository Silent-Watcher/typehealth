# TypeHealth

[![npm version](https://img.shields.io/npm/v/typehealth.svg)](https://www.npmjs.com/package/typehealth)
[![npm downloads](https://img.shields.io/npm/dm/typehealth.svg)](https://www.npmjs.com/package/typehealth)
[![license](https://img.shields.io/npm/l/typehealth.svg)](./LICENSE)
[![node](https://img.shields.io/node/v/typehealth.svg)](https://www.npmjs.com/package/typehealth)

A lightweight TypeScript **type safety analyzer**. TypeHealth analyzes your TypeScript project and shows you — in plain numbers, not vibes — how effectively the type system is actually being used.

```text
╭──────────────────────╮
│ TYPEHEALTH           │
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

## Why TypeHealth

Most tools count keywords. TypeHealth answers questions you actually ask:

- **Where is type checking not happening?** Type coverage measures the share of eligible type positions that resolve to a real type — with the absolute position count shown, because a percentage without its denominator is meaningless.
- **Where does `any` sneak in silently?** Explicit and implicit `any` are reported separately — a deliberate `any` is a decision; a silent one is an accident.
- **Which assertions are dangerous?** `as any`, double assertions and casts between unrelated types are flagged; legitimate casts are not.
- **Where does untrusted data enter the program?** HTTP inputs, `JSON.parse` results, HTTP responses and queue payloads are reported as *potentially* unvalidated — clearly labeled uncertain, because static analysis cannot prove runtime safety.
- **Is the compiler even helping?** Disabled strictness options are listed per project.

Metrics are **independent** — no arbitrary composite score. Each has a documented formula: [Metric Definitions](./docs/reference/metric-definitions.md).

## Features

- 📊 **Type coverage** with per-file health ranking (worst files first)
- 🔍 **Explicit / implicit `any`**, unsafe assertions, non-null assertions
- 🚫 **Suppression detection** — `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`
- 🌐 **Runtime boundary heuristics** for express/fastify/koa, fetch, JSON.parse, amqplib, KafkaJS, bullmq
- ⚙️ **Strictness audit** of your tsconfig
- 🖥️ **Beautiful static terminal report** — CI-safe, `NO_COLOR` aware
- 📄 **Deterministic JSON report** — versioned schema, embedded metric definitions, diff-friendly
- 🌗 **Self-contained HTML report** — zero JavaScript, no remote assets, works offline
- 🚦 **CI-ready**: `--changed`, `--fail-under`, baseline ratcheting — [GitHub Actions recipe](./docs/features/ci-integration.md)
- 🔒 **Security-first**: analyzed code is never executed, file discovery is scoped to your project
- ⚡ **Fast**: one shared TypeScript program, one AST walk per file — ~900 files/s
- 📦 **Zero-config**: finds and honors your existing tsconfig (`include`/`exclude` respected)

## Requirements

- Node.js ≥ 22.18

## Install

```sh
npm install -D typehealth
# or
pnpm add -D typehealth
```

Then run it:

```sh
npx typehealth scan
```

On npm: [npmjs.com/package/typehealth](https://www.npmjs.com/package/typehealth) · Source: [github.com/Silent-Watcher/typehealth](https://github.com/Silent-Watcher/typehealth)

## Usage

```sh
typehealth scan                          # analyze current directory
typehealth scan --cwd ./my-project       # analyze another directory
typehealth scan --config ./tsconfig.json # explicit tsconfig
typehealth scan --changed origin/main    # only files changed vs a git ref
typehealth scan --fail-under 80          # CI: exit 1 below 80% coverage
typehealth scan --baseline base.json     # CI: exit 1 on regression
typehealth scan --no-color               # plain output
typehealth scan --help
typehealth --version
```

| Option | Default | Description |
|--------|---------|-------------|
| `--format <terminal\|json\|html>` | `terminal` | `json` → stdout, `html` → `typehealth-report.html` in cwd |
| `--cwd <path>` | `.` | Project directory |
| `--config <path>` | `<cwd>/tsconfig.json` | tsconfig path |
| `--changed [ref]` | off | Only files changed vs HEAD (+ untracked) or vs a git reference |
| `--fail-under <pct>` | off | Exit 1 when coverage is below the percentage |
| `--baseline <path>` | off | Exit 1 when coverage drops or new findings appear vs a previous JSON report |
| `--no-color` | off | Disable colors (also automatic in CI / with `NO_COLOR`) |

**Exit codes:** `0` pass · `1` gate failure (`--fail-under`/`--baseline`) · `2` usage/config error.

A `tsconfig.json` must be resolvable — via `--config` or in the directory tree. Discovery honors your `include`/`exclude` and additionally skips `node_modules`, `dist`, `build`, `coverage` and `*.d.ts`.

## Documentation

Full documentation lives in [`docs/`](./docs) (built with VitePress — run it locally with `pnpm run docs:dev`):

- [Introduction](./docs/guide/introduction.md) — what TypeHealth measures and why
- [CLI Reference](./docs/guide/cli-reference.md) — every option and exit code
- [Type Safety Metrics](./docs/concepts/type-safety-metrics.md) — the measurement model
- [Metric Definitions](./docs/reference/metric-definitions.md) — exact formulas
- [Terminal / JSON / HTML reports](./docs/features/terminal-report.md) — output formats
- [CI Integration](./docs/features/ci-integration.md) — `--changed`, `--fail-under`, baselines, GitHub Actions
- [Runtime Boundaries](./docs/concepts/runtime-boundaries.md) — what the boundary heuristics can and cannot tell you
- [Security Model](./docs/security/security-model.md) — the untrusted-input contract

## Development

```sh
git clone https://github.com/Silent-Watcher/typehealth.git
cd typehealth
pnpm install
pnpm run build        # tsdown → dist/
pnpm test             # node --test (native runner, no Jest)
pnpm run typecheck    # tsc --noEmit, strict
pnpm run docs:dev     # documentation dev server
```

Architecture, testing conventions and performance notes: [Development docs](./docs/development/architecture.md). Development progress is tracked openly in [`PROGRESS.md`](./PROGRESS.md).

## Security

TypeHealth treats analyzed projects as untrusted input: your code is never executed, discovery never leaves your project directory, and all report content is escaped. Details: [Security Model](./docs/security/security-model.md). Found a security issue? Please open a private security advisory instead of a public issue.

## License

MIT — see [LICENSE](./LICENSE).
