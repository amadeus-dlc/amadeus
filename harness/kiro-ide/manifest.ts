// harness/kiro-ide/manifest.ts — the Kiro IDE distribution row.
//
// Identical to the Kiro CLI harness (harness/kiro/) EXCEPT:
//   - Ships .kiro.hook files for hook registration (IDE ignores agent JSON hooks)
//   - The amadeus.json agent config omits the `hooks` field (dead weight in IDE)
//   - Injects a `tools:` frontmatter grant into the delegation-target agent
//     .md files (frontmatterAdditions below) - the IDE resolves a delegated
//     subagent's tools from the agent .md frontmatter, not from the agent-v1
//     JSON the CLI reads, so without the injected line an IDE delegate runs
//     toolless (field-proven: the dispatched composer reported "terminal tool
//     not available" until the grant was added).
//
// The CLI harness relies on agent JSON hooks (the `hooks` object inside
// amadeus.json); the IDE harness relies on .kiro.hook files (the only mechanism
// the IDE recognises). Both share the same core, adapter, and TS hook bodies.

import type { HarnessManifest } from "../../scripts/manifest-types.ts";
import onboardingFills from "./onboarding.fills.ts";

const manifest: HarnessManifest = {
  name: "kiro-ide",
  harnessDir: ".kiro",

  // Same core projection as kiro CLI.
  coreDirs: [
    { src: "tools", dst: "tools" },
    { src: "amadeus-common", dst: "amadeus-common" },
    { src: "knowledge", dst: "knowledge" },
    { src: "sensors", dst: "sensors" },
    { src: "scopes", dst: "scopes" },
    { src: "agents", dst: "agents" },
    { src: "hooks", dst: "hooks" },
    { src: "skills/amadeus-session-cost", dst: "skills/amadeus-session-cost" },
    { src: "skills/amadeus-replay", dst: "skills/amadeus-replay" },
    { src: "skills/amadeus-outcomes-pack", dst: "skills/amadeus-outcomes-pack" },
    { src: "skills/amadeus-grilling", dst: "skills/amadeus-grilling" },
  ],

  // Authored surfaces: same as CLI but adds .kiro.hook files and omits the
  // hooks field from amadeus.json.
  harnessFiles: [
    { src: "skills/amadeus/SKILL.md", dst: "skills/amadeus/SKILL.md" },
    { src: "skills/amadeus/question-rendering.md", dst: "skills/amadeus/question-rendering.md" },
    { src: "agents/amadeus.json", dst: "agents/amadeus.json" },
    { src: "agents/amadeus-architect-agent.json", dst: "agents/amadeus-architect-agent.json" },
    { src: "agents/amadeus-developer-agent.json", dst: "agents/amadeus-developer-agent.json" },
    { src: "agents/amadeus-product-lead-agent.json", dst: "agents/amadeus-product-lead-agent.json" },
    { src: "agents/amadeus-architecture-reviewer-agent.json", dst: "agents/amadeus-architecture-reviewer-agent.json" },
    { src: "agents/amadeus-composer-agent.json", dst: "agents/amadeus-composer-agent.json" },
    { src: "hooks/amadeus-kiro-adapter.ts", dst: "hooks/amadeus-kiro-adapter.ts" },
    { src: "hooks/amadeus-audit-logger.kiro.hook", dst: "hooks/amadeus-audit-logger.kiro.hook" },
    { src: "hooks/amadeus-mint.kiro.hook", dst: "hooks/amadeus-mint.kiro.hook" },
    { src: "hooks/amadeus-block.kiro.hook", dst: "hooks/amadeus-block.kiro.hook" },
    { src: "hooks/amadeus-log-subagent.kiro.hook", dst: "hooks/amadeus-log-subagent.kiro.hook" },
    { src: "hooks/amadeus-runtime-compile.kiro.hook", dst: "hooks/amadeus-runtime-compile.kiro.hook" },
    { src: "hooks/amadeus-session-end.kiro.hook", dst: "hooks/amadeus-session-end.kiro.hook" },
    { src: "hooks/amadeus-session-start.kiro.hook", dst: "hooks/amadeus-session-start.kiro.hook" },
    { src: "hooks/amadeus-stop.kiro.hook", dst: "hooks/amadeus-stop.kiro.hook" },
    { src: "hooks/amadeus-sync-statusline.kiro.hook", dst: "hooks/amadeus-sync-statusline.kiro.hook" },
    { src: "settings/cli.json", dst: "settings/cli.json" },
    // Project-root .gitignore (beside .kiro/, not inside it) — same workspace-layout
    // committed-vs-ignored split as the Kiro CLI tree: per-user cursors + machine-local
    // runtime ignored, the shared work (memory/codekb/registry/state/audit shards/
    // artifacts) committed. Authored as dot-gitignore so it does not act as a live
    // ignore inside harness/kiro-ide/; projectRoot routes it to dist/kiro-ide/.gitignore
    // + the --check drift guard. (Kiro IDE DOES support a promptSubmit seam (the
    // human-turn mint hook) and a preToolUse seam (the exit-2 human-presence hard
    // block) - both spike-proven on the IDE; the latch lines describe what is wired,
    // not a platform limit.)
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],

  // IDE-native tool grants for the five delegation targets (the agents the
  // conductor dispatches via the `subagent` tool: composer, the two
  // subagent-mode stage workers, and the two reviewers). The IDE reads these
  // from the .md frontmatter; the agent-v1 JSONs above are CLI-only. Kiro IDE
  // frontmatter tool names: "read" / "write" / "shell". NOTE the IDE grant is
  // UNSCOPED (no allowedCommands/allowedPaths equivalent) - wider than the
  // CLI JSON sandbox; the persona Boundaries prose and the conductor's gates
  // remain the behavioral constraint. Reviewers need "write" too: the stage
  // protocol has them append a `## Review` section to the primary artifact
  // (the same grant their CLI JSONs carry). Never grant a delegation tool
  // here - delegates must not nest.
  frontmatterAdditions: [
    { file: "agents/amadeus-composer-agent.md", lines: [`tools: ["read", "write", "shell"]`] },
    { file: "agents/amadeus-developer-agent.md", lines: [`tools: ["read", "write", "shell"]`] },
    { file: "agents/amadeus-architect-agent.md", lines: [`tools: ["read", "write", "shell"]`] },
    { file: "agents/amadeus-product-lead-agent.md", lines: [`tools: ["read", "write", "shell"]`] },
    { file: "agents/amadeus-architecture-reviewer-agent.md", lines: [`tools: ["read", "write", "shell"]`] },
  ],

  onboarding: { dst: "AGENTS.md", projectRoot: true, fills: onboardingFills },

  rulesRename: "steering",

  authoredExempt: [/^agents\/[^/]+\.json$/, /^hooks\/amadeus-kiro-[^/]+\.ts$/, /^hooks\/[^/]+\.kiro\.hook$/],

  emit: null,
};

export default manifest;
