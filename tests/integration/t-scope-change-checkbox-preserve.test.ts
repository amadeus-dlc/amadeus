// size: medium
//
// Issue #1015 regression seam: scope-change must preserve ALL SIX checkbox
// states when it rebuilds the `## Stage Progress` section, not just the four
// the old hand-written ternary enumerated. The pre-fix rebuild collapsed
// `[?]` (awaiting-approval) and `[R]` (revising) to `[ ]`, silently discarding
// gate/revision state on a scope change.
//
// This drives handleScopeChange IN-PROCESS (imported from the shipped dist
// tool, so DATA_DIR resolves the compiled stage-graph.json next to it) — the
// same seam idiom as t203/t-phase-progress-rollup-seam. In-process driving
// puts the rebuilt marker line and the shared header line under coverage that
// a spawned subprocess would hide (the bun --coverage spawn blindspot).
//
// Falling-test evidence (#1015 AC-3b / FR-5): against the pre-fix rebuild the
// `[?]`/`[R]` assertions go red ([ ] collapse); after the CHECKBOX_MAP-derived
// rebuild they pass. The `[x]`/`[-]`/`[S]` assertions pin FR-3c (the states
// that already round-tripped keep round-tripping).

import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { afterAll, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  canonicalCompletedCount,
  cleanupTestProject,
  createTestProject,
  seedAuditFile,
  seededStateFile,
  seedStateFile,
  sedReplaceInFile,
} from "../harness/fixtures.ts";
import { handleScopeChange } from "../../dist/claude/.claude/tools/amadeus-utility.ts";

// Match the standalone-hermeticity default the other utility suites set so a
// bare `bun test <this file>` behaves like the runner.
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

/**
 * Seed a `feature`-scope state (state-mid-ideation.md) plus audit, then flip
 * one stage into each of the six checkbox states so the rebuild has to
 * round-trip every one of them.
 */
function sixStateProj(): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, "state-mid-ideation.md");
  seedAuditFile(p);
  const state = seededStateFile(p);
  // The hand-authored fixture omits the `<!-- Checkbox states: ... -->` comment
  // that a real born state carries; scope-change's rebuild regex anchors on it,
  // so inject it to make the fixture realistic and let the rebuild actually run.
  sedReplaceInFile(
    state,
    "## Stage Progress\n",
    "## Stage Progress\n<!-- Checkbox states: [ ] not started, [-] in progress, [?] awaiting approval (gate open), [R] revising (user rejected gate), [x] completed, [S] skipped via --stage/--phase jump -->\n",
  );
  // Fixture ships: intent-capture/market-research = [x], feasibility = [-],
  // the rest of ideation = [ ]. Flip to cover [?], [R], [-], [S] too.
  sedReplaceInFile(state, "- [-] feasibility", "- [?] feasibility"); // awaiting-approval
  sedReplaceInFile(state, "- [ ] scope-definition", "- [R] scope-definition"); // revising
  sedReplaceInFile(state, "- [ ] team-formation", "- [-] team-formation"); // in-progress
  sedReplaceInFile(state, "- [ ] rough-mockups", "- [S] rough-mockups"); // skipped
  // Legacy #1875 shape shared with the route matrix: a historical [x] row is
  // now SKIP-effective while Completed still carries the raw [x] count.
  sedReplaceInFile(state, "- [x] workspace-scaffold — EXECUTE", "- [x] workspace-scaffold — SKIP");
  const legacy = readFileSync(state, "utf-8");
  // Guard the seeding itself: a silent no-op replace would leave raw and
  // canonical Completed equal and the legacy-skew assertions vacuous.
  if (!/^- \[x\] workspace-scaffold — SKIP/m.test(legacy)) {
    throw new Error("fixture seeding failed: workspace-scaffold row was not flipped to SKIP");
  }
  const rawCompleted = (legacy.match(/^- \[x\]/gm) ?? []).length;
  sedReplaceInFile(state, /^- \*\*Completed\*\*: \d+$/m, `- **Completed**: ${rawCompleted}`);
  return p;
}

function expectCanonicalCompleted(content: string): void {
  const field = Number.parseInt(/^- \*\*Completed\*\*: (\d+)$/m.exec(content)?.[1] ?? "-1", 10);
  expect(field).toBe(canonicalCompletedCount(content));
}

// Each case builds its own fixture project, and the canonical emit path
// registers a Logger Provider for one workspace per process — so the
// registration is dropped between cases, as the provider tests already do.
beforeEach(() => {
  resetOtelPerProject();
});

describe("t-scope-change-checkbox-preserve (#1015)", () => {
  test("scope-change preserves [?] awaiting-approval and [R] revising markers", () => {
    const p = sixStateProj();
    handleScopeChange(p, { scope: "mvp" });
    const out = readFileSync(seededStateFile(p), "utf-8");
    // The bug: these two collapsed to `[ ]`.
    expect(out).toMatch(/^- \[\?\] feasibility /m);
    expect(out).toMatch(/^- \[R\] scope-definition /m);
  });

  test("scope-change preserves [x] completed, [-] in-progress, [S] skipped (FR-3c)", () => {
    const p = sixStateProj();
    handleScopeChange(p, { scope: "mvp" });
    const out = readFileSync(seededStateFile(p), "utf-8");
    expect(out).toMatch(/^- \[x\] intent-capture /m);
    expect(out).toMatch(/^- \[-\] team-formation /m);
    expect(out).toMatch(/^- \[S\] rough-mockups /m);
    expectCanonicalCompleted(out);
  });

  test("scope-change leaves untouched pending stages as [ ] (FR-3c default)", () => {
    const p = sixStateProj();
    handleScopeChange(p, { scope: "mvp" });
    const out = readFileSync(seededStateFile(p), "utf-8");
    // reverse-engineering was [ ] in the fixture and stays [ ].
    expect(out).toMatch(/^- \[ \] reverse-engineering /m);
  });

  test("scope-change canonicalizes Completed when completed rows become SKIP-effective", () => {
    const p = sixStateProj();
    handleScopeChange(p, { scope: "fix" });
    const out = readFileSync(seededStateFile(p), "utf-8");
    expect(out).toMatch(/^- \[x\] intent-capture — SKIP/m);
    expectCanonicalCompleted(out);
    const rawCompleted = (out.match(/^- \[x\]/gm) ?? []).length;
    const completed = Number.parseInt(/^- \*\*Completed\*\*: (\d+)$/m.exec(out)?.[1] ?? "-1", 10);
    expect(completed).toBeLessThan(rawCompleted);
  });

  test("rewritten Stage Progress header carries the full six-state legend (FR-4a)", () => {
    const p = sixStateProj();
    handleScopeChange(p, { scope: "mvp" });
    const out = readFileSync(seededStateFile(p), "utf-8");
    expect(out).toContain("[?] awaiting approval (gate open)");
    expect(out).toContain("[R] revising (user rejected gate)");
  });
});
