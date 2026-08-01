// covers: function:compileStageGraph, function:applyPluginScopeOptIns, function:mergeComposedScopes
// size: medium
//
// t355 (integration) — #1630 end-to-end: `amadeus-graph compile` over a real
// plugin host whose plugin stage declares an EXISTING composed scope.
//
// The reported failure was a full compile: with `self-feature` carrying 18
// EXECUTE stages on disk, composing a plugin stage that declares
// `scopes: [self-feature]` recompiled the row down to 1 EXECUTE (the
// plugin stage alone) — the approved plan was destroyed with no diagnostic,
// because the transposed row shadowed the on-disk one in mergeComposedScopes.
// A second recompile after dropping the plugin then kept the wrecked row,
// leaving a cell addressing a slug no longer in the graph.
//
// This drives the real compile through the AMADEUS_PLUGINS_HOST_ROOT /
// AMADEUS_STAGE_GRAPH / AMADEUS_SCOPE_GRID seams over a temp host, so the
// assertions read the bytes compile actually writes.

import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  __resetGraphCache,
  main,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";

const DIST_DATA = join(import.meta.dir, "..", "..", "dist", "claude", ".claude", "tools", "data");
const PLUGIN = "t355-plugin";
const STAGE_SLUG = "t355-model-check";
const COMPOSED_SCOPE = "t355-composed";

const tempDirs: string[] = [];
const originalPluginRoot = process.env.AMADEUS_PLUGINS_HOST_ROOT;
const originalStageGraph = process.env.AMADEUS_STAGE_GRAPH;
const originalScopeGrid = process.env.AMADEUS_SCOPE_GRID;
const originalScopesDir = process.env.AMADEUS_SCOPES_DIR;

type Grid = Record<string, { stages: Record<string, "EXECUTE" | "SKIP"> }>;

function stageFixture(slug: string, scopes: string[]): string {
  return [
    "---",
    `slug: ${slug}`,
    "phase: construction",
    "execution: CONDITIONAL",
    "condition: Scope opt-in fixture.",
    "lead_agent: amadeus-developer-agent",
    "support_agents: []",
    "mode: inline",
    "produces: []",
    "consumes: []",
    "requires_stage: []",
    "inputs: none",
    "outputs: none",
    `scopes: [${scopes.join(", ")}]`,
    "---",
    "",
    "Fixture stage body.",
    "",
  ].join("\n");
}

/**
 * Build a plugin host containing zero or one plugin stage, plus copies of the
 * shipped stage-graph / scope-grid the compile reads and rewrites.
 */
function makeHost(stageScopes: string[] | null): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t355-"));
  tempDirs.push(root);
  const plugins: Array<[string, unknown]> = [];
  const aggregate: Array<[string, unknown]> = [];

  if (stageScopes !== null) {
    const stageDir = join(root, "plugins", PLUGIN, "stages");
    mkdirSync(stageDir, { recursive: true });
    const content = stageFixture(STAGE_SLUG, stageScopes);
    writeFileSync(join(stageDir, `${STAGE_SLUG}.md`), content);
    const path = `plugins/${PLUGIN}/stages/${STAGE_SLUG}.md`;
    const contentDigest = `sha256:${createHash("sha256").update(Buffer.from(content)).digest("hex")}`;
    const stageIndex = [{
      path,
      slug: STAGE_SLUG,
      contentDigest,
      frontmatter: {
        slug: STAGE_SLUG,
        phase: "construction",
        execution: "CONDITIONAL",
        condition: "Scope opt-in fixture.",
        lead_agent: "amadeus-developer-agent",
        support_agents: [],
        mode: "inline",
        produces: [],
        consumes: [],
        requires_stage: [],
        inputs: "none",
        outputs: "none",
        scopes: stageScopes,
      },
    }];
    plugins.push([PLUGIN, {
      plugin: PLUGIN,
      ownedPaths: [path],
      ownedContentDigests: [[path, contentDigest]],
      stageIndex,
      stageIndexDigest: `sha256:${createHash("sha256").update(JSON.stringify(stageIndex)).digest("hex")}`,
      trustGrant: {
        plugin: PLUGIN,
        contentDigest: `sha256:${"0".repeat(64)}`,
        grantTimestamp: "2026-07-27T00:00:00.000Z",
      },
      sharedFiles: [],
    }]);
    aggregate.push([PLUGIN, stageIndex]);
  }

  writeFileSync(join(root, ".amadeus-plugin-composition.json"), JSON.stringify({
    ledger: [],
    plugins,
    pluginStageIndexDigest:
      `sha256:${createHash("sha256").update(JSON.stringify(aggregate)).digest("hex")}`,
  }));
  copyFileSync(join(DIST_DATA, "stage-graph.json"), join(root, "stage-graph.json"));
  copyFileSync(join(DIST_DATA, "scope-grid.json"), join(root, "scope-grid.json"));
  return root;
}

