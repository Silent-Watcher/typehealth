# Getting Started

The npm package is release-ready and awaiting publication. Until then, install from a clone of the repository:

```sh
git clone <repository-url>
cd typescope
pnpm install
pnpm run build
```

## Requirements

- Node.js 22.18 or newer.

## First scan

```sh
# from source
node dist/cli/index.js scan

# after publication (or via the packed tarball)
npx typescope scan
```

`scan` finds your nearest `tsconfig.json`, analyzes the source files it discovers, and prints the terminal report — see [CLI Reference](/guide/cli-reference) for all options and [Type Safety Metrics](/concepts/type-safety-metrics) for how to read the numbers.
