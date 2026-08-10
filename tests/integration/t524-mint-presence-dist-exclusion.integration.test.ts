// covers: file:scripts/package.ts, file:scripts/manifest-types.ts
// size: medium
//
// t524 — #860: amadeus-mint-presence.ts is a core hook. package.ts projects
// core/hooks/ verbatim into every harness's coreDirs (each manifest declares
// { src: "hooks", dst: "hooks" }), but only SOME harnesses actually invoke it:
//
//   - claude:  settings.json.example wires UserPromptSubmit to the core hook
//              directly (subprocess call to hooks/amadeus-mint-presence.ts).
//   - cursor:  the "mint" adapter target routes to hookFile
//              "amadeus-mint-presence.ts" (subprocess call).
//   - kimi:    the "mint" adapter target routes to hookPath
//              "amadeus-mint-presence.ts" (subprocess call).
//
// The rest classify a HUMAN_TURN mint through the CANONICAL in-process seam
// (mintHumanPresence, imported from tools/amadeus-presence-reservation.ts)
// and never spawn the core hook file — so it ships as dead code:
//
//   - codex:    amadeus-codex-adapter.ts "case mint" calls mintHumanPresence
//               inline (no runCore("amadeus-mint-presence.ts", ...) call).
//   - kiro:     amadeus-kiro-adapter.ts calls mintHumanPresence inline.
//   - kiro-ide: amadeus-kiro-adapter.ts (kiro-ide copy) calls mintHumanPresence
//               inline.
//   - opencode: the amadeus-opencode-plugin.ts prompt-hook mint site calls
//               mintHumanPresence inline.
//   - pi:       has no prompt-submit hook wiring of any kind (0 references to
//               "mint" anywhere under harness/pi/).
//
// Mechanism: pure structural check over the shipped dist/ trees `bun run
// build` produces — no process boundary, no LLM. This pins the fix: the
// unwired harnesses' coreDirs entry for "hooks" declares
// exclude: ["amadeus-mint-presence.ts"], so the packager skips the file
// during projection (scripts/package.ts buildTree); the wired harnesses keep
// shipping it untouched.

import { describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..", "..");
const dist = (name: string, harnessDir: string): string =>
  join(ROOT, "dist", name, harnessDir, "hooks", "amadeus-mint-presence.ts");

// Harnesses whose adapter genuinely spawns the core hook as a subprocess.
const WIRED = [
  { name: "claude", dir: ".claude" },
  { name: "cursor", dir: ".cursor" },
  { name: "kimi", dir: ".kimi-code" },
] as const;

// Harnesses that mint HUMAN_TURN inline (mintHumanPresence import) or have no
// mint wiring at all — the core hook is never invoked on these shells (#860).
const UNWIRED = [
  { name: "codex", dir: ".codex" },
  { name: "kiro", dir: ".kiro" },
  { name: "kiro-ide", dir: ".kiro" },
  { name: "opencode", dir: ".opencode" },
  { name: "pi", dir: ".pi" },
] as const;

describe("#860 — amadeus-mint-presence.ts ships only where a harness actually wires it", () => {
  for (const { name, dir } of WIRED) {
    test(`${name}: ships hooks/amadeus-mint-presence.ts (subprocess-wired)`, () => {
      expect(existsSync(dist(name, dir))).toBe(true);
    });
  }

  for (const { name, dir } of UNWIRED) {
    test(`${name}: does NOT ship hooks/amadeus-mint-presence.ts (inline mint, dead code)`, () => {
      expect(existsSync(dist(name, dir))).toBe(false);
    });
  }
});
