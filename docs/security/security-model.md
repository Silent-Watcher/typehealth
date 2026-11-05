# Security Model

TypeScope analyzes untrusted code. The rules below are the project's security contract; violations are bugs and get regression tests.

## Analyzed projects are untrusted input

- **Analyzed source code is never executed.** All analysis is static, via the TypeScript Compiler API. No project JavaScript is evaluated, imported or required.
- **No arbitrary code evaluation.** The tsconfig is parsed by the TypeScript API, not executed; no plugin/transpiler hooks are honored.
- **File discovery is scoped.** Only files inside the resolved project directory are analyzed, even if tsconfig patterns reach outside (see [Analysis Engine](/concepts/analysis-engine)). `node_modules`, `dist`, `build`, `coverage` and declaration files are excluded by default.
- **CLI arguments are validated.** `--cwd` must be an existing directory, `--config` an existing file, `--format` a known value; everything else fails with exit code 2 rather than being passed through.
- **Reports escape nothing less than everything source-derived.** Filenames, messages and code positions originate in the analyzed project. The terminal report writes plain text; the HTML report (Phase 7) will HTML-escape all source-derived content and load no remote assets. JSON output (Phase 7) is generated with a serializer, never string concatenation of source text.
- **No writes outside what the user asked for.** The scan command never modifies the analyzed project.
- **No shell construction from user or project input.** No `exec`/`spawn` of analyzed content anywhere.

## Error handling

- Ordinary CLI users see actionable one-line messages, not stack traces.
- Unexpected internal errors exit with code 1 and are treated as reportable bugs.
- Malformed tsconfigs are reported with TypeScript's own diagnostics, which point at file and position without dumping file contents wholesale.

## Current limitations

- Symlink traversal is on the Phase 8 hardening list; today, discovery follows the tsconfig's own resolution.
- Excessively large source files have no size guard yet (Phase 8).
- See [Runtime Boundaries](/concepts/runtime-boundaries) for why boundary findings are advisory heuristics, never security verdicts.
