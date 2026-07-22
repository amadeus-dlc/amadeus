import { describe, expect, test } from "bun:test";
import type { ArmId, Verdict } from "../../scripts/formal-verif/contract.ts";
import type { CanonicalInputSet, FullMatrixRun, FullMatrixValidation, ScheduleEntry } from "../../scripts/formal-verif/full-matrix.ts";
import {
  ALGORITHM_VERSION,
  type ArmEligibility,
  type CostTuple,
  type MeasuredCell,
  type VerifiedMatrixView,
  assessAlloy,
  classifyArm,
  closeDecision,
  comparePareto,
  deriveMeasuredCells,
  verifyStructure,
} from "../../scripts/formal-verif/eligibility.ts";

const BASELINE = "HEALTHY_BASELINE";
const cell = (arm: ArmId, subject: string, verdict: Verdict, contractClass: string | null = subject === BASELINE ? null : `class-${subject}`): MeasuredCell => ({ arm, subject, runNo: 1, isBaseline: subject === BASELINE, verdict, contractClass, cellRef: `${arm}\0${subject}` });
const viewOf = (cells: readonly MeasuredCell[]): VerifiedMatrixView => ({ algorithmVersion: ALGORITHM_VERSION, inputSetIdentity: "a".repeat(64), matrixIdentity: "b".repeat(64), baselineSubject: BASELINE, cells });
const armCells = (arm: ArmId, defects: Verdict[], baseline: Verdict): MeasuredCell[] => [cell(arm, BASELINE, baseline), ...defects.map((verdict, i) => cell(arm, `fx-${i}`, verdict))];
const eligibleArm = (arm: ArmId): MeasuredCell[] => armCells(arm, ["DETECTED", "DETECTED"], "NOT_DETECTED");
const cost = (loc: number, elapsed: number, median: number): CostTuple => ({ armAuthoredLoc: loc, authoringElapsedMs: elapsed, suiteMedianMs: median });

describe("structural gate", () => {
  test("a complete matrix passes structural verification", () => {
    const matrix: FullMatrixValidation = { kind: "CompleteMatrix", expectedCellCount: 96, matrixIdentity: "b".repeat(64) };
    expect(verifyStructure(matrix, []).ok).toBe(true);
  });
  test("only HARNESS_ERROR_CELL findings normalize to a structurally complete harness matrix", () => {
    const matrix: FullMatrixValidation = { kind: "IncompleteMatrix", findings: [{ kind: "HARNESS_ERROR_CELL", key: { arm: "tla", sampleKind: "MEASURED", runNo: 1, subject: BASELINE } }] };
    const result = verifyStructure(matrix, []);
    expect(result.ok && result.value).toBe("StructurallyCompleteHarnessMatrix");
  });
  test("a missing cell is a structural failure, never rounded to NOT_DETECTED", () => {
    const matrix: FullMatrixValidation = { kind: "IncompleteMatrix", findings: [{ kind: "MISSING", key: { arm: "ts", sampleKind: "MEASURED", runNo: 2, subject: "fx-0" } }] };
    const result = verifyStructure(matrix, ["src"]);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error.code).toBe("STRUCTURAL_INCOMPLETE");
  });
});

describe("hard eligibility", () => {
  test("all defects detected and a clean baseline is eligible", () => {
    expect(classifyArm(viewOf(eligibleArm("tla")), "tla").kind).toBe("Eligible");
  });
  test("a missed defect is DEFECT_NOT_DETECTED", () => {
    const result = classifyArm(viewOf(armCells("tla", ["DETECTED", "NOT_DETECTED"], "NOT_DETECTED")), "tla");
    expect(result.kind === "Ineligible" && result.reasons).toContain("DEFECT_NOT_DETECTED");
  });
  test("any harness error makes the arm ineligible", () => {
    const result = classifyArm(viewOf(armCells("ts", ["DETECTED", "HARNESS_ERROR"], "NOT_DETECTED")), "ts");
    expect(result.kind === "Ineligible" && result.reasons).toContain("HARNESS_ERROR");
  });
  test("a baseline DETECTED is a preserved false positive", () => {
    const result = classifyArm(viewOf(armCells("tla", ["DETECTED", "DETECTED"], "DETECTED")), "tla");
    expect(result.kind === "Ineligible" && result.reasons).toContain("BASELINE_FALSE_POSITIVE");
  });
  test("distinct reasons are preserved together, not collapsed", () => {
    const result = classifyArm(viewOf(armCells("tla", ["NOT_DETECTED", "HARNESS_ERROR"], "DETECTED")), "tla");
    expect(result.kind === "Ineligible" && [...result.reasons].sort()).toEqual(["BASELINE_FALSE_POSITIVE", "DEFECT_NOT_DETECTED", "HARNESS_ERROR"]);
  });
});

describe("Pareto comparison", () => {
  test("T with all axes <= and one < dominates", () => expect(comparePareto(cost(10, 20, 30), cost(10, 25, 30))).toBe("T_DOMINATES"));
  test("S dominates when it is strictly better", () => expect(comparePareto(cost(40, 20, 30), cost(10, 20, 30))).toBe("S_DOMINATES"));
  test("a mutual trade-off is non-dominated", () => expect(comparePareto(cost(10, 40, 30), cost(40, 20, 30))).toBe("NON_DOMINATED_PAIR"));
  test("a three-axis tie is non-dominated (no winner)", () => expect(comparePareto(cost(10, 20, 30), cost(10, 20, 30))).toBe("NON_DOMINATED_PAIR"));
});

