---
layout: home
hero:
  name: TypeHealth
  text: TypeScript Type Safety Analyzer
  tagline: Understand how effectively TypeScript's type system is used in your project. Real metrics, honest limitations, zero config.
  image:
    src: /logo.svg
    alt: TypeHealth logo
  actions:
    - theme: brand
      text: Introduction
      link: /guide/introduction
    - theme: alt
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: Live sample report
      link: /demo/typehealth-report.html
    - theme: alt
      text: Install Agent Skill ⚡
      link: /features/agent-skill
---

<style>
.sample-term {
  background: #0d1117;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-radius: 12px;
  padding: 18px 22px;
  font: 12.5px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
  overflow-x: auto;
}
.sample-term .t-b { color: #79c0ff; }
.sample-term .t-g { color: #3fb950; }
.sample-term .t-y { color: #d29922; }
.sample-term .t-r { color: #f85149; }
.sample-term .t-m { color: #8b949e; }
</style>

## One command, the whole picture

```sh
npx typehealth scan
```

<div class="sample-term">
<span class="t-m">╭──────────────────────╮<br>
│ </span><span class="t-b">TYPEHEALTH</span><span class="t-m">            │<br>
│ Type Safety Analyzer │<br>
╰──────────────────────╯</span><br>
<br>
Project&nbsp; /tmp/demo-api<br>
Files&nbsp;&nbsp;&nbsp; 2<br>
Duration 0.19s<br>
<br>
<span class="t-b">TYPE COVERAGE</span> <span class="t-y">██████████░░░░░░░░░░░░░░ 40.0%</span> <span class="t-m">(10 positions)</span><br>
<br>
<span class="t-b">METRICS</span><br>
&nbsp;&nbsp;Explicit any&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="t-y">4</span><br>
&nbsp;&nbsp;Implicit any&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="t-y">3</span><br>
&nbsp;&nbsp;Unsafe assertions&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="t-y">1</span><br>
&nbsp;&nbsp;Non-null assertions&nbsp;&nbsp;&nbsp; <span class="t-y">1</span><br>
&nbsp;&nbsp;Suppressions&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <span class="t-m">0</span><br>
&nbsp;&nbsp;Unvalidated boundaries&nbsp; <span class="t-y">4</span><br>
&nbsp;&nbsp;Weak strictness flags&nbsp;&nbsp; <span class="t-r">9</span><br>
<br>
<span class="t-b">FILE HEALTH</span><br>
&nbsp;&nbsp;src/webhook.controller.ts&nbsp;&nbsp;<span class="t-r">█████░░░░░░░░░░░ 33%</span><br>
&nbsp;&nbsp;src/payment.service.ts&nbsp;&nbsp;&nbsp;&nbsp; <span class="t-y">████████░░░░░░░░ 50%</span><br>
<br>
<span class="t-b">TOP FINDINGS</span><br>
&nbsp;&nbsp;<span class="t-r">[HIGH]</span> src/webhook.controller.ts:7 Type assertion to any.<br>
&nbsp;&nbsp;<span class="t-y">[MEDIUM]</span> src/payment.service.ts:4 JSON.parse result used without recognized runtime validation (uncertain).<br>
<br>
<span class="t-g">Analysis completed successfully.</span>
</div>

## What it measures — and why it matters

- **Where is type checking not happening?** Type coverage counts *positions*, shows the absolute denominator, and ranks your worst files first — a percentage without its denominator is meaningless.
- **Where does `any` sneak in?** Explicit and implicit `any` are reported separately: a deliberate `any` is a decision, a silent one is an accident.
- **Which assertions are dangerous?** `as any`, double assertions and casts between unrelated types are flagged. Legitimate casts are not.
- **Where does untrusted data enter?** HTTP inputs, `JSON.parse`, HTTP responses and queue payloads — reported as *potentially* unvalidated and labeled uncertain, because static analysis cannot prove runtime safety.
- **Is the compiler even helping?** Every disabled strictness option, listed per project.

Every metric is independent with a [documented formula](/reference/metric-definitions). No arbitrary score, ever.

## Built for AI coding agents

Install the official Agent Skill and your AI assistant (Claude Code, Cursor, Gemini CLI, …) knows how to run TypeHealth, read the results, and fix type-safety issues the right way — investigating before changing code, never silencing errors with `as any` or `@ts-ignore`, and never gaming the metrics.

```sh
npx skills add Silent-Watcher/typehealth
```

What the Skill brings: automatic detection of installed CLI and project setup · correct CLI usage with the AI-optimized Markdown report · correct metric interpretation · an incremental, evidence-driven fixing workflow · verification loops with real re-scans. [Learn more →](/features/agent-skill)

## Four output formats, one engine

**JSON** — deterministic, versioned, self-describing. Byte-identical across runs on identical input (only the duration varies), safe to commit, diff and snapshot:

```json
{
  "schemaVersion": 1,
  "tool": { "name": "typehealth", "version": "0.1.0" },
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
  "findings": [
    {
      "file": "src/payment.service.ts",
      "line": 4,
      "column": 15,
      "rule": "unvalidated-boundary",
      "severity": "medium",
      "message": "JSON.parse result used without recognized runtime validation (uncertain)."
    }
  ],
  "metricDefinitions": { "typeCoverage": "typedPositions / eligiblePositions. …" }
}
```

**HTML** — a single self-contained file: zero JavaScript, no remote assets, full escaping of source-derived content, works offline. [Open a live sample →](/demo/typehealth-report.html)

**Terminal** — what you saw above: static, CI-log-safe, `NO_COLOR` aware.

**Markdown** — deterministic, escape-safe, severity-ordered: purpose-built for AI agents and context windows, with `n/a` vs `0` distinguished and nothing truncated. [See the format →](/features/ai-report)

## Built for CI from day one

```sh
# fail when coverage drops below 80%
typehealth scan --fail-under 80

# only what changed in this PR (validated git reference)
typehealth scan --changed origin/main

# ratchet: fail on coverage drops or new findings vs a committed baseline
typehealth scan --format json > typehealth-baseline.json
typehealth scan --baseline typehealth-baseline.json
```

Exit codes: `0` pass · `1` gate failure · `2` usage error. A complete [GitHub Actions recipe](/features/ci-integration) — merge-base, artifact upload and all — is in the docs.

## Security is a contract, not a promise

Analyzed projects are untrusted input: your code is **never executed**, file discovery is scoped to your project via `realpath` (symlinks cannot smuggle outside content), oversized files are skipped with a finding, unreadable files are surfaced instead of silently dropped, and HTML reports escape everything source-derived. Details in the [security model](/security/security-model).
