# Getting Started

> Languages: **English** | [日本語](01-getting-started.ja.md)

This chapter walks you through installing this implementation, verifying your environment, and preparing for your first workflow.

---

## Prerequisites

This implementation requires two tools on your system:

| Prerequisite | Purpose | Install |
|-------------|---------|---------|
| **Claude Code** | This implementation runs as a Claude Code command. The orchestrator, agents, and hooks all execute within Claude Code. | Native install (recommended, auto-updates): macOS/Linux/WSL `curl -fsSL https://claude.ai/install.sh \| bash`; Windows PowerShell `irm https://claude.ai/install.ps1 \| iex`. Or `brew install --cask claude-code`. ([docs](https://code.claude.com/docs/en/quickstart)) |
| **bun** | Required for all CLI tools and all 11 hooks (state management, audit logging, sensor dispatch, runtime-graph compile, loop enforcement, statusline, human-turn mint). Everything is TypeScript, run via bun (~20ms startup). No additional dependencies — works identically on macOS, Linux, and native Windows PowerShell. | `curl -fsSL https://bun.sh/install \| bash` ([docs](https://bun.sh)). On Windows: `npm install -g bun` or `powershell -c "irm bun.sh/install.ps1 \| iex"` |

> **Important**: `bun` must be on your `PATH` for non-interactive shells. Claude Code runs your shell non-interactively, so it sources `~/.zshenv` (zsh) or `~/.bashrc` (bash) — NOT `~/.zshrc`. On Windows with Git Bash, `~/.bashrc` is the correct file. If `which bun` fails inside Claude Code, add the bun PATH export to the appropriate file.

Verify prerequisites:

```bash
command -v claude >/dev/null && echo "✓ Claude Code installed" || echo "✗ Install Claude Code first"
command -v bun    >/dev/null && echo "✓ bun installed"          || echo "✗ Install bun first"
```

## Model Provider Setup

The shipped Claude Code and Codex configs do not pin a provider or model.
Amadeus-DLC uses the normal defaults of the harness you run it from:

- Claude Code reads your usual Claude Code account, provider, and model settings.
- Codex reads your usual `~/.codex/config.toml` and project trust settings.
- Project-local provider/model overrides are optional and should be added only when your team deliberately wants this project to force a specific runtime.

Keep credentials and personal provider choices out of committed project files.
For Claude Code, use `.claude/settings.local.json` or user-level settings. For
Codex, use `~/.codex/config.toml` unless the project intentionally owns a shared
runtime policy.

## MCP Servers (optional)

The Claude Code distribution does not ship a project `.mcp.json` by default.
Add project or user MCP server definitions only when your workflow needs
external tools or extra context. Claude Code provisions declared servers to the
session, and every Amadeus-DLC agent inherits those session servers — there is
no per-agent grant to perform.

> **Restricting an agent (advanced):** inheritance is additive — declaring a server makes it available to all agents, and you cannot grant servers per-agent. To *prevent* a specific agent from using a server, narrow that agent's `tools:` allowlist to the fully-qualified `mcp__<server>__<tool>` ids it may call (a bare `mcp__<server>` token is not honoured). See [Agents](06-agents.md) for how agent tool access works.

### Not using these?

Missing credentials are not blocking. A server you have no credentials for is
simply unavailable; the workflow runs without it and never stalls waiting on it.
To drop a server entirely, remove its entry from your project or user MCP config.

---

## Installation

AI-DLC installs by copying its distribution for your harness into your project. The steps below cover **Claude Code** (the `dist/claude/.claude/` tree). Running Kiro or Codex? Each ships its own distribution and install steps — see [Running on Kiro IDE](harnesses/kiro-ide.md) or [Running on Codex CLI](harnesses/codex-cli.md). The Claude Code implementation ships as a `.claude/` directory that you copy into your project.

### Step 1: Copy the implementation

```bash
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/amadeus/   your-project/amadeus/     # the workspace shell — a sibling of .claude/, not inside it
```

The first line copies the engine — the orchestrator, stage files, agent personas, hooks, knowledge files, and default settings. The second copies the **workspace shell**: the pre-built `amadeus/spaces/default/memory/` method tree the engine reads. It ships as a **sibling** of `.claude/` (not inside it), so it must be copied separately — or copy the whole `dist/claude/` tree at once. `/amadeus --doctor` fails its "workspace shell ready" check if `amadeus/spaces/default/memory/` is missing.

### Step 2: Navigate to your project

```bash
cd your-project
```

All `/amadeus` commands run relative to the project root.

---

## The Workspace Shell

There is no scaffold step. The distribution you copied in already ships the
workspace shell — the `.claude/` engine plus a pre-built `amadeus/spaces/default/`
holding the memory layer (`amadeus/spaces/default/memory/`, where team-affirmed
practices and learnings live). You do not run any init command.

The first time you run `/amadeus` (or describe what to build), the engine
**auto-births** the first intent into the active space. Each intent gets its own
record dir at `amadeus/spaces/<space>/intents/<YYMMDD>-<label>/`, which holds:

- `amadeus-state.md` — the per-intent workflow state
- `audit/` — the audit trail, written as per-clone shards (`<host>-<clone>.md`)
- `<phase>/<stage>/...` — the stage artifacts (e.g. `inception/requirements-analysis/requirements.md`)

Team knowledge lives one level up, at the space level —
`amadeus/spaces/<space>/knowledge/` (a sibling of `intents/`) — so it accumulates
across every intent in the space. The engine creates it empty; you add free-form
files under an optional `amadeus-shared/` and per-agent subdirectories.

To add [team knowledge](08-knowledge.md) or team practices before your first run,
edit the shipped `amadeus/spaces/default/memory/` files; the space-level
`amadeus/knowledge/` directory is created (empty) once your first `/amadeus` runs.

For the full picture of the workspace layout — how it holds many intents at once,
what spaces are for, and the commands to move between them — see
[Spaces and Intents](03-spaces-and-intents.md).

---

## Verify the Setup

Run the health check to confirm everything is in place:

```
/amadeus --doctor
```

`--doctor` exits 0 when every check passes and 1 when any check fails; the full report writes to stdout in both cases.

### What `--doctor` checks

| Check | What It Validates |
|-------|-------------------|
| Prerequisites | `bun` is installed and on `$PATH` |
| Hook presence | Every hook `settings.json` wires (its `hooks` blocks + the `statusLine` command — all 11 framework hooks) exists in `.claude/hooks/`; a wired-but-missing hook fails loudly. Sourcing the expected roster from `settings.json` means adding a hook there auto-checks it |
| Project structure | `.claude/settings.json` exists with expected configuration |
| Workspace shell | `.claude/` + `amadeus/spaces/default/memory/` are present (the shipped shell) |
| State file | the active intent's `amadeus-state.md` matches its audit trail (no drift) |
| Hook heartbeats | `.amadeus-hooks-health/` contains recent timestamps from hook executions |
| Graph integrity | No cycles in `stage-graph.json`; every slug has a matching stage file |
| Scope validation | All 10 scopes walk cleanly against the graph (advisories for scope-truncation gaps are expected) |
| Schema + references | Every stage's YAML frontmatter validates, and every consumes/requires_stage reference resolves |
| Keyword overlap | No keyword is claimed by more than one scope across the `.claude/scopes/*.md` files |

### Example output

```
✓ bun installed (required for CLI tools and hooks)
✓ amadeus-audit-logger.ts present
✓ amadeus-sync-statusline.ts present
✓ amadeus-validate-state.ts present
✓ amadeus-log-subagent.ts present
✓ amadeus-session-start.ts present
✓ amadeus-session-end.ts present
✓ amadeus-statusline.ts present
✓ settings.json present
✓ AMADEUS_DEFAULT_SCOPE (unset — no project default)
✓ workspace shell ready (.claude/ + amadeus/spaces/default/memory/)
✓ Hook heartbeats: not yet fired (first workflow stage will populate)
✓ State matches last audit event (no drift)
✓ Cycle detection: 0 cycles
✓ Orphan stage files: 32 graph entries all have files
✓ Scope validation: 10 scopes valid (29 advisories)
✓ Schema validation: 32/32 stages valid
✓ Graph references: 122 artifacts + edges resolved
✓ Keyword overlap: no conflicts
```

### Fixing failures

| Failure | Fix |
|---------|-----|
| `bun` not installed | Install via `curl -fsSL https://bun.sh/install \| bash`. On Windows: `npm install -g bun` or `powershell -c "irm bun.sh/install.ps1 \| iex"`. Ensure it is on PATH for non-interactive shells. |
| Hook not present | Re-copy the `.claude/` directory from the distribution |
| `settings.json` missing | Create it from the template without overwriting existing config: `cp -n dist/claude/.claude/settings.json.example .claude/settings.json` |
| Workspace shell missing | Re-copy the workspace shell from `dist/claude/` into your project root |
| State file issues | Archive the active intent's record dir under `amadeus/spaces/<space>/intents/` and run `/amadeus` to start fresh |
| Graph/scope/schema/keyword failures | The diagnostic reports the specific artifact, slug, or scope name at fault. These indicate authoring drift in `.claude/amadeus-common/stages/` or `.claude/scopes/`; regenerate the compiled graph + scope grid with `bun .claude/tools/amadeus-graph.ts compile` or inspect the named stage/scope directly. |

---

## Start Your First Workflow

Once `--doctor` passes, you are ready to run:

```
/amadeus Build a REST API for inventory management
```

Or specify a scope directly:

```
/amadeus feature
/amadeus bugfix Fix the login timeout issue
```

See [Your First Workflow](02-your-first-workflow.md) for a step-by-step walkthrough of what happens next.

---

## Quick Reference

In your shell:

```bash
# Verify prerequisites
command -v claude >/dev/null && echo "✓ Claude Code" || echo "✗ Claude Code"
command -v bun    >/dev/null && echo "✓ bun"          || echo "✗ bun"

# Install (engine + the workspace shell sibling)
cp -r dist/claude/.claude/ your-project/.claude/
cp -r dist/claude/amadeus/   your-project/amadeus/
cp -n your-project/.claude/CLAUDE.md.example your-project/.claude/CLAUDE.md
cp -n your-project/.claude/settings.json.example your-project/.claude/settings.json

# Launch Claude Code in your project
cd your-project && claude
```

Inside the Claude Code session:

```
# Verify (exits 1 on any check failure; read stdout for the full report)
/amadeus --doctor

# Start
/amadeus Build a task management API with user authentication
```

---

## Tool Permissions

The included `.claude/settings.json.example` pre-approves Claude Code tools (Read, Edit, Write, Bash, Glob, Grep, Task, WebSearch) so workflows run without per-call permission prompts after you copy it to `.claude/settings.json`. Review the file before use and adjust to your security requirements.

See [Customization](13-customization.md) for details on modifying tool permissions.

---

## Next Steps

- [Your First Workflow](02-your-first-workflow.md) — annotated walkthrough of a complete run
- [Scopes, Depth, and Test Strategy](05-scopes-and-depth.md) — choosing the right scope for your task
- [Troubleshooting](15-troubleshooting.md) — common issues and fixes
- [Glossary](glossary.md) — terminology reference
