# Development Setup

## Requirements

- Node.js 22.18 or newer (tested with Node 24).
- npm 10 or newer.

## Setup

```sh
npm install
```

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | Production build with tsdown (ESM + declaration files into `dist/`) |
| `npm run test` | Tests with the Node.js native test runner (`node --test`) |
| `npm run typecheck` | Type checking with `tsc --noEmit` |
| `npm run docs:dev` | VitePress documentation dev server |
| `npm run docs:build` | VitePress production build |
| `npm run docs:preview` | Preview the built documentation |

## Tooling notes

- Builds use [tsdown](https://tsdown.dev); type checking uses the TypeScript compiler directly. TypeScript is pinned to 5.x because the analyzer builds on the TypeScript Compiler API.
- Tests use `node:test` and `node:assert/strict` only — no Jest, no Vitest. Node's native TypeScript type stripping runs the `.ts` test and source files directly.
- Source and test files import each other with explicit `.ts` extensions; this works for `node --test` (type stripping), `tsc --noEmit` (`allowImportingTsExtensions`) and tsdown.
