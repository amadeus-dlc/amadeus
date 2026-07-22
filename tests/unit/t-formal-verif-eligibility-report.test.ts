import { describe, expect, test } from "bun:test";
import type { ArmId, Verdict } from "../../scripts/formal-verif/contract.ts";
import {
  ALGORITHM_VERSION,
  type AlloyAssessment,
  type MeasuredCell,
  type VerifiedMatrixView,
  assessAlloy,
  closeDecision,
} from "../../scripts/formal-verif/eligibility.ts";
import {
  type ReportModel,
  type ReversalConditionMapping,
  type ReversalSource,
  type TraceIndexEntry,
  buildReportModel,
  renderReport,
  verifyReversalMappings,
  verifyTrace,
} from "../../scripts/formal-verif/eligibility-report.ts";

const BASELINE = "HEALTHY_BASELINE";
const cell = (arm: ArmId, subject: string, verdict: Verdict): MeasuredCell => ({ arm, subject, runNo: 1, isBaseline: subject === BASELINE, verdict, contractClass: subject === BASELINE ? null : `class-${subject}`, cellRef: `${arm}\0${subject}` });
const eligibleArm = (arm: ArmId): MeasuredCell[] => [cell(arm, BASELINE, "NOT_DETECTED"), cell(arm, "fx-0", "DETECTED")];
const viewOf = (cells: readonly MeasuredCell[]): VerifiedMatrixView => ({ algorithmVersion: ALGORITHM_VERSION, inputSetIdentity: "a".repeat(64), matrixIdentity: "b".repeat(64), baselineSubject: BASELINE, cells });

const source: ReversalSource = { sourceIdentity: "grill".padEnd(64, "0"), conditions: [{ sourceIdentity: "grill".padEnd(64, "0"), ordinal: 1, textHash: "t1".padEnd(64, "0") }, { sourceIdentity: "grill".padEnd(64, "0"), ordinal: 2, textHash: "t2".padEnd(64, "0") }] };
const fullMappings = (): ReversalConditionMapping[] => source.conditions.map((condition) => ({ condition, supports: [`${condition.ordinal}-cell`], refutes: [] }));

function fixtureModel(cells: readonly MeasuredCell[] = [...eligibleArm("tla"), ...eligibleArm("ts")]): ReportModel {
  const view = viewOf(cells);
  const decision = closeDecision(view, { tla: { kind: "Eligible", arm: "tla" }, ts: { kind: "Eligible", arm: "ts" } }, { tla: { armAuthoredLoc: 10, authoringElapsedMs: 20, suiteMedianMs: 30 }, ts: { armAuthoredLoc: 20, authoringElapsedMs: 20, suiteMedianMs: 30 } });
  const alloy: AlloyAssessment = assessAlloy(view);
  return buildReportModel({ view, decision, alloy, reversalMappings: fullMappings() });
}

function traceOf(model: ReportModel): TraceIndexEntry[] {
  return model.rows.map((row) => ({ reportRowId: row.rowId, semanticKey: row.semanticKey, commandReceipt: `cmd:${row.rowId}`, ciRunJob: "ci:run/job", artifactRef: `artifact:${row.rowId}`, contentHash: row.contentHash }));
}

describe("reversal-condition mappings", () => {
  test("a complete bijection with non-empty refs verifies", () => {
    expect(verifyReversalMappings(source, fullMappings()).ok).toBe(true);
  });
  test("an unmapped source condition is rejected", () => {
    expect(verifyReversalMappings(source, fullMappings().slice(0, 1)).ok).toBe(false);
  });
  test("an invented condition ordinal outside the source is rejected", () => {
    const mappings = [...fullMappings(), { condition: { sourceIdentity: source.sourceIdentity, ordinal: 99, textHash: "t9".padEnd(64, "0") }, supports: ["x"], refutes: [] }];
    expect(verifyReversalMappings(source, mappings).ok).toBe(false);
  });
  test("a text hash drift on a mapped condition is rejected", () => {
    const mappings = fullMappings();
    mappings[0] = { ...mappings[0]!, condition: { ...mappings[0]!.condition, textHash: "drift".padEnd(64, "0") } };
    expect(verifyReversalMappings(source, mappings).ok).toBe(false);
  });
  test("a source identity drift is rejected", () => {
    const mappings = fullMappings();
    mappings[0] = { ...mappings[0]!, condition: { ...mappings[0]!.condition, sourceIdentity: "other".padEnd(64, "0") } };
    expect(verifyReversalMappings(source, mappings).ok).toBe(false);
  });
  test("an empty support/refute mapping is rejected", () => {
    const mappings = fullMappings();
    mappings[0] = { ...mappings[0]!, supports: [], refutes: [] };
    expect(verifyReversalMappings(source, mappings).ok).toBe(false);
  });
});

describe("trace verification", () => {
  test("a complete trace index over every row verifies", () => {
    const model = fixtureModel();
    expect(verifyTrace(model, traceOf(model)).kind).toBe("VerifiedTraceIndex");
  });
  test("a missing row trace is invalid", () => {
    const model = fixtureModel();
    expect(verifyTrace(model, traceOf(model).slice(1)).kind).toBe("InvalidTraceIndex");
  });
  test("a content hash drift is detected", () => {
    const model = fixtureModel();
    const trace = traceOf(model);
    trace[0] = { ...trace[0]!, contentHash: "drift".padEnd(64, "0") };
    const result = verifyTrace(model, trace);
    expect(result.kind === "InvalidTraceIndex" && result.findings.some((finding) => finding.startsWith("hash drift"))).toBe(true);
  });
  test("an incomplete source ref is detected", () => {
    const model = fixtureModel();
    const trace = traceOf(model);
    trace[0] = { ...trace[0]!, artifactRef: "" };
    expect(verifyTrace(model, trace).kind).toBe("InvalidTraceIndex");
  });
  test("an orphan trace entry is detected", () => {
    const model = fixtureModel();
    const trace = [...traceOf(model), { reportRowId: "z".repeat(64), semanticKey: "orphan", commandReceipt: "c", ciRunJob: "j", artifactRef: "a", contentHash: "h" }];
    expect(verifyTrace(model, trace).kind).toBe("InvalidTraceIndex");
  });
});

describe("report rendering", () => {
  test("a verified model renders JSON and Markdown copying the final decision", () => {
    const model = fixtureModel();
    const rendered = renderReport(model, verifyTrace(model, traceOf(model)));
    expect(rendered.ok).toBe(true);
    expect(rendered.ok && rendered.value.markdown).toContain("Final decision: ARM\\_T\\_CANDIDATE");
    expect(rendered.ok && rendered.value.canonicalJson.byteLength > 0).toBe(true);
  });
  test("an unverified trace blocks publish with a ReportFailure", () => {
    const model = fixtureModel();
    const failure = renderReport(model, verifyTrace(model, traceOf(model).slice(1)));
    expect(failure.ok).toBe(false);
    expect(!failure.ok && failure.error.code).toBe("UNVERIFIED_TRACE");
  });
  test("markdown escapes table and control characters from row content", () => {
    const model = fixtureModel([cell("tla", "fx-|<x", "DETECTED"), cell("tla", BASELINE, "NOT_DETECTED"), ...eligibleArm("ts")]);
    const rendered = renderReport(model, verifyTrace(model, traceOf(model)));
    expect(rendered.ok).toBe(true);
    if (!rendered.ok) return;
    expect(rendered.value.markdown).toContain("\\|");
    expect([...rendered.value.markdown].every((char) => char.codePointAt(0)! >= 0x20 || char === "\n")).toBe(true);
  });
});
