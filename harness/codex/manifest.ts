// harness/codex/manifest.ts — the Codex CLI distribution row.
//
// Projects core/ into dist/codex/.codex/ (rules → amadeus-rules, D-10) and defers
// every codex-specific surface to emit.ts (config.toml.example, hooks.json.example, trust-seed,
// AGENTS.md, 11 agent TOMLs, the .agents/skills/ tree). Mirrors the proven
// package-codex.ts spike, generalized onto the unified packager.
//
// Codex specifics vs Claude/Kiro:
//   - token → .codex
//   - rules/ → amadeus-rules/ (Codex's native .codex/rules/ is Starlark
//     permission rules; the AIDLC markdown layers live in amadeus-rules/)
//   - skills are NOT shipped in .codex/skills/ — Codex discovers skills at
//     <project>/.agents/skills/, so skipRunnerGen is set and emit() composes
//     the whole skill set (orchestrator + runners + session skills) there.
//   - the only authored .codex/ file is the amadeus-codex-adapter.ts stdin shim
//     (a harnessFile); the agent TOMLs in .codex/agents/ are emitted.

import type { HarnessManifest } from "../../scripts/manifest-types.ts";
import emit from "./emit.ts";

const manifest: HarnessManifest = {
  name: "codex",
  harnessDir: ".codex",

  // Core projection: rules→amadeus-rules, NO session skills (emitted to
  // .agents/skills/ by emit). Persona .md files ARE core (the conductor reads
  // them as prose; Codex agent discovery reads only the emitted .toml).
  coreDirs: [
    { src: "tools", dst: "tools" },
    { src: "amadeus-common", dst: "amadeus-common" },
    { src: "knowledge", dst: "knowledge" },
    { src: "rules", dst: "amadeus-rules" },
    { src: "sensors", dst: "sensors" },
    { src: "scopes", dst: "scopes" },
    { src: "agents", dst: "agents" },
    { src: "hooks", dst: "hooks" },
  ],

  // The one authored .codex/ surface: the stdin adapter shim. The orchestrator
  // skill is authored too but is EMITTED into .agents/skills/amadeus/ by emit().
  harnessFiles: [
    { src: "hooks/amadeus-codex-adapter.ts", dst: "hooks/amadeus-codex-adapter.ts" },
    // Project-root .gitignore (beside .codex/, not inside it) — re-rooted under
    // aidlc/spaces/* for the workspace layout (SEED): cursors + machine-local
    // runtime ignored, the shared work (memory/codekb/registry/state/audit
    // shards/artifacts) committed. Net-new for Codex — it shipped none before.
    // Authored as dot-gitignore so it does not act as a live ignore inside
    // harness/codex/. projectRoot routes it to dist/codex/.gitignore + the
    // --check drift guard.
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],

  rulesRename: "amadeus-rules",

  // The codex adapter lives inside the core-copied hooks/ dir — exempt it from
  // the orphan scan. (Agent TOMLs are emitted, not authored — they are part of
  // emit's expected set, scanned by emit's own check.)
  authoredExempt: [/^hooks\/amadeus-codex-[^/]+\.ts$/],

  // Skills go to .agents/skills/ via emit, not <harnessDir>/skills/ via runner-gen.
  skipRunnerGen: true,

  emit,
};

export default manifest;
