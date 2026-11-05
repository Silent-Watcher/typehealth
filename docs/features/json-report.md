# JSON Report

`typehealth scan --format json` prints a machine-readable report to stdout — deterministic, versioned and self-describing. Built for CI jobs, dashboards and diffing between runs.

## Schema (version 1)

```json
{
  "schemaVersion": 1,
  "tool": { "name": "typehealth", "version": "0.1.0" },
  "project": {
    "directory": "/tmp/demo-api",
    "configPath": "/tmp/demo-api/tsconfig.json",
    "durationMs": 197,
    "files": 2
  },
  "metrics": {
    "typeCoverage": 0.4,
    "eligiblePositions": 10,
    "typedPositions": 4,
    "explicitAny": 4,
    "implicitAny": 3,
    "unsafeAssertions": 1,
    "nonNullAssertions": 1,
    "suppressions": 0,
    "runtimeBoundaries": 4,
    "weakStrictnessFlags": 9
  },
  "files": [
    {
      "file": "/tmp/demo-api/src/payment.service.ts",
      "typeCoverage": 0.5,
      "eligiblePositions": 4,
      "typedPositions": 2,
      "explicitAny": 1,
      "implicitAny": 1,
      "unsafeAssertions": 0,
      "nonNullAssertions": 1,
      "suppressions": 0,
      "runtimeBoundaries": 1
    }
  ],
  "findings": [
    {
      "file": "/tmp/demo-api/src/payment.service.ts",
      "line": 1,
      "column": 7,
      "rule": "explicit-any",
      "severity": "medium",
      "message": "Explicit any type usage."
    }
  ],
  "metricDefinitions": {
    "typeCoverage": "typedPositions / eligiblePositions. …",
    "…": "…"
  }
}
```

(Truncated for readability; every report embeds the full `metricDefinitions` map so a report is self-describing years later.)

## Guarantees

- **Versioned**: `schemaVersion` is bumped on any breaking shape change. Parse defensively if you build tooling on top.
- **Deterministic ordering**: `files` are sorted by path, `findings` by (file, line, column, rule). Two scans of identical input produce identical ordering — safe for `diff` and for snapshot tests. The only field that varies between runs is `project.durationMs`.
- **Self-describing**: `metricDefinitions` carries the exact formula for every metric.
- **No timestamps**: reports contain no wall-clock data, so they can be committed and compared across machines.

`typeCoverage` is `null` (JSON `null`) when a project has no eligible positions — never a fake `100%`.
