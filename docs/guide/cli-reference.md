# CLI Reference

## Commands

```sh
typehealth scan
typehealth --version
typehealth --help
```

## scan

```sh
typehealth scan [options]
```

| Option | Value | Default | Description |
|--------|-------|---------|-------------|
| `--format` | `terminal` \| `json` \| `html` | `terminal` | Output format. `json` prints to stdout, `html` writes `typehealth-report.html` to the current working directory |
| `--cwd` | path | current directory | Project directory to analyze |
| `--config` | path | `<cwd>/tsconfig.json` | Path to tsconfig.json |
| `--changed` | optional git ref | off | Analyze only files changed vs HEAD (+ untracked) or vs the given reference |
| `--fail-under` | 0–100 | off | Exit 1 when type coverage is below this percentage |
| `--baseline` | path | off | Compare against a previous JSON report; exit 1 on regression |
| `--no-color` | flag | off | Disable colored output |
| `--help` | flag | off | Print scan usage |

Both `--format json` and `--format=json` forms are accepted.

Color is disabled automatically when stdout is not a TTY or when the `NO_COLOR` environment variable is set.

A `tsconfig.json` must be resolvable — either via `--config` or in the project directory tree. Without one the scan exits with code 2.

## Current status

All three output formats are implemented: [terminal](/features/terminal-report) (default), [JSON](/features/json-report) and [HTML](/features/html-report), plus [CI gating](/features/ci-integration) with `--changed`, `--fail-under` and `--baseline`.

## Exit codes

| Code | Meaning |
|------|---------|
| 0 | Scan completed without a gate failing |
| 1 | Gate failure: `--fail-under` not met or `--baseline` regression |
| 2 | Usage or configuration error |

See [Exit Codes](/reference/exit-codes) and [CI Integration](/features/ci-integration) for details.
