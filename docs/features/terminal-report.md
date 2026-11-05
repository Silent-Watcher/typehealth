# Terminal Report

The default output format. Designed to be readable in a terminal and safe in CI logs.

## Example

Real output from `typehealth scan` on a small API project:

```text
╭──────────────────────╮
│ TYPEHEALTH            │
│ Type Safety Analyzer │
╰──────────────────────╯

Project  /tmp/demo-api
Config   /tmp/demo-api/tsconfig.json
Files    2
Duration 0.19s

TYPE COVERAGE ██████████░░░░░░░░░░░░░░ 40.0% (10 positions)

METRICS
  Explicit any            4
  Implicit any            3
  Unsafe assertions       1
  Non-null assertions     1
  Suppressions            0
  Unvalidated boundaries  4
  Weak strictness flags   9

FILE HEALTH
  src/webhook.controller.ts      █████░░░░░░░░░░░ 33%
  src/payment.service.ts         ████████░░░░░░░░ 50%

TOP FINDINGS
  [HIGH] /tmp/demo-api/src/webhook.controller.ts:7 Type assertion to any.
  [MEDIUM] /tmp/demo-api/src/payment.service.ts:1 Explicit any type usage.
  [MEDIUM] /tmp/demo-api/src/payment.service.ts:4 Type is implicitly any.
  [MEDIUM] /tmp/demo-api/src/payment.service.ts:4 JSON.parse result used without recognized runtime validation (uncertain).
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:3 Explicit any type usage.
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:3 Explicit any type usage.
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:4 Type is implicitly any.
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:4 External request data accessed without recognized runtime validation (uncertain).
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:5 External HTTP response used without recognized runtime validation (uncertain).
  [MEDIUM] /tmp/demo-api/src/webhook.controller.ts:6 Type is implicitly any.

Analysis completed successfully.
```

## Sections

| Section | Content |
|---------|---------|
| Header | Tool identity box |
| Project info | Analyzed directory, resolved tsconfig, file count, wall-clock duration |
| TYPE COVERAGE | The headline metric with a progress bar and the absolute position count behind it — a percentage without its denominator is meaningless |
| METRICS | All independent counters from [Metric Definitions](/reference/metric-definitions) |
| FILE HEALTH | Up to 5 files with the lowest coverage, worst first. Files with no eligible positions are excluded. Long paths are shortened from the left |
| TOP FINDINGS | Up to 10 findings, highest severity first. Every finding links a file, a line and a message |

## Color behavior

- Green: healthy metrics (coverage ≥ 80%), success footer.
- Yellow: warnings (coverage 50–79%), medium-severity findings.
- Red: critical results (coverage < 50%), high/critical findings.
- Cyan: labels; gray: metadata and zero counts.

Color is disabled automatically and the text renders plain when:

- stdout is not a TTY (pipes, CI),
- the `NO_COLOR` environment variable is set,
- `--no-color` is passed.

## Progress model

The report is **static**: nothing is redrawn, nothing animates. This is deliberate — analysis is fast (well under a second for typical projects), a spinner would be noise, and static output cannot corrupt CI logs. The `Duration` line is the only timing signal. If future benchmarks show slow scans (see [Performance](/development/performance)), a real per-file progress display will be added then — never a fake one.
