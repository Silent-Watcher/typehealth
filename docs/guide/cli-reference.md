# CLI Reference

## Commands

```sh
typescope scan
typescope --version
typescope --help
```

## scan

```sh
typescope scan [options]
```

| Option | Value | Default | Description |
|--------|-------|---------|-------------|
| `--format` | `terminal` \| `json` \| `html` | `terminal` | Output format |
| `--cwd` | path | current directory | Project directory to analyze |
| `--config` | path | `<cwd>/tsconfig.json` | Path to tsconfig.json |
| `--no-color` | flag | off | Disable colored output |
| `--help` | flag | off | Print scan usage |

Both `--format json` and `--format=json` forms are accepted.

Color is disabled automatically when stdout is not a TTY or when the `NO_COLOR` environment variable is set.

A `tsconfig.json` must be resolvable — either via `--config` or in the project directory tree. Without one the scan exits with code 2.

## Current status

Running `typescope scan` analyzes the project and prints a plain metric summary: type coverage, any counts, unsafe assertions, non-null assertions, suppressions, weak strictness flags, findings and duration. The polished terminal UI lands in Phase 6; `--format json` and `--format html` are accepted by the parser but report "not implemented yet" until Phase 7. See [Analysis Engine](/concepts/analysis-engine) and [Metric Definitions](/reference/metric-definitions).

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Scan completed successfully |
| 1 | Unexpected error |
| 2 | Usage or configuration error |

See [Exit Codes](/reference/exit-codes) for details.
