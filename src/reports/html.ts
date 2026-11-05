import type { AnalysisResult, FileMetrics } from '../core/analyzer.ts'
import type { Finding, Severity } from '../core/findings.ts'
import type { ReportInput } from './json.ts'
import { SCHEMA_VERSION } from './schema.ts'
import { name, version } from '../index.ts'

/** Escape all HTML-significant characters. Everything derived from the
 *  analyzed project (paths, messages) must pass through this. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

const SEVERITY_CLASS: Record<Severity, string> = {
  info: 'sev-info',
  low: 'sev-low',
  medium: 'sev-medium',
  high: 'sev-high',
  critical: 'sev-critical',
}

const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low', 'info']

/** Render a fully self-contained HTML report: inline CSS, zero JavaScript,
 *  no remote assets, works offline. */
export function renderHtmlReport(input: ReportInput): string {
  const { analysis, projectDir, configPath } = input
  const p = analysis.project
  const coverage = p.typeCoverage
  const coveragePct = coverage === null ? 'n/a' : `${(coverage * 100).toFixed(1)}%`
  const coverageColor = coverage === null ? 'muted' : coverage >= 0.8 ? 'green' : coverage >= 0.5 ? 'yellow' : 'red'

  const cards = [
    ['Explicit any', p.explicitAny],
    ['Implicit any', p.implicitAny],
    ['Unsafe assertions', p.unsafeAssertions],
    ['Non-null assertions', p.nonNullAssertions],
    ['Suppressions', p.suppressions],
    ['Unvalidated boundaries', p.runtimeBoundaries],
    ['Weak strictness flags', p.weakStrictnessFlags],
  ]
    .map(
      ([label, value]) =>
        `<div class="card"><div class="card-value ${value === 0 ? 'muted' : ''}">${value}</div><div class="card-label">${label}</div></div>`,
    )
    .join('\n        ')

  const severityRows = SEVERITIES.map((severity) => {
    const count = analysis.findings.filter((f) => f.severity === severity).length
    return `<tr><td><span class="badge ${SEVERITY_CLASS[severity]}">${severity}</span></td><td class="num">${count}</td></tr>`
  }).join('\n          ')

  const fileRows = analysis.files
    .filter((f) => f.typeCoverage !== null && f.eligiblePositions > 0)
    .sort((a, b) => (a.typeCoverage ?? 1) - (b.typeCoverage ?? 1) || a.file.localeCompare(b.file))
    .map((f) => fileRow(f))
    .join('\n        ')

  const findingsByFile = groupByFile(analysis.findings)
  const findingSections =
    findingsByFile.length === 0
      ? '<p class="muted">No findings. Type system looks clean.</p>'
      : findingsByFile
          .map(
            ([file, findings]) => `
      <details open>
        <summary>${escapeHtml(shorten(file))} <span class="badge-count">${findings.length}</span></summary>
        <ul class="findings">
          ${findings.map((f) => findingRow(f)).join('\n          ')}
        </ul>
      </details>`,
          )
          .join('\n')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TypeScope Report</title>
<style>
  :root { --bg:#0d1117; --fg:#e6edf3; --muted:#8b949e; --card:#161b22; --border:#30363d;
          --green:#3fb950; --yellow:#d29922; --red:#f85149; --accent:#58a6ff; --gray:#6e7681 }
  * { box-sizing: border-box }
  body { margin:0; background:var(--bg); color:var(--fg);
         font:14px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif }
  main { max-width:960px; margin:0 auto; padding:32px 16px 64px }
  h1 { font-size:1.5rem; margin:0 } h2 { font-size:1.05rem; margin:32px 0 12px }
  a { color:var(--accent) } .muted { color:var(--muted) } .num { text-align:right }
  header .meta { color:var(--muted); margin:4px 0 0; overflow-wrap:anywhere }
  .bar { height:10px; background:#21262d; border-radius:99px; overflow:hidden; flex:1 }
  .bar > span { display:block; height:100%; border-radius:99px }
  .fill-green { background:var(--green) } .fill-yellow { background:var(--yellow) } .fill-red { background:var(--red) }
  .coverage { display:flex; align-items:center; gap:16px; background:var(--card);
              border:1px solid var(--border); border-radius:8px; padding:16px 20px; margin-top:20px }
  .coverage .pct { font-size:1.9rem; font-weight:700; min-width:7ch }
  .coverage .pct.green { color:var(--green) } .coverage .pct.yellow { color:var(--yellow) } .coverage .pct.red { color:var(--red) }
  .cards { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:10px; margin-top:16px }
  .card { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:14px 16px }
  .card-value { font-size:1.4rem; font-weight:700 } .card-value.muted { color:var(--gray) }
  .card-label { color:var(--muted); font-size:.85rem }
  table { width:100%; border-collapse:collapse }
  th, td { text-align:left; padding:6px 10px; border-bottom:1px solid var(--border) }
  th { color:var(--muted); font-weight:400 }
  td.path { max-width:340px; overflow-wrap:anywhere }
  details { background:var(--card); border:1px solid var(--border); border-radius:8px; padding:10px 16px; margin-bottom:10px }
  summary { cursor:pointer; font-weight:600; overflow-wrap:anywhere }
  .badge-count { color:var(--muted); font-weight:400 }
  ul.findings { list-style:none; margin:8px 0 4px; padding:0 }
  ul.findings li { padding:4px 0; border-top:1px solid var(--border); overflow-wrap:anywhere }
  .badge { display:inline-block; border-radius:99px; padding:0 10px; font-size:.75rem; font-weight:600 }
  .sev-critical,.sev-high { background:var(--red); color:#0d1117 }
  .sev-medium { background:var(--yellow); color:#0d1117 }
  .sev-low,.sev-info { background:var(--gray); color:#0d1117 }
  footer { color:var(--muted); margin-top:40px; font-size:.85rem }
</style>
</head>
<body>
<main>
  <header>
    <h1>TypeScope <span class="muted">· Type Safety Analyzer</span></h1>
    <p class="meta">${escapeHtml(projectDir)}<br>tsconfig: ${escapeHtml(configPath)} · ${p.files} files · ${Math.round(analysis.durationMs)} ms · schema v${SCHEMA_VERSION}</p>
  </header>

  <section class="coverage">
    <div class="pct ${coverageColor}">${coveragePct}</div>
    <div style="flex:1">
      <div style="display:flex;align-items:center;gap:12px">
        <div class="bar"><span class="fill-${coverageColor}" style="width:${coverage === null ? 0 : Math.round(coverage * 100)}%"></span></div>
      </div>
      <p class="muted" style="margin:6px 0 0">Type coverage · ${p.eligiblePositions} eligible positions · ${p.typedPositions} typed</p>
    </div>
  </section>

  <h2>Metrics</h2>
  <section class="cards">
        ${cards}
  </section>

  <h2>Severity distribution</h2>
  <table>
    <thead><tr><th>Severity</th><th class="num">Findings</th></tr></thead>
    <tbody>
          ${severityRows}
    </tbody>
  </table>

  <h2>File health <span class="muted">(lowest coverage first)</span></h2>
  <table>
    <thead><tr><th>File</th><th>Coverage</th><th class="num">Positions</th></tr></thead>
    <tbody>
        ${fileRows}
    </tbody>
  </table>

  <h2>Findings <span class="muted">(${analysis.findings.length})</span></h2>
      ${findingSections}

  <footer>Generated by ${name} v${version} · static report, works offline · metric definitions in the documentation</footer>
</main>
</body>
</html>
`
}

function fileRow(f: FileMetrics): string {
  const ratio = f.typeCoverage ?? 0
  const pct = `${(ratio * 100).toFixed(1)}%`
  const fill = ratio >= 0.8 ? 'fill-green' : ratio >= 0.5 ? 'fill-yellow' : 'fill-red'
  return `<tr>
          <td class="path">${escapeHtml(shorten(f.file))}</td>
          <td style="min-width:180px"><div class="bar"><span class="${fill}" style="width:${Math.round(ratio * 100)}%"></span></div></td>
          <td class="num">${pct} · ${f.typedPositions}/${f.eligiblePositions}</td>
        </tr>`
}

function findingRow(f: Finding): string {
  return `<li><span class="badge ${SEVERITY_CLASS[f.severity]}">${f.severity}</span> line ${f.line}:${f.column} — ${escapeHtml(f.message)}</li>`
}

function groupByFile(findings: Finding[]): Array<[string, Finding[]]> {
  const map = new Map<string, Finding[]>()
  for (const finding of findings) {
    const list = map.get(finding.file)
    if (list === undefined) map.set(finding.file, [finding])
    else list.push(finding)
  }
  return [...map.entries()]
}

function shorten(file: string): string {
  const base = file.split('/').slice(-2).join('/')
  return base
}
