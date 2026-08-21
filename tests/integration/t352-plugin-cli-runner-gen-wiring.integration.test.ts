// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// U3 (#1598) — the plugin CLI must regenerate stage-runners after it recompiles,
// on BOTH verbs (BR-U3-3: compose ADDS the composed stage's `/amadeus-<slug>`
// runner, drop PRUNES it through the same regeneration). Driven IN-PROCESS
// through handlePluginCli(argv, deps) over the real engine and a real temp host,
// with the two spawning seams (recompile, generateRunners) injected as counters
// so the ORDER and the failure contract are observable (t351 proves what the
// generator itself does). Integration tier — real FS (fs-tests-integration-first).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  defaultPluginCliDeps,
  handlePluginCli,
  type PluginCliDeps,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const PLUGIN = "conformance-fixture";
const OWNED_STAGE = `plugins/${PLUGIN}/stages/${PLUGIN}.md`;

let host = "";
const out: string[] = [];
const err: string[] = [];
// The observable trace of the two post-apply spawns, in call order.
let trace: string[] = [];

function deps(opts: { runnersOk?: boolean; recompileOk?: boolean } = {}): PluginCliDeps {
  const { runnersOk = true, recompileOk = true } = opts;
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
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t352-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => {
      trace.push("recompile");
      return recompileOk;
    },
    generateRunners: () => {
      trace.push("generateRunners");
      return runnersOk;
    },
    recordDrops: recordPluginDrops,
    stagingEntryState: () => "absent" as const,
    listHarnessTrees: () => [],
    listPluginSourceDirs: () => [],
    copyPluginSource: () => {},
    clearDrops: clearPluginDrops,
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
  writeFileSync(
    join(host, "tools", "data", "stage-graph.json"),
    JSON.stringify([
      {
        slug: "fixture-stage",
        phase: "construction",
        number: "3.99",
        name: "Fixture Stage",
      },
    ]),
  );
}

beforeEach(() => {
  host = mkdtempSync(join(tmpdir(), "amadeus-t352-"));
  out.length = 0;
  err.length = 0;
  trace = [];
});

afterEach(() => {
  rmSync(host, { recursive: true, force: true });
});

describe("t352 plugin CLI regenerates stage-runners (#1598)", () => {
  test("compose regenerates runners AFTER the recompile", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    // Order matters: the generator reads the COMPILED graph, so a regeneration
    // before the recompile would never see the composed stage.
    expect(trace).toEqual(["recompile", "generateRunners"]);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
  });

  test("drop regenerates runners AFTER the recompile (symmetric with compose)", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    trace = [];
    expect(handlePluginCli(["drop", PLUGIN, "--project-root", host], deps())).toBe(0);
    expect(trace).toEqual(["recompile", "generateRunners"]);
    expect(existsSync(join(host, OWNED_STAGE))).toBe(false);
  });

  test("a failed regeneration after compose is loud (apply-stage failure, exit 1)", () => {
    installGoodPlugin();
    const code = handlePluginCli(["compose", "--project-root", host], deps({ runnersOk: false }));
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("stage-runner generation failed after compose"))).toBe(true);
    // The apply itself committed before the regeneration step failed.
    expect(existsSync(join(host, OWNED_STAGE))).toBe(true);
  });

  test("a failed regeneration after drop is loud (apply-stage failure, exit 1)", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);
    err.length = 0;
    const code = handlePluginCli(["drop", PLUGIN, "--project-root", host], deps({ runnersOk: false }));
    expect(code).toBe(1);
    expect(err.some((l) => l.includes("stage-runner generation failed after drop"))).toBe(true);
  });

  test("a failed recompile short-circuits: runners are never regenerated off a stale graph", () => {
    installGoodPlugin();
    expect(handlePluginCli(["compose", "--project-root", host], deps({ recompileOk: false }))).toBe(1);
    expect(trace).toEqual(["recompile"]);
  });

  test("the default dependency bag wires a real spawning generator seam", () => {
    // Drives the real spawnSync call in-process (only the spawned child is
    // uninstrumented) against a fixture-local compiled graph and skills tree.
    installFixtureHarness();
    const d = defaultPluginCliDeps();
    expect(d.generateRunners(host)).toBe(true);
    expect(existsSync(join(host, "skills", "amadeus-fixture-stage", "SKILL.md"))).toBe(true);
  });
});