describe("closed decision", () => {
  const bothEligible = () => ({ tla: { kind: "Eligible", arm: "tla" } as ArmEligibility, ts: { kind: "Eligible", arm: "ts" } as ArmEligibility });
  test("both ineligible closes to BOTH_INELIGIBLE without cost", () => {
    const decision = closeDecision(viewOf([]), { tla: { kind: "Ineligible", arm: "tla", reasons: ["HARNESS_ERROR"] }, ts: { kind: "Ineligible", arm: "ts", reasons: ["DEFECT_NOT_DETECTED"] } });
    expect(decision.kind === "ValidDecision" && decision.finalDecision).toBe("BOTH_INELIGIBLE");
    expect(decision.kind === "ValidDecision" && decision.eligiblePairCosts).toBeUndefined();
  });
  test("one eligible arm becomes the candidate without needing cost", () => {
    const decision = closeDecision(viewOf([]), { tla: { kind: "Eligible", arm: "tla" }, ts: { kind: "Ineligible", arm: "ts", reasons: ["HARNESS_ERROR"] } });
    expect(decision.kind === "ValidDecision" && decision.finalDecision).toBe("ARM_T_CANDIDATE");
    expect(decision.kind === "ValidDecision" && decision.eligiblePairCosts).toBeUndefined();
  });
  test("both eligible require cost and dominance selects the winner", () => {
    const decision = closeDecision(viewOf([]), bothEligible(), { tla: cost(10, 20, 30), ts: cost(20, 20, 30) });
    expect(decision.kind === "ValidDecision" && decision.finalDecision).toBe("ARM_T_CANDIDATE");
    expect(decision.kind === "ValidDecision" && decision.pareto).toBe("T_DOMINATES");
  });
  test("both eligible with a trade-off closes to no winner", () => {
    const decision = closeDecision(viewOf([]), bothEligible(), { tla: cost(10, 40, 30), ts: cost(40, 20, 30) });
    expect(decision.kind === "ValidDecision" && decision.finalDecision).toBe("BOTH_ELIGIBLE_NO_WINNER");
  });
  test("both eligible with missing cost is an EvaluationFailure, not BOTH_INELIGIBLE", () => {
    const decision = closeDecision(viewOf([]), bothEligible());
    expect(decision.kind).toBe("EvaluationFailure");
    expect(decision.kind === "EvaluationFailure" && decision.code).toBe("MISSING_ELIGIBLE_PAIR_COSTS");
  });
  test("negative cost is rejected as an EvaluationFailure", () => {
    const decision = closeDecision(viewOf([]), bothEligible(), { tla: cost(-1, 20, 30), ts: cost(20, 20, 30) });
    expect(decision.kind).toBe("EvaluationFailure");
  });
  test("the same input and algorithm version reproduce the same decision identity", () => {
    const a = closeDecision(viewOf([]), bothEligible(), { tla: cost(10, 20, 30), ts: cost(20, 20, 30) });
    const b = closeDecision(viewOf([]), bothEligible(), { tla: cost(10, 20, 30), ts: cost(20, 20, 30) });
    expect(a.kind === "ValidDecision" && b.kind === "ValidDecision" && a.identity.resultIdentity).toBe(b.kind === "ValidDecision" ? b.identity.resultIdentity : "");
  });
});

describe("Alloy trigger", () => {
  test("no missed defect is NOT_TRIGGERED", () => {
    expect(assessAlloy(viewOf([...eligibleArm("tla"), ...eligibleArm("ts")])).triggerState).toBe("NOT_TRIGGERED");
  });
  test("a missed defect requires a separate decision and is listed", () => {
    const assessment = assessAlloy(viewOf([cell("tla", "fx-0", "NOT_DETECTED"), cell("tla", BASELINE, "NOT_DETECTED")]));
    expect(assessment.triggerState).toBe("SEPARATE_DECISION_REQUIRED");
    expect(assessment.misses.map((miss) => miss.alias)).toEqual(["fx-0"]);
  });
  test("a shared missed contract class is a common blind spot", () => {
    const shared: MeasuredCell[] = [
      { ...cell("tla", "fx-shared", "NOT_DETECTED"), contractClass: "C-shared" },
      { ...cell("ts", "fx-shared", "NOT_DETECTED"), contractClass: "C-shared" },
    ];
    expect(assessAlloy(viewOf(shared)).commonBlindSpotClasses).toEqual(["C-shared"]);
  });
});

describe("measured-cell derivation", () => {
  const entry = (arm: ArmId): ScheduleEntry => ({ globalOrdinal: 0, arm, sample: { kind: "MEASURED", runNo: 1 }, position: "first", entryIdentity: "e".repeat(64) });
  test("derives one cell per subject from measured suites and marks the baseline", () => {
    const inputSet = { orderedSubjects: [BASELINE, "fx-0"] } as unknown as CanonicalInputSet;
    const run: FullMatrixRun = { scheduleId: "s", receipts: [], outcomes: [{ kind: "MeasuredSuite", suite: { entry: entry("tla"), startReceiptIdentity: "r", orderedBundleIds: [], verdicts: ["NOT_DETECTED", "DETECTED"], counterexampleIds: [null, null], durationMs: 1 } }] };
    const cells = deriveMeasuredCells(inputSet, run, { "fx-0": "class-0" });
    expect(cells.length).toBe(2);
    expect(cells[0]!.isBaseline).toBe(true);
    expect(cells[1]!.contractClass).toBe("class-0");
  });
});
