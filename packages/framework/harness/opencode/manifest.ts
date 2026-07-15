// harness/opencode/manifest.ts — the OpenCode CLI distribution row (skeleton).
//
// Projects core/ into dist/opencode/.opencode/ (rules → amadeus-rules, mirroring
// codex D-10) and defers the ONE opencode-specific surface — the
// .opencode/commands/amadeus.md orchestrator-forwarding command — to emit.ts.
// A minimal walking skeleton: no adapter shim, no per-shell config, no agent
// transposition (those arrive in later Bolts). The tools/data/harness.json
// runtime fact is written by the packager's writeHarnessData (scripts/package.ts),
// NOT by emit — the skeleton adds no data emission of its own.
//
// OpenCode specifics vs Codex:
//   - token → .opencode
//   - rules/ → amadeus-rules/ (same rename class as codex; the AIDLC markdown
//     layers live in amadeus-rules/, keeping the harness's native rules dir free)
//   - skills are NOT shipped in .opencode/skills/ — OpenCode discovers user
//     commands at .opencode/commands/, so skipRunnerGen is set and emit() writes
//     the single orchestrator-forwarding command there.
//   - NO authored .opencode/ file beyond the projectRoot .gitignore: unlike
//     codex there is no stdin adapter shim, so authoredExempt is the explicit
//     empty array (no core-copied dir hides an authored harness file).

import type { HarnessManifest } from "../../../../scripts/manifest-types.ts";
import emit from "./emit.ts";

const manifest: HarnessManifest = {
  name: "opencode",
  harnessDir: ".opencode",

  // Core projection: identical to codex — rules→amadeus-rules, NO skills dir
  // (the command is emitted to .opencode/commands/ by emit). Persona .md files
  // ARE core (the conductor reads them as prose).
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

  // The one authored non-.opencode surface: the project-root .gitignore (beside
  // .opencode/, re-rooted under amadeus/spaces/* for the workspace layout).
  // Authored as dot-gitignore so it does not act as a live ignore inside
  // harness/opencode/. projectRoot routes it to dist/opencode/.gitignore + the
  // --check drift guard. Byte-identical to codex's dot-gitignore (workspace
  // layout is harness-neutral).
  harnessFiles: [{ src: "dot-gitignore", dst: ".gitignore", projectRoot: true }],

  rulesRename: "amadeus-rules",

  // No authored file lives inside a core-copied dir (no adapter shim) — explicit
  // empty array documents that the orphan scan needs no exemption here.
  authoredExempt: [],

  // The command ships at .opencode/commands/ via emit, not <harnessDir>/skills/
  // via runner-gen.
  skipRunnerGen: true,

  emit,
};

export default manifest;
