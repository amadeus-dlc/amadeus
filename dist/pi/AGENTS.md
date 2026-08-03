# AI-DLC on Pi Coding Agent

This project ships Amadeus as trusted project-local Pi resources. Invoke the
orchestrator with `/skill:amadeus` followed by a scope or project description.

## Prerequisites

- **Pi Coding Agent >= 0.83.0**: install `@earendil-works/pi-coding-agent`. On first interactive startup, Pi asks whether to trust a project containing local settings, extensions, or skills. Amadeus loads only after Pi's native project-trust decision.
- **Project trust**: Review the tracked `.pi/` resources and approve them through Pi. Amadeus never auto-approves the project, changes `~/.pi/agent/trust.json`, or treats trust as an OS sandbox.
- **bun**: Required for the deterministic TypeScript tools and the child-execution driver. Ensure it is available to non-interactive shells.
- **Locking**: Audit log file locking is handled portably using mkdir-based locking in the system temp directory (no external dependencies).
- **Hook permissions**: All framework hooks are TypeScript (`.ts`) and run via `bun`. No executable bits required — works identically on macOS, Linux, and native Windows PowerShell.
- **Runtime package**: the extension imports Pi's public API from `@earendil-works/pi-coding-agent`; do not replace the declared minimum-version check with private Pi internals.

## AI-DLC Structure