/** Append a composed scope entry the way the composer writes it. */
function seedComposedScope(root: string, donorScope: string): Grid[string] {
  const gridPath = join(root, "scope-grid.json");
  const grid = JSON.parse(readFileSync(gridPath, "utf-8")) as Grid;
  const entry = { stages: { ...grid[donorScope].stages } };
  grid[COMPOSED_SCOPE] = entry;
  writeFileSync(gridPath, `${JSON.stringify(grid, null, 2)}\n`, "utf-8");
  const scopesDir = join(root, "scopes");
  mkdirSync(scopesDir, { recursive: true });
  writeFileSync(
    join(scopesDir, `amadeus-${COMPOSED_SCOPE}.md`),
    [
      "---",
      `name: ${COMPOSED_SCOPE}`,
      "depth: Standard",
      "description: Composed scope fixture.",
      "keywords: []",
      "---",
      "",
      "Fixture scope.",
      "",
    ].join("\n"),
    "utf-8",
  );
  return entry;
}

async function compileHost(root: string): Promise<Grid> {
  process.env.AMADEUS_PLUGINS_HOST_ROOT = root;
  process.env.AMADEUS_STAGE_GRAPH = join(root, "stage-graph.json");
  process.env.AMADEUS_SCOPE_GRID = join(root, "scope-grid.json");
  process.env.AMADEUS_SCOPES_DIR = join(root, "scopes");
  __resetGraphCache();
  await main(["compile"]);
  return JSON.parse(readFileSync(join(root, "scope-grid.json"), "utf-8")) as Grid;
}

function executeSlugs(entry: Grid[string]): string[] {
  return Object.entries(entry.stages)
    .filter(([, action]) => action === "EXECUTE")
    .map(([slug]) => slug)
    .sort();
}

beforeEach(() => {
  __resetGraphCache();
});

