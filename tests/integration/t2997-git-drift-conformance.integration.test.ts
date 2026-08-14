// t2997 — the git-drift bundle shape: stages:[] + sensors + seams (U3, R9/R10).
// covers: file:plugins/git-drift/plugin.json, file:plugins/git-drift/sensors/amadeus-git-drift.md
// covers: file:packages/framework/core/tools/amadeus-plugin-compose.ts
// size: medium
//
// git-drift is the first shipped plugin that contributes ONLY sensors: it adds
// no stage, so nothing about it is reachable unless the seam rewrite and the
// sensor projection both land and the compiler then resolves the declared id.
// This walks that chain against the real bundle and the real compiler:
//
//   compose  -> the manifest lands at <host>/sensors/amadeus-git-drift.md and
//               the tool under <host>/plugins/git-drift/tools/
//   compile  -> code-generation AND build-and-test carry `git-drift` in their
//               sensors_applicable, at advisory severity
//   mismatch -> a seam entry naming an id no manifest declares fails the
//               compile loudly instead of composing into a silent no-op
//
// Real filesystem and the real compiler, hence the integration tier.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  discoverPlugins,
  inspectPlugin,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import { buildHostSnapshot } from "../../packages/framework/core/tools/amadeus-plugin.ts";
import {
  __resetGraphCache,
  compileStageGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const PLUGIN_SRC = join(REPO_ROOT, "plugins", "git-drift");
const PLUGIN = "git-drift";
const SENSOR_ID = "git-drift";
const SEAM_STAGES = ["code-generation", "build-and-test"] as const;

const GRAPH_ENV_KEYS = [
  "AMADEUS_STAGES_DIR",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SCOPE_GRID",
  "AMADEUS_RULES_DIR",
  "AMADEUS_SENSORS_DIR",
  "AMADEUS_PLUGINS_HOST_ROOT",
] as const;

let host = "";
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = Object.fromEntries(GRAPH_ENV_KEYS.map((k) => [k, process.env[k]]));
  host = mkdtempSync(join(tmpdir(), "amadeus-t2997-drift-host-"));
  for (const name of readdirSync(CORE_ROOT)) {
    cpSync(join(CORE_ROOT, name), join(host, name), { recursive: true });
  }
  cpSync(PLUGIN_SRC, join(host, ".amadeus-plugin-src", PLUGIN), { recursive: true });
});

afterEach(() => {
  for (const k of GRAPH_ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetStageGraphForTests();
  __resetGraphCache();
  rmSync(host, { recursive: true, force: true });
});

function compose(): void {
  const discovered = discoverPlugins(join(host, ".amadeus-plugin-src"));
  expect(discovered.map((p) => p.name)).toEqual([PLUGIN]);
  const backend = createNodeBackend(host);
  const inspected = inspectPlugin(discovered[0], buildHostSnapshot(host, backend));
  expect(inspected.kind === "ready" ? "ready" : JSON.stringify(inspected)).toBe("ready");
  if (inspected.kind !== "ready") return;
  const tx: WorkspaceTransaction = {
    backend,
    verify: () => ({ ok: true }),
    lock: createNodeLock(host),
    newTxnId: () => `t2997-${Date.now()}-${Math.random()}`,
  };
  expect(applyPluginPlan(inspected.plan, tx).kind).toBe("committed");
}

function compileFromHost(): ReturnType<typeof compileStageGraph> {
  process.env.AMADEUS_STAGES_DIR = join(host, "amadeus-common", "stages");
  process.env.AMADEUS_SENSORS_DIR = join(host, "sensors");
  process.env.AMADEUS_PLUGINS_HOST_ROOT = host;
  process.env.AMADEUS_RULES_DIR = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
  delete process.env.AMADEUS_STAGE_GRAPH;
  _resetStageGraphForTests();
  __resetGraphCache();
  return compileStageGraph();
}

function sensorIdsOf(slug: string): readonly string[] {
  const stage = compileFromHost().stages.find((s) => s.slug === slug);
  expect(stage).toBeDefined();
  return (stage?.sensors_applicable ?? []).map((s) => s.id);
}

describe("t2997 the git-drift bundle composes as a sensors-only plugin", () => {
  test("the manifest declares no stage and still reaches both seam stages", () => {
    const manifest = JSON.parse(readFileSync(join(PLUGIN_SRC, "plugin.json"), "utf-8"));
    expect(manifest.stages).toEqual([]);
    expect(manifest.seams.map((s: { stage: string; seam: string }) => `${s.stage}.${s.seam}`).sort()).toEqual(
      [...SEAM_STAGES].map((s) => `${s}.sensors`).sort(),
    );
  });

  test("compose lands the sensor manifest and the tool where the host reads them", () => {
    compose();
    expect(existsSync(join(host, "sensors", `amadeus-${SENSOR_ID}.md`))).toBe(true);
    expect(existsSync(join(host, "plugins", PLUGIN, "tools", "amadeus-sensor-git-drift.ts"))).toBe(true);
  });

  test("both seam stages carry the sensor after compose, at advisory severity", () => {
    for (const slug of SEAM_STAGES) expect(sensorIdsOf(slug)).not.toContain(SENSOR_ID);
    compose();
    for (const slug of SEAM_STAGES) expect(sensorIdsOf(slug)).toContain(SENSOR_ID);
    const stage = compileFromHost().stages.find((s) => s.slug === "code-generation");
    const entry = (stage?.sensors_applicable ?? []).find((s) => s.id === SENSOR_ID);
    // Advisory is the compiler's default and is emitted by omission.
    expect(entry?.severity).toBeUndefined();
  });
});

describe("t2997 a seam entry no manifest declares fails loudly (R10)", () => {
  test("compile refuses a stage importing an id the sensor registry does not hold", () => {
    const manifestPath = join(host, ".amadeus-plugin-src", PLUGIN, "plugin.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    manifest.seams = manifest.seams.map((seam: { entries: string[] }) => ({
      ...seam,
      entries: ["git-drift-typo"],
    }));
    writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

    compose();
    expect(() => compileFromHost()).toThrow(/unknown sensor id "git-drift-typo"/);
  });
});
