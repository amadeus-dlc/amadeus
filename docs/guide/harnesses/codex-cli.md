# AI-DLC on Codex CLI

> Languages: **English** | [日本語](codex-cli.ja.md)

`dist/codex/` is one of the framework's harness distributions, for the
OpenAI **Codex CLI** harness. One deterministic core, many harnesses: the
engine, state machine, audit log, graph, swarm referee, and learnings gate are
byte-identical across every distribution — only the shell differs. The
tree is **generated** from `core/` + `harness/codex/` by `bun scripts/package.ts codex`;
never hand-edit it (the drift guard fails CI).

## Prerequisites

- **Codex CLI ≥ 0.139.0** — earlier releases do not surface the real agent
  role in subagent hook payloads and do not resolve hyphenated agent TOMLs.
  `/amadeus --doctor` enforces the pin. Check with `codex --version`.
- **bun** — same requirement as the Claude harness; every tool and hook runs
  via bun.
- **A model provider** — Codex uses your normal configured provider and model.
  The shipped project `config.toml.example` does not pin either one. Copy it to
  `.codex/config.toml` only when the project does not already have one. Put
  provider/model choices in `~/.codex/config.toml`, or add project-local
  overrides deliberately if your team wants this project to force a specific runtime.

## Install

1. Copy the distribution into your project (which must be a **git
   repository** — Codex only discovers a project `.codex/hooks.json` inside
   one):

   ```bash
   cp -r dist/codex/.codex/  your-project/.codex/
   cp -r dist/codex/.agents/ your-project/.agents/
   cp -r dist/codex/amadeus/   your-project/amadeus/      # the workspace shell (spaces/default/memory) — a sibling of .codex/, not inside it
   cp dist/codex/AGENTS.md   your-project/AGENTS.md   # or merge into yours
   cp -n your-project/.codex/config.toml.example your-project/.codex/config.toml
   cp -n your-project/.codex/hooks.json.example your-project/.codex/hooks.json
   ```

   The `amadeus/` directory is the workspace shell — it ships the pre-built
   `amadeus/spaces/default/memory/` method tree the engine reads. It is a
   **sibling** of `.codex/`, so copy it separately (or copy the whole
   `dist/codex/` tree at once). `$amadeus --doctor` fails its "workspace shell
   ready" check if it is missing.

2. Apply the `.gitignore` entries from the shipped `AGENTS.md` § "Git
   Integration" **before** starting a workflow — the per-clone audit shards
   under each intent's `audit/` are committed deliberately (each clone writes
   its own `<host>-<clone>.md`, so concurrent appends never git-conflict), while
   per-user cursors and machine-local runtime state stay ignored.

3. Trust the project. Codex trust is **two layers**, and both must be
   pre-seeded in `$CODEX_HOME/config.toml`:

   - **Layer 1 — project trust:** a `[projects."<abs-project-dir>"]` table with
     `trust_level = "trusted"`. This is the gate. **Without layer 1 Codex skips
     this project's entire `.codex` hook layer with no warning**, so layer 2
     never even runs.
   - **Layer 2 — hook trust:** the `[hooks.state."..."]` entries. Codex never
     runs untrusted hooks (the `--dangerously-bypass-hook-trust` flag does not
     run them either).

   `scripts/team-up.sh` seeds both layers automatically for each Codex member.
   To seed manually, either run one interactive TUI session and choose "Trust
   all and continue" at the hooks dialog, or pre-seed deterministically:

   ```toml
   # layer 1 — project trust (add by hand)
   [projects."/abs/path/to/your-project"]
   trust_level = "trusted"
   ```

   ```bash
   # layer 2 — hook trust (printed ready to paste)
   bun scripts/package.ts codex trust --project /abs/path/to/your-project
   ```

   The layer-2 command appends ready-to-paste `[hooks.state]` entries for
   `$CODEX_HOME/config.toml` (the hash covers the hook identity, not the path —
   the printed entries are exact for `hooks.json` created from the shipped
   `hooks.json.example`). `$amadeus --doctor` checks layer 1's presence loudly
   and reminds about layer 2.

4. Keep `.codex/config.toml` project-level only when the project intentionally
   owns Codex settings; otherwise keep provider/model choices in
   `~/.codex/config.toml`. Verify with:

   ```bash
   bun .codex/tools/amadeus-utility.ts doctor
   ```

## Use

