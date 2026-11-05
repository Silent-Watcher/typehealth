# Getting Started

TypeHealth is on npm: [npmjs.com/package/typehealth](https://www.npmjs.com/package/typehealth).

```sh
npm install -D typehealth
# or
pnpm add -D typehealth
```

## Requirements

- Node.js 22.18 or newer.

## First scan

```sh
npx typehealth scan
```

`scan` finds your nearest `tsconfig.json`, analyzes the source files it discovers, and prints the terminal report — see [CLI Reference](/guide/cli-reference) for all options and [Type Safety Metrics](/concepts/type-safety-metrics) for how to read the numbers.

## Quick wins

```sh
# fail CI below 80% coverage
npx typehealth scan --fail-under 80

# only what changed in this PR
npx typehealth scan --changed origin/main

# a shareable, self-contained HTML report
npx typehealth scan --format html
```

Running from source (for contributors) is covered in [Development Setup](/development/development-setup).
