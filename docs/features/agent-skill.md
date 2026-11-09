# Agent Skill

TypeHealth ships an official [Agent Skill](https://github.com/vercel-labs/skills) that teaches AI coding agents (Claude Code, Cursor, Gemini CLI and other compatible agents) how to discover, run, and correctly act on TypeHealth results.

## What it does

The Skill is operational knowledge, not another analyzer. It instructs an agent to:

- detect whether TypeHealth is installed and how to run it with the project's package manager;
- prefer `typehealth scan --format markdown` when reading results;
- interpret each metric correctly (`n/a` vs `0`, heuristics vs measured counts);
- investigate findings before changing code — findings are evidence, not instructions;
- fix issues incrementally without `as any`, `@ts-ignore` or other suppressions;
- re-run TypeHealth and validate changes instead of claiming unverified improvement;
- never game the metrics (no hiding findings, excluding files, or weakening tsconfig).

Installing the Skill does **not** install the TypeHealth CLI — they are separate concerns, and the Skill explains both.

## Installation

Run this in any directory (the Skill installs into your agent's skill directory):

```sh
npx skills add Silent-Watcher/typehealth
```

Managing installed skills:

```sh
npx skills list              # verify installation
npx skills check             # check for updates
npx skills update            # update installed skills
npx skills remove typehealth # remove the skill
```

The `skills` CLI requires Node.js 22.20+. Skills are installed from this Git repository directly — no separate npm package is involved.

## Typical AI-assisted workflow

Once installed, just ask your agent to "measure type coverage", "improve type safety", or "analyze this project with typehealth". The agent will:

1. Run `typehealth scan --format markdown` and read the report.
2. Pick the highest-severity findings and read the surrounding code first.
3. Apply minimal, convention-respecting fixes.
4. Run the project's tests and typecheck.
5. Re-run TypeHealth to verify real improvement.

## Security notes

- Installing a skill from a Git repository executes installer code via npx — only install from sources you trust.
- The Skill never runs scripts from your analyzed project; TypeHealth itself never executes analyzed code.

## Troubleshooting

- **Agent does not use the skill** — verify installation with `npx skills list`, and check that your agent supports the Agent Skills format.
- **`typehealth: command not found`** — the Skill intentionally does not install the CLI. Add it as a dev dependency (`pnpm add -D typehealth`) or run it via `npx typehealth scan`.
- **No tsconfig found** — pass `--config path/to/tsconfig.json` or run inside the project directory.
