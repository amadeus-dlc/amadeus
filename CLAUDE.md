## Project Instructions

- Communicate with the user in Japanese.
- Write documentation in English by default.
- As an exception, write `amadeus/**/*.md` in Japanese.
- Write code comments in English.
- Write commit messages in English.
- If you find violations of these language rules while working, fix them as part of the same change.

@.claude/rules/amadeus.md

<!--
  The @-line above pulls the AIDLC method into Claude's ambient context. It is
  the first hop of a reference chain (NOT a copy): CLAUDE.md → @.claude/rules/
  amadeus.md → @../../amadeus/spaces/default/memory/*.md. The method is authored ONCE
  at the workspace root under amadeus/spaces/default/memory/ (org/team/project +
  phases/), so edit it there, never in .claude/rules/amadeus.md. Verified resolving
  (G1 PASS) — see tmp/workspace-vision/at-import-spike/RESULTS.md.
-->

# Project Name <!-- Replace with your project name -->

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured development. The workspace shell ships in `.claude/` (no setup command); the engine auto-births the first intent when you describe what to build. Run `/amadeus` followed by a scope or project description to begin. Run `/amadeus --doctor` to validate your setup. Run `/amadeus --version` to print the framework version. Run `/amadeus --stage <slug>` to jump to a specific stage, `/amadeus --phase <name>` to jump to a phase, `/amadeus --depth <level>` to override depth, `/amadeus --test-strategy <level>` to override test volume. Run `/amadeus compose "<task>"` to have the adaptive composer propose a tailored EXECUTE/SKIP plan (works up front, from a scan report via `--report <path>`, and mid-workflow to re-shape the pending stages - every proposal stops at an approve/edit/reject gate).

For Amadeus self-development, explicitly select `amadeus-feature`,
`amadeus-bugfix`, or `amadeus-refactor` based on the change type. Use the
legacy `amadeus` scope only when resuming an existing intent. The canonical
policy is `amadeus/spaces/default/memory/project.md` § Scope Overrides.

## Prerequisites

- **bun**: Required for CLI tools and hook scripts (state management, audit logging, jump orchestration). Install via `curl -fsSL https://bun.sh/install | bash`. On Windows: `npm install -g bun` or `powershell -c "irm bun.sh/install.ps1 | iex"`. Startup is ~20ms. **Important**: `bun` must be on your PATH for non-interactive shells. Claude Code runs your shell non-interactively, so it sources `~/.zshenv` (zsh) or `~/.bashrc` (bash) — NOT `~/.zshrc`. On Windows with Git Bash, `~/.bashrc` is the correct file. If `which bun` fails inside Claude Code, add the bun PATH export to the appropriate file.
- **Claude Code model configuration**: The shipped `.claude/settings.json.example` does not pin a provider or model. Copy it to `.claude/settings.json` only when this project does not already have one. It uses the Claude Code defaults from the user's normal environment. Put personal model/provider overrides in `.claude/settings.local.json` or your user-level Claude Code settings.
- **MCP servers (optional)**: Add project or user MCP server definitions when your workflow needs external tools or context. Credentials should flow through your local environment or personal settings; no keys are committed. Servers you have no credentials for are simply unavailable and never block a workflow. Declared servers are provisioned to the session and **inherited by every agent** — there is no per-agent grant; agents that should be prevented from using a server are narrowed via their `tools:` allowlist with fully-qualified `mcp__<server>__<tool>` ids.
- **Locking**: Audit log file locking is handled portably using mkdir-based locking in the system temp directory (no external dependencies).
- **Hook permissions**: All 11 hooks are TypeScript (`.ts`) and run via `bun`. No executable bits required — works identically on macOS, Linux, and native Windows PowerShell.
- **Settings**: Copy `.claude/settings.json.example` to `.claude/settings.json` only when the project does not already have one. The example pre-approves tools (Read, Edit, Write, Bash, Glob, Grep, Task, WebSearch) so workflows run without per-call permission prompts.
- **Personal overrides**: Copy `.claude/settings.local.json.example` to `.claude/settings.local.json` (gitignored) to override the model or set environment variables without affecting shared settings.

## AI-DLC Structure

- **Skill**: `.claude/skills/amadeus/` — Orchestrator (`SKILL.md`), stage protocol, and 32 stage files across 5 phase directories
- **Session skills** (read-only, user-invocable): `.claude/skills/amadeus-session-cost/`, `.claude/skills/amadeus-replay/`, `.claude/skills/amadeus-outcomes-pack/`, `.claude/skills/amadeus-grilling/` — typed as `/amadeus-session-cost`, `/amadeus-replay`, `/amadeus-outcomes-pack`, `/amadeus-grilling`. The first three pull every count from `bun .claude/tools/amadeus-runtime.ts summary --json` (no LLM-side counting); `amadeus-grilling` runs a one-question-at-a-time grilling interview per `.claude/amadeus-common/protocols/grilling-protocol.md`. Classified `read-only`: they never advance the workflow stage pointer and never emit audit events. `amadeus-session-cost`, `amadeus-replay`, and `amadeus-grilling` print to the terminal only (`amadeus-grilling` writes a summary file only on explicit request); `amadeus-outcomes-pack` is the only one that always writes a file (`OUTCOMES.md`).
- **Stage-runner skills** (user-invocable): `.claude/skills/amadeus-<stage>/` — one per runnable stage, typed as `/amadeus-<stage>` (e.g. `/amadeus-application-design`, `/amadeus-code-generation`). Each runs that single stage in isolation via the engine's `--single` mode (`amadeus-orchestrate next --stage <slug> --single`) and **never advances your main workflow's `Current Stage`** — a single-stage run is isolated by design (the tool refuses to advance the main workflow). They are opt-in packaging: the same stage is reachable via `/amadeus --stage <slug> --single` without a runner. The runner set is generated from the compiled stage graph by `bun .claude/tools/amadeus-runner-gen.ts write` and kept in sync by its `check` drift guard, so adding a stage file and regenerating adds its runner. The three bootstrap **initialization** stages ship no per-stage runner (they have no standalone meaning); the whole initialization phase is packaged as `/amadeus-init`, which mints the first intent and builds its state in one step. (This is opt-in packaging: the engine normally auto-births the first intent the moment you describe what to build — no separate initialization command is needed.)
- **Agents**: `.claude/agents/` — 11 domain-expert personas (product, design, delivery, architect, aws-platform, compliance, devsecops, developer, quality, pipeline-deploy, operations). Each is a flat `.md` file prefixed `amadeus-<role>-agent.md`; the conductor adopts the persona inline, or delegates to it via the `Task` tool for the two subagent stages (2.1, 3.5).
- **Method/rules**: `amadeus/spaces/<space>/memory/` — Layered files authored once at the workspace root, read by each harness via its native include (no copy into `.claude/`): `org.md` (framework defaults + organisation-wide guardrails), `team.md` (this team's affirmed practices), `project.md` (project-specific specialisation), plus `phases/<phase>.md` for ideation, inception, construction, and operation (initialization is bootstrap-only and ships no rule file). Resolution is a strict-additive five-layer chain — `org → team → project → phase → stage` — where every applicable rule appears in `rules_in_context` at runtime. Conflicts (narrower contradicting broader policy) are rejected at the §13 learning admission check before the learning reaches disk. See `docs/reference/01-architecture.md` § "Configuration layers" and `docs/reference/08-rule-system.md` for the schema.
- **Sensors**: `.claude/sensors/` — Deterministic verification manifests (advisory). Ships with framework defaults (`amadeus-required-sections.md`, `amadeus-upstream-coverage.md`, `amadeus-linter.md`, `amadeus-type-check.md`); forks may add custom `amadeus-<id>.md` manifests. Stages declare which sensors fire via the frontmatter `sensors: [<id>]` list — a pull import resolved at compile time. The PostToolUse hook reads the compile-resolved `sensors_applicable` array off the stage graph node.
- **Knowledge**: `.claude/knowledge/` — Methodology reference. Per-agent under `amadeus-<agent>-agent/` subfolders; `amadeus-shared/` holds cross-agent material. Ships with framework.
- **Team Knowledge**: `amadeus/knowledge/` (i.e. `amadeus/spaces/<space>/knowledge/`) — User-managed team and domain knowledge, a space-level sibling of `memory/`/`codekb/`/`intents/` that accumulates across every intent in the space. Free-form and empty at bootstrap (no fixed file set, no seeded READMEs); the engine ensure-exists the empty dir on your first `/amadeus`. Agents read `amadeus/knowledge/amadeus-shared/` (all agents) and `amadeus/knowledge/<agent>/` (that agent) if the team creates them.
- **Tools**: `.claude/tools/` — Deterministic CLI tools (TypeScript, run via bun). All framework files prefixed `amadeus-*.ts`. They cover state management, audit emission, the orchestration engine (`amadeus-orchestrate.ts` with its `next`/`report` subcommands), graph compile, runner generation, sensor firing, the §13 learnings gate (`amadeus-learnings.ts`), and the swarm convergence referee (`amadeus-swarm.ts`).
- **Hooks**: `.claude/hooks/` — Framework hooks for audit emission, session lifecycle, state sync, state validation, subagent tracking, and statusline rendering. All framework files prefixed `amadeus-*.ts`.
## Conventions

- All artifacts go under the active intent's record dir — `amadeus/spaces/<space>/intents/<slug>-<id8>/` (shorthand `<record>/`) — beneath the neutral `amadeus/` workspace roof; application code goes to the workspace root (or a sibling repo). Single-team users only ever see `spaces/default/`.
- Each stage keeps an observation diary at `<record>/<phase>/<stage>/memory.md`, auto-created from a template at stage start and maintained by the orchestrator — never hand-edited
- Use emojis as defined in skill/stage files — reproduce them exactly
- Validate Mermaid diagram syntax before writing; include text fallback
- Validate all generated content for character escaping issues

## Documentation

For full documentation, see `docs/guide/` (User Guide), `docs/harness-engineering/` (Harness Engineer Guide), and `docs/reference/` (Developer Reference); start at `docs/README.md`.
## AI-DLC Method (imported)

The AI-DLC method — the layered practice files (`org.md`, `team.md`, `project.md`, and the per-phase `phases/<phase>.md`) — is authored once at the workspace root under `amadeus/spaces/default/memory/` and imported into Claude's ambient context by reference (the `@.claude/rules/amadeus.md` import at the top of this file), never copied. That stub `@`-imports each method file from `amadeus/spaces/default/memory/`; Claude resolves the nested chain. Edit the method there — it is the single hand-editable source of truth, identical on every harness. (AI-DLC's own stage resolver reads the same tree directly, so each stage is method-correct without this ambient import.)

## Session Resumption

On startup, resolve the active intent (the `amadeus/spaces/<space>/intents/active-intent` cursor) and check for its `<record>/amadeus-state.md`. If found, load prior context and offer to resume from last checkpoint. (A brand-new workspace has no intent yet — the engine auto-births the first one on your first `/amadeus`.)
## Git Integration

Commit the `amadeus/` workspace tree — the record (state, the per-clone audit shards under `<record>/audit/`, `intents.json`), memory, codekb, and knowledge are all version-controlled. The shipped `.gitignore` excludes the per-user cursors and machine-local runtime (these may be per-clone or contain sensitive data):
- `amadeus/active-space` and `amadeus/spaces/*/intents/active-intent` (per-user cursors)
- `amadeus/.amadeus-clone-id` (per-clone audit-shard token) and `amadeus/.amadeus-sessions/`
- `amadeus/spaces/*/intents/*/runtime-graph.json` (also covers per-Bolt worktree fragments by relative-path glob)
- `amadeus/spaces/*/intents/*/.amadeus-*` (recovery, hooks-health, sensors scratch)
- `.claude/settings.local.json`
