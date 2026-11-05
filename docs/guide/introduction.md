# Introduction

TypeHealth is a lightweight TypeScript type safety analyzer distributed as an npm package. It analyzes TypeScript projects and helps developers understand how effectively TypeScript's type system is being used.

## What it measures

TypeHealth reports independent metrics rather than a single score:

- Type coverage: the proportion of eligible type-checking opportunities that resolve to a type other than `any`.
- Explicit and implicit `any` usage.
- Unsafe type assertions and non-null assertions.
- Type suppressions (`@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`).
- Weak TypeScript compiler configurations.
- Potentially unsafe external data boundaries.

The goal is actionable insight, not keyword counting. No metric claims to represent absolute type safety; each has a documented definition and known limitations.

## Project status

TypeHealth is in early development. The analyzer, CLI and reports are implemented across development phases (see `ROADMAP.md` in the repository). Features not yet implemented are not documented as available here.