afterAll(() => {
  if (originalPluginRoot === undefined) delete process.env.AMADEUS_PLUGINS_HOST_ROOT;
  else process.env.AMADEUS_PLUGINS_HOST_ROOT = originalPluginRoot;
  if (originalStageGraph === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
  else process.env.AMADEUS_STAGE_GRAPH = originalStageGraph;
  if (originalScopeGrid === undefined) delete process.env.AMADEUS_SCOPE_GRID;
  else process.env.AMADEUS_SCOPE_GRID = originalScopeGrid;
  if (originalScopesDir === undefined) delete process.env.AMADEUS_SCOPES_DIR;
  else process.env.AMADEUS_SCOPES_DIR = originalScopesDir;
  __resetGraphCache();
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

describe("compile: plugin scope opt-in over a real plugin host (#1630)", () => {
  test("a plugin declaring a composed scope joins its plan instead of replacing it", async () => {
    const root = makeHost([COMPOSED_SCOPE]);
    const seeded = seedComposedScope(root, "feature");
    const seededExec = executeSlugs(seeded);
    // Guard the fixture itself: the donor scope must carry a real, multi-stage
    // plan, otherwise "N survived" would be a vacuous claim.
    expect(seededExec.length).toBeGreaterThan(1);

    const grid = await compileHost(root);

    // Regression assertion: every seeded EXECUTE stage survived, and the
    // plugin stage joined as one more. Pre-fix this collapsed to exactly
    // [t355-model-check].
    expect(executeSlugs(grid[COMPOSED_SCOPE])).toEqual(
      [...seededExec, STAGE_SLUG].sort(),
    );
    expect(grid[COMPOSED_SCOPE].stages[STAGE_SLUG]).toBe("EXECUTE");
  }, 30000);

  test("a plugin declaring a stock scope joins it without disturbing existing cells", async () => {
    const root = makeHost(["feature"]);
    const before = JSON.parse(
      readFileSync(join(root, "scope-grid.json"), "utf-8"),
    ) as Grid;

    const grid = await compileHost(root);

    expect(grid.feature.stages[STAGE_SLUG]).toBe("EXECUTE");
    for (const [slug, action] of Object.entries(before.feature.stages)) {
      expect(grid.feature.stages[slug]).toBe(action);
    }
    // Other stock scopes gain no cell for the plugin stage (no redundant SKIP).
    expect(grid.fix.stages[STAGE_SLUG]).toBeUndefined();
  }, 30000);

  test("a plugin declaring a brand-new scope gets a row holding only its own cell", async () => {
    const root = makeHost(["t355-plugin-only"]);
    const grid = await compileHost(root);
    expect(grid["t355-plugin-only"].stages).toEqual({ [STAGE_SLUG]: "EXECUTE" });
  }, 30000);

  // Declared revision (#1863): this test used to assert the cell was GC'd on
  // drop. That GC destroyed the approved plan — an opt-in stage (`scopes: []`)
  // mints no cell on the way back, so the on-disk grid was the only copy and a
  // re-compose could not restore it. The contract is now the round trip below.
  test("drop -> compose is lossless for an opt-in plugin's composed-scope cell", async () => {
    // `scopes: []` — the opt-in shape formal-model-check ships with, so the
    // cell can only come from the composed row on disk.
    const root = makeHost([]);
    const seeded = seedComposedScope(root, "feature");
    const gridPath = join(root, "scope-grid.json");
    const manifest = readFileSync(join(root, ".amadeus-plugin-composition.json"), "utf-8");
    const stagePath = join(root, "plugins", PLUGIN, "stages", `${STAGE_SLUG}.md`);
    const stageBytes = readFileSync(stagePath, "utf-8");

    // The composer's approved plan: the opt-in stage added to the composed row.
    const seededGrid = JSON.parse(readFileSync(gridPath, "utf-8")) as Grid;
    seededGrid[COMPOSED_SCOPE].stages[STAGE_SLUG] = "EXECUTE";
    writeFileSync(gridPath, `${JSON.stringify(seededGrid, null, 2)}\n`, "utf-8");

    const withPlugin = await compileHost(root);
    expect(withPlugin[COMPOSED_SCOPE].stages[STAGE_SLUG]).toBe("EXECUTE");

    // Drop the plugin: empty composition manifest, stage file removed.
    rmSync(join(root, "plugins"), { recursive: true, force: true });
    writeFileSync(join(root, ".amadeus-plugin-composition.json"), JSON.stringify({
      ledger: [],
      plugins: [],
      pluginStageIndexDigest: `sha256:${createHash("sha256").update(JSON.stringify([])).digest("hex")}`,
    }));

    const dropped = await compileHost(root);
    // The cell SURVIVES the drop — this is the write that used to destroy it.
    expect(dropped[COMPOSED_SCOPE].stages[STAGE_SLUG]).toBe("EXECUTE");
    // The rest of the composed plan is untouched.
    for (const slug of executeSlugs(seeded)) {
      expect(dropped[COMPOSED_SCOPE].stages[slug]).toBe("EXECUTE");
    }

    // Re-compose the same plugin: the plan is back, byte-identical to the
    // pre-drop compile.
    mkdirSync(join(root, "plugins", PLUGIN, "stages"), { recursive: true });
    writeFileSync(stagePath, stageBytes);
    writeFileSync(join(root, ".amadeus-plugin-composition.json"), manifest);
    const recomposed = await compileHost(root);
    expect(recomposed[COMPOSED_SCOPE].stages[STAGE_SLUG]).toBe("EXECUTE");
    expect(executeSlugs(recomposed[COMPOSED_SCOPE])).toEqual(
      executeSlugs(withPlugin[COMPOSED_SCOPE]),
    );
  }, 30000);

  test("a zero-plugin host recompiles the shipped grid byte-identically", async () => {
    const root = makeHost(null);
    const before = readFileSync(join(root, "scope-grid.json"), "utf-8");
    await compileHost(root);
    expect(readFileSync(join(root, "scope-grid.json"), "utf-8")).toBe(before);
  }, 30000);
});
