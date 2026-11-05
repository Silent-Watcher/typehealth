# Type Safety Metrics

TypeHealth reports independent metrics. No metric claims to represent absolute type safety, and metrics are never combined into a score. Precise formulas live in [Metric Definitions](/reference/metric-definitions).

## Why independent metrics

A single percentage hides what matters. A project can have high type coverage and still contain dangerous `as any` casts; a project can have a low score purely because of generated code. TypeHealth therefore reports each dimension on its own:

- **Type coverage** — how much of the codebase's typeable surface resolves to a real type.
- **Explicit any** — deliberate `any` usage.
- **Implicit any** — places where TypeScript fell back to `any` silently.
- **Unsafe assertions** — casts that bypass meaningful checking (`as any`, double assertions, casts between unrelated types).
- **Non-null assertions** — uses of the `!` operator.
- **Suppressions** — `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` comments.
- **Strictness configuration** — disabled compiler strictness options.
- **Unvalidated boundaries** — external data entry points (HTTP, queues, `JSON.parse`) without a recognized validation step; heuristic and labeled uncertain, see [Runtime Boundaries](/concepts/runtime-boundaries).

## How to read them

- Coverage answers "how much of the codebase participates in type checking".
- Explicit vs implicit any distinguishes conscious decisions from silent fallbacks.
- Assertions and suppressions measure escape hatches; their severity depends on context, which is why each finding carries its own severity rather than just a count.
- Strictness is a project-level signal: a weak tsconfig weakens every other metric's meaning.

## Known limitations

- Static analysis cannot prove runtime safety; runtime boundary findings (Phase 5) are labeled as uncertain by design.
- Type coverage counts *positions*, not AST nodes — identifiers, declarations and expressions are counted once per eligible position (see [Metric Definitions](/reference/metric-definitions)).
- Code inside `node_modules`, build output and declaration files is never analyzed.
