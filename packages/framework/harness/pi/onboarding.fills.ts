// Pi-specific fills for the shared project onboarding document.

import type { OnboardingFills } from "../../../../scripts/onboarding.ts";

const fills: OnboardingFills = {
  invoke: "/skill:amadeus",
  slots: {
    title_block: `# AI-DLC on Pi Coding Agent

This project ships Amadeus as trusted project-local Pi resources. Invoke the
orchestrator with \`/skill:amadeus\` followed by a scope or project description.`,
    prereq_bullets: `- **Pi Coding Agent >= 0.83.0**: install \`@earendil-works/pi-coding-agent\`. On first interactive startup, Pi asks whether to trust a project containing local settings, extensions, or skills. Amadeus loads only after Pi's native project-trust decision.
- **Project trust**: Review the tracked \`.pi/\` resources and approve them through Pi. Amadeus never auto-approves the project, changes \`~/.pi/agent/trust.json\`, or treats trust as an OS sandbox.
- **bun**: Required for the deterministic TypeScript tools and the child-execution driver. Ensure it is available to non-interactive shells.`,
    prereq_bullets_tail: `- **Runtime package**: the extension imports Pi's public API from \`@earendil-works/pi-coding-agent\`; do not replace the declared minimum-version check with private Pi internals.`,
    agents_note: `Pi loads the persona documents as prose. Delegated Construction work is launched by the Amadeus Pi child driver; Pi does not provide a built-in subagent primitive.`,
    structure_extra: `- **Pi extension**: \`{{HARNESS_DIR}}/extensions/amadeus.ts\` — the native lifecycle adapter loaded by Pi after project trust.
- **Pi child driver**: \`{{HARNESS_DIR}}/drivers/amadeus-pi-driver.ts\` — an Amadeus-internal execution resource, not a Pi auto-loaded extension.`,
    guide_pointer: `See \`docs/guide/harnesses/pi.md\` for the Pi-specific install and trust flow.`,
    sections_before_resumption: `## Pi trust boundary

Pi project trust authorizes project-local code to run with the user's normal
permissions. It is not a sandbox. Missing or rejected trust means the local
Amadeus extension and skills remain unavailable; the installer must not bypass
that native decision.`,
    sections_after_resumption: "",
    gitignore_extra: `- Pi's user-level trust decisions remain in \`~/.pi/agent/trust.json\` and are never committed by Amadeus.`,
  },
};

export default fills;
