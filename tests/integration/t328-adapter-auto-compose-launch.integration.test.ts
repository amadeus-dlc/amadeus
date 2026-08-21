// covers: file:packages/framework/harness/codex/hooks/amadeus-codex-adapter.ts, file:packages/framework/harness/kiro/hooks/amadeus-kiro-adapter.ts, file:packages/framework/harness/kiro-ide/hooks/amadeus-kiro-adapter.ts, file:packages/framework/harness/cursor/hooks/amadeus-cursor-adapter.ts, file:packages/framework/harness/kimi/hooks/amadeus-kimi-adapter.ts
// size: large
//
// U4 hook-wiring-remaining — the REAL native-hook launch (BR-U4-3,
// reliability-design.md REL-U4-3). For each wired adapter face, spawn the
// ACTUAL installed adapter (dist tree) with the session-start target and prove
// it reaches auto-compose by its observable effect — the composition record now
// records the staged plugin. A grep of the wiring is verification theatre and
// is explicitly NOT sufficient (t327 is the structural closure; THIS is the
// live firing). seam-writer-mode-precondition: we drive the adapter's OWN
// session-start dispatch (the writer), never a stubbed compose.
//
// Runs against dist (the installed surface an adapter's runCore siblings the
// core hooks in). dist currency is enforced by dist:check in CI; the test reads
// the same trees t149 does. Nested spawns (adapter → compose → recompile) run
// under a 60s timeout each, like t299.

import { scaleTestTime } from "../lib/test-time-factor.ts";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createNodeBackend } from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { amadeusToolTarget } from "../harness/cli-target.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const COMPOSITION = ".amadeus-plugin-composition.json";

// The five wired adapter faces (claude's SessionStart wiring is covered by U2's
// t299). Each entry names the dist tree that co-locates the adapter with the
// core hooks its runCore invokes.
const FACES: ReadonlyArray<{ name: string; distName: string; harnessDir: string; adapter: string }> = [
  { name: "codex", distName: "codex", harnessDir: ".codex", adapter: "amadeus-codex-adapter.ts" },
  { name: "cursor", distName: "cursor", harnessDir: ".cursor", adapter: "amadeus-cursor-adapter.ts" },
  { name: "kimi", distName: "kimi", harnessDir: ".kimi-code", adapter: "amadeus-kimi-adapter.ts" },
  { name: "kiro", distName: "kiro", harnessDir: ".kiro", adapter: "amadeus-kiro-adapter.ts" },
  { name: "kiro-ide", distName: "kiro-ide", harnessDir: ".kiro", adapter: "amadeus-kiro-adapter.ts" },
];

let host = "";

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t328-"));
});

// The plugin host root is the face's HARNESS dir under the project root (#1591
// ruling B) — where the shipped INSTALL doc says to stage, where compose writes,
// and where the engine reads composed stages back from.
function hostRootOf(face: (typeof FACES)[number]): string {
  return join(host, face.harnessDir);
}

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

// Install the face's harness tree into the host and spawn its adapter for the
// session-start target — exactly how the host CLI fires the session hook.
function fireSessionStart(face: (typeof FACES)[number]): ReturnType<typeof spawnSync> {
  const distTree = join(REPO_ROOT, "dist", face.distName, face.harnessDir);
  cpSync(distTree, hostRootOf(face), { recursive: true });
  // Stage the opt-in plugin so compose has something to apply (its observable
  // effect is the proof the adapter reached compose). Staged after the tree copy
  // because the staging dir lives inside the harness root.
  cpSync(FIXTURE, join(hostRootOf(face), ".amadeus-plugin-src", PLUGIN), { recursive: true });
  const adapter = join(host, face.harnessDir, "hooks", face.adapter);
  return spawnSync("bun", [amadeusToolTarget(adapter), "session-start"], {
    encoding: "utf-8",
    input: "{}",
    cwd: host,
    timeout: scaleTestTime(60_000),
    // CLAUDE_PROJECT_DIR anchors resolveProjectDirFromHook (kiro/kiro-ide rung 2);
    // codex/cursor/kimi resolve from cwd. Both point at the staged host.
    env: { ...process.env, CLAUDE_PROJECT_DIR: host },
  });
}

describe("t328 adapter auto-compose real launch (U4)", () => {
  for (const face of FACES) {
    test(`${face.name}: session-start adapter really reaches compose (BR-U4-3, not verification theatre)`, () => {
      // Before: nothing composed.
      expect(existsSync(join(hostRootOf(face), COMPOSITION))).toBe(false);

      fireSessionStart(face);

      // After: the real subprocess reached the engine and wrote the record.
      const record = createNodeBackend(hostRootOf(face)).readComposition();
      expect(record.plugins.has(PLUGIN), `${face.name} auto-composed the staged plugin`).toBe(true);

      // No-op fast path (FR-3c / PERF-U4-1): a second session-start with the record
      // already current re-fires --if-stale and leaves the record byte-identical —
      // the compose applied no second time.
      const before = readFileSync(join(hostRootOf(face), COMPOSITION));
      fireSessionStart(face);
      expect(readFileSync(join(hostRootOf(face), COMPOSITION)).equals(before), `${face.name} second fire is a no-op`).toBe(true);
    });
  }
});
