# Project Name <!-- Replace with your project name -->

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured development, running on the **Kiro IDE harness**. The workspace shell ships in `.kiro/` (no setup command); the engine auto-births the first intent when you describe what to build. Run `/amadeus` followed by a scope or project description to begin. Run `/amadeus --doctor` to validate your setup, `/amadeus --version` to print the framework version, `/amadeus --stage <slug>` to jump to a specific stage, `/amadeus --phase <name>` to jump to a phase, `/amadeus --depth <level>` to override depth, `/amadeus --test-strategy <level>` to override test volume. Run `/amadeus compose "<task>"` to have the adaptive composer propose a tailored EXECUTE/SKIP plan (works up front, from a scan report via `--report <path>`, and mid-workflow to re-shape the pending stages - every proposal stops at an approve/edit/reject gate).

## Prerequisites

- **Kiro IDE**, signed in: the hooks/skills/agent features this install relies on (blocking `agentStop` hook, preToolUse/postToolUse matchers, `.kiro/skills/` slash commands, workspace `chat.defaultAgent`) are registered as `.kiro/hooks/*.kiro.hook` files and appear in the IDE's Agent Hooks panel.
- **bun**: Required for the CLI tools and hook scripts (state management, audit logging, orchestration engine). Install via `curl -fsSL https://bun.sh/install | bash`. `bun` must be on your PATH for the non-interactive shells the harness spawns — these source `~/.zshenv` (zsh) or `~/.bashrc` (bash), NOT `~/.zshrc`.
- **Activation**: this install ships `.kiro/settings/cli.json` setting `chat.defaultAgent: "amadeus"`, so opening this project in Kiro IDE uses the AI-DLC agent by default and `/amadeus` just works in the chat panel. **Note: the workspace default takes precedence over any global default agent you have configured.** If you prefer your own default, delete that settings line and select the `amadeus` agent in the chat panel instead.
- **Permissions**: the `amadeus` agent pre-approves ONLY `bun .kiro/tools/*` shell commands (plus read-only tools); everything else prompts. There is no blanket shell trust. In `--no-interactive` runs, tools that would prompt are auto-approved by the harness — prefer interactive sessions for gated workflows.
- **Locking**: Audit log file locking is handled portably using mkdir-based locking in the system temp directory (no external dependencies).
- **Hook permissions**: All 11 hooks are TypeScript (`.ts`) and run via `bun`. No executable bits required — works identically on macOS, Linux, and native Windows PowerShell.

## AI-DLC Structure

