// covers: function:standingGrantSatisfiesGate, function:evaluateStandingGrantGateEligibility
//
// Issue #1497: a standing delegation grant must classify gates the same way for
// a COMPOSED workflow scope (amadeus-feature / amadeus-bugfix / …) as it does
// for a stock scope. Composed scopes exist ONLY in the compiled scope-grid —
// stage frontmatter carries the stock vocabulary — so the pre-fix predicate,
// which read stage.scopes directly, saw every stage as out-of-scope under a
// composed scope and produced two silent failures:
//   symptom A — `next` was always null → every gate looked like a phase
//     boundary → the default (opt-out) grant covered NOTHING (silent no-op)
//   symptom B — the first construction stage was never identified → the
//     walking-skeleton exclusion silently never fired (an opt-in grant
//     auto-approved the skeleton gate)
//
// Every assertion here reads the REAL shipped data files (stage-graph.json,
// scope-grid.json and the per-scope .md metadata) — the .codex face is the one
// that carries the composed scopes, so it is the face under test (the same
// face tests/harness/solo-gate-fixture.ts pins for the graph).
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  _resetScopeMappingForTests,
  evaluateStandingGrantGateEligibility,
  loadScopeMapping,
  type StageEntry,
  StandingGrant,
  standingGrantSatisfiesGate,
  type WalkingSkeletonStance,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  REAL_SCOPE_GRID_PATH,
  REAL_SCOPES_DIR,
  REAL_STAGE_GRAPH_PATH,
  useRealScopeData,
} from "../harness/real-scope-data.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const GRAPH_PATH = REAL_STAGE_GRAPH_PATH;
const GRID_PATH = REAL_SCOPE_GRID_PATH;
const SCOPES_DIR = REAL_SCOPES_DIR;

const GRAPH = JSON.parse(readFileSync(GRAPH_PATH, "utf-8")) as StageEntry[];
const GRID = JSON.parse(readFileSync(GRID_PATH, "utf-8")) as Record<
  string,
  { stages: Record<string, "EXECUTE" | "SKIP"> }
>;

const STOCK_SCOPES = [
  "bugfix",
  "chore",
  "enterprise",
  "feature",
  "infra",
  "mvp",
  "poc",
  "refactor",
  "security-patch",
  "workshop",
] as const;

let restoreScopeData: (() => void) | null = null;

beforeAll(() => {
  restoreScopeData = useRealScopeData();
});

afterAll(() => {
  restoreScopeData?.();
});

function grantWith(includesPhaseBoundary: boolean): StandingGrant {
  const block =
    "## Standing Grant Issued\n**Timestamp**: 2026-07-26T00:00:00.000Z\n" +
    "**Event**: GRANT_ISSUED\n**Grant Id**: aabbccdd\n**Scope**: stage-gates\n" +
    "**Expires At**: 2099-01-01T00:00:00.000Z\n" +
    `**Includes Phase Boundary**: ${includesPhaseBoundary}\n` +
    "**Issuer Space**: default\n**Issuer Intent**: x\n**Issuer Shard**: y.md\n" +
    "**Issuer Human Ts**: 2026-07-26T00:00:00.000Z\n";
  const grant = StandingGrant.parse(block);
  if (grant === null) throw new Error("fixture grant did not parse");
  return grant;
}

function stateContent(scope: string, stance?: string): string {
  const stanceLine = stance === undefined ? "" : `- **Skeleton Stance**: ${stance}\n`;
  return `# AI-DLC State\n\n- **Scope**: ${scope}\n${stanceLine}`;
}

// The EXECUTE path of a scope, in graph order — the same walk the engine's
// subgraphForScope performs, recomputed here from the raw grid so the test's
// expectation is derived from the data file rather than from the implementation.
function executePath(scope: string): StageEntry[] {
  return GRAPH.filter((stage) => GRID[scope]?.stages[stage.slug] === "EXECUTE");
}

