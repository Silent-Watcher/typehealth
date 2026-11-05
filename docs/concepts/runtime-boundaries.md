# Runtime Boundaries

TypeScript's type system stops at the edge of your program: data that arrives over HTTP, from a queue, or from `JSON.parse` is typed as `any` (or asserted) and carries no compile-time guarantees. TypeScope's runtime boundary analysis points at places where external data enters the program **without a recognized validation step**.

## What this analysis is — and is not

This is a **limited static heuristic**, not a taint analysis and not a proof of anything. Every finding is labeled *uncertain*:

- A finding means "external data flows here and no recognized validator appears to process it" — it does not mean the code is unsafe.
- No finding does not mean the code is safe: the heuristic cannot see cross-file data flow, dynamic access, or validation outside its known patterns.

The analyzer deliberately does not attempt full dataflow tracking; that trade-off keeps results fast, explainable and free of large dependency machinery.

## Recognized boundaries

| Kind | Detected pattern | Notes |
|------|------------------|-------|
| JSON parse | `JSON.parse(...)` | result is `any` |
| HTTP request | `req.body`, `req.query`, `req.params`, `ctx.request.body` (objects named `req`, `request`, `ctx`) | express, fastify, koa |
| HTTP response | `fetch(...)` and `.json()` / `.text()` calls | both the call and the read may be reported |
| Queue payload | first callback parameter of `.consume(...)`, `eachMessage`/`eachBatch` handlers, `new Worker(queue, (job) => ...)` | amqplib, KafkaJS, bullmq |

## Recognized validation patterns

A boundary is not reported when its value (directly, or via a same-file variable assignment) flows into a call to a known validator method: `parse`, `safeParse`, `validate`, `validateSync`, `validateOrReject`, `decode`, `decodeUnknownSync`, `isValid`, `assert` — covering zod, valibot, yup, joi, ajv, class-validator, io-ts and effect/schema by name.

The check is file-scoped and name-based. `JSON.parse`, `Date.parse` and similar are excluded from the validator list.

## Limitations

- Recognition is by name, not by type: `schema.parse(x)` is trusted because of the method name, not because the object was proven to be a schema.
- Validation in a different file (e.g. a middleware) is invisible.
- `fetch()` and `.json()` are reported separately; one request may produce two findings.
- Only the boundaries above are recognized; other entry points (WebSockets, env vars, stdin) are out of scope for now.
- These heuristics will produce both false positives and false negatives. Severity is `medium` and every message contains "uncertain".
