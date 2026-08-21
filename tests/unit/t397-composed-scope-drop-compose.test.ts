// covers: function:mergeComposedScopes
//
// t397 (unit) — #1863: a drop -> compose cycle must not destroy a composed
// scope's plugin cell.
//
// Before the fix, `mergeComposedScopes` filtered every folded cell through
// `knownSlugs` (the slug set of the graph being compiled). Dropping a plugin
// takes its stage out of the graph, so the composed row's cell for that stage
// was GC'd and written back to disk; a later `compose` could not restore it,
// because an opt-in plugin stage (`scopes: []`) never mints a cell through
// `applyPluginScopeOptIns`. The approved plan lost an EXECUTE stage
// permanently, with no diagnostic — the on-disk grid was the only copy.
//
// Warning instead of preserving would not have helped: `amadeus-plugin.ts`
// drives the recompile through `spawnRecompile` with `stdio: "ignore"`
// (amadeus-plugin.ts:287-300), so anything compile printed at the moment of
// the loss was discarded. Only PRESERVING the cell protects the data.
//
// Mechanism: none (PURE in-process imports — zero LLM, zero tokens).
//
// Source under test (dist/claude/.claude/tools/amadeus-graph.ts):
//   mergeComposedScopes(fresh, onDiskJson, registeredScopes?): ScopeGrid

import { describe, expect, test } from "bun:test";
import {
  applyPluginScopeBindings,
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
  return applyPluginScopeBindings(
    mergeComposedScopes(
      transposeScopeGrid(coreStages.filter((s) => (s.scopes?.length ?? 0) > 0)),
      onDiskJson,
      REGISTERED,
    ),
    pluginStages.map((pluginStage) => ({ plugin: "fixture-plugin", stage: pluginStage })),
    {},
  );
}

// `self-feature` is a COMPOSED scope: no core stage names it in frontmatter,
// so the transpose never mints its row and the on-disk entry is the only copy
// — exactly the shape of the real `self-feature` row that carries
// `pr-convergence: EXECUTE` (#1634).
const CORE: Stages = [stage("alpha", ["feature"]), stage("beta", ["feature"])];
// An explicit-invocation-only plugin stage uses `scopes: []`.
const PLUGIN: Stages = [stage("model-check", [], true)];
const REGISTERED = new Set(["feature", "self-feature"]);

const COMPOSED_ON_DISK = JSON.stringify({
  "self-feature": {
    stages: { alpha: "EXECUTE", beta: "EXECUTE", "model-check": "EXECUTE" },
  },
});

describe("drop -> compose keeps a composed scope's plugin cell (#1863)", () => {
  test("the full cycle is lossless: composed -> dropped -> recomposed", () => {
    // A: plugin composed — the committed state.
    const a = compileGrid(CORE, PLUGIN, COMPOSED_ON_DISK);
    expect(a["self-feature"].stages["model-check"]).toBe("EXECUTE");

    // B: plugin dropped — its stage has left the graph. The cell must SURVIVE
    // the fold (pre-fix it was GC'd here and the on-disk copy overwritten).
    const b = compileGrid(CORE, [], canonicalScopeGridJson(a));
    expect(b["self-feature"].stages["model-check"]).toBe("EXECUTE");

    // C: recomposed from B's on-disk bytes. `scopes: []` means the overlay
    // mints nothing, so restoration depends entirely on B having preserved it.
    const c = compileGrid(CORE, PLUGIN, canonicalScopeGridJson(b));
    expect(c["self-feature"].stages["model-check"]).toBe("EXECUTE");

    // The whole cycle is a fixed point — no cell drifts across a round trip.
    expect(canonicalScopeGridJson(c)).toBe(canonicalScopeGridJson(a));
  });

  test("a folded row keeps every cell, including slugs absent from the graph", () => {
    const merged = mergeComposedScopes(
      transposeScopeGrid([stage("alpha", ["feature"])]),
      JSON.stringify({
        "self-feature": {
          stages: { alpha: "EXECUTE", "dropped-plugin": "EXECUTE", beta: "SKIP" },
        },
      }),
      new Set(["feature", "self-feature"]),
    );
    expect(merged["self-feature"].stages).toEqual({
      alpha: "EXECUTE",
      "dropped-plugin": "EXECUTE",
      beta: "SKIP",
    });
  });

  test("a folded row without scope metadata is still removed as stale", () => {
    // Unchanged by this fix: `registeredScopes` remains the row-level filter.
    const fresh = transposeScopeGrid([stage("alpha", ["feature"])]);
    const merged = mergeComposedScopes(
      fresh,
      JSON.stringify({ retired: { stages: { alpha: "EXECUTE" } } }),
      new Set(["feature"]),
    );
    expect(merged.retired).toBeUndefined();
  });
});

describe("compiling with a stage absent stays silent (#1863)", () => {
  test("a preserved cell for an absent slug is a normal state, not a diagnostic", () => {
    // The shipped grid carries `self-feature.pr-convergence`, so every
    // workspace that has not composed that opt-in plugin holds a cell for an
    // absent slug BY DESIGN. Warning about it would fire on the default
    // install, not on a fault — so compile says nothing and the preservation
    // above is the whole contract. (An earlier draft printed an advisory here;
    // book-pack-verify caught it firing on the plugin-free workspace it builds.)
    const merged = mergeComposedScopes(
      transposeScopeGrid([stage("alpha", ["feature"])]),
      JSON.stringify({
        "self-feature": { stages: { alpha: "EXECUTE", "model-check": "EXECUTE" } },
      }),
      new Set(["feature", "self-feature"]),
    );
    const cells = merged["self-feature"].stages;
    expect(cells["model-check"]).toBe("EXECUTE");
    expect(Object.keys(cells).sort()).toEqual(["alpha", "model-check"]);
  });
});
