// covers: function:swarmEvidenceVerdict
//
// The approve-side reconciliation judge (FR-2). A compiled Bolt DAG declares
// which batches run in parallel; the audit trail records which units actually
// fanned out together. This function is the pure comparison between the two — no
// disk, no audit read, no env, so a verdict can never be derived from the outcome
// it is meant to gate.
//
// The evidence is keyed on UNIT NAMES, not batch numbers (#2354). A batch number
// is a value the conductor hands `prepare --batch`, so a re-dispatch after a
// failed attempt-set advances it and every later batch's rows land under a number
// the plan never declared. Unit names are the identity the plan and the audit
// actually share.

import { describe, expect, test } from "bun:test";
import {
  type SwarmEvidence,
  swarmEvidenceVerdict,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

/** Evidence that each given unit group fanned out together and then settled. */
function ranAsSwarm(...groups: string[][]): SwarmEvidence {
  return {
    fannedOutUnitSets: groups.map((group) => new Set(group)),
    settledUnits: new Set(groups.flat()),
  };
}

/** No SWARM row of any kind — the shape a serially-run parallel plan leaves. */
const NO_EVIDENCE: SwarmEvidence = { fannedOutUnitSets: [], settledUnits: new Set() };

describe("t402 swarmEvidenceVerdict (FR-2)", () => {
  test("a: an all-serial plan needs no evidence (AC-2c)", () => {
    const verdict = swarmEvidenceVerdict([["alpha"], ["beta"], ["gamma"]], NO_EVIDENCE);
    expect(verdict.kind).toBe("satisfied");
  });

  test("b: a parallel batch with no SWARM row at all is missing (AC-2a)", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], NO_EVIDENCE);
    expect(verdict).toEqual({ kind: "missing", batches: [{ number: 1, units: ["alpha", "beta"] }] });
  });

  test("c: a parallel batch that fanned out and settled is satisfied (AC-2b)", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], ranAsSwarm(["alpha", "beta"]));
    expect(verdict.kind).toBe("satisfied");
  });

  // Fanned-out-but-never-settled is the shape a fan-out that was abandoned
  // mid-batch leaves. Requiring both halves is what keeps the guard from
  // accepting an intent to fan out as proof that fanning out happened.
  test("d: fanned out without settling is still missing", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], {
      fannedOutUnitSets: [new Set(["alpha", "beta"])],
      settledUnits: new Set(),
    });
    expect(verdict.kind).toBe("missing");
  });

  test("e: settled without a fan-out row is still missing", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], {
      fannedOutUnitSets: [],
      settledUnits: new Set(["alpha", "beta"]),
    });
    expect(verdict.kind).toBe("missing");
  });

  // #2354. The measured shape: intent 260805-semi-redefine-autonomy-f fanned out
  // its declared batch 1 with cap 3 and all three unit names on one SWARM_STARTED
  // row, but a halt-and-ask re-dispatch meant finalize recorded the completion
  // under batch 2 — and every later batch's rows shifted by one too. Nothing about
  // the RUN was serial; only the numbering drifted, so a unit-keyed judge must
  // call this satisfied.
  test("f: evidence recorded under shifted batch numbers is satisfied (#2354)", () => {
    const verdict = swarmEvidenceVerdict(
      [
        ["autonomy-statusline", "launch-autonomy-flag", "semi-authorization-core"],
        ["advisory-auto-resolution", "semi-policy-carrier", "stop-question-carveout"],
      ],
      ranAsSwarm(
        ["autonomy-statusline", "launch-autonomy-flag", "semi-authorization-core"],
        ["advisory-auto-resolution", "semi-policy-carrier", "stop-question-carveout"],
      ),
    );
    expect(verdict.kind).toBe("satisfied");
  });

  // The drift #1892 counted, stated in unit terms: dispatching each unit as its
  // own one-unit fan-out IS building them one at a time. No single row names the
  // declared batch's units together, so no row proves the parallelism the plan
  // declared.
  test("g: one unit per fan-out row does not satisfy a wide batch (#1892)", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], ranAsSwarm(["alpha"], ["beta"]));
    expect(verdict).toEqual({ kind: "missing", batches: [{ number: 1, units: ["alpha", "beta"] }] });
  });

  // Superset, not equality: a conductor may claim a wider unit set than one
  // declared level, and the batch's units were still dispatched together.
  test("h: a wider fan-out row covers a narrower declared batch", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], ranAsSwarm(["alpha", "beta", "gamma"]));
    expect(verdict.kind).toBe("satisfied");
  });

  // The measured case behind the "list them all" rule: intent
  // 260720-upstream-sync-230 declared widths [6,3,1,1,1] and fanned out batches
  // 2-5 but not batch 1. A judge that passed on any evidence at all would call
  // that record green and miss the drift #1892 counted.
  test("i: partial evidence names every unsatisfied batch, not the first", () => {
    const verdict = swarmEvidenceVerdict([["a", "b"], ["c", "d"], ["e", "f"], ["g"]], ranAsSwarm(["c", "d"]));
    expect(verdict).toEqual({
      kind: "missing",
      batches: [
        { number: 1, units: ["a", "b"] },
        { number: 3, units: ["e", "f"] },
      ],
    });
  });

  test("j: a plan with no batches at all is satisfied", () => {
    expect(swarmEvidenceVerdict([], NO_EVIDENCE).kind).toBe("satisfied");
  });
});
