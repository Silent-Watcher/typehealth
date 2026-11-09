# Changelog

All notable changes to this project are documented in this file. The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-11-09

### Added

- **AI-optimized Markdown report** — `typehealth scan --format markdown` renders the analysis as deterministic, escape-safe Markdown optimized for LLM/AI-agent consumption: stable section headings, severity-ordered findings, repo-relative paths, `n/a` vs `0` distinction, no ANSI codes, no truncation.
- **Official Agent Skill** — `skills/typehealth/SKILL.md` in the Agent Skills format, installable into AI coding agents via `npx skills add Silent-Watcher/typehealth`. Teaches agents how to install, run, interpret and safely act on TypeHealth results, including anti-gaming rules.
- Documentation: new [AI Markdown Report](docs/features/ai-report.md) and [Agent Skill](docs/features/agent-skill.md) guides; landing page now includes the Skill install command and an AI-agent value overview.
- Automated validation tests for the Markdown renderer (structure, determinism, injection safety) and the Skill (documented flags/sections/metrics cross-checked against the real sources).

### Changed

- Nothing removed; all existing output formats (`terminal`, `json`, `html`), CLI options, exit codes and gating behavior are unchanged.

## [0.9.0]

Initial public release: core analyzer with independent type-safety metrics, terminal/JSON/HTML reports, CI gating (`--changed`, `--fail-under`, `--baseline`), deterministic findings, and security hardening for untrusted analyzed projects.
