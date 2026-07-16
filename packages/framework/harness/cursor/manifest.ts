// harness/cursor/manifest.ts — the Cursor IDE distribution row (U3 port).
//
// Projects core/ into dist/cursor/.cursor/ (rules → amadeus-rules, mirroring
// codex/opencode) and defers the two cursor-specific surfaces — the authored
// stdin adapter shim and the emitted commands/rules/hooks/AGENTS files — to
// emit.ts. Modeled on the codex row (adapter + emit) and the opencode row
// (skeleton coreDirs + projectRoot .gitignore).
//
// Cursor specifics vs Codex/OpenCode:
//   - token → .cursor
//   - rules/ → amadeus-rules/ (rename kept for parity with codex/opencode;
//     core/rules/ is empty today so the projection is a no-op — the AIDLC method
//     lives at the workspace root under amadeus/spaces/<space>/memory/). Cursor's
//     native .cursor/rules/ holds .mdc rule files; emit writes ONE
//     .cursor/rules/amadeus.mdc pointing at that method chain — no rule bodies
//     are copied.
//   - user commands are discovered at .cursor/commands/, so skipRunnerGen is set
//     and emit() writes the single orchestrator-forwarding command there.
//   - the only authored .cursor/ file is the amadeus-cursor-adapter.ts stdin
//     shim (a harnessFile inside the core-copied hooks/ dir); everything else
//     emit() produces is generated, scanned by emit's own check.

import type { HarnessManifest } from "../../../../scripts/manifest-types.ts";
import emit from "./emit.ts";

const manifest: HarnessManifest = {
  name: "cursor",
  harnessDir: ".cursor",

  // Core projection: identical 8 dirs to codex/opencode — rules→amadeus-rules,
  // NO skills dir (the command is emitted to .cursor/commands/ by emit). Persona
  // .md files ARE core (the conductor reads them as prose).
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

  // Three authored surfaces:
  //   1. the stdin adapter entrypoint + its logic lib, landing inside the
  //      core-copied hooks/ dir (beside the byte-shared amadeus-*.ts core hooks
  //      the lib pipes into). Split so the tested logic is 100% covered and the
  //      uninstrumentable entrypoint stays a thin, import-free shim.
  //   2. the project-root .gitignore (beside .cursor/, re-rooted under
  //      amadeus/spaces/* for the workspace layout). Authored as dot-gitignore
  //      so it does not act as a live ignore inside harness/cursor/. projectRoot
  //      routes it to dist/cursor/.gitignore + the --check drift guard.
  //      Byte-identical to codex/opencode (workspace layout is harness-neutral).
  harnessFiles: [
    { src: "hooks/amadeus-cursor-adapter.ts", dst: "hooks/amadeus-cursor-adapter.ts" },
    { src: "hooks/amadeus-cursor-lib.ts", dst: "hooks/amadeus-cursor-lib.ts" },
    { src: "dot-gitignore", dst: ".gitignore", projectRoot: true },
  ],

  rulesRename: "amadeus-rules",

  // The cursor adapter lives inside the core-copied hooks/ dir — exempt the
  // authored amadeus-cursor-*.ts shim(s) from the orphan scan. (The .mdc rule,
  // command, hooks.json, and AGENTS.md are emitted, part of emit's expected set.)
  authoredExempt: [/^hooks\/amadeus-cursor-[^/]+\.ts$/],

  // The command + rule + hooks.json + AGENTS.md ship via emit, not
  // <harnessDir>/skills/ via runner-gen.
  skipRunnerGen: true,

  emit,
};

export default manifest;
