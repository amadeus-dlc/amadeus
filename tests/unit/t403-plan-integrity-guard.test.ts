// covers: function:guardMessage, function:planIntegrityVerdict, function:planGuardMessage
//
// The issuance-side plan-integrity guard: the three-part guard message builder
// and the pure verdict that decides whether a swarm decline is a legitimate
// serial fallback, an autonomy-ladder redirect, or a plan violation. Both are
// total functions over their arguments — no filesystem, no audit, no env — so
// the whole surface is driven in-process here.

import { describe, expect, test } from "bun:test";
import {
  AUTONOMY_LADDER_EXIT,
  GUARD_EXIT_MARKER,
  GUARD_OBSERVED_MARKER,
  GUARD_WEIGHT_MARKER,
  guardMessage,
  PLAN_CORRECTION_EXIT,
  PLAN_DRIFT_WEIGHT,
  planGuardMessage,
  planIntegrityVerdict,
  type SwarmDecline,
} from "../../packages/framework/core/tools/amadeus-lib.ts";

/** A width-2 declared batch — the smallest shape that declares parallelism. */
const PARALLEL_BATCH = { number: 2, units: ["alpha", "beta"] } as const;
/** A width-1 declared batch — a legitimately serial topological level. */
const SERIAL_BATCH = { number: 1, units: ["alpha"] } as const;

describe("t403 guardMessage assembles the three-part contract (FR-4 / AC-4a)", () => {
  test("a: all three markers are present in a fully populated message", () => {
    const message = guardMessage({
      observation: "batch 2 declares a width-3 parallel batch (alpha, beta, gamma).",
      weight: "Plan drift silently serialised 4 of 18 audited intents.",
      exit: "Add the edge to unit-of-work-dependency.md, recompile, re-run next.",
    });
    expect(message).toContain(GUARD_OBSERVED_MARKER);
    expect(message).toContain(GUARD_WEIGHT_MARKER);
    expect(message).toContain(GUARD_EXIT_MARKER);
    expect(message).toContain("batch 2");
    expect(message).toContain("alpha, beta, gamma");
  });

  test("b: each marker prefixes its own part, in observation/weight/exit order", () => {
    const message = guardMessage({ observation: "OBS", weight: "WHY", exit: "OUT" });
    const observedAt = message.indexOf(GUARD_OBSERVED_MARKER);
    const weightAt = message.indexOf(GUARD_WEIGHT_MARKER);
    const exitAt = message.indexOf(GUARD_EXIT_MARKER);
    expect(observedAt).toBeGreaterThanOrEqual(0);
    expect(weightAt).toBeGreaterThan(observedAt);
    expect(exitAt).toBeGreaterThan(weightAt);
    expect(message).toContain(`${GUARD_OBSERVED_MARKER}OBS`);
    expect(message).toContain(`${GUARD_WEIGHT_MARKER}WHY`);
    expect(message).toContain(`${GUARD_EXIT_MARKER}OUT`);
  });

  // The vacuity guard (cid:code-generation:vocabulary-collision-vacuity-guard):
  // the three markers must be distinct from one another, or a check that only
  // asserts their presence would pass on a message carrying one part three
  // times.
  test("c: the three markers are distinct strings", () => {
    const markers = new Set([GUARD_OBSERVED_MARKER, GUARD_WEIGHT_MARKER, GUARD_EXIT_MARKER]);
    expect(markers.size).toBe(3);
  });

  // A message that dropped a part must be distinguishable from a complete one,
  // or the marker check above would pass on anything. This pins the check's
  // discrimination without touching the production assembler.
  test("d: a hand-built two-part message is missing a marker", () => {
    const truncated = `${GUARD_OBSERVED_MARKER}OBS\n\n${GUARD_WEIGHT_MARKER}WHY`;
    expect(truncated.includes(GUARD_EXIT_MARKER)).toBe(false);
  });

  test("e: the canonical exit and weight constants carry their named contract", () => {
    // The violation exit names the plan-correction path end to end: the file to
    // edit, the recompile, the re-run.
    expect(PLAN_CORRECTION_EXIT).toContain("unit-of-work-dependency.md");
    expect(PLAN_CORRECTION_EXIT).toContain("compile");
    expect(PLAN_CORRECTION_EXIT).toContain("next");
    // The redirect exit reuses the existing ladder vocabulary rather than
    // inventing a second command for the same answer.
    expect(AUTONOMY_LADDER_EXIT).toContain("set-autonomy");
    expect(AUTONOMY_LADDER_EXIT).toContain("autonomous");
    expect(AUTONOMY_LADDER_EXIT).toContain("gated");
    // The weight is the measured basis, not an exhortation.
    expect(PLAN_DRIFT_WEIGHT).toMatch(/\d/);
  });
});