Invoke the orchestrator with `$amadeus` (or `/skills` → amadeus) followed by a
scope or description — same commands as the Claude harness (`$amadeus --status`,
`$amadeus --help`, …). Stage runners are explicit-only:
`$amadeus-application-design`, `$amadeus-bugfix`, etc. (they are excluded from
implicit skill matching so 37 runner descriptions don't pollute the index).

## Harness differences vs Claude Code

- **Gates** always render as numbered prose (answer with a number or free text).
  Codex's built-in question-tool replies are not exposed to the shipped
  PostToolUse hooks, while a prose reply reaches the UserPromptSubmit adapter
  and mints the auditable `HUMAN_TURN` required by the human-presence guard.
  Gate semantics remain in the engine.
- **No custom statusline** — workflow position rides the `update_plan` tool
  (the `task-progress` statusline item) and `$amadeus --status`.
- **Git under the sandbox**: `workspace-write` keeps `.git` read-only
  in-sandbox by design. Interactive sessions auto-escalate, and the shipped
  `.codex/rules/default.rules` pre-allows `git worktree`/`commit`/`add`.
  Headless runs (CI, exec workers) need
  `writable_roots = ["<main repo>/.git"]` — template in the shipped
  `config.toml.example` template (linked worktrees resolve into `<main>/.git/worktrees/*`,
  so it must be the main repo's `.git`).
- **Construction swarm = native subagent fan-out** — one native subagent per
  Construction unit in its Bolt worktree, converging against the same
  deterministic referee. The conductor resolves `AMADEUS_USE_SWARM` against the
  harness: unset selects the subagent floor; `codex-ultra` selects native
  fan-out at reasoning effort=ultra; `claude-ultra` loud-degrades to the floor
  (`SWARM_DEGRADED` is audited); the legacy `1` or any other value is rejected
  fail-closed. **Breaking change**: the old headless `codex exec` per-unit
  worker floor is retired — there is no `codex exec` fallback. For the
  `codex-ultra` case, reasoning effort=ultra is accepted by the API and the
  child runs to completion — there is no telemetry that ultra was actually
  applied.
- **Session lifecycle**: Codex has no SessionEnd event; an unclosed session
  is reconciled as an inferred `SESSION_ENDED` audit row at the next session
  start. The Codex-only PostCompact event re-injects the workflow mission
  after compaction — a determinism upgrade over the Claude harness.
- **Artifact audit fidelity**: in headless `codex exec` runs the model often
  writes files via shell heredocs, which bypass the `apply_patch` hook
  matcher — `ARTIFACT_*` rows can be sparse. Interactive TUI sessions (where
  the system prompt mandates `apply_patch`) are the high-fidelity audit mode.
- **AIDLC rule layers** live at the workspace root under `amadeus/spaces/<space>/memory/` (one hand-editable source, identical on every harness); the `AMADEUS_RULES_DIR` env seam in `config.toml` points the resolver there and the orchestrator injects an `@amadeus/spaces/<space>/memory/...` prompt mention. Codex's native `.codex/rules/` directory holds Starlark permission rules — distinct from the AIDLC method.
- **No welcome message**: the Claude harness renders the Phases/Stages/Scopes
  onboarding banner from `settings.json` `companyAnnouncements` at session start;
  Codex has no equivalent. The session-start path injects resume context only.
- **MCP servers**: Codex reads MCP definitions from `[mcp_servers.<name>]`
  tables in `config.toml` (project `.codex/config.toml` or `~/.codex/config.toml`)
  — add the servers you need there. The shipped config declares **none** (the
  Claude and Codex both ship zero project MCP servers by default).

## Regenerating

```bash
bun scripts/package.ts codex          # regenerate dist/codex from core/ + harness/codex/
bun scripts/package.ts --check        # CI drift guard (every harness)
```

Core `.ts` files are byte-identical to their `core/tools/` and `core/hooks/`
sources (pinned by `tests/unit/t150-codex-packaging.test.ts`); prose carries the
`{{HARNESS_DIR}}` token the packager substitutes to `.codex` (plus the
`rules/` → `amadeus-rules/` rename), the one permitted transform class. The live
end-to-end journey is `tests/e2e/t-exec-codex-status.serial.test.ts` (gate:
`AMADEUS_CODEX_EXEC_LIVE=1`).

## Next steps

Installed and trusted? The methodology is the same on every harness — keep going
with the neutral chapters:

- [Your First Workflow](../02-your-first-workflow.md) — an annotated end-to-end run.
- [Phases and Stages](../04-phases-and-stages.md) — the 5 phases and 32 stages.
- [Scopes, Depth, and Test Strategy](../05-scopes-and-depth.md) — right-sizing a run.
- [Glossary](../glossary.md) — every term defined.

Other harnesses: [Running AI-DLC on Kiro IDE](kiro-ide.md) · [the harness family index](README.md).
