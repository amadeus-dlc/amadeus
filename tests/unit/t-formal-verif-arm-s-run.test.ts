// covers: domain:formal-verif-arm-s-run
// size: small
//
// Arm S run driver: exhaustive + fixed-seed properties against the healthy
// baseline (NOT_DETECTED), synthetic defective subjects (DETECTED), replay
// identity, verdict normalization, CellResult conformance, and the freeze
// manifest allowlist. Pure — no fs/spawn (unit tier).

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import { parseCellResult } from "../../scripts/formal-verif/contract.ts";
import { ok } from "../../scripts/formal-verif/arm-s-result.ts";
import { SEQUENCE_BUDGET, type SubjectPort, validateSequence } from "../../scripts/formal-verif/arm-s-oracle.ts";
import { healthyBaselineSubject } from "../../scripts/formal-verif/arm-s-model-subject.ts";
import { descriptorIdentity } from "../../scripts/formal-verif/arm-s-universe.ts";
import {
  ARM_S_MAX_ACTIONS,
  ARM_S_NUM_RUNS,
  ARM_S_SEED,
  INPUT_ALLOWLIST,
  freezeManifest,
  normalize,
  runArmS,
  runProperties,
  scanForbidden,
  sequenceArb,
} from "../../scripts/formal-verif/arm-s-runner.ts";

const healthy = healthyBaselineSubject();

describe("arm-s healthy run → NOT_DETECTED (BR-14/BR-18)", () => {
  const run = runArmS(healthy);

  test("verdict is NOT_DETECTED with a completion proof", () => {
    expect(run.verdict).toBe("NOT_DETECTED");
    expect(run.proof.kind).toBe("completion");
  });

  test("completion carries the 5,760 + 160 proofs and 300 property runs", () => {
    if (run.proof.kind !== "completion") throw new Error("expected completion");
    expect(run.proof.core.actualCount).toBe(5760);
    expect(run.proof.validation.uniqueCount).toBe(160);
    expect(run.proof.propertyRuns).toBe(3 * ARM_S_NUM_RUNS);
  });

  test("emitted cell conforms to the public CellResult schema", () => {
    expect(parseCellResult(run.cell).ok).toBe(true);
    expect(run.cell.arm).toBe("ts");
    expect(run.cell.counterexampleId).toBeNull();
  });
});

describe("arm-s detects defective subjects → DETECTED (BR-18)", () => {
  test("an append that never rejects unknown-ref is caught exhaustively", () => {
    const defective: SubjectPort = { ...healthy, append: (ledger, b) => ok([...ledger, b]) };
    const run = runArmS(defective);
    expect(run.verdict).toBe("DETECTED");
    if (run.proof.kind !== "counterexample") throw new Error("expected counterexample");
    expect(run.proof.counterexample.propertyId).toBe("P6_UNKNOWN_REF");
  });

  test("a tally that ignores holds is caught by the property runner", () => {
    const defective: SubjectPort = { ...healthy, tally: () => ({ kind: "established", winner: 1 }) };
    const report = runProperties(defective);
    expect(report.failed).toBe(true);
    expect(report.counterexample?.propertyId).toBe("P1_WINNER");
  });

  test("a lateness check that reads the wrong axis is caught", () => {
    const defective: SubjectPort = { ...healthy, classifyLate: () => false };
    const run = runArmS(defective);
    expect(run.verdict).toBe("DETECTED");
    if (run.proof.kind !== "counterexample") throw new Error("expected counterexample");
    expect(run.proof.counterexample.propertyId).toBe("P3_LATENESS");
  });
});

describe("arm-s determinism and normalization (BR-17/BR-19)", () => {
  test("fixed seed replays the same counterexample identity", () => {
    const defective: SubjectPort = { ...healthy, tally: () => ({ kind: "established", winner: 1 }) };
    const a = runProperties(defective);
    const b = runProperties(defective);
    expect(a.counterexample?.counterexampleId ?? null).toBe(b.counterexample?.counterexampleId ?? null);
    expect(a.counterexample?.counterexampleId).toBeTruthy();
  });

  test("healthy property run is reproducibly green", () => {
    expect(runProperties(healthy).failed).toBe(false);
    expect(runProperties(healthy).propertyRuns).toBe(3 * ARM_S_NUM_RUNS);
  });

  test("verdict normalization keeps the three classes distinct", () => {
    expect(normalize({ kind: "harness", reason: "coverage" })).toBe("HARNESS_ERROR");
    expect(normalize({ kind: "counterexample", counterexample: { propertyId: "P1_WINNER", minimalInput: "{}", expected: "x", actual: "y", counterexampleId: "z" } })).toBe("DETECTED");
  });
});

describe("arm-s blind freeze manifest (BR-20/BR-21)", () => {
  test("forbiddenPathCount is derived from a real scan, not hardcoded", () => {
    const manifest = freezeManifest(descriptorIdentity().sha256);
    // The count equals scanning the actual freeze inputs (currently clean = 0).
    expect(manifest.forbiddenPathCount).toBe(scanForbidden(INPUT_ALLOWLIST).length);
    expect(manifest.forbiddenPathCount).toBe(0);
    expect(manifest.forbiddenPaths).toEqual([]);
    expect(manifest.seed).toBe(20260720);
  });

  test("a poisoned freeze input makes the derived count non-zero", () => {
    const poisoned = freezeManifest(descriptorIdentity().sha256, [...INPUT_ALLOWLIST, "scripts/formal-verif/tla-arm.ts"]);
    expect(poisoned.forbiddenPathCount).toBe(1);
    expect(poisoned.forbiddenPaths).toEqual(["scripts/formal-verif/tla-arm.ts"]);
  });

  test("scanForbidden flags an Arm T / skeleton path", () => {
    expect(scanForbidden(["./tla-arm.ts", "./canonical.ts"])).toEqual(["./tla-arm.ts"]);
    expect(scanForbidden(["./fixture-registry.ts"])).toEqual(["./fixture-registry.ts"]);
    expect(scanForbidden(["fast-check", "./arm-s-oracle.ts"])).toEqual([]);
  });
});

describe("arm-s action-sequence generator soundness (BR-15/BR-16)", () => {
  test("maxActions is the shared domain budget, not a stray literal", () => {
    expect(ARM_S_MAX_ACTIONS).toBe(SEQUENCE_BUDGET.maxActions);
  });

  test("every generated sequence is well-formed and within maxActions", () => {
    fc.assert(
      fc.property(sequenceArb(), (actions) => {
        expect(validateSequence(actions).ok).toBe(true);
        expect(actions.length).toBeLessThanOrEqual(ARM_S_MAX_ACTIONS);
      }),
      { seed: ARM_S_SEED, numRuns: ARM_S_NUM_RUNS },
    );
  });

  test("the generator places exactly one TALLY at an index in 1..6", () => {
    fc.assert(
      fc.property(sequenceArb(), (actions) => {
        const tallyIndices = actions.map((a, i) => (a.kind === "TALLY" ? i : -1)).filter((i) => i >= 0);
        expect(tallyIndices.length).toBe(1);
        expect(tallyIndices[0]).toBeGreaterThanOrEqual(1);
        expect(tallyIndices[0]).toBeLessThanOrEqual(SEQUENCE_BUDGET.tallyMaxIndex);
      }),
      { seed: ARM_S_SEED, numRuns: ARM_S_NUM_RUNS },
    );
  });
});
