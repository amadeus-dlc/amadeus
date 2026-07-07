// harness/claude/onboarding.fills.ts — Claude Code's onboarding-doc fills.
// Rendered with core/templates/onboarding.md by scripts/onboarding.ts into
// dist/claude/.claude/CLAUDE.md.example. {{HARNESS_DIR}} stays for the packager transform.

import type { OnboardingFills } from "../../../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "/amadeus",
  slots: {
    title_block: `@.claude/rules/amadeus.md

<!--
  The @-line above pulls the AIDLC method into Claude's ambient context. It is
  the first hop of a reference chain (NOT a copy): CLAUDE.md → @.claude/rules/
  amadeus.md → @../../amadeus/spaces/default/memory/*.md. The method is authored ONCE
  at the workspace root under amadeus/spaces/default/memory/ (org/team/project +
  phases/), so edit it there, never in .claude/rules/amadeus.md. Verified resolving
  (G1 PASS) — see tmp/workspace-vision/at-import-spike/RESULTS.md.
-->

# Project Name <!-- Replace with your project name -->

This project uses AI-DLC (AI-Driven Development Life Cycle) for structured development. The workspace shell ships in \`.claude/\` (no setup command); the engine auto-births the first intent when you describe what to build. Run \`/amadeus\` followed by a scope or project description to begin. Run \`/amadeus --doctor\` to validate your setup. Run \`/amadeus --version\` to print the framework version. Run \`/amadeus --stage <slug>\` to jump to a specific stage, \`/amadeus --phase <name>\` to jump to a phase, \`/amadeus --depth <level>\` to override depth, \`/amadeus --test-strategy <level>\` to override test volume. Run \`/amadeus compose "<task>"\` to have the adaptive composer propose a tailored EXECUTE/SKIP plan (works up front, from a scan report via \`--report <path>\`, and mid-workflow to re-shape the pending stages - every proposal stops at an approve/edit/reject gate).`,

    prereq_bullets: `- **bun**: Required for CLI tools and hook scripts (state management, audit logging, jump orchestration). Install via \`curl -fsSL https://bun.sh/install | bash\`. On Windows: \`npm install -g bun\` or \`powershell -c "irm bun.sh/install.ps1 | iex"\`. Startup is ~20ms. **Important**: \`bun\` must be on your PATH for non-interactive shells. Claude Code runs your shell non-interactively, so it sources \`~/.zshenv\` (zsh) or \`~/.bashrc\` (bash) — NOT \`~/.zshrc\`. On Windows with Git Bash, \`~/.bashrc\` is the correct file. If \`which bun\` fails inside Claude Code, add the bun PATH export to the appropriate file.
- **Claude Code model configuration**: The shipped \`.claude/settings.json.example\` does not pin a provider or model. Copy it to \`.claude/settings.json\` only when this project does not already have one. It uses the Claude Code defaults from the user's normal environment. Put personal model/provider overrides in \`.claude/settings.local.json\` or your user-level Claude Code settings.
- **MCP servers (optional)**: Add project or user MCP server definitions when your workflow needs external tools or context. Credentials should flow through your local environment or personal settings; no keys are committed. Servers you have no credentials for are simply unavailable and never block a workflow. Declared servers are provisioned to the session and **inherited by every agent** — there is no per-agent grant; agents that should be prevented from using a server are narrowed via their \`tools:\` allowlist with fully-qualified \`mcp__<server>__<tool>\` ids.`,

    prereq_bullets_tail: `- **Settings**: Copy \`.claude/settings.json.example\` to \`.claude/settings.json\` only when the project does not already have one. The example pre-approves tools (Read, Edit, Write, Bash, Glob, Grep, Task, WebSearch) so workflows run without per-call permission prompts.
- **Personal overrides**: Copy \`.claude/settings.local.json.example\` to \`.claude/settings.local.json\` (gitignored) to override the model or set environment variables without affecting shared settings.`,

    agents_note: `Each is a flat \`.md\` file prefixed \`amadeus-<role>-agent.md\`; the conductor adopts the persona inline, or delegates to it via the \`Task\` tool for the two subagent stages (2.1, 3.5).`,

    structure_extra: "",

    guide_pointer: "",

    sections_before_resumption: `## AI-DLC Method (imported)

The AI-DLC method — the layered practice files (\`org.md\`, \`team.md\`, \`project.md\`, and the per-phase \`phases/<phase>.md\`) — is authored once at the workspace root under \`amadeus/spaces/default/memory/\` and imported into Claude's ambient context by reference (the \`@{{HARNESS_DIR}}/rules/amadeus.md\` import at the top of this file), never copied. That stub \`@\`-imports each method file from \`amadeus/spaces/default/memory/\`; Claude resolves the nested chain. Edit the method there — it is the single hand-editable source of truth, identical on every harness. (AI-DLC's own stage resolver reads the same tree directly, so each stage is method-correct without this ambient import.)
`,

    sections_after_resumption: "",

    gitignore_extra: `- \`.claude/settings.local.json\``,
  },
};

export default fills;
