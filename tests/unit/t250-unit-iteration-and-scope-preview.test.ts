// covers: function:parseConstructionIteration function:readConstructionIteration function:nextConstructionStep function:coverageKey function:summarizeExecuteStages function:previewScopeCost function:selectNextUnitForStage
// size: small
//
// t250-unit-iteration-and-scope-preview.test.ts — in-process pure-function tests
// for U05 (FR-2 items 8-9): the two public decision seams nextConstructionStep /
// previewScopeCost plus their helpers, all imported directly from the shipped
// amadeus-graph.ts (the pure seams read no project state; previewScopeCost reads
// the shipped compiled grid + graph, so the dist copy's real data backs the
// all-scope parity check). The CLI projections (state verb reject, validate-grid
// additive summary, intent-birth scope-cost line) are exercised by the
// integration twin t250.

import { describe, expect, test } from "bun:test";
import {
  coverageKey,
  loadGraph,
  loadScopeGrid,
  nextConstructionStep,
  parseConstructionIteration,
  previewScopeCost,
  readConstructionIteration,
  selectNextUnitForStage,
  summarizeExecuteStages,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { validScopes } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

describe("t250 parseConstructionIteration", () => {
  test("accepts the two legal axes", () => {
    expect(parseConstructionIteration("stage-major")).toEqual({
      ok: true,
      value: "stage-major",
    });
    expect(parseConstructionIteration("unit-major")).toEqual({
      ok: true,
      value: "unit-major",
    });
  });

  test("rejects unknown / empty / mixed-case tokens before any mutation", () => {
    for (const bad of ["", "Unit-Major", "UNIT-MAJOR", "stagemajor", "bolt", " unit-major"]) {
      const r = parseConstructionIteration(bad);
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(r.error).toContain(bad);
        expect(r.error).toContain("stage-major, unit-major");
      }
    }
  });
});

describe("t250 readConstructionIteration", () => {
  test("null / absent field / unparseable value all fall to the default axis", () => {
    expect(readConstructionIteration(null)).toBe("stage-major");
    expect(readConstructionIteration("## Runtime State\n- **Revision Count**: 0\n")).toBe(
      "stage-major",
    );
    expect(
      readConstructionIteration("- **Construction Iteration**: nonsense\n"),
    ).toBe("stage-major");
  });

  test("reads an explicit opt-in unit-major field", () => {
    expect(
      readConstructionIteration(
        "## Runtime State\n- **Construction Iteration**: unit-major\n",
      ),
    ).toBe("unit-major");
    expect(
      readConstructionIteration("- **Construction Iteration**: stage-major\n"),
    ).toBe("stage-major");
  });
});

describe("t250 coverageKey", () => {
  test("joins unit and stage with a colon separator, no collision", () => {
    expect(coverageKey("u1", "code-generation")).toBe("u1::code-generation");
    // Distinct pairs never map to the same key.
    expect(coverageKey("a-b", "c")).not.toBe(coverageKey("a", "b-c"));
  });
});