- **Skill**: `.kiro/skills/amadeus/` — Orchestrator (`SKILL.md`), stage protocol, and 32 stage files across 5 phase directories
- **Session skills** (read-only, user-invocable): `.kiro/skills/amadeus-session-cost/`, `.kiro/skills/amadeus-replay/`, `.kiro/skills/amadeus-outcomes-pack/`, `.kiro/skills/amadeus-grilling/` — typed as `/amadeus-session-cost`, `/amadeus-replay`, `/amadeus-outcomes-pack`, `/amadeus-grilling`. The first three pull every count from `bun .kiro/tools/amadeus-runtime.ts summary --json` (no LLM-side counting); `amadeus-grilling` runs a one-question-at-a-time grilling interview per `.kiro/amadeus-common/protocols/grilling-protocol.md`. Classified `read-only`: they never advance the workflow stage pointer and never emit audit events. `amadeus-session-cost`, `amadeus-replay`, and `amadeus-grilling` print to the terminal only (`amadeus-grilling` writes a summary file only on explicit request); `amadeus-outcomes-pack` is the only one that always writes a file (`OUTCOMES.md`).
- **Stage-runner skills** (user-invocable): `.kiro/skills/amadeus-<stage>/` — one per runnable stage, typed as `/amadeus-<stage>` (e.g. `/amadeus-application-design`, `/amadeus-code-generation`). Each runs that single stage in isolation via the engine's `--single` mode (`amadeus-orchestrate next --stage <slug> --single`) and **never advances your main workflow's `Current Stage`** — a single-stage run is isolated by design (the tool refuses to advance the main workflow). They are opt-in packaging: the same stage is reachable via `/amadeus --stage <slug> --single` without a runner. The runner set is generated from the compiled stage graph by `bun .kiro/tools/amadeus-runner-gen.ts write` and kept in sync by its `check` drift guard, so adding a stage file and regenerating adds its runner. The three bootstrap **initialization** stages ship no per-stage runner (they have no standalone meaning); the whole initialization phase is packaged as `/amadeus-init`, which mints the first intent and builds its state in one step. (This is opt-in packaging: the engine normally auto-births the first intent the moment you describe what to build — no separate initialization command is needed.)
- **Agents**: `.kiro/agents/` — 11 domain-expert personas (product, design, delivery, architect, aws-platform, compliance, devsecops, developer, quality, pipeline-deploy, operations). On Kiro the conductor is `agents/amadeus.json`; the two subagent stages (2.1, 3.5) delegate to `amadeus-developer-agent.json` / `amadeus-architect-agent.json` via the Kiro `subagent` tool, and the 11 persona `.md` files are adopted inline.
- **Method/rules**: `amadeus/spaces/<space>/memory/` — Layered files authored once at the workspace root, read by each harness via its native include (no copy into `.kiro/`): `org.md` (framework defaults + organisation-wide guardrails), `team.md` (this team's affirmed practices), `project.md` (project-specific specialisation), plus `phases/<phase>.md` for ideation, inception, construction, and operation (initialization is bootstrap-only and ships no rule file). Resolution is a strict-additive five-layer chain — `org → team → project → phase → stage` — where every applicable rule appears in `rules_in_context` at runtime. Conflicts (narrower contradicting broader policy) are rejected at the §13 learning admission check before the learning reaches disk. See `docs/reference/01-architecture.md` § "Configuration layers" and `docs/reference/08-rule-system.md` for the schema.
- **Sensors**: `.kiro/sensors/` — Deterministic verification manifests (advisory). Ships with framework defaults (`amadeus-required-sections.md`, `amadeus-upstream-coverage.md`, `amadeus-linter.md`, `amadeus-type-check.md`); forks may add custom `amadeus-<id>.md` manifests. Stages declare which sensors fire via the frontmatter `sensors: [<id>]` list — a pull import resolved at compile time. The PostToolUse hook reads the compile-resolved `sensors_applicable` array off the stage graph node.
- **Knowledge**: `.kiro/knowledge/` — Methodology reference. Per-agent under `amadeus-<agent>-agent/` subfolders; `amadeus-shared/` holds cross-agent material. Ships with framework.
- **Team Knowledge**: `amadeus/knowledge/` (i.e. `amadeus/spaces/<space>/knowledge/`) — User-managed team and domain knowledge, a space-level sibling of `memory/`/`codekb/`/`intents/` that accumulates across every intent in the space. Free-form and empty at bootstrap (no fixed file set, no seeded READMEs); the engine ensure-exists the empty dir on your first `/amadeus`. Agents read `amadeus/knowledge/amadeus-shared/` (all agents) and `amadeus/knowledge/<agent>/` (that agent) if the team creates them.
- **Tools**: `.kiro/tools/` — Deterministic CLI tools (TypeScript, run via bun). All framework files prefixed `amadeus-*.ts`. They cover state management, audit emission, the orchestration engine (`amadeus-orchestrate.ts` with its `next`/`report` subcommands), graph compile, runner generation, sensor firing, the §13 learnings gate (`amadeus-learnings.ts`), and the swarm convergence referee (`amadeus-swarm.ts`).
- **Hooks**: `.kiro/hooks/` — Framework hooks for audit emission, session lifecycle, state sync, state validation, subagent tracking, and statusline rendering. All framework files prefixed `amadeus-*.ts`.
## Conventions

- All artifacts go under the active intent's record dir — `amadeus/spaces/<space>/intents/<slug>-<id8>/` (shorthand `<record>/`) — beneath the neutral `amadeus/` workspace roof; application code goes to the workspace root (or a sibling repo). Single-team users only ever see `spaces/default/`.
- Each stage keeps an observation diary at `<record>/<phase>/<stage>/memory.md`, auto-created from a template at stage start and maintained by the orchestrator — never hand-edited
- Use emojis as defined in skill/stage files — reproduce them exactly
- Validate Mermaid diagram syntax before writing; include text fallback
- Validate all generated content for character escaping issues

## Documentation

For full documentation, see `docs/guide/` (User Guide), `docs/harness-engineering/` (Harness Engineer Guide), and `docs/reference/` (Developer Reference); start at `docs/README.md`. The Kiro-specific guide (install, what differs, the live journey test) is `docs/guide/harnesses/kiro-ide.md`.
## What's different on this harness

This is the same AI-DLC core that ships to every harness — one deterministic engine, state machine, audit trail, and stage set, rendered onto Kiro IDE. On Kiro:

- Approval gates and questions render as **numbered prose options** (no structured-question widget); the questions FILE with `[Answer]:` tags remains the source of truth.
- There is **no statusline** and **no welcome message**; use `/amadeus --status` and the progress lines at gates.
- Construction swarm runs as **subagent fan-out only** (`AMADEUS_USE_SWARM=1` is a loud no-op).
- Pre-compaction audit events (`SESSION_COMPACTED`) are not emitted — the IDE has no hook for that moment (`SESSION_STARTED`/`SESSION_ENDED` fire on session start and stop via the `.kiro.hook` files).
- **MCP servers**: none ship, and the Kiro MCP config mechanism is not configured here (the Claude distribution ships five; Kiro ships zero today).
- A workflow's `amadeus/` workspace tree is harness-neutral: a project can move between Claude Code and Kiro IDE installs (supported but untested — keep both `.claude/` and `.kiro/` in sync via the framework's packaging if you do this).

## Session Resumption

On startup, resolve the active intent (the `amadeus/spaces/<space>/intents/active-intent` cursor) and check for its `<record>/amadeus-state.md`. If found, load prior context and offer to resume from last checkpoint. (A brand-new workspace has no intent yet — the engine auto-births the first one on your first `/amadeus`.)
## Git Integration

Commit the `amadeus/` workspace tree — the record (state, the per-clone audit shards under `<record>/audit/`, `intents.json`), memory, codekb, and knowledge are all version-controlled. The shipped `.gitignore` excludes the per-user cursors and machine-local runtime (these may be per-clone or contain sensitive data):
- `amadeus/active-space` and `amadeus/spaces/*/intents/active-intent` (per-user cursors)
- `amadeus/.amadeus-clone-id` (per-clone audit-shard token) and `amadeus/.amadeus-sessions/`
- `amadeus/spaces/*/intents/*/runtime-graph.json` (also covers per-Bolt worktree fragments by relative-path glob)
- `amadeus/spaces/*/intents/*/.amadeus-*` and `amadeus/spaces/*/intents/.amadeus-*` (recovery, hooks-health, sensors scratch; the second pattern is the no-intent fallback root hooks write to before the first intent is born)
