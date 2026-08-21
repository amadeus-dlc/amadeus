// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// U7 conformance-suite — ADOPTED test for upstream t188 #12 ("compose recompiles
// when the graph lost the plugin's stages"). Amadeus's self-heal trigger is
// PLAIN `compose`: after the per-plugin apply loop it recompiles UNCONDITIONALLY
// (amadeus-plugin.ts handleCompose), so a second plain compose against a current
// record still recompiles (applied=0, recompiled) — the path that restores a
// graph that lost stages out-of-band. `compose --if-stale` (the SessionStart hook
// path) is record-keyed and returns a no-op without recompiling. This test pins
// BOTH: the unconditional-recompile trigger and the --if-stale degrade. The real
// recompile's graph-restoration EFFECT is covered end-to-end by t299 (#3). Drives
// the CLI IN-PROCESS with a recompile COUNTER (bun --coverage does not instrument
// spawned children). Touches a real temp fs — integration tier.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginDrop,
  applyPluginPlan,
  clearPluginDrops,
  createNodeBackend,
  createNodeLock,
  diagnosePlugins,
  discoverPlugins,
  inspectPlugin,
  planPluginDrop,
  recordPluginDrops,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  buildHostSnapshot,
  copyPluginSource,
  handlePluginCli,
  type PluginCliDeps,
  stagingEntryState,
  listHarnessTrees,
  listPluginSourceDirs,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";

let host = "";
let recompileCount = 0;
let applyCount = 0;
const out: string[] = [];

// Real engine; recompile + apply are counted (bun --coverage cannot see a spawned
// child, so the runtime graph is stubbed with a counter — seam-export-handler-amend).
function deps(): PluginCliDeps {
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan: (plan, tx) => {
      applyCount += 1;
      return applyPluginPlan(plan, tx);
    },
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t338-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => {
      recompileCount += 1;
      return true;
    },
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: () => {},
  };
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t338-"));
  cpSync(FIXTURE, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
  recompileCount = 0;
  applyCount = 0;
  out.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t338 recompile self-heal trigger (upstream t188 #12)", () => {
  test("plain compose recompiles unconditionally (self-heal trigger); --if-stale on a current record does not (upstream t188 #12)", () => {
    // First compose: applies the plugin and recompiles.
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(applyCount).toBe(1);
    expect(recompileCount).toBe(1);

    // Second PLAIN compose against the now-current record: nothing is stale so the
    // apply loop is skipped (applyCount unchanged), but the engine STILL recompiles
    // unconditionally — this is the self-heal trigger that restores a graph which
    // lost the plugin's stages out-of-band.
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    expect(applyCount).toBe(1); // no new apply
    expect(recompileCount).toBe(2); // recompiled anyway
    expect(out.some((l) => l.includes("composed 0"))).toBe(true);

    // Contrast: --if-stale on a current record is the record-keyed fast path — it
    // returns a no-op and does NOT recompile (the documented degrade: the hook path
    // does not self-heal an out-of-band graph corruption).
    expect(handlePluginCli(["compose", "--if-stale", "--project-root", host], deps())).toBe(0);
    expect(applyCount).toBe(1);
    expect(recompileCount).toBe(2); // unchanged — no recompile on the fast path
    expect(out.some((l) => l.includes("no-op"))).toBe(true);
  });
});