describe("t250 nextConstructionStep", () => {
  const units = ["u1", "u2"];
  const stages = ["functional-design", "nfr-design", "code-generation"];
  const cov = (...pairs: Array<[string, string]>): ReadonlySet<string> =>
    new Set(pairs.map(([u, s]) => coverageKey(u, s)));

  test("stage-major: stage outer, unit inner (all uncovered)", () => {
    // First cell scanned is (functional-design, u1).
    expect(
      nextConstructionStep(
        { iteration: "stage-major", covered: cov() },
        { units, stages },
      ),
    ).toEqual({ kind: "run", unit: "u1", stage: "functional-design" });
  });

  test("stage-major: advances unit-inner before stage-outer", () => {
    // (fd,u1) covered -> next is (fd,u2), NOT (nfr-design,u1).
    expect(
      nextConstructionStep(
        { iteration: "stage-major", covered: cov(["u1", "functional-design"]) },
        { units, stages },
      ),
    ).toEqual({ kind: "run", unit: "u2", stage: "functional-design" });
  });

  test("unit-major: unit outer, stage inner (all uncovered)", () => {
    expect(
      nextConstructionStep(
        { iteration: "unit-major", covered: cov() },
        { units, stages },
      ),
    ).toEqual({ kind: "run", unit: "u1", stage: "functional-design" });
  });

  test("unit-major: advances stage-inner before unit-outer", () => {
    // (fd,u1) covered -> next is (nfr-design,u1), NOT (fd,u2).
    expect(
      nextConstructionStep(
        { iteration: "unit-major", covered: cov(["u1", "functional-design"]) },
        { units, stages },
      ),
    ).toEqual({ kind: "run", unit: "u1", stage: "nfr-design" });
  });

  test("the two axes diverge on a partially-covered matrix", () => {
    const covered = cov(["u1", "functional-design"]);
    const sm = nextConstructionStep({ iteration: "stage-major", covered }, { units, stages });
    const um = nextConstructionStep({ iteration: "unit-major", covered }, { units, stages });
    expect(sm).not.toEqual(um);
    expect(sm).toEqual({ kind: "run", unit: "u2", stage: "functional-design" });
    expect(um).toEqual({ kind: "run", unit: "u1", stage: "nfr-design" });
  });

  test("single-stage matrix is byte-identical across axes (the engine's per-stage emission)", () => {
    const oneStage = ["code-generation"];
    const covered = cov(["u1", "code-generation"]);
    const sm = nextConstructionStep({ iteration: "stage-major", covered }, { units, stages: oneStage });
    const um = nextConstructionStep({ iteration: "unit-major", covered }, { units, stages: oneStage });
    expect(sm).toEqual(um);
    expect(sm).toEqual({ kind: "run", unit: "u2", stage: "code-generation" });
  });

  test("fully-covered matrix returns done for both axes", () => {
    const all = new Set<string>();
    for (const u of units) for (const s of stages) all.add(coverageKey(u, s));
    expect(nextConstructionStep({ iteration: "stage-major", covered: all }, { units, stages })).toEqual({
      kind: "done",
    });
    expect(nextConstructionStep({ iteration: "unit-major", covered: all }, { units, stages })).toEqual({
      kind: "done",
    });
  });

  test("empty units or stages returns done", () => {
    expect(
      nextConstructionStep({ iteration: "unit-major", covered: new Set() }, { units: [], stages }),
    ).toEqual({ kind: "done" });
    expect(
      nextConstructionStep({ iteration: "stage-major", covered: new Set() }, { units, stages: [] }),
    ).toEqual({ kind: "done" });
  });

  test("does not mutate its inputs", () => {
    const covered = cov(["u1", "functional-design"]);
    const frozenState = Object.freeze({ iteration: "unit-major" as const, covered });
    const frozenGraph = Object.freeze({ units: Object.freeze([...units]), stages: Object.freeze([...stages]) });
    expect(() =>
      nextConstructionStep(frozenState, frozenGraph),
    ).not.toThrow();
    expect(covered.size).toBe(1);
  });
});

describe("t250 selectNextUnitForStage (per-stage engine seam)", () => {
  const units = ["u1", "u2", "u3"];
  test("returns the first uncovered unit in order (stage-major)", () => {
    const covered = new Set(["u1"]);
    expect(
      selectNextUnitForStage("code-generation", units, (u) => covered.has(u), "stage-major"),
    ).toBe("u2");
  });

  test("unit-major over a single stage picks the same first uncovered unit", () => {
    const covered = new Set(["u1", "u2"]);
    expect(
      selectNextUnitForStage("code-generation", units, (u) => covered.has(u), "unit-major"),
    ).toBe("u3");
  });

  test("returns null when every unit is covered", () => {
    expect(
      selectNextUnitForStage("code-generation", units, () => true, "stage-major"),
    ).toBeNull();
  });

  test("empty unit list returns null", () => {
    expect(selectNextUnitForStage("x", [], () => false, "unit-major")).toBeNull();
  });
});

describe("t250 summarizeExecuteStages", () => {
  test("counts total stages and only the gated ones", () => {
    const gated = new Set(["a", "c"]);
    const r = summarizeExecuteStages(["a", "b", "c"], (s) => gated.has(s));
    expect(r).toEqual({ stageCount: 3, gateCount: 2 });
  });

  test("empty set is zero/zero", () => {
    expect(summarizeExecuteStages([], () => true)).toEqual({ stageCount: 0, gateCount: 0 });
  });
});

describe("t250 previewScopeCost", () => {
  test("every real scope's count matches an independent recount of the compiled grid + graph", () => {
    const grid = loadScopeGrid();
    const graph = loadGraph();
    const nonInit = new Set(graph.filter((s) => s.phase !== "initialization").map((s) => s.slug));
    let checked = 0;
    for (const scope of validScopes()) {
      const summary = previewScopeCost(scope, grid);
      // Independent recount straight from the grid entry + graph phases.
      const execute = Object.entries(grid[scope]?.stages ?? {})
        .filter(([, a]) => a === "EXECUTE")
        .map(([slug]) => slug);
      const expectedStages = execute.length;
      const expectedGates = execute.filter((s) => nonInit.has(s)).length;
      expect(summary).toEqual({ scope, stageCount: expectedStages, gateCount: expectedGates });
      // Gates never exceed stages; init stages (bootstrap) are never gated.
      expect(summary.gateCount).toBeLessThanOrEqual(summary.stageCount);
      checked++;
    }
    expect(checked).toBeGreaterThan(0);
  });

  test("throws on an unknown scope", () => {
    expect(() => previewScopeCost("not-a-scope", loadScopeGrid())).toThrow(/Unknown scope/);
  });
});
