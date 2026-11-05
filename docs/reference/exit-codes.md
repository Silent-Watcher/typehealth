# Exit Codes

TypeScope uses exit codes to signal results to shells and CI systems.

| Code | Meaning | Examples |
|------|---------|----------|
| `0` | Success | Scan completed, `--help`/`--version` printed |
| `1` | Unexpected error | An internal error that is not caused by user input |
| `2` | Usage or configuration error | Unknown command or option, invalid `--format` value, missing value for an option, nonexistent `--cwd` or `--config` path |

Usage errors are printed to stderr and never to stdout, so CI logs stay clean. Exit code `1` is reserved for unexpected internal errors; if you see it, it is a bug worth reporting.
