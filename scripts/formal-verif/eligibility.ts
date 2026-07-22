import { canonicalIdentity } from "./canonical.ts";
import type { ArmId, Result, Verdict } from "./contract.ts";
import type { CanonicalInputSet, FullMatrixRun, FullMatrixValidation } from "./full-matrix.ts";

// U8 owns hard eligibility, the 3-axis Pareto close, and the Alloy trigger only. It consumes the
// U7 verified matrix and cost tuples as immutable inputs and never generates or mutates raw
// evidence, matrix, or cost. Structure failure is never rounded to INELIGIBLE, HARNESS_ERROR is
// never rounded to NOT_DETECTED, and an evaluation failure is never rounded to BOTH_INELIGIBLE.

export const ALGORITHM_VERSION = "amadeus.formal-verif.eligibility.v1";

export type EligibilityReason = "DEFECT_NOT_DETECTED" | "HARNESS_ERROR" | "BASELINE_FALSE_POSITIVE";
export type FinalDecision = "ARM_T_CANDIDATE" | "ARM_S_CANDIDATE" | "BOTH_ELIGIBLE_NO_WINNER" | "BOTH_INELIGIBLE";
export type ParetoRelation = "T_DOMINATES" | "S_DOMINATES" | "NON_DOMINATED_PAIR";
export type AlloyTriggerState = "NOT_TRIGGERED" | "SEPARATE_DECISION_REQUIRED";

export interface CostTuple { armAuthoredLoc: number; authoringElapsedMs: number; suiteMedianMs: number }

export interface MeasuredCell { arm: ArmId; subject: string; runNo: number; isBaseline: boolean; verdict: Verdict; contractClass: string | null; cellRef: string }

export interface VerifiedMatrixView {
  algorithmVersion: string;
  inputSetIdentity: string;
  matrixIdentity: string;
  baselineSubject: string;
  cells: readonly MeasuredCell[];
}

export type ArmEligibility =
  | { kind: "Eligible"; arm: ArmId }
  | { kind: "Ineligible"; arm: ArmId; reasons: readonly EligibilityReason[] };

export interface EligiblePairCosts { tla: CostTuple; ts: CostTuple }
export interface EvaluationIdentity { inputSetIdentity: string; matrixIdentity: string; algorithmVersion: string; resultIdentity: string }
export interface EvaluationFailure { kind: "EvaluationFailure"; code: string; findings: readonly string[]; sourceRefs: readonly string[] }
export type DecisionResult =
  | { kind: "ValidDecision"; eligibilityByArm: { tla: ArmEligibility; ts: ArmEligibility }; eligiblePairCosts?: EligiblePairCosts; pareto?: ParetoRelation; finalDecision: FinalDecision; identity: EvaluationIdentity }
  | EvaluationFailure;

export interface MissedContract { alias: string; contractClass: string; arm: ArmId; cellRef: string }
export interface AlloyAssessment { misses: readonly MissedContract[]; commonBlindSpotClasses: readonly string[]; triggerState: AlloyTriggerState }

const ARMS: readonly ArmId[] = ["tla", "ts"];

export function deriveMeasuredCells(inputSet: CanonicalInputSet, run: FullMatrixRun, contractClassBySubject: Readonly<Record<string, string>>): readonly MeasuredCell[] {
  const cells: MeasuredCell[] = [];
  for (const outcome of run.outcomes) {
    if (outcome.kind !== "MeasuredSuite" || outcome.suite.entry.sample.kind !== "MEASURED") continue;
    const { entry, verdicts } = outcome.suite;
    inputSet.orderedSubjects.forEach((subject, i) => {
      const verdict = verdicts[i];
      if (!verdict) return;
      const isBaseline = subject === inputSet.orderedSubjects[0];
      cells.push({ arm: entry.arm, subject, runNo: entry.sample.runNo, isBaseline, verdict, contractClass: isBaseline ? null : contractClassBySubject[subject] ?? null, cellRef: `${entry.arm}\0${entry.sample.runNo}\0${subject}` });
    });
  }
  return cells;
}

// A verified structural matrix is either a fully CompleteMatrix or one whose only findings are
// verified expected HARNESS_ERROR_CELL findings. Any other finding class is a structural failure.
export function verifyStructure(matrix: FullMatrixValidation, sourceRefs: readonly string[]): Result<"CompleteMatrix" | "StructurallyCompleteHarnessMatrix", EvaluationFailure> {
  if (matrix.kind === "CompleteMatrix") return { ok: true, value: "CompleteMatrix" };
  const nonHarness = matrix.findings.filter((finding) => finding.kind !== "HARNESS_ERROR_CELL");
  if (nonHarness.length > 0) return { ok: false, error: { kind: "EvaluationFailure", code: "STRUCTURAL_INCOMPLETE", findings: nonHarness.map((finding) => finding.kind), sourceRefs } };
  return { ok: true, value: "StructurallyCompleteHarnessMatrix" };
}

