// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// U2 walking-skeleton-claude — the plugin CLI's failure and default-wiring paths,
// driven IN-PROCESS through handlePluginCli(argv, deps) (bun --coverage does not
// instrument spawned children — seam-export-handler-amend). t299 proves the happy
// path; this file proves every guarded stage failure returns the right { kind:
// "failure", stage } and exit code, exercises the real default dependency bag's
// runtime seams (nodeTx, spawnRecompile), and drives handleDoctor's drift mapping.
// Touches a real temp filesystem, hence integration tier (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  defaultPluginCliDeps,
  handlePluginCli,
  type PluginCliDeps,
  stagingEntryState,
  listHarnessTrees,
  listPluginSourceDirs,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const OWNED_STAGE = `plugins/${PLUGIN}/stages/${PLUGIN}.md`;

let host = "";
const out: string[] = [];
const err: string[] = [];

// Real engine; recompile and tx verify are configurable to hit the guarded
// failure returns. (t299 uses the same injection pattern for the happy path.)
function deps(opts: { verifyOk?: boolean; recompileOk?: boolean } = {}): PluginCliDeps {
  const { verifyOk = true, recompileOk = true } = opts;
  return {
    discoverPlugins: (root) => discoverPlugins(root),
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: (root) => createNodeBackend(root),
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => (verifyOk ? { ok: true } : { ok: false, reason: "synthetic verify failure" }),
      lock: createNodeLock(root),
      newTxnId: () => `t302-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => recompileOk,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    listHarnessTrees,
    listPluginSourceDirs,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst),
    out: (l) => out.push(l),
    err: (l) => err.push(l),
  };
}

function installGoodPlugin(): void {
  cpSync(FIXTURE, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
}

function installFixtureHarness(): void {
  for (const name of readdirSync(CORE_ROOT)) {
    cpSync(join(CORE_ROOT, name), join(host, name), { recursive: true });
  }
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t302-"));
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t302 plugin CLI failure branches (U2)", () => {
  test("compose rejects a plugin whose seam targets an absent stage (plan failure)", () => {
    // A plugin whose seam references a stage not on the host: inspectPlugin returns
    // non-ready, so handleCompose short-circuits with a plan-stage failure.
    const dir = join(host, ".amadeus-plugin-src", "bad-seam");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "plugin.json"),
      JSON.stringify({ name: "bad-seam", stages: [], seams: [{ stage: "no-such-stage", seam: "produces", entries: ["x"] }], fragments: [] }),
    );
    const code = handlePluginCli(["compose", "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("plan failed") && l.includes("bad-seam"))).toBe(true);
    // No composition landed.
    expect(existsSync(join(host, ".amadeus-plugin-composition.json"))).toBe(false);
  });

  test("compose reports a recompile failure after a successful apply (apply-stage failure)", () => {
    installGoodPlugin();
    const code = handlePluginCli(["compose", "--project-root", host], deps({ recompileOk: false }));
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("recompile failed after compose"))).toBe(true);
    // The apply itself committed before the recompile step failed.
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
  });

  test("drop of an uncomposed plugin fails at the plan stage", () => {
    installGoodPlugin();
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("is not composed"))).toBe(true);
  });

  test("drop rejects when the owned stage was removed out-of-band (plan rejection)", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    // Delete the owned stage behind the CLI's back → planPluginDrop rejects.
    rmSync(join(host, OWNED_STAGE));
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps());
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("drop rejected"))).toBe(true);
  });

  test("drop reports an apply failure when the transaction verify fails", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps({ verifyOk: false }));
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("apply failed"))).toBe(true);
    // The verify failure rolled back: the owned stage is still present.
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
  });

  test("drop reports a recompile failure after a successful apply", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps({ recompileOk: false }));
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("recompile failed after drop"))).toBe(true);
    // The drop's apply committed before the recompile step failed.
    expect(existsSync(join(host, OWNED_STAGE))).toBe(false);
  });

  test("doctor maps a drifted (owned-path-missing) plugin to the drift state", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    // Remove the owned stage → diagnosePlugins observes drift.
    rmSync(join(host, OWNED_STAGE));
    out.length = 0;
    const code = handlePluginCli(["doctor", "--project-root", host], deps());
    expect(code).toBe(0); // drift is not a degraded state
    // Canonical renderer wording (shared with the integrated doctor, #1585).
    expect(out.some((l) => l.includes(`Plugin ${PLUGIN}: [drift:`))).toBe(true);
  });
});

describe("t302 default dependency bag runtime seams", () => {
  test("nodeTx builds a real, verifying transaction over the host", () => {
    const d = defaultPluginCliDeps();
    const backend = d.makeBackend(host);
    const tx = d.makeTx(host, backend);
    // nodeTx's verify is a no-op OK (the engine's atomic mechanism is unchanged);
    // the args are ignored but the signature requires them.
    expect(tx.verify(new Map(), "compose")).toEqual({ ok: true });
    expect(typeof tx.newTxnId()).toBe("string");
    expect(tx.newTxnId()).not.toBe(tx.newTxnId());
  });

  test("spawnRecompile runs the runtime compile subprocess and returns its exit-status flag", () => {
    // Drives the real spawnSync call in-process (only the spawned child is
    // uninstrumented) against a fixture-local harness.
    installFixtureHarness();
    const d = defaultPluginCliDeps();
    expect(d.recompile(host)).toBe(true);
    expect(existsSync(join(host, "tools", "data", "stage-graph.json"))).toBe(true);
    expect(existsSync(join(host, "tools", "data", "scope-grid.json"))).toBe(true);
  });
});
