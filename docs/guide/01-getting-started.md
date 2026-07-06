# Getting Started

## Prerequisites

- [Bun](https://bun.sh) — runs every Amadeus CLI tool (`amadeus-utility.ts`, `amadeus-orchestrate.ts`, and the rest of `.agents/amadeus/tools/`) as well as the installer itself.
- git — the installer runs from a clone of the Amadeus repository, not from a downloaded archive.
- A coding harness to drive the `amadeus` skill. This guide's examples assume Claude Code. Codex works too: `.agents/` alone is a complete, standalone install with no `.claude/` wiring required.

## Install

Clone the Amadeus repository, then run the installer from that clone, targeting the workspace you want Amadeus in:

```sh
git clone https://github.com/amadeus-dlc/amadeus.git
cd amadeus
bun run scripts/amadeus-install.ts --target <workspace>
```

or, equivalently:

```sh
npm run amadeus:install -- --target <workspace>
```

`<workspace>` is the project you want to run Amadeus DLC against — point it at your own project (an empty directory works fine for a first try; the example below installs into one).

Here is a real run, captured against a fresh workspace (its absolute path is shortened to `<workspace>` below; nothing else is altered):

```
amadeus-install: installing into <workspace>
[1/5] engine        .agents/amadeus/ (7 dirs, replaced)
[2/5] skills        .claude/skills/amadeus*, .agents/skills/amadeus* (replaced)
[3/5] symlinks      .claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools} (recreated)
[4/5] settings      .claude/settings.json (hooks merged: 11 entries, 0 duplicates)
[5/5] smoke         doctor check passed
note: workspace shell is seeded at your first /amadeus workflow (known state on a fresh install)
amadeus-install: done. Next: see README "導入後の検証" (doctor / amadeus-validator)
```

Step 5 runs `doctor` as a smoke check. The note about the workspace shell is expected on a fresh install: that shell is created by your first workflow run, not by the installer — [Verify the install](#verify-the-install) below shows the corresponding `doctor` line, and [Your First Workflow](02-first-workflow.md) shows it being seeded.

## What gets installed

- The engine, `.agents/amadeus/` (7 directories: `agents`, `amadeus-common`, `hooks`, `knowledge`, `scopes`, `sensors`, `tools`).
- The `amadeus*` skills, under both `.claude/skills/` and `.agents/skills/`.
- `.claude/{agents,amadeus-common,hooks,knowledge,scopes,sensors,tools}`, relative symlinks into `.agents/amadeus/`.
- `AMADEUS.md` at the workspace root, transformed for end users (development-only sections removed).
- The Amadeus hooks wiring, merged into `.claude/settings.json` — existing keys such as `env`, `permissions`, and other tools' hooks are left untouched.

Codex users need no `.claude/` wiring: `.agents/` alone is a complete, standalone install.

## Verify the install

```sh
bun <workspace>/.agents/amadeus/tools/amadeus-utility.ts doctor --project-dir <workspace>
bun run .agents/skills/amadeus-validator/validator/AmadeusValidator.ts <workspace>
```

`doctor` is the same health check the installer ran as its step 5; running it directly shows the full report instead of the installer's one-line summary. Right after a fresh install, everything passes:

```
AI-DLC Health Check
─────────────────────────────────────
✓  bun installed (required for CLI tools and hooks)
✓  amadeus-audit-logger.ts present
✓  amadeus-log-subagent.ts present
✓  amadeus-mint-presence.ts present
✓  amadeus-runtime-compile.ts present
✓  amadeus-sensor-fire.ts present
✓  amadeus-session-end.ts present
✓  amadeus-session-start.ts present
✓  amadeus-stop.ts present
✓  amadeus-sync-statusline.ts present
✓  amadeus-validate-state.ts present
✓  settings.json present
✓  AWS_AIDLC_DEFAULT_SCOPE (unset — no project default)
✓  workspace shell pending first workflow — seeded at first intent birth (run your first /amadeus workflow)
✓  Hook heartbeats: not yet fired (first workflow stage will populate)
✓  Audit locks: none leaked
✓  Orphan worktrees: 0 observed
✓  Stale branches: 0 (0 bolt-* observed)
✓  Orphan state files: 0 observed
✓  Orphan audit: 0 observed
✓  Practices staleness: state file absent (informational)
✓  MERGE_DISPATCH: 0 orphan INVOKED (0 bracketed)
✓  Cycle detection: 0 cycles
✓  Orphan stage files: 32 graph entries all have files
✓  Uncompiled stage files: 0 stage files missing from the compiled graph
✓  Scope validation: 10 scopes valid (27 advisories)
✓  Schema validation: 32/32 stages validated
✓  Graph references: 122 artifacts + edges resolved
✓  Keyword overlap: no conflicts
✓  Rule drift: org rules absent (informational)
✓  Paired sensor coverage: no sensor-bound rules (0 feedforward-only)
✓  Intent registry: all rows ⇄ record dirs reconciled
─────────────────────────────────────
32 passed, 0 failed
```

One line is worth reading closely: `workspace shell pending first workflow`. The installer copies the engine and the skills, but the Space shell — `amadeus/spaces/default/memory/` — is created by your first workflow run, not by the installer. The line flips to `workspace shell ready` as soon as you run your first workflow, which [Your First Workflow](02-first-workflow.md) demonstrates directly.

## Updating

To update, re-run the same install command against the same workspace:

```sh
bun run scripts/amadeus-install.ts --target <workspace>
```

It is idempotent: replaced content converges to the same result, and the hooks merge never creates duplicate entries.
