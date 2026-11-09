# Testing

TypeHealth uses the Node.js native test runner exclusively — `node:test` and `node:assert/strict`. No Jest, no Vitest.

## Running

```sh
pnpm test          # node --test 'test/**/*.test.ts'
```

Node's native TypeScript type stripping executes the `.ts` test and source files directly; `pnpm run typecheck` (`tsc --noEmit`) provides the type-level guarantee separately.

## Layout

| Directory | Content |
|-----------|---------|
| `test/unit/` | Pure-function tests (colors, report renderers, Markdown report, agent Skill) |
| `test/cli/` | CLI behavior through spawned processes (`node src/cli/index.ts ...`) asserting stdout/stderr and exit codes |
| `test/integration/` | Analyzer, discovery and boundary tests over real fixtures |

## Conventions

- **Temporary-directory fixtures**: integration tests build projects with `mkdtempSync` under `os.tmpdir()` and clean up in `finally`. No shared fixture state between tests.
- **Pure-AST tests** build `ts.SourceFile`s directly from code strings. When a test needs `node.parent` (the boundary analysis does), the source file must be created with `setParentNodes: true` — parent pointers are not built by default.
- **Deterministic assertions**: reports and finding lists are ordered, so exact `deepEqual`/`deepStrictEqual` comparisons are preferred over substring matching where practical.
- Strict mode gotcha handled in tests: `noUncheckedIndexedAccess` makes `list[0]` possibly `undefined` — use the `first()` helper that asserts non-emptiness.

## What is covered

- CLI: every option, both `--opt value` and `--opt=value` forms, every exit path (0/2), `NO_COLOR`.
- Discovery: include/exclude, scope filtering, `.d.ts`/`node_modules`/`dist`/`build`/`coverage` exclusion, malformed and missing tsconfig, explicit `--config`.
- Analysis: coverage arithmetic, explicit vs implicit any, assertion severity tiers, suppression kinds and false-positive resistance (string literals, doc comments), strictness flags, empty projects, syntax errors, dedupe/order.
- Boundaries: each boundary kind, validator bypass (direct and file-scoped variable), group dedupe, clean code.
- Terminal report: section content, ordering, caps, determinism, color on/off.
