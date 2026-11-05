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

## Current status

The analyzer itself is under development (Phase 3). Running `typescope scan` currently validates the options and prints the resolved project configuration. `--format json` and `--format html` are accepted by the parser but report "not implemented yet" until Phase 7.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Scan completed successfully |
| 1 | Unexpected error |
| 2 | Usage or configuration error |

See [Exit Codes](/reference/exit-codes) for details.
