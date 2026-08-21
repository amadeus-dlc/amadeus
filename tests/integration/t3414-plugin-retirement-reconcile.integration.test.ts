// covers: file:packages/framework/core/tools/amadeus-plugin.ts
// size: medium
//
// t3414 (integration) — compose-time reconciliation of a RETIRED plugin
// (issue #3414). Mechanism: in-process runPluginCli against a temp project
// (t415's harness and synthetic fixture plugin); zero LLM, zero network.
//
// WHY THIS EXISTS: two reconcile paths were unreachable exactly when a plugin
// was retired from the authoring source.
//   * removeManagedPluginStaging required the authoring source to still exist
//     before it would remove the staged copy, so deleting plugins/<name>/ made
//     the cleanup permanently unreachable and the staged bundle — manifest and
//     evaluators included — survived every later compose.
//   * dropDeselectedCompositions returned early unless the project config
//     carried an explicit `plugin` key, so a project without one kept the
//     retired plugin's composition entry forever. `composedPluginNames` reads
//     that entry, so the retired plugin kept supplying advisories.
// Together the residue kept a retired plugin's hooks live in a workspace whose
// source no longer contained it.
//
// WHAT IS UNDER TEST (both sides):
//   1. Explicit selection + retired source: entry AND staged bundle go.
//   2. NO explicit `plugin` key + retired source: entry AND staged bundle go.
//   3. The other side: a live plugin keeps its entry and its staged bundle.
//   4. The consumer layout (no authoring tree at all, the staged bundle IS the
//      source) declares nothing retired and is left completely alone.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  listHarnessTrees,
  listPluginSourceDirs,
  runPluginCli,
  stagingEntryState,
  type PluginCliDeps,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "conformance-fixture-plugin", "conformance-fixture");
const LIVE = "conformance-fixture";
const RETIRED = "retired-fixture";

let project = "";
let host = "";

function deps(): PluginCliDeps {
  return {
    discoverPlugins,
    inspectPlugin,
    applyPluginPlan,
    planPluginDrop,
    applyPluginDrop,
    diagnosePlugins,
    buildHostSnapshot,
    makeBackend: createNodeBackend,
    makeTx: (root, backend): WorkspaceTransaction => ({
      backend,
      verify: () => ({ ok: true }),
      lock: createNodeLock(root),
      newTxnId: () => `t3414-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
    generateRunners: () => true,
    recordDrops: recordPluginDrops,
    clearDrops: clearPluginDrops,
    stagingEntryState,
    copyPluginSource: (src, dst) => copyPluginSource(src, dst, () => {}),
    listHarnessTrees,
    listPluginSourceDirs,
    out: () => {},
    err: () => {},
  };
}

function writeSelection(plugins: readonly string[] | null): void {
  mkdirSync(join(project, "amadeus"), { recursive: true });
  // `null` writes a config WITHOUT a `plugin` key — the non-explicit selection
  // that made the deselection sweep unreachable.
  const raw = plugins === null
    ? { swarm: { unit: { concurrency: { limit: 1 } } } }
    : { plugin: { activation: { names: plugins } } };
  writeFileSync(join(project, "amadeus", "config.json"), `${JSON.stringify(raw, null, 2)}\n`);
}

function writeSourcePlugin(name: string): void {
  cpSync(FIXTURE, join(project, "plugins", name), { recursive: true });
  writeFileSync(
    join(project, "plugins", name, "plugin.json"),
    `${JSON.stringify({ name, stages: [], seams: [], fragments: [], sensors: [], tools: [] }, null, 2)}\n`,
  );
}

// Compose, refusing to read the reconciled state out of a failed run: a
// failure kind here would otherwise read as "nothing to sweep".
// The consumer layout: the bundle is staged under the host root directly, with
// no <project>/plugins/ authoring tree anywhere.
function stageConsumerPlugin(name: string): void {
  const root = join(host, ".amadeus-plugin-src", name);
  cpSync(FIXTURE, root, { recursive: true });
  writeFileSync(
    join(root, "plugin.json"),
    `${JSON.stringify({ name, stages: [], seams: [], fragments: [], sensors: [], tools: [] }, null, 2)}\n`,
  );
}

const compose = (): void => {
  const result = runPluginCli(["compose", "--if-stale", "--project-root", host], deps());
  expect(["composed", "noop"]).toContain(result.kind);
};

const composedNames = (): string[] => [...createNodeBackend(host).readComposition().plugins.keys()].sort();
const staged = (name: string): boolean => existsSync(join(host, ".amadeus-plugin-src", name, "plugin.json"));

beforeEach(() => {
  project = mkdtempSync(join(tmpdir(), "amadeus-t3414-project-"));
  host = join(project, ".codex");
  mkdirSync(host, { recursive: true });
});

afterEach(() => rmSync(project, { recursive: true, force: true }));

describe("t3414 retired-plugin reconciliation at compose", () => {
  test("an explicit selection drops the entry AND the staged bundle of a retired plugin", () => {
    writeSourcePlugin(LIVE);
    writeSourcePlugin(RETIRED);
    writeSelection([LIVE, RETIRED]);
    compose();
    expect(composedNames()).toEqual([LIVE, RETIRED].sort());
    expect(staged(RETIRED)).toBe(true);

    // Retirement: the authoring source and the selection both drop it.
    rmSync(join(project, "plugins", RETIRED), { recursive: true, force: true });
    writeSelection([LIVE]);
    compose();

    expect(composedNames()).toEqual([LIVE]);
    expect(staged(RETIRED)).toBe(false);
    // The other side: the live plugin is untouched.
    expect(staged(LIVE)).toBe(true);
  });

  test("a consumer project with no explicit `plugin` key still sheds a retired entry", () => {
    // The consumer layout: no <project>/plugins/ at all and no `plugin` key —
    // the two conditions that made the deselection sweep unreachable.
    writeSelection(null);
    stageConsumerPlugin(LIVE);
    stageConsumerPlugin(RETIRED);
    compose();
    expect(composedNames()).toEqual([LIVE, RETIRED].sort());

    // Retirement in this layout IS the removal of the staged bundle.
    rmSync(join(host, ".amadeus-plugin-src", RETIRED), { recursive: true, force: true });
    compose();

    expect(composedNames()).toEqual([LIVE]);
    expect(staged(LIVE)).toBe(true);
  });

  test("the other side: the consumer layout keeps a bundle it still supplies", () => {
    writeSelection(null);
    stageConsumerPlugin(LIVE);
    expect(existsSync(join(project, "plugins"))).toBe(false);
    compose();
    expect(composedNames()).toEqual([LIVE]);

    // A second compose must not read the absent authoring tree as retirement.
    compose();
    expect(composedNames()).toEqual([LIVE]);
    expect(staged(LIVE)).toBe(true);
  });
});