describe("t403 planIntegrityVerdict maps declines to the three verdicts (FR-1)", () => {
  test("f: no declared batch is ok whatever the decline", () => {
    const declines: SwarmDecline[] = [
      { kind: "not-swarm-stage" },
      { kind: "skeleton-gate" },
      { kind: "autonomy-unset-pre-skeleton" },
      { kind: "autonomy-unset" },
      { kind: "no-dag" },
      { kind: "all-covered" },
    ];
    for (const decline of declines) {
      expect(planIntegrityVerdict(decline, null).kind).toBe("ok");
    }
  });

  test("g: a width-1 declared batch is a legitimate serial level, never a guard", () => {
    expect(planIntegrityVerdict({ kind: "autonomy-unset" }, SERIAL_BATCH).kind).toBe("ok");
  });

  test.each([
    ["not-swarm-stage", { kind: "not-swarm-stage" } as SwarmDecline],
    ["skeleton-gate", { kind: "skeleton-gate" } as SwarmDecline],
    ["autonomy-unset-pre-skeleton", { kind: "autonomy-unset-pre-skeleton" } as SwarmDecline],
    ["all-covered", { kind: "all-covered" } as SwarmDecline],
    ["no-dag", { kind: "no-dag" } as SwarmDecline],
  ])("h: %s never fires the guard even at width 2 (AC-1c)", (_name, decline) => {
    expect(planIntegrityVerdict(decline, PARALLEL_BATCH).kind).toBe("ok");
  });

  test("i: an unset grant after the skeleton redirects to the ladder (AC-1b)", () => {
    const verdict = planIntegrityVerdict({ kind: "autonomy-unset" }, PARALLEL_BATCH);
    expect(verdict.kind).toBe("redirect");
    if (verdict.kind !== "redirect") throw new Error("expected a redirect verdict");
    expect(verdict.declaredWidth).toBe(2);
    expect(verdict.batchNumber).toBe(PARALLEL_BATCH.number);
    expect(verdict.units).toEqual(["alpha", "beta"]);
  });

  // The fail-closed default (BR-U2-3). A decline reason added later without a
  // matching branch here must stop, not silently serialise — so the guard is
  // driven with a reason the switch does not enumerate.
  test("j: an unenumerated decline reason is a violation (AC-1a)", () => {
    const unknown = { kind: "future-decline-reason" } as unknown as SwarmDecline;
    const verdict = planIntegrityVerdict(unknown, PARALLEL_BATCH);
    expect(verdict.kind).toBe("violation");
    if (verdict.kind !== "violation") throw new Error("expected a violation verdict");
    expect(verdict.declaredWidth).toBe(2);
    expect(verdict.batchNumber).toBe(PARALLEL_BATCH.number);
    expect(verdict.units).toEqual(["alpha", "beta"]);
  });

  test("k: declaredWidth is derived from the declared units, never passed in", () => {
    const wide = { number: 1, units: ["a", "b", "c", "d"] };
    const verdict = planIntegrityVerdict({ kind: "autonomy-unset" }, wide);
    if (verdict.kind !== "redirect") throw new Error("expected a redirect verdict");
    expect(verdict.declaredWidth).toBe(wide.units.length);
  });
});

describe("t403 planGuardMessage writes both exits from one builder (FR-4 / AC-4a)", () => {
  const REDIRECT = {
    kind: "redirect",
    batchNumber: 2,
    declaredWidth: 2,
    units: ["alpha", "beta"],
  } as const;
  const VIOLATION = {
    kind: "violation",
    batchNumber: 7,
    declaredWidth: 3,
    units: ["alpha", "beta", "gamma"],
  } as const;

  test("l: the redirect message is three-part and exits via the ladder", () => {
    const message = planGuardMessage(REDIRECT);
    expect(message).toContain(GUARD_OBSERVED_MARKER);
    expect(message).toContain(GUARD_WEIGHT_MARKER);
    expect(message).toContain(GUARD_EXIT_MARKER);
    expect(message).toContain(AUTONOMY_LADDER_EXIT);
    expect(message).not.toContain(PLAN_CORRECTION_EXIT);
  });

  test("m: the violation message is three-part and exits via a plan correction", () => {
    const message = planGuardMessage(VIOLATION);
    expect(message).toContain(GUARD_OBSERVED_MARKER);
    expect(message).toContain(GUARD_WEIGHT_MARKER);
    expect(message).toContain(GUARD_EXIT_MARKER);
    expect(message).toContain(PLAN_CORRECTION_EXIT);
    expect(message).not.toContain(AUTONOMY_LADDER_EXIT);
  });

  test("n: both messages carry the same measured weight, from one constant", () => {
    expect(planGuardMessage(REDIRECT)).toContain(PLAN_DRIFT_WEIGHT);
    expect(planGuardMessage(VIOLATION)).toContain(PLAN_DRIFT_WEIGHT);
  });

  test("o: the observation states the batch, the width, and every declared unit", () => {
    const message = planGuardMessage(VIOLATION);
    expect(message).toContain("batch 7 3 units wide");
    for (const unit of VIOLATION.units) expect(message).toContain(unit);
  });
});
