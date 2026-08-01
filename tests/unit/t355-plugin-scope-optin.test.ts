// covers: function:applyPluginScopeOptIns, function:mergeComposedScopes
//
// t355 (unit) — #1630: a plugin stage declaring a scope must JOIN that
// scope's plan, never replace it.
//
// Before the fix, `compileStageGraph` fed plugin stages into
// `transposeScopeGrid` alongside the core stages. The transpose mints one
// row per declared name with EXECUTE only on the stages that named it, so a
// plugin declaring an existing COMPOSED scope produced a fresh row holding
// just that plugin stage. `mergeComposedScopes` skips any name already in
// the fresh grid (`if (name in merged) continue`), so the on-disk composed
// row — the approved plan — was dropped and the scope silently collapsed
// from N EXECUTE stages to 1.
//
// The fix splits the two roles:
//   - core frontmatter DERIVES rows (transpose, compile-side filtered to
//     non-plugin stages);
//   - a plugin stage OVERLAYS EXECUTE cells after the composed fold
//     (applyPluginScopeOptIns) — strictly additive, never authoring SKIP.
// (`mergeComposedScopes` used to also GC folded cells whose slug had left the
// graph. That GC destroyed a composed plan across a drop -> compose cycle and
// was removed in #1863; the fold now preserves cells verbatim.)
//
// Mechanism: none (PURE in-process imports — zero LLM, zero tokens). The
// end-to-end compile proof over a real plugin host lives in
// tests/integration/t355-plugin-scope-grid-clobber.integration.test.ts.
//
// Source under test (dist/claude/.claude/tools/amadeus-graph.ts):
//   mergeComposedScopes(fresh, onDiskJson, registeredScopes?): ScopeGrid
//   applyPluginScopeOptIns(grid, pluginStages): ScopeGrid

