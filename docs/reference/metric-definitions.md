# Metric Definitions

Exact, reproducible definitions of every metric TypeHealth reports. These formulas are part of the tool's contract; changes are breaking changes for the JSON report schema.

## Eligible positions

The unit of measurement for type coverage is an **eligible position**:

- the declared name of every variable declaration (`var`/`let`/`const`, including destructuring declarations and `catch` clause variables),
- every function/method/constructor parameter (the parameter's name; a destructuring pattern counts as one position),
- the return type of every function declaration, method declaration, getter, function expression and arrow function.

Excluded from eligibility:

- setters and constructors as *return-type* positions (their return types are fixed to `void`/the class instance and carry no information),
- files never analyzed: declaration files (`*.d.ts`), anything inside `node_modules/`, `dist/`, `build/`, `coverage/`, and anything outside the project directory.

## Type coverage

```
type coverage = typedPositions / eligiblePositions
```

where a position is **typed** when the TypeScript type checker resolves its type to something that is not `any` (including error types, which carry the `Any` flag). `unknown` counts as typed. When a project has no eligible positions, coverage is reported as `null` (rendered `n/a`), never as 100%.

## Explicit any

Counted: every `any` keyword occurring in a type position — annotations, type arguments, return type annotations, and the target of `as`/`<>` assertions. One keyword occurrence = one count = one `explicit-any` finding (medium severity).

## Implicit any

Counted: eligible positions whose checker-resolved type is `any` **and** whose explicit type annotation (if any) does not contain an `any` keyword. The return type of a function whose body returns an `any`-typed value but which has no `any` in its (absent) return annotation is counted as implicit — the inner cast is reported separately as an unsafe assertion. Severity: medium.

## Unsafe assertions

An `as`/`<>` assertion is counted (and reported) when any of the following holds:

| Condition | Severity |
|-----------|----------|
| Target type is `any` | high |
| The asserted expression is itself an assertion (double assertion) | medium |
| Neither side is assignable to the other (unrelated types) | medium |

Legitimate assertions (e.g. `"text" as string`) are neither counted nor reported.

## Non-null assertions

Every use of the postfix `!` operator (one count and one low-severity finding each).

## Suppressions

Every `@ts-ignore` (medium), `@ts-nocheck` (high) and `@ts-expect-error` (low) comment found in analyzed source files. Matches outside comments are ignored. `@ts-expect-error` is reported deliberately: it is compile-checked, but still suppresses type information.

## Unvalidated boundaries

Project-level count of `unvalidated-boundary` findings: static heuristic detections of external data (JSON.parse results, request data, HTTP responses, queue payloads) without a recognized validation step. Every finding is **uncertain by definition** — see [Runtime Boundaries](/concepts/runtime-boundaries) for the recognized patterns and their limitations. Severity: medium. A JSON.parse assignment may also appear in the implicit-any metric; the two findings describe different concerns (type vs runtime validation).

## Weak strictness flags

Project-level count of the following compiler options that are not effectively enabled: `strict`, `noImplicitAny`, `strictNullChecks`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict`, `useUnknownInCatchVariables`. Enabling `strict` enables the sub-flags unless they are explicitly set to `false`. Reported as one `weak-strictness` finding against the tsconfig (medium when any flag is disabled, otherwise info).

## Findings

Findings are deduplicated by `file:line:column:rule` and ordered deterministically (file, line, column, rule) so reports are reproducible across runs on identical input.
