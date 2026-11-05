# HTML Report

`typescope scan --format html` writes a single self-contained HTML file and prints its path:

```sh
$ typescope scan --format html
Report written to /home/you/typescope-report.html
```

The report is written to the **invoking user's current working directory**, never into the analyzed project (unless that is where you run from — then it is the one file you asked for).

## Contents

- **Headline type coverage** with a color-coded bar and the absolute position counts.
- **Metric cards** for all seven independent metrics; zero values dimmed.
- **Severity distribution** table (critical → info).
- **File health** table, lowest coverage first, per-file bars with typed/eligible positions.
- **Findings grouped by file**, each with severity badge and line/column, expandable via `<details>`.
- Footer with tool version and schema version.

## Security properties

The analyzed project is untrusted input, and the HTML report renders its data. Therefore:

- **Every source-derived string is HTML-escaped** — filenames, paths, messages. A file named `<script>x</script>.ts` renders as text, never as markup.
- **Zero JavaScript.** The report is pure HTML + inline CSS; there is nothing to inject into and nothing to exploit.
- **No remote assets.** No CDN links, no fonts, no trackers — the report works fully offline and leaks nothing about your codebase to third parties.
- **One file.** Inline styles only; send it to a colleague as an attachment.

## Layout

Responsive via CSS grid/flex with a 960px max width — usable on laptops, tablets and CI artifact browsers. Dark GitHub-style palette.

::: tip
Combine with CI: run `typescope scan --format html` in your pipeline and upload `typescope-report.html` as a build artifact. See [Exit Codes](/reference/exit-codes) for CI gating (full `--fail-under` support lands in Phase 9).
:::