export function classifyArm(view: VerifiedMatrixView, arm: ArmId): ArmEligibility {
  const armCells = view.cells.filter((cell) => cell.arm === arm);
  const defects = armCells.filter((cell) => !cell.isBaseline);
  const baselines = armCells.filter((cell) => cell.isBaseline);
  const reasons = new Set<EligibilityReason>();
  if (armCells.some((cell) => cell.verdict === "HARNESS_ERROR")) reasons.add("HARNESS_ERROR");
  if (defects.some((cell) => cell.verdict === "NOT_DETECTED")) reasons.add("DEFECT_NOT_DETECTED");
  if (baselines.some((cell) => cell.verdict === "DETECTED")) reasons.add("BASELINE_FALSE_POSITIVE");
  if (defects.length === 0 || baselines.length === 0) reasons.add("HARNESS_ERROR");
  if (reasons.size > 0) return { kind: "Ineligible", arm, reasons: [...reasons] };
  return { kind: "Eligible", arm };
}

function nonNegative(cost: CostTuple): boolean {
  return [cost.armAuthoredLoc, cost.authoringElapsedMs, cost.suiteMedianMs].every((value) => Number.isSafeInteger(value) && value >= 0);
}

export function comparePareto(t: CostTuple, s: CostTuple): ParetoRelation {
  const axes: readonly (keyof CostTuple)[] = ["armAuthoredLoc", "authoringElapsedMs", "suiteMedianMs"];
  const tLeq = axes.every((axis) => t[axis] <= s[axis]);
  const tLt = axes.some((axis) => t[axis] < s[axis]);
  const sLeq = axes.every((axis) => s[axis] <= t[axis]);
  const sLt = axes.some((axis) => s[axis] < t[axis]);
  if (tLeq && tLt) return "T_DOMINATES";
  if (sLeq && sLt) return "S_DOMINATES";
  return "NON_DOMINATED_PAIR";
}

function decisionFromPareto(relation: ParetoRelation): FinalDecision {
  return relation === "T_DOMINATES" ? "ARM_T_CANDIDATE" : relation === "S_DOMINATES" ? "ARM_S_CANDIDATE" : "BOTH_ELIGIBLE_NO_WINNER";
}

export function closeDecision(view: VerifiedMatrixView, eligibilityByArm: { tla: ArmEligibility; ts: ArmEligibility }, costs?: EligiblePairCosts): DecisionResult {
  const sourceRefs = [view.inputSetIdentity, view.matrixIdentity];
  const tlaOk = eligibilityByArm.tla.kind === "Eligible";
  const tsOk = eligibilityByArm.ts.kind === "Eligible";
  let finalDecision: FinalDecision;
  let eligiblePairCosts: EligiblePairCosts | undefined;
  let pareto: ParetoRelation | undefined;
  if (tlaOk && tsOk) {
    if (!costs || !nonNegative(costs.tla) || !nonNegative(costs.ts)) return { kind: "EvaluationFailure", code: "MISSING_ELIGIBLE_PAIR_COSTS", findings: ["both arms eligible require complete non-negative cost tuples"], sourceRefs };
    eligiblePairCosts = costs;
    pareto = comparePareto(costs.tla, costs.ts);
    finalDecision = decisionFromPareto(pareto);
  } else finalDecision = tlaOk ? "ARM_T_CANDIDATE" : tsOk ? "ARM_S_CANDIDATE" : "BOTH_INELIGIBLE";
  const resultBody = { finalDecision, eligibilityByArm, eligiblePairCosts: eligiblePairCosts ?? null, pareto: pareto ?? null };
  const resultIdentity = canonicalIdentity({ inputSetIdentity: view.inputSetIdentity, matrixIdentity: view.matrixIdentity, algorithmVersion: view.algorithmVersion, result: resultBody }, ALGORITHM_VERSION).sha256;
  return { kind: "ValidDecision", eligibilityByArm, eligiblePairCosts, pareto, finalDecision, identity: { inputSetIdentity: view.inputSetIdentity, matrixIdentity: view.matrixIdentity, algorithmVersion: view.algorithmVersion, resultIdentity } };
}

export function assessAlloy(view: VerifiedMatrixView): AlloyAssessment {
  const misses: MissedContract[] = [];
  for (const cell of view.cells) {
    if (!cell.isBaseline && cell.verdict === "NOT_DETECTED" && cell.contractClass) misses.push({ alias: cell.subject, contractClass: cell.contractClass, arm: cell.arm, cellRef: cell.cellRef });
  }
  const classesByArm = new Map<ArmId, Set<string>>(ARMS.map((arm) => [arm, new Set<string>()]));
  for (const miss of misses) classesByArm.get(miss.arm)?.add(miss.contractClass);
  const commonBlindSpotClasses = [...(classesByArm.get("tla") ?? new Set<string>())].filter((klass) => classesByArm.get("ts")?.has(klass)).sort();
  return { misses, commonBlindSpotClasses, triggerState: misses.length > 0 ? "SEPARATE_DECISION_REQUIRED" : "NOT_TRIGGERED" };
}