- **Skill**: `.pi/skills/amadeus/` — Orchestrator (`SKILL.md`), stage protocol, and 32 stage files across 5 phase directories
- **Session skills** (read-only, user-invocable): `.pi/skills/amadeus-session-cost/`, `.pi/skills/amadeus-replay/`, `.pi/skills/amadeus-outcomes-pack/`, `.pi/skills/amadeus-grilling/` — typed as `/skill:amadeus-session-cost`, `/skill:amadeus-replay`, `/skill:amadeus-outcomes-pack`, `/skill:amadeus-grilling`. The first three pull every count from `bun .pi/tools/amadeus-runtime.ts summary --json` (no LLM-side counting); `amadeus-grilling` runs a one-question-at-a-time grilling interview per `.pi/amadeus-common/protocols/grilling-protocol.md`. Classified `read-only`: they never advance the workflow stage pointer and never emit audit events. `amadeus-session-cost`, `amadeus-replay`, and `amadeus-grilling` print to the terminal only (`amadeus-grilling` writes a summary file only on explicit request); `amadeus-outcomes-pack` is the only one that always writes a file (`OUTCOMES.md`).
- **Stage-runner skills** (user-invocable): `.pi/skills/amadeus-<stage>/` — one per runnable stage, typed as `/skill:amadeus-<stage>` (e.g. `/skill:amadeus-application-design`, `/skill:amadeus-code-generation`). Each runs that single stage in isolation via the engine's `--single` mode (`amadeus-orchestrate next --stage <slug> --single`) and **never advances your main workflow's `Current Stage`** — a single-stage run is isolated by design (the tool refuses to advance the main workflow). They are opt-in packaging: the same stage is reachable via `/skill:amadeus --stage <slug> --single` without a runner. The runner set is generated from the compiled stage graph by `bun .pi/tools/amadeus-runner-gen.ts write` and kept in sync by its `check` drift guard, so adding a stage file and regenerating adds its runner. The three bootstrap **initialization** stages ship no per-stage runner (they have no standalone meaning); the whole initialization phase is packaged as `/skill:amadeus-init`, which mints the first intent and builds its state in one step. (This is opt-in packaging: the engine normally auto-births the first intent the moment you describe what to build — no separate initialization command is needed.)
- **Agents**: `.pi/agents/` — 11 domain-expert personas (product, design, delivery, architect, aws-platform, compliance, devsecops, developer, quality, pipeline-deploy, operations). Pi loads the persona documents as prose. Delegated Construction work is launched by the Amadeus Pi child driver; Pi does not provide a built-in subagent primitive.
- **Method/rules**: `amadeus/spaces/<space>/memory/` — Layered files authored once at the workspace root, read by each harness via its native include (no copy into `.pi/`): `org.md` (framework defaults + organisation-wide guardrails), `team.md` (this team's affirmed practices), `project.md` (project-specific specialisation), plus `phases/<phase>.md` for ideation, inception, construction, and operation (initialization is bootstrap-only and ships no rule file). Resolution is a strict-additive five-layer chain — `org → team → project → phase → stage` — where every applicable rule appears in `rules_in_context` at runtime. Conflicts (narrower contradicting broader policy) are rejected at the §13 learning admission check before the learning reaches disk. See `docs/reference/01-architecture.md` § "Configuration layers" and `docs/reference/08-rule-system.md` for the schema.
- **Sensors**: `.pi/sensors/` — Deterministic verification manifests (advisory). Ships with framework defaults (`amadeus-required-sections.md`, `amadeus-upstream-coverage.md`, `amadeus-linter.md`, `amadeus-type-check.md`); forks may add custom `amadeus-<id>.md` manifests. Stages declare which sensors fire via the frontmatter `sensors: [<id>]` list — a pull import resolved at compile time. The PostToolUse hook reads the compile-resolved `sensors_applicable` array off the stage graph node.
- **Knowledge**: `.pi/knowledge/` — Methodology reference. Per-agent under `amadeus-<agent>-agent/` subfolders; `amadeus-shared/` holds cross-agent material. Ships with framework.
- **Team Knowledge**: `amadeus/knowledge/` (i.e. `amadeus/spaces/<space>/knowledge/`) — User-managed team and domain knowledge, a space-level sibling of `memory/`/`codekb/`/`intents/` that accumulates across every intent in the space. Free-form and empty at bootstrap (no fixed file set, no seeded READMEs); the engine ensure-exists the empty dir on your first `/skill:amadeus`. Agents read `amadeus/knowledge/amadeus-shared/` (all agents) and `amadeus/knowledge/<agent>/` (that agent) if the team creates them.
- **Tools**: `.pi/tools/` — Deterministic CLI tools (TypeScript, run via bun). All framework files prefixed `amadeus-*.ts`. They cover state management, audit emission, the orchestration engine (`amadeus-orchestrate.ts` with its `next`/`report` subcommands), graph compile, runner generation, sensor firing, the §13 learnings gate (`amadeus-learnings.ts`), and the swarm convergence referee (`amadeus-swarm.ts`).
- **Hooks**: `.pi/hooks/` — Framework hooks for audit emission, session lifecycle, state sync, state validation, subagent tracking, and statusline rendering. All framework files prefixed `amadeus-*.ts`.
- **Pi extension**: `.pi/extensions/amadeus.ts` — the native lifecycle adapter loaded by Pi after project trust.
- **Pi child driver**: `.pi/drivers/amadeus-pi-driver.ts` — an Amadeus-internal execution resource, not a Pi auto-loaded extension.
## Conventions

- All artifacts go under the active intent's record dir — `amadeus/spaces/<space>/intents/<slug>-<id8>/` (shorthand `<record>/`) — beneath the neutral `amadeus/` workspace roof; application code goes to the workspace root (or a sibling repo). Single-team users only ever see `spaces/default/`.
- Each stage keeps an observation diary at `<record>/<phase>/<stage>/memory.md`, auto-created from a template at stage start and maintained by the orchestrator — never hand-edited
- Use emojis as defined in skill/stage files — reproduce them exactly
- Validate Mermaid diagram syntax before writing; include text fallback
- Validate all generated content for character escaping issues

## Documentation

For full documentation, see `docs/guide/` (User Guide), `docs/harness-engineering/` (Harness Engineer Guide), and `docs/reference/` (Developer Reference); start at `docs/README.md`. See `docs/guide/harnesses/pi-coding-agent.md` for the Pi-specific install and trust flow.
## Pi trust boundary

Pi project trust authorizes project-local code to run with the user's normal
permissions. It is not a sandbox. Missing or rejected trust means the local
Amadeus extension and skills remain unavailable; the installer must not bypass
that native decision.
## Session Resumption

On startup, resolve the active intent (the `amadeus/spaces/<space>/intents/active-intent` cursor) and check for its `<record>/amadeus-state.md`. If found, load prior context and offer to resume from last checkpoint. (A brand-new workspace has no intent yet — the engine auto-births the first one on your first `/skill:amadeus`.)
## Git Integration

Commit the `amadeus/` workspace tree — the record (state, the per-clone audit shards under `<record>/audit/`, `intents.json`), memory, codekb, and knowledge are all version-controlled. The shipped `.gitignore` excludes the per-user cursors and machine-local runtime (these may be per-clone or contain sensitive data):
- `amadeus/active-space` and `amadeus/spaces/*/intents/active-intent` (per-user cursors)
- `amadeus/.amadeus-clone-id` (per-clone audit-shard token) and `amadeus/.amadeus-sessions/`
- `amadeus/spaces/*/intents/*/runtime-graph.json` (also covers per-Bolt worktree fragments by relative-path glob)
- `amadeus/spaces/*/intents/*/.amadeus-*` and `amadeus/spaces/*/intents/.amadeus-*` (recovery, hooks-health, sensors scratch; the second pattern is the no-intent fallback root hooks write to before the first intent is born)
- Pi's user-level trust decisions remain in `~/.pi/agent/trust.json` and are never committed by Amadeus.
