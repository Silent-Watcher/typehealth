# TypeHealth Report

## Project Context

- Tool: typehealth v0.10.0
- Report format: markdown v1
- Project root: /tmp/demo-api
- TypeScript config: /tmp/demo-api/tsconfig.json
- Files analyzed: 3

## Executive Summary

- Type coverage: 70.0% (14/20 eligible positions)
- Findings: 12 total (info: 0, low: 1, medium: 10, high: 1, critical: 0)
- Limitations: runtimeBoundaries is a heuristic estimate of unvalidated external data, not a taint analysis; file-skipped findings mark files excluded from analysis.

## Metrics

| Metric | Value |
| --- | --- |
| typeCoverage | 0.7 |
| eligiblePositions | 20 |
| typedPositions | 14 |
| explicitAny | 2 |
| implicitAny | 5 |
| unsafeAssertions | 1 |
| nonNullAssertions | 1 |
| suppressions | 0 |
| runtimeBoundaries | 2 |
| weakStrictnessFlags | 9 |

## File Health

| File | Coverage | Eligible | Typed | Explicit any | Implicit any | Unsafe assertions | Non-null assertions | Suppressions | Runtime boundaries |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| src/extra.ts | 100.0% | 4 | 4 | 0 | 0 | 0 | 0 | 0 | 0 |
| src/payment.service.ts | 57.1% | 7 | 4 | 0 | 3 | 0 | 0 | 0 | 1 |
| src/webhook.controller.ts | 66.7% | 9 | 6 | 2 | 2 | 1 | 1 | 0 | 1 |

## Findings

- [HIGH] src/webhook.controller.ts:14:19 unsafe-assertion: Type assertion to any.
- [MEDIUM] src/payment.service.ts:1:24 implicit-any: Type is implicitly any.
- [MEDIUM] src/payment.service.ts:1:32 implicit-any: Type is implicitly any.
- [MEDIUM] src/payment.service.ts:6:1 implicit-any: Type is implicitly any.
- [MEDIUM] src/payment.service.ts:7:10 unvalidated-boundary: JSON.parse result used without recognized runtime validation (uncertain).
- [MEDIUM] src/webhook.controller.ts:7:40 explicit-any: Explicit any type usage.
- [MEDIUM] src/webhook.controller.ts:8:9 implicit-any: Type is implicitly any.
- [MEDIUM] src/webhook.controller.ts:8:16 unvalidated-boundary: JSON.parse result used without recognized runtime validation (uncertain).
- [MEDIUM] src/webhook.controller.ts:14:9 implicit-any: Type is implicitly any.
- [MEDIUM] src/webhook.controller.ts:14:20 explicit-any: Explicit any type usage.
- [MEDIUM] tsconfig.json:1:1 weak-strictness: Disabled strictness options: strict, noImplicitAny, strictNullChecks, strictFunctionTypes, strictBindCallApply, strictPropertyInitialization, noImplicitThis, alwaysStrict, useUnknownInCatchVariables.
- [LOW] src/webhook.controller.ts:10:17 non-null-assertion: Non-null assertion operator (!).

## Recommended Investigation Areas

- src/webhook.controller.ts:14 (high, unsafe-assertion)
- src/payment.service.ts:1 (medium, implicit-any)
- src/payment.service.ts:1 (medium, implicit-any)
- src/payment.service.ts:6 (medium, implicit-any)
- src/payment.service.ts:7 (medium, unvalidated-boundary)
