// harness/kimi/onboarding.fills.ts — Kimi Code CLI's onboarding-doc fills.
// Rendered with core/templates/onboarding.md by scripts/onboarding.ts into
// dist/kimi/AGENTS.md (project root). {{HARNESS_DIR}} → .kimi-code is applied
// by the packager transform afterwards (rulesRename is null, so no rename).

import type { OnboardingFills } from "../../../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "/skill:amadeus",
  slots: {
    title_block: `# Project Name <!-- Replace with your project name -->

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured development, running on the **Kimi Code harness**. The workspace shell ships in \`.kimi-code/\` (no setup command); the engine auto-births the first intent when you describe what to build. Run \`/skill:amadeus\` followed by a scope or project description to begin. Run \`/skill:amadeus --doctor\` to validate your setup, \`/skill:amadeus --version\` to print the framework version, \`/skill:amadeus --stage <slug>\` to jump to a specific stage, \`/skill:amadeus --phase <name>\` to jump to a phase, \`/skill:amadeus --depth <level>\` to override depth, \`/skill:amadeus --test-strategy <level>\` to override test volume. Run \`/skill:amadeus compose "<task>"\` to have the adaptive composer propose a tailored EXECUTE/SKIP plan (works up front, from a scan report via \`--report <path>\`, and mid-workflow to re-shape the pending stages - every proposal stops at an approve/edit/reject gate).`,

    prereq_bullets: `- **Kimi Code CLI ≥ 0.29.0**: the hard floor because 0.29.0 introduced Markdown custom agents and their \`tools\` allowlists, which the read-only reviewer profiles require. Check with \`kimi --version\`; \`/skill:amadeus --doctor\` rejects 0.28.x and older releases. Hook payload handling remains tolerant of unknown fields, and the separate hook-function probe is advisory.
- **bun**: Required for the CLI tools and hook scripts (state management, audit logging, orchestration engine). Install via \`curl -fsSL https://bun.sh/install | bash\`. \`bun\` must be on your PATH for the non-interactive shells the harness spawns — these source \`~/.zshenv\` (zsh) or \`~/.bashrc\` (bash), NOT \`~/.zshrc\`.
- **Hook wiring**: Kimi Code has no project-level config file, so the \`[[hooks]]\` + \`[[permission.rules]]\` this install needs live in the user-level \`~/.kimi-code/config.toml\`. The setup CLI merges the shipped \`.kimi-code/hooks/amadeus-hooks.snippet.toml\` there as a marker-fenced managed block (\`# >>> amadeus-kimi-hooks >>>\`) with a diff preview, an explicit confirm, a backup, and an atomic write; your existing \`[[hooks]]\` are preserved and only the managed block is ever replaced or removed. Manual wiring (same snippet, paste between the markers) is documented for non-interactive environments.
- **Permissions**: the managed block first denies agent-side Bash composition matching \`Bash(*.kimi-code/hooks/*)\`, then pre-allows only \`Bash(bun .kimi-code/tools/*)\` and the required \`git worktree\`/\`git commit\`/\`git add\` prefixes. This deny is defense-in-depth, not caller authentication; host-managed hooks are unaffected. The projected product and architecture reviewer profiles allow only \`Read\`, \`Grep\`, and \`Glob\`, so Kimi's tool policy rejects reviewer Bash calls before execution. Everything else follows your normal permission mode. There is no blanket shell trust.`,

    prereq_bullets_tail: "",

    agents_note: `On Kimi the conductor adopts a persona inline from \`.kimi-code/agents/amadeus-<role>-agent.md\`; the two subagent stages (2.1, 3.5) delegate to the named role via the Agent tool, and the 11 persona \`.md\` files are the same core prose every harness reads.`,

    structure_extra: "",

    guide_pointer: `The Kimi-specific guide (install, hook wiring, what differs) is \`docs/guide/harnesses/kimi-code.md\`.`,

    sections_before_resumption: `## What's different on this harness

This is the same AI-DLC core that ships to every harness — one deterministic engine, state machine, audit trail, and stage set, rendered onto Kimi Code. On Kimi:

- Approval gates and structured questions render via **AskUserQuestion**; **numbered prose is the sanctioned fallback** when the tool is unavailable (auto permission mode, headless \`kimi -p\`). Both paths mint the auditable \`HUMAN_TURN\` the human-presence guard requires — \`PostToolUse(AskUserQuestion)\` and \`UserPromptSubmit\` route to the same mint target. The questions FILE with \`[Answer]:\` tags remains the source of truth.
- Kimi's \`Stop\` hook is observation-only: the external hook payload does not provide a trustworthy main-vs-subagent caller identity, so the adapter never forwards \`Stop\` to the stateful core hook. Continue the workflow through the skill's explicit forwarding loop or the next human turn. Read-only reviewer profiles expose only \`Read\`, \`Grep\`, and \`Glob\`; Kimi enforces that allowlist again before tool execution.
- There is **no statusline** and **no welcome message**; stage visibility rides the TodoList tool (one in-progress item per running stage, text ending with the stage's \`[slug]\` suffix) and \`/skill:amadeus --status\`.
- Construction swarm runs as **subagent fan-out only** — the driver comes from \`amadeus-swarm.ts resolve --harness kimi\`: \`subagent\` dispatches here, \`claude-ultra\`/\`codex-ultra\` loud-degrade to the subagent floor (\`SWARM_DEGRADED\`), and an unknown value is rejected fail-closed. There is no kimi-ultra.
- Session-end and pre-compaction audit events (\`SESSION_ENDED\`, state validation) are wired natively (\`SessionEnd\` matcher \`exit\`, \`PreCompact\` matcher \`manual|auto\`) — no next-start reconcile hack is needed. PostCompact re-injection is not wired on this harness.
- A workflow's \`amadeus/\` workspace tree is harness-neutral: a project can move between Claude Code and Kimi Code installs (supported but untested — keep both \`.claude/\` and \`.kimi-code/\` in sync via the framework's packaging if you do this).
`,

    sections_after_resumption: "",

    gitignore_extra: `- \`.kimi-code/local.toml\``,
  },
};

export default fills;
