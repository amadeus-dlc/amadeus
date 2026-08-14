// covers: function:compileStageGraph, function:applyPluginScopeBindings, file:amadeus/config.json
// size: medium
//
// t2996 (integration) — the PR convergence stage's scope membership survives a
// plugin directory rename.
//
// `applyPluginScopeBindings` looks the binding up by the plugin's DIRECTORY
// name (amadeus-graph derives it from the staged path's second segment) and by
// the stage slug. The host's `plugin.scope-bindings` outer key is therefore
// coupled to the directory name, while the inner key is coupled to the slug.
// A rename that moves the directory without moving the outer key drops the
// binding SILENTLY: the stage still compiles, it simply stops appearing in any
// scope row.
//
// This drives the REAL bundle through a real compose + compile against the REAL
// repository `amadeus/config.json`, so the asserted rows are the bytes the
// compiler emits rather than a restatement of the config.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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
  listHarnessTrees,
  listPluginSourceDirs,
  type PluginCliDeps,
  stagingEntryState,
} from "../../packages/framework/core/tools/amadeus-plugin.ts";
import {
  __resetGraphCache,
  compileStageGraph,
} from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE_ROOT = join(REPO_ROOT, "packages", "framework", "core");
const PLUGINS_ROOT = join(REPO_ROOT, "plugins");
const STAGE_SLUG = "pr-convergence";
const SELF_SCOPES = ["self-document", "self-feature", "self-fix", "self-refactor"] as const;

const ENV_KEYS = [
  "AMADEUS_STAGES_DIR",
  "AMADEUS_STAGE_GRAPH",
  "AMADEUS_SCOPE_GRID",
  "AMADEUS_RULES_DIR",
  "AMADEUS_SENSORS_DIR",
  "AMADEUS_PLUGINS_HOST_ROOT",
  "CLAUDE_PROJECT_DIR",
] as const;

interface PluginManifest {
  readonly name: string;
  readonly stages?: readonly { readonly slug: string }[];
}

type ScopeGrid = Record<string, { stages: Record<string, "EXECUTE" | "SKIP"> }>;

let host = "";
let saved: Record<string, string | undefined> = {};
const out: string[] = [];
const err: string[] = [];

/** The shipped directory names under `plugins/` whose manifest declares the PR
 *  convergence stage. Discovered from disk so a rename moves the fixture with
 *  the source instead of pinning the pre-rename name. */
function pluginDirsOwningStage(slug: string): readonly string[] {
  const found: string[] = [];
  for (const name of [...readdirSync(PLUGINS_ROOT)].sort()) {
    const dir = join(PLUGINS_ROOT, name);
    if (!statSync(dir).isDirectory()) continue;
    const manifest = JSON.parse(
      readFileSync(join(dir, "plugin.json"), "utf-8"),
    ) as PluginManifest;
    if ((manifest.stages ?? []).some((s) => s.slug === slug)) found.push(name);
  }
  return found;
}

function deps(): PluginCliDeps {
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
      newTxnId: () => `t2996-${Date.now()}-${Math.random()}`,
    }),
    recompile: () => true,
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

/** Compile the temp host against the REAL repository configuration and return
 *  the emitted scope grid. */
function compiledGrid(): ScopeGrid {
  process.env.AMADEUS_STAGES_DIR = join(host, "amadeus-common", "stages");
  process.env.AMADEUS_SENSORS_DIR = join(host, "sensors");
  process.env.AMADEUS_PLUGINS_HOST_ROOT = host;
  process.env.AMADEUS_RULES_DIR = join(REPO_ROOT, "amadeus", "spaces", "default", "memory");
  process.env.CLAUDE_PROJECT_DIR = REPO_ROOT;
  delete process.env.AMADEUS_STAGE_GRAPH;
  delete process.env.AMADEUS_SCOPE_GRID;
  _resetStageGraphForTests();
  __resetGraphCache();
  return JSON.parse(compileStageGraph().gridJson) as ScopeGrid;
}

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  host = mkdtempSync(join(tmpdir(), "amadeus-t2996-"));
  for (const name of readdirSync(CORE_ROOT)) {
    cpSync(join(CORE_ROOT, name), join(host, name), { recursive: true });
  }
  out.length = 0;
  err.length = 0;
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    const v = saved[k];
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  _resetStageGraphForTests();
  __resetGraphCache();
  rmSync(host, { recursive: true, force: true });
});

describe("t2996 the PR convergence stage keeps its self-scope rows across the rename", () => {
  test("exactly one shipped plugin directory owns the stage", () => {
    expect(pluginDirsOwningStage(STAGE_SLUG)).toHaveLength(1);
  });

  test("composing the real bundle puts the stage on every self scope row", () => {
    const [pluginDir] = pluginDirsOwningStage(STAGE_SLUG);
    cpSync(join(PLUGINS_ROOT, pluginDir), join(host, ".amadeus-plugin-src", pluginDir), {
      recursive: true,
    });
    expect(handlePluginCli(["compose", "--project-root", host], deps())).toBe(0);

    const grid = compiledGrid();
    const rowsCarryingStage = Object.keys(grid)
      .filter((scope) => grid[scope].stages[STAGE_SLUG] === "EXECUTE")
      .sort();
    expect(rowsCarryingStage).toEqual([...SELF_SCOPES]);
  });

  test("without the bundle no scope row mentions the stage (control)", () => {
    const grid = compiledGrid();
    const mentions = Object.keys(grid).filter(
      (scope) => grid[scope].stages[STAGE_SLUG] !== undefined,
    );
    expect(mentions).toEqual([]);
  });
});
