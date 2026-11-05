# CI Integration

TypeScope is built for pipelines: static output, no timestamps in JSON, deterministic ordering, and meaningful exit codes.

## Exit codes for gating

| Situation | Exit code |
|-----------|-----------|
| Scan completed, no gate triggered | 0 |
| `--fail-under` threshold not met, or `--baseline` regression detected | 1 |
| Usage/config error (bad args, invalid git reference, missing baseline) | 2 |

## `--fail-under`

Fail the build when type coverage drops below a percentage:

```sh
typescope scan --fail-under 80
```

Projects with no measurable positions (empty `include`) pass — there is nothing to gate. The gate applies to every output format, so `--format json --fail-under 80` works for pipelines that parse stdout.

## `--changed`

Analyze only what changed, against the local diff or a git reference:

```sh
typescope scan --changed            # uncommitted changes vs HEAD + untracked files
typescope scan --changed origin/main
```

The reference is validated before use (an invalid one is a usage error, exit 2). Changed sets come from `git diff --name-only` restricted to the project directory; files are canonicalized through `realpath`, so deleted files are skipped and symlinked files are compared by their real path. PR pipelines should pass the merge-base reference (see the GitHub Actions example below).

## `--baseline`

Compare against a previous run and fail on regression (coverage dropped **or** new findings appeared):

```sh
typescope scan --format json > typescope-baseline.json   # once, commit the file
typescope scan --baseline typescope-baseline.json
```

The baseline is a regular JSON report; its `schemaVersion` is validated, so baselines from incompatible versions are rejected with an actionable message instead of comparing garbage. Comparison keys on `file:line:column:rule` — code that moved shows up as "new" findings; this imprecision is accepted because finding *some* noise is better than hiding *real* regressions. The report prints the coverage delta in percentage points, new and resolved finding counts.

Typical flow: gate with `--fail-under` on every PR, refresh the baseline deliberately when you improve ("ratchet"), and let `--baseline` catch slow leaks in between.

## GitHub Actions

```yaml
name: typescope
on: [pull_request]
jobs:
  type-safety:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0          # full history so merge-base works
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install -g typescope   # once published (see README)
      - name: Type safety gate
        run: |
          BASE=$(git merge-base origin/${{ github.base_ref }} HEAD)
          typescope scan --changed "$BASE" --fail-under 80
      - name: Upload HTML report
        if: always()
        run: typescope scan --format html
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: typescope-report
          path: typescope-report.html
```

`fetch-depth: 0` matters: `--changed` needs the merge base to exist locally. The HTML upload always runs, so failing builds still show *what* regressed.

## Notes

- `git` must be installed and the project directory must be inside a work tree when `--changed` is used — otherwise a usage error (exit 2) explains what is missing.
- Baseline comparison only affects the exit code; the JSON report schema (v1) is unchanged, so existing consumers keep working.