describe("#1497 FR-1: composed-scope gate classification (symptom A)", () => {
  test("RED: an opt-out grant covers an ordinary same-phase gate under amadeus-bugfix", () => {
    // reverse-engineering (inception) → requirements-analysis (inception).
    const path = executePath("amadeus-bugfix").map((s) => s.slug);
    expect(path).toContain("reverse-engineering");
    expect(
      standingGrantSatisfiesGate(
        grantWith(false),
        "reverse-engineering",
        stateContent("amadeus-bugfix"),
        GRAPH,
      ),
    ).toBe(true);
  });

  test("an opt-out grant still refuses a real phase-boundary gate under amadeus-bugfix", () => {
    // requirements-analysis (inception) → code-generation (construction).
    expect(
      standingGrantSatisfiesGate(
        grantWith(false),
        "requirements-analysis",
        stateContent("amadeus-bugfix"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("an opt-out grant still refuses the terminal gate under amadeus-bugfix", () => {
    const path = executePath("amadeus-bugfix");
    const terminal = path[path.length - 1].slug;
    expect(terminal).toBe("build-and-test");
    expect(
      standingGrantSatisfiesGate(
        grantWith(false),
        terminal,
        stateContent("amadeus-bugfix"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("an opt-in grant covers the phase-boundary gate under amadeus-bugfix", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "requirements-analysis",
        stateContent("amadeus-bugfix"),
        GRAPH,
      ),
    ).toBe(true);
  });

  test("a stage the composed scope SKIPs is not treated as the next in-scope stage", () => {
    // application-design is SKIP for amadeus-bugfix: were it counted in-scope,
    // requirements-analysis would stop being a phase boundary.
    expect(GRID["amadeus-bugfix"].stages["application-design"]).toBe("SKIP");
    expect(
      standingGrantSatisfiesGate(
        grantWith(false),
        "requirements-analysis",
        stateContent("amadeus-bugfix"),
        GRAPH,
      ),
    ).toBe(false);
  });
});

// FR-1d — the legacy frontmatter-based classifier, reimplemented verbatim as the
// reference oracle. For every stock scope the new grid-based resolution must
// reproduce it exactly; the composed scopes are exactly where the two diverge.
function legacyVerdict(
  includesPhaseBoundary: boolean,
  slug: string,
  scope: string,
  stance: string | undefined,
): boolean {
  const inScope = (stage: StageEntry): boolean =>
    stage.scopes === undefined || stage.scopes.includes(scope);
  const currentIndex = GRAPH.findIndex((stage) => stage.slug === slug);
  const current = currentIndex < 0 ? null : GRAPH[currentIndex];
  const next = currentIndex < 0 ? null : (GRAPH.slice(currentIndex + 1).find(inScope) ?? null);
  const crossesPhaseBoundary = !next || (current != null && next.phase !== current.phase);
  const firstConstruction = GRAPH.find(
    (stage) => stage.phase === "construction" && inScope(stage),
  );
  const stanceValue: WalkingSkeletonStance | undefined =
    stance === "on" || stance === "off" || stance === "scope-dependent" ? stance : undefined;
  return (
    evaluateStandingGrantGateEligibility(grantWith(includesPhaseBoundary), {
      gateRequired: true,
      isPhaseBoundary: crossesPhaseBoundary,
      isFirstConstructionGate: firstConstruction?.slug === slug,
      isPerUnitStage: false,
      isPerUnitFinalGate: false,
      scope,
      walkingSkeletonStance: stanceValue,
    }).kind === "eligible"
  );
}

describe("#1497 FR-1d: stock-scope parity", () => {
  test("every stock scope × stage × grant × stance combination is unchanged", () => {
    let combinations = 0;
    for (const scope of STOCK_SCOPES) {
      for (const stage of GRAPH) {
        for (const includesPhaseBoundary of [false, true]) {
          for (const stance of [undefined, "on", "off", "scope-dependent"]) {
            combinations += 1;
            const actual = standingGrantSatisfiesGate(
              grantWith(includesPhaseBoundary),
              stage.slug,
              stateContent(scope, stance),
              GRAPH,
            );
            const expected = legacyVerdict(includesPhaseBoundary, stage.slug, scope, stance);
            if (actual !== expected) {
              throw new Error(
                `parity broken: scope=${scope} slug=${stage.slug} boundary=${includesPhaseBoundary} stance=${stance} actual=${actual} expected=${expected}`,
              );
            }
          }
        }
      }
    }
    expect(combinations).toBe(STOCK_SCOPES.length * GRAPH.length * 2 * 4);
  });
});

describe("#1497 FR-2: walking-skeleton exclusion under a composed scope (symptom B)", () => {
  test("RED: stance=on excludes the first construction gate under amadeus-feature", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "functional-design",
        stateContent("amadeus-feature", "on"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("RED: an absent stance on amadeus-feature still excludes the skeleton gate", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "functional-design",
        stateContent("amadeus-feature"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("RED: a scope-dependent stance on amadeus-feature still excludes it", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "functional-design",
        stateContent("amadeus-feature", "scope-dependent"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("an explicit stance=off clears the exclusion under amadeus-feature", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "functional-design",
        stateContent("amadeus-feature", "off"),
        GRAPH,
      ),
    ).toBe(true);
  });

  test("the first construction stage itself is grid-derived, not stock-derived", () => {
    // amadeus-feature SKIPs nothing before functional-design; amadeus-bugfix
    // SKIPs functional-design entirely, so ITS skeleton gate is code-generation.
    expect(executePath("amadeus-feature").find((s) => s.phase === "construction")?.slug).toBe(
      "functional-design",
    );
    expect(executePath("amadeus-bugfix").find((s) => s.phase === "construction")?.slug).toBe(
      "code-generation",
    );
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "code-generation",
        stateContent("amadeus-bugfix", "on"),
        GRAPH,
      ),
    ).toBe(false);
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "build-and-test",
        stateContent("amadeus-bugfix", "on"),
        GRAPH,
      ),
    ).toBe(true);
  });
});

// FR-3 — the per-unit axis. standingGrantSatisfiesGate pins isPerUnitStage /
// isPerUnitFinalGate to false; these tests fix the measured reason that is safe:
// the ONLY per-unit directive that ever reaches an approval gate is the
// all-covered final one, and for a FINAL gate the two encodings are equivalent
// by construction of evaluateStandingGrantGateEligibility.
describe("#1497 FR-3: per-unit axis equivalence at the final gate", () => {
  const base = {
    gateRequired: true,
    isPhaseBoundary: false,
    isFirstConstructionGate: false,
    scope: "amadeus-bugfix",
    walkingSkeletonStance: "off" as WalkingSkeletonStance,
  };

  test("the per-unit FINAL gate is judged identically to the hardcoded pair", () => {
    const hardcoded = evaluateStandingGrantGateEligibility(grantWith(false), {
      ...base,
      isPerUnitStage: false,
      isPerUnitFinalGate: false,
    });
    const perUnitFinal = evaluateStandingGrantGateEligibility(grantWith(false), {
      ...base,
      isPerUnitStage: true,
      isPerUnitFinalGate: true,
    });
    expect(perUnitFinal).toEqual(hardcoded);
    expect(perUnitFinal.kind).toBe("eligible");
  });

  test("an INCOMPLETE per-unit iteration would be refused if it ever reached here", () => {
    expect(
      evaluateStandingGrantGateEligibility(grantWith(false), {
        ...base,
        isPerUnitStage: true,
        isPerUnitFinalGate: false,
      }),
    ).toEqual({ kind: "ineligible", reason: "per-unit-incomplete" });
  });
});

describe("#1497 FR-5 / NFR-2: fail-closed on unavailable scope data", () => {
  test("an unknown scope is not covered and does not throw", () => {
    expect(
      standingGrantSatisfiesGate(
        grantWith(true),
        "reverse-engineering",
        stateContent("no-such-scope"),
        GRAPH,
      ),
    ).toBe(false);
  });

  test("a state file without a Scope field is not covered and does not throw", () => {
    expect(
      standingGrantSatisfiesGate(grantWith(true), "reverse-engineering", "# AI-DLC State\n", GRAPH),
    ).toBe(false);
  });

  test("unreadable scope data falls back to human approval instead of throwing", () => {
    process.env.AMADEUS_SCOPES_DIR = join(REPO_ROOT, "no-such-scopes-dir");
    process.env.AMADEUS_SCOPE_GRID = join(REPO_ROOT, "no-such-grid.json");
    _resetScopeMappingForTests();
    try {
      expect(Object.keys(loadScopeMapping())).toHaveLength(0);
      expect(
        standingGrantSatisfiesGate(
          grantWith(true),
          "reverse-engineering",
          stateContent("amadeus-bugfix"),
          GRAPH,
        ),
      ).toBe(false);
    } finally {
      process.env.AMADEUS_SCOPES_DIR = SCOPES_DIR;
      process.env.AMADEUS_SCOPE_GRID = GRID_PATH;
      _resetScopeMappingForTests();
    }
  });
});

describe("#1497 NFR-1: the predicate is shared by the solo and team callers", () => {
  test("the verdict does not depend on the operating mode", () => {
    const saved = process.env.AMADEUS_OPERATING_MODE;
    try {
      process.env.AMADEUS_OPERATING_MODE = "team";
      const team = standingGrantSatisfiesGate(
        grantWith(false),
        "reverse-engineering",
        stateContent("amadeus-bugfix"),
        GRAPH,
      );
      process.env.AMADEUS_OPERATING_MODE = "solo";
      const solo = standingGrantSatisfiesGate(
        grantWith(false),
        "reverse-engineering",
        stateContent("amadeus-bugfix"),
        GRAPH,
      );
      expect(team).toBe(solo);
      expect(team).toBe(true);
    } finally {
      if (saved === undefined) delete process.env.AMADEUS_OPERATING_MODE;
      else process.env.AMADEUS_OPERATING_MODE = saved;
    }
  });
});
