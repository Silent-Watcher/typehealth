# Exit Codes

TypeHealth uses exit codes to signal results to shells and CI systems.

| Code | Meaning | Examples |
|------|---------|----------|
| `0` | Success | Scan completed without a gate failing, `--help`/`--version` printed |
| `1` | Gate failure | `--fail-under` threshold not met, `--baseline` regression detected |
| `2` | Usage or configuration error | Unknown command or option, invalid `--format` or `--fail-under` value, nonexistent `--cwd`/`--config`/baseline path, invalid git reference, `--changed` outside a git repository |

Usage errors are printed to stderr and never to stdout, so CI logs stay clean. Gate failures (`1`) are the intended way for CI to block a build. An exit code `1` *without* `--fail-under`/`--baseline` in play means an internal error — a bug worth reporting.
