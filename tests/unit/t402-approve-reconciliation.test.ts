// covers: function:swarmEvidenceVerdict
//
// The approve-side reconciliation judge (FR-2). A compiled Bolt DAG declares
// which batches run in parallel; the audit trail records which batches actually
// fanned out. This function is the pure comparison between the two — no disk, no
// audit read, no env, so a verdict can never be derived from the outcome it is
// meant to gate.

import { describe, expect, test } from "bun:test";
import {
  type SwarmEvidence,
  swarmEvidenceVerdict,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

/** Evidence with the given batch numbers started AND completed. */
function ranAsSwarm(...numbers: number[]): SwarmEvidence {
  return { startedBatches: new Set(numbers), completedBatches: new Set(numbers) };
}

/** No SWARM row of any kind — the shape a serially-run parallel plan leaves. */
const NO_EVIDENCE: SwarmEvidence = { startedBatches: new Set(), completedBatches: new Set() };

describe("t402 swarmEvidenceVerdict (FR-2)", () => {
  test("a: an all-serial plan needs no evidence (AC-2c)", () => {
    const verdict = swarmEvidenceVerdict([["alpha"], ["beta"], ["gamma"]], NO_EVIDENCE);
    expect(verdict.kind).toBe("satisfied");
  });

  test("b: a parallel batch with no SWARM row at all is missing (AC-2a)", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], NO_EVIDENCE);
    expect(verdict).toEqual({ kind: "missing", batches: [{ number: 1, units: ["alpha", "beta"] }] });
  });

  test("c: a parallel batch that started and completed is satisfied (AC-2b)", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], ranAsSwarm(1));
    expect(verdict.kind).toBe("satisfied");
  });

  // Started-but-never-completed is the shape a fan-out that was abandoned
  // mid-batch leaves. Requiring both rows is what keeps the guard from accepting
  // an intent to fan out as proof that fanning out happened.
  test("d: started without completed is still missing", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], {
      startedBatches: new Set([1]),
      completedBatches: new Set(),
    });
    expect(verdict.kind).toBe("missing");
  });

  test("e: completed without started is still missing", () => {
    const verdict = swarmEvidenceVerdict([["alpha", "beta"]], {
      startedBatches: new Set(),
      completedBatches: new Set([1]),
    });
    expect(verdict.kind).toBe("missing");
  });

  // The measured case behind the "list them all" rule: intent
  // 260720-upstream-sync-230 declared widths [6,3,1,1,1] and has SWARM rows for
  // batches 2-5 but none for batch 1. A judge that passed on any evidence at all
  // would call that record green and miss the drift #1892 counted.
  test("f: partial evidence names every unsatisfied batch, not the first", () => {
    const verdict = swarmEvidenceVerdict(
      [["a", "b"], ["c", "d"], ["e", "f"], ["g"]],
      ranAsSwarm(2),
    );
    expect(verdict).toEqual({
      kind: "missing",
      batches: [
        { number: 1, units: ["a", "b"] },
        { number: 3, units: ["e", "f"] },
      ],
    });
  });

  test("g: a plan with no batches at all is satisfied", () => {
    expect(swarmEvidenceVerdict([], NO_EVIDENCE).kind).toBe("satisfied");
  });
});
