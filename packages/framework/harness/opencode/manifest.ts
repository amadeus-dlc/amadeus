// harness/opencode/manifest.ts — the OpenCode CLI distribution row.
//
// Projects core/ into dist/opencode/.opencode/ (rules → amadeus-rules, mirroring
// codex D-10) and defers every opencode-specific surface to emit.ts: the
// .opencode/commands/amadeus.md orchestrator-forwarding command (Bolt 1), and
// the Bolt 2 surfaces — the projectRoot AGENTS.md session guide,
// opencode.json.example (a permission-narrowing config example), and the four
// harness-neutral SESSION skills composed into .opencode/skills/. No adapter
// shim and no agent transposition (OpenCode has no stdin-hook shell and reads
// the persona .md bodies as prose). The tools/data/harness.json runtime fact is
// written by the packager's writeHarnessData (scripts/package.ts), NOT by emit.
//
// OpenCode specifics vs Codex:
//   - token → .opencode
//   - rules/ → amadeus-rules/ (same rename class as codex; the AIDLC markdown
//     layers live in amadeus-rules/, keeping the harness's native rules dir free)
//   - skills ship at .opencode/skills/ (OpenCode's skill-discovery path) and user
//     commands at .opencode/commands/ — both emitted by emit(), so skipRunnerGen
//     is set. Only the four SESSION skills are composed there; the orchestrator
//     ships solely as the command (E-OC16 ruling C — core has no orchestrator
//     skill origin, and re-composing it would duplicate the command in dist).
//   - session skills ship as bare SKILL.md (no codex openai.yaml guard — that is
//     an OpenAI/Codex agent-discovery artifact with no OpenCode equivalent).
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

  // emit() owns both the .opencode/commands/ command and the .opencode/skills/
  // session skills; the packager's standard runner-gen (which would write
  // <harnessDir>/skills/ per-stage runners) is skipped — per-stage runners are
  // out of scope for this port.
  skipRunnerGen: true,

  emit,
};

export default manifest;