import { describe, expect, test } from "bun:test";
import {
  applyPluginScopeOptIns,
  canonicalScopeGridJson,
  mergeComposedScopes,
  type ScopeGrid,
  transposeScopeGrid,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";

type Stages = Parameters<typeof transposeScopeGrid>[0];

/** Minimal stage records — the grid seams read only `slug` and `scopes`. */
function stage(slug: string, scopes: string[], plugin = false): Stages[number] {
  const s = { slug, number: "0.1", scopes } as unknown as Stages[number];
  if (plugin) (s as { plugin_source?: true }).plugin_source = true;
  return s;
}

/** The exact composition compileStageGraph applies, over explicit inputs. */
function compileGrid(
  coreStages: Stages,
  pluginStages: Stages,
  onDiskJson: string | null,
): ScopeGrid {
  return applyPluginScopeOptIns(
    mergeComposedScopes(
      transposeScopeGrid(coreStages.filter((s) => (s.scopes?.length ?? 0) > 0)),
      onDiskJson,
    ),
    pluginStages,
  );
}

// A composed scope as the composer writes it: an appended grid entry naming
// three core stages, with no frontmatter producer anywhere.
const CORE: Stages = [
  stage("alpha", ["feature"]),
  stage("beta", ["feature"]),
  stage("gamma", []),
];
const COMPOSED_ON_DISK = JSON.stringify({
  feature: { stages: { alpha: "EXECUTE", beta: "EXECUTE", gamma: "SKIP" } },
  "self-feature": {
    stages: { alpha: "EXECUTE", beta: "EXECUTE", gamma: "EXECUTE" },
  },
});

describe("plugin scope opt-in does not clobber a composed scope (#1630)", () => {
  test("a plugin declaring a composed scope joins it — the composed plan survives", () => {
    const grid = compileGrid(
      CORE,
      [stage("model-check", ["self-feature"], true)],
      COMPOSED_ON_DISK,
    );
    // Regression assertion: the composed row keeps ALL THREE core EXECUTE
    // cells (pre-fix this row was replaced by { "model-check": "EXECUTE" }),
    // and the plugin stage is added as a fourth.
    expect(grid["self-feature"].stages).toEqual({
      alpha: "EXECUTE",
      beta: "EXECUTE",
      gamma: "EXECUTE",
      "model-check": "EXECUTE",
    });
    const execCount = Object.values(grid["self-feature"].stages).filter(
      (a) => a === "EXECUTE",
    ).length;
    expect(execCount).toBe(4);
  });

  test("a plugin declaring an unknown scope creates a row holding only its own cell", () => {
    const grid = compileGrid(
      CORE,
      [stage("model-check", ["tla-only"], true)],
      COMPOSED_ON_DISK,
    );
    // No redundant SKIP cells for stages with no membership — same treatment
    // compile gives `scopes: []`.
    expect(grid["tla-only"].stages).toEqual({ "model-check": "EXECUTE" });
  });

  test("a plugin opting into a STOCK scope leaves every existing cell untouched", () => {
    const grid = compileGrid(
      CORE,
      [stage("model-check", ["feature"], true)],
      COMPOSED_ON_DISK,
    );
    // `gamma` declares no scopes, so compile keeps it out of the transpose
    // input entirely and it owns no cell — unchanged pre-existing behaviour.
    expect(grid.feature.stages).toEqual({
      alpha: "EXECUTE",
      beta: "EXECUTE",
      "model-check": "EXECUTE",
    });
  });

  test("zero plugins leave the grid byte-identical to the plugin-free compile", () => {
    const withNone = compileGrid(CORE, [], COMPOSED_ON_DISK);
    const baseline = mergeComposedScopes(
      transposeScopeGrid(CORE.filter((s) => (s.scopes?.length ?? 0) > 0)),
      COMPOSED_ON_DISK,
    );
    expect(canonicalScopeGridJson(withNone)).toBe(canonicalScopeGridJson(baseline));
  });

  test("scope keys stay sorted after an overlay adds a new row", () => {
    const grid = compileGrid(
      CORE,
      [stage("model-check", ["aaa-first", "zzz-last"], true)],
      COMPOSED_ON_DISK,
    );
    expect(Object.keys(grid)).toEqual([...Object.keys(grid)].sort());
    expect(Object.keys(grid)).toContain("aaa-first");
    expect(Object.keys(grid)).toContain("zzz-last");
  });
});

// Declared revision (#1863): this block used to pin the OPPOSITE contract —
// the fold GC'd every cell whose slug had left the graph. That GC was a
// tidiness measure added alongside the #1630 clobber fix, not part of it (the
// clobber fix is applyPluginScopeOptIns, pinned above and unchanged here), and
// it destroyed a composed plan on a drop -> compose cycle. The cells are now
// preserved and reported instead; the full cycle proof lives in
// tests/unit/t397-composed-scope-drop-compose.test.ts.
describe("mergeComposedScopes preserves folded cells verbatim (#1863)", () => {
  test("a folded composed row keeps cells addressing absent slugs", () => {
    const onDisk = JSON.stringify({
      "self-feature": {
        stages: { alpha: "EXECUTE", "dropped-plugin": "EXECUTE", beta: "SKIP" },
      },
    });
    const merged = mergeComposedScopes(
      transposeScopeGrid([stage("alpha", ["feature"])]),
      onDisk,
    );
    // dropped-plugin is not in the graph; the cell survives so composing the
    // plugin back in restores the approved plan.
    expect(merged["self-feature"].stages).toEqual({
      alpha: "EXECUTE",
      "dropped-plugin": "EXECUTE",
      beta: "SKIP",
    });
  });

  test("a composed row whose stages all left the graph keeps its whole plan", () => {
    const onDisk = JSON.stringify({
      ghost: { stages: { "gone-a": "EXECUTE", "gone-b": "EXECUTE" } },
    });
    const merged = mergeComposedScopes(
      transposeScopeGrid([stage("alpha", ["feature"])]),
      onDisk,
    );
    expect(merged.ghost.stages).toEqual({
      "gone-a": "EXECUTE",
      "gone-b": "EXECUTE",
    });
  });

  test("fresh rows still win over a folded on-disk entry of the same name", () => {
    const merged = mergeComposedScopes(
      transposeScopeGrid([stage("alpha", ["feature"]), stage("beta", ["feature"])]),
      JSON.stringify({ feature: { stages: { alpha: "EXECUTE" } } }),
    );
    // `feature` exists in fresh, so the on-disk entry is skipped entirely.
    expect(merged.feature.stages).toEqual({ alpha: "EXECUTE", beta: "EXECUTE" });
  });

  test("a malformed on-disk grid still contributes nothing (fresh wins)", () => {
    const fresh = transposeScopeGrid([stage("alpha", ["feature"])]);
    expect(mergeComposedScopes(fresh, "{ not json")).toEqual(fresh);
    expect(mergeComposedScopes(fresh, null)).toEqual(fresh);
    expect(mergeComposedScopes(fresh, "[]")).toEqual(fresh);
  });

  test("a folded row without scope metadata is removed as stale", () => {
    const fresh = transposeScopeGrid([stage("alpha", ["fix"])]);
    const merged = mergeComposedScopes(
      fresh,
      JSON.stringify({
        fix: { stages: { alpha: "EXECUTE" } },
        bugfix: { stages: { alpha: "EXECUTE" } },
        "team-custom": { stages: { alpha: "EXECUTE" } },
      }),
      new Set(["fix", "team-custom"]),
    );
    expect(Object.keys(merged)).toEqual(["fix", "team-custom"]);
  });
});
