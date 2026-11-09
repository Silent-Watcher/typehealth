# AI-Optimized Markdown Report

`--format markdown` renders the analysis as a compact, deterministic Markdown document designed for consumption by LLMs and AI coding agents — and still perfectly readable by humans.

```sh
typehealth scan --format markdown
```

## Why a dedicated format

The terminal report is decorated for humans (bars, boxes, color). The JSON report is complete but verbose for context-window-constrained agents. The Markdown report is a first-class format, not a conversion: stable headings, compact tables, severity-ordered findings, and escaping that keeps source-derived content (messages, file names) from altering the document structure.

## Report structure

Sections always appear in this order:

1. **Project Context** — tool version, report format version, project root, resolved tsconfig, analyzed file count.
2. **Executive Summary** — type coverage as `typed/eligible` positions, finding counts per severity, and the analysis limitations (the `runtimeBoundaries` heuristic; skipped files).
3. **Metrics** — one table row per metric. `n/a` means the metric is undefined (e.g. no eligible positions); `0` is a measured zero. The two are never conflated.
4. **File Health** — every analyzed file with coverage and metric counts. Nothing is truncated or silently dropped.
5. **Findings** — severity-descending list: `[SEVERITY] path:line:column rule: message`.
6. **Recommended Investigation Areas** — references to the five most severe findings. Pointers only; no speculative code fixes.

## Properties

- **Deterministic** — identical input produces byte-identical output; no timestamps. Safe to commit, diff and feed to an agent repeatedly.
- **No ANSI codes, no decorations** — clean for AI context windows and CI logs.
- **Repo-relative paths** — files under the project root are shown relative to it.
- **Escape-safe** — backticks, pipes, newlines, HTML tags and Markdown structure injection in source-derived strings are neutralized, so a malicious file cannot alter the report structure.
- **Complete** — all findings and all files are preserved; truncation would silently hide problems.

## Compatibility

Works with every scan option: `--cwd`, `--config`, `--changed`, `--fail-under`, `--baseline`, `--no-color`. Exit codes are unchanged: the report is printed to stdout even when a gate (`--fail-under`, `--baseline`) fails, so an agent can read the findings and act.

## Example

```markdown
# TypeHealth Report

## Executive Summary

- Type coverage: 40.0% (4/10 eligible positions)
- Findings: 6 total (info: 0, low: 0, medium: 2, high: 1, critical: 0)

## Metrics

| Metric | Value |
| --- | --- |
| typeCoverage | 0.4 |
| explicitAny | 4 |
| ... | ... |

## Findings

- [HIGH] src/webhook.controller.ts:7:20 unsafe-assertion: Type assertion to any.
```
