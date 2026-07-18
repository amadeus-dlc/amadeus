// harness/codex/onboarding.fills.ts — Codex CLI's onboarding-doc fills.
// Rendered with core/templates/onboarding.md by scripts/onboarding.ts inside
// emit.ts into dist/codex/AGENTS.md (project root). emit() applies the
// {{HARNESS_DIR}} → .codex substitution + rules/ → amadeus-rules/ rename itself.
//
// This RETIRES the old read-CLAUDE.md + regex-rewrite path: Codex no longer
// derives its onboarding doc from Claude's, so Claude prose can no longer leak
// through (the F-ONBOARDING-LEAK class). The Codex-specific header + Prerequisites
// are authored here directly.

import type { OnboardingFills } from "../../../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "$amadeus",
  slots: {
    title_block: `@.agents/rules/amadeus.md

# AI-DLC on Codex CLI

This project uses AI-DLC (AI-Driven Development Life Cycle) under the OpenAI
Codex CLI harness (minimum version 0.139.0). Invoke the orchestrator skill with
\`$amadeus\` (or \`/skills\` → amadeus) followed by a scope or project description.
The deterministic engine, state machine, audit log, and referee are
byte-identical to every other harness distribution; only the shell differs. Run
\`$amadeus --status\` for progress, \`$amadeus --help\` for usage, \`$amadeus intent\`
to list intents, \`$amadeus --doctor\` to validate setup, and
\`$amadeus --stage <slug>\` / \`--phase <name>\` / \`--depth <level>\` /
\`--test-strategy <level>\` for the usual overrides. Run \`$amadeus compose
"<task>"\` to have the adaptive composer propose a tailored EXECUTE/SKIP plan
(up front, from a scan report via \`--report <path>\`, or mid-workflow to
re-shape the pending stages - every proposal stops at an approve/edit/reject
gate).`,

    prereq_bullets: `- **Codex CLI ≥ 0.139.0**: earlier releases do not surface the real agent role in subagent hook payloads and do not resolve hyphenated agent TOMLs. \`$amadeus --doctor\` enforces the pin. Check with \`codex --version\`.
- **bun**: Required for CLI tools and hook scripts (state management, audit logging, jump orchestration). Install via \`curl -fsSL https://bun.sh/install | bash\`. On Windows: \`npm install -g bun\` or \`powershell -c "irm bun.sh/install.ps1 | iex"\`. \`bun\` must be on your PATH for the non-interactive shells the harness spawns — these source \`~/.zshenv\` (zsh) or \`~/.bashrc\` (bash), NOT \`~/.zshrc\`.
- **Model provider**: The shipped \`.codex/config.toml.example\` does not pin a provider. Copy it to \`.codex/config.toml\` only when this project does not already have one. Codex uses the user's normal configured default provider and model. Put personal model/provider overrides in \`~/.codex/config.toml\`, or add project-local settings deliberately if your team wants to standardize them.
- **MCP servers (optional)**: Codex reads MCP server definitions from \`[mcp_servers.<name>]\` tables in \`config.toml\` (project \`.codex/config.toml\` or \`~/.codex/config.toml\`). The shipped config declares none — add the servers you need there. Credentials flow through your environment; a server you have no credentials for is simply unavailable and never blocks a workflow.`,

    prereq_bullets_tail: `- **Permissions**: \`.codex/rules/default.rules\` (Starlark prefix rules) pre-allows the deterministic core's exact command prefixes — \`bun .codex/tools/\`, \`bun .codex/hooks/\`, and \`git worktree\`/\`commit\`/\`add\` — so workflows run without per-call prompts. The sandbox is \`workspace-write\`; commands outside the allowlist prompt.
- **Personal overrides**: Settings in \`~/.codex/config.toml\` merge over the project \`.codex/config.toml\`. Put machine-specific overrides there to avoid changing the shared project config.`,

    agents_note: `On Codex the agent personas are transposed into \`.agents/\` TOMLs (the conductor reads the persona \`.md\` bodies as prose); the two subagent stages (2.1, 3.5) run as \`codex exec\` workers.`,

    structure_extra: "",

    guide_pointer: `The Codex-specific guide (prerequisites, trust pre-seed, provider config, the git-repo requirement) is \`docs/guide/harnesses/codex-cli.md\`.`,

    sections_before_resumption: `## What's different on this harness

This is the same AI-DLC core that ships to every harness, rendered onto Codex CLI. On Codex:

- **Gates** always render as numbered prose. Codex's built-in question-tool replies are not exposed to the shipped PostToolUse hooks, while a prose reply reaches the UserPromptSubmit adapter and mints the auditable \`HUMAN_TURN\` required by the human-presence guard. Gate semantics remain in the engine.
- **No custom statusline and no welcome message**: workflow position rides the \`update_plan\` tool and \`$amadeus --status\`.
- **Git under the sandbox**: \`workspace-write\` keeps \`.git\` read-only in-sandbox; interactive sessions auto-escalate and \`.codex/rules/default.rules\` pre-allows \`git worktree\`/\`commit\`/\`add\`. Headless runs need \`writable_roots\` (template in the shipped \`config.toml.example\`).
- **Construction swarm** is native subagent fan-out — one child per unit in this session, each confined to its worktree; the driver comes from \`amadeus-swarm.ts resolve --harness codex\`: \`subagent\`/\`codex-ultra\` dispatch here, \`claude-ultra\` loud-degrades to the subagent floor (\`SWARM_DEGRADED\`), and an unknown value is rejected fail-closed.
- **Session lifecycle**: Codex has no SessionEnd event (an unclosed session is reconciled as an inferred \`SESSION_ENDED\` at the next start); the Codex-only PostCompact event re-injects the workflow mission after compaction.
- **The AIDLC method** (the layered practice files \`org.md\`, \`team.md\`, \`project.md\`, and the per-phase \`phases/<phase>.md\`) lives once at the workspace root under \`amadeus/spaces/default/memory/\` — the single hand-editable source of truth, identical on every harness, NOT a per-harness copy. Codex auto-merges the root \`AGENTS.md\` and the orchestrator injects an \`@amadeus/spaces/default/memory/…\` prompt mention to pull specific method files into context on demand; AI-DLC's own stage resolver reads the same tree directly (via the \`AMADEUS_RULES_DIR\` seam in the shipped \`config.toml.example\`). Edit the method there, never under \`.codex/\`. (\`.codex/rules/default.rules\` remains Codex's native Starlark permission-rules file — distinct from the AIDLC method, and the two must not collide.)
`,

    sections_after_resumption: "",

    gitignore_extra: "",
  },
};

export default fills;
