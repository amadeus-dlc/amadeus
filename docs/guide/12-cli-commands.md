# CLI Commands

This chapter is a reference for the `/amadeus [command]` surface: everything you can type after `/amadeus` inside your harness. It is captured directly from the tool's own `--help` output, run in an isolated workspace — nothing below is paraphrased from memory. The full output is 50 lines long; it is reproduced below split across the four sections the tool itself prints (Scopes, Utilities, Other, Examples), with nothing altered beyond that split.

For what the forwarding loop actually does with a command once you type it — the `next` / `report` cycle against the engine — see [Your First Workflow](02-first-workflow.md).

## Overview

The help header names the entrypoint and its usage form:

```
AI-DLC — AI-Driven Development Life Cycle

Usage: /amadeus [command]
```

`/amadeus --help` prints this whole reference on demand, so the sections below are always one command away from your own terminal; `/amadeus --version` prints just the framework version.

## Scopes

```
Scopes (set depth, test strategy, and stage count):
  bugfix            7 of 32 stages, minimal depth — Fix a specific bug
  enterprise        All 32 stages, comprehensive depth — Regulated enterprise feature, full audit trail
  feature           All 32 stages, standard depth (default) — Default for new features, practical depth
  infra             13 of 32 stages, standard depth — Infrastructure changes
  mvp               22 of 32 stages, standard depth — Skip operations, ship the core
  pdm               12 of 32 stages, standard depth — Product planning and requirements definition without implementation
  poc               8 of 32 stages, minimal depth — Prove feasibility fast
  refactor          8 of 32 stages, minimal depth — Clean up existing code
  security-patch    10 of 32 stages, minimal depth — CVE response
  workshop          25 of 32 stages, standard depth, minimal test strategy — Facilitated group session with mandatory gates
```

Each row is a scope name followed by how it sets the three things the parenthetical calls out: how many of the 32 stages it runs, its depth, and — for `workshop`, the one scope that overrides it — its test strategy. `feature` is the default: run `/amadeus feature` (or `/amadeus` with no scope named) to get it. The exact EXECUTE/SKIP stage set behind each "N of 32 stages" figure is defined in the [scopes contract](../amadeus/lifecycle/scopes.md), not repeated here.

## Utilities

```
Utilities:
  --status          Show current workflow progress (read-only)
  compose "<task>"  Propose a tailored EXECUTE/SKIP plan (mid-workflow: re-shape the pending stages)
  compose --report <path>  Compose from a scan report (triage findings into a fix-and-ship run)
  --new-scope "<task>"  Force the composer to synthesize a custom scope even when a stock scope matches
  intent            List intents in the active space (read-only; --json for structured output)
  intent <name>     Switch the active intent
  space             List spaces (read-only; --json for structured output)
  space <name>      Switch the active space (team)
  space-create <name>  Create a new space (team) seeded from the framework baseline
  codekb-path       Print the deterministic per-repo codekb directory (read-only)
  --doctor          Run health check on hooks, settings, and directory structure
  --stage <id>      Jump to a specific stage (by slug or number, e.g., code-generation or 3.5)
  --phase <name>    Jump to the first in-scope stage of a phase (e.g., construction or 3)
  --scope <scope>   Set or change scope (standalone or with --stage/--phase)
  --depth <level>   Override depth (minimal, standard, comprehensive)
  --test-strategy <level>  Override test strategy (minimal, standard, comprehensive)
  --version         Show the framework version
  --help            Show this help message
```

These 18 lines split into two clusters:

- **Read-only** — `--status`, `intent` and `space` *with no argument* (they list), `codekb-path`, `--doctor`, `--version`, and `--help` only inspect the workspace; none of them changes what the engine runs next.
- **State- or workflow-changing** — `intent <name>` and `space <name>` switch the active cursor, so everything `/amadeus` does afterwards targets the switched-to intent or space; treat them as steering commands, not safe inspection. `compose "<task>"`, `compose --report <path>`, `--new-scope "<task>"`, `--stage <id>`, `--phase <name>`, `--scope <scope>`, `--depth <level>`, and `--test-strategy <level>` all change what the workflow does next, whether by proposing a tailored plan or by jumping or overriding the active one. `space-create <name>` sits in neither cluster: it provisions a new space without inspecting or steering an existing workflow.

`--stage` and `--phase` accept the slug or number shown in their own descriptions (e.g. `code-generation` or `3.5`; `construction` or `3`); what the engine does once it receives that jump is the `next`/`report` mechanics covered in [Your First Workflow](02-first-workflow.md), not repeated here.

## Other

```
Other:
  <description>     Describe what to build — scope is auto-detected
  (no arguments)    Resume existing workflow, or start fresh if none exists
```

Typing a freeform description instead of a scope or flag — `/amadeus Fix the login timeout bug`, say — hands the engine text to auto-detect a scope from, rather than one you name explicitly. Running `/amadeus` with nothing after it resumes whatever workflow is already active, or starts a fresh one if none exists; [Your First Workflow](02-first-workflow.md) walks through both the birth that follows and the state it produces.

## Examples

```
Examples:
  /amadeus feature                                Start a feature workflow
  /amadeus Fix the login timeout bug              Auto-detected as bugfix scope
  /amadeus compose "harden the deploy pipeline"   Composer proposes a tailored plan
  /amadeus                                        Resume or begin
  /amadeus --stage code-generation                Jump to code-generation stage
  /amadeus --phase construction --scope bugfix    Jump to construction with bugfix scope
  /amadeus --scope bugfix --depth comprehensive  Bugfix with comprehensive depth
  /amadeus --depth minimal                       Change depth of active workflow
  /amadeus --depth standard --test-strategy minimal  Full artifacts, minimal tests
```

Each line combines a scope, a jump, or an override from the two sections above; none of them introduces anything beyond what Scopes, Utilities, and Other already describe.

## Next steps

For what happens inside the engine once a command lands — the `next`/`report` loop, birth, and the state it writes — see [Your First Workflow](02-first-workflow.md). For the stage-by-stage detail behind `--stage`, `--phase`, and each scope's EXECUTE/SKIP set, see the [Lifecycle Contract Overview](../amadeus/lifecycle/overview.md) and the [scopes contract](../amadeus/lifecycle/scopes.md). The guide [index](index.md) tracks the status of every chapter.
