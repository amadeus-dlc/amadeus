import { describe, expect, test } from "bun:test";
import type { CellResult, Verdict } from "../../scripts/formal-verif/contract.ts";
import type { DCount } from "../../scripts/formal-verif/fixture-registry-domain.ts";
import type { PromotedFixtureManifest } from "../../scripts/formal-verif/fixture-registry.ts";
import type { MonotonicClock, SuiteRunResult, VerifiedExecutionReceipt } from "../../scripts/formal-verif/execution-evidence.ts";
import {
  aggregateTiming,
  buildMatrixEvidence,
  compileInputSet,
  compileSchedule,
  HEALTHY_BASELINE,
  MATRIX_INTEGRATION_STATUS,
  runFullMatrix,
  verifyFullMatrix,
  type ScheduleEntry,
  type SuiteRunnerPort,
} from "../../scripts/formal-verif/full-matrix.ts";

const sha = (seed: string) => seed.padEnd(64, "0").slice(0, 64);
const manifest = (dCount: DCount, aliases: string[], overrides: Partial<PromotedFixtureManifest> = {}): PromotedFixtureManifest => ({
  schemaVersion: 1,
  baselineSha: sha("base"),
  dCount,
  orderedEntries: aliases.map((fixtureAlias) => ({ fixtureAlias }) as PromotedFixtureManifest["orderedEntries"][number]),
  universeIdentity: sha("universe"),
  promotionPermissionIdentity: sha("perm"),
  manifestIdentity: sha("manifest"),
  ...overrides,
});
const aliases7 = ["fx-a", "fx-b", "fx-c", "fx-d", "fx-e", "fx-f", "fx-g"];
const aliases5 = ["fx-a", "fx-b", "fx-c", "fx-d", "fx-e"];

const clock = (): MonotonicClock => { let t = 0; return { nowMs: () => (t += 1000), utcNow: () => "2026-07-20T00:00:00Z" }; };
const cell = (arm: "tla" | "ts", subject: string, verdict: Verdict): CellResult => ({ schemaVersion: 1, arm, fixtureId: subject, baselineSha: sha("base"), armSha: sha(arm), verdict, exitCode: 0, toolVersions: {}, seedOrBound: {}, startedAt: "2026-07-20T00:00:00Z", finishedAt: "2026-07-20T00:00:01Z", counterexampleId: verdict === "DETECTED" ? sha(`cx-${subject}`) : null, evidencePaths: [] });
const receipt = (id: string): VerifiedExecutionReceipt => ({ kind: "VerifiedExecutionReceipt", bundleId: sha(id), envelopeHash: sha("env"), runnerHead: "r", storeHead: "s", runnerSequence: 0, storeSequence: 0 });

function fakeRunner(options: { verdictFor?: (entry: ScheduleEntry, subject: string) => Verdict; durationFor?: (entry: ScheduleEntry) => number; incompleteOrdinals?: readonly number[] } = {}): SuiteRunnerPort {
  const verdictFor = options.verdictFor ?? (() => "DETECTED");
  const durationFor = options.durationFor ?? ((entry) => (entry.sample.kind === "WARMUP" ? 5 : (entry.arm === "tla" ? 100 : 200) + entry.sample.runNo));
  return {
    run: async (entry, subjects): Promise<SuiteRunResult> => {
      if (options.incompleteOrdinals?.includes(entry.globalOrdinal)) {
        return { kind: "IncompleteSuite", receipts: [], results: [], missingSubjects: [...subjects], findings: [{ kind: "SUITE_TIMEOUT", subject: subjects[0]!, cause: "deadline reached" }], durationMs: 120_000 };
      }
      return { kind: "CompleteSuite", receipts: subjects.map((s) => receipt(`${entry.globalOrdinal}-${s}`)), results: subjects.map((s) => cell(entry.arm, s, verdictFor(entry, s))), durationMs: durationFor(entry) };
    },
  };
}

async function completeRun(dCount: DCount, aliases: string[], runner = fakeRunner()) {
  const inputSet = compileInputSet(manifest(dCount, aliases), sha("base"));
  if (!inputSet.ok) throw new Error(inputSet.error.message);
  const schedule = compileSchedule(inputSet.value.inputSetIdentity);
  if (!schedule.ok) throw new Error(schedule.error.message);
  const run = await runFullMatrix(schedule.value, inputSet.value, { clock: clock(), runner });
  return { inputSet: inputSet.value, schedule: schedule.value, run };
}

describe("full-matrix input set", () => {
  test("D-COUNT 7 yields baseline-first 8 subjects in manifest order", () => {
    const result = compileInputSet(manifest(7, aliases7), sha("base"));
    expect(result.ok && result.value.orderedSubjects).toEqual([HEALTHY_BASELINE, ...aliases7]);
    expect(result.ok && result.value.orderedSubjects.length).toBe(8);
  });
  test("D-COUNT 5 yields 6 subjects", () => {
    const result = compileInputSet(manifest(5, aliases5), sha("base"));
    expect(result.ok && result.value.orderedSubjects.length).toBe(6);
  });
  test("entry count not matching D-COUNT is rejected", () => {
    const result = compileInputSet(manifest(7, aliases5), sha("base"));
    expect(result.ok).toBe(false);
  });
  test("baseline SHA mismatch is rejected", () => {
    const result = compileInputSet(manifest(7, aliases7), sha("other"));
    expect(result.ok).toBe(false);
  });
  test("alias colliding with the baseline is rejected", () => {
    const result = compileInputSet(manifest(7, [HEALTHY_BASELINE, ...aliases7.slice(1)]), sha("base"));
    expect(result.ok).toBe(false);
  });
  test("duplicate aliases are rejected", () => {
    const result = compileInputSet(manifest(7, ["fx-a", "fx-a", "fx-c", "fx-d", "fx-e", "fx-f", "fx-g"]), sha("base"));
    expect(result.ok).toBe(false);
  });
});

describe("full-matrix schedule", () => {
  test("compiles 12 hash-derived entries with warmup opposite->first and 3:2 measured bias", () => {
    const inputSet = compileInputSet(manifest(7, aliases7), sha("base"));
    const schedule = inputSet.ok ? compileSchedule(inputSet.value.inputSetIdentity) : { ok: false as const, error: { kind: "ScheduleError" as const, message: "" } };
    expect(schedule.ok).toBe(true);
    if (!schedule.ok) return;
    const s = schedule.value;
    expect(s.entries.length).toBe(12);
    expect(s.entries[0]!.arm).toBe(s.leadBias.opposite);
    expect(s.entries[0]!.sample).toEqual({ kind: "WARMUP", runNo: 0 });
    expect(s.entries[1]!.arm).toBe(s.firstArm);
    // measured run 1 (odd) leads with firstArm, run 2 (even) leads with opposite
    expect(s.entries[2]!.arm).toBe(s.firstArm);
    expect(s.entries[4]!.arm).toBe(s.leadBias.opposite);
    expect(s.leadBias.firstPositions).toBe(3);
    expect(s.leadBias.oppositePositions).toBe(2);
    expect(s.entries.every((e, i) => e.globalOrdinal === i)).toBe(true);
    expect(new Set(s.entries.map((e) => e.entryIdentity)).size).toBe(12);
  });
  test("non-SHA input set identity is rejected", () => {
    expect(compileSchedule("not-a-hash").ok).toBe(false);
  });
});

describe("full-matrix validation and evidence", () => {
  test("complete run over D-COUNT 7 validates 96 cells with a valid receipt chain", async () => {
    const { inputSet, schedule, run } = await completeRun(7, aliases7);
    expect(run.receipts.length).toBe(12);
    expect(run.receipts[0]!.predecessorReceiptIdentity).toBeNull();
    expect(run.receipts[1]!.predecessorReceiptIdentity).toBe(run.receipts[0]!.receiptIdentity);
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    expect(matrix.kind).toBe("CompleteMatrix");
    expect(matrix.kind === "CompleteMatrix" && matrix.expectedCellCount).toBe(96);
  });
  test("complete run over D-COUNT 5 validates 72 cells", async () => {
    const { inputSet, schedule, run } = await completeRun(5, aliases5);
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    expect(matrix.kind === "CompleteMatrix" && matrix.expectedCellCount).toBe(72);
  });
  test("a schedule bound to a different input set is INPUT_DRIFT, not CompleteMatrix", async () => {
    // Third-review repro (E-FVEU7NFR1 residual Major 1): identical subjects but a
    // foreign manifest identity used to validate as CompleteMatrix because the
    // validator never compared the schedule's input-set binding.
    const { schedule, run } = await completeRun(7, aliases7);
    const foreign = compileInputSet(manifest(7, aliases7, { manifestIdentity: sha("other-manifest") }), sha("base"));
    if (!foreign.ok) throw new Error(foreign.error.message);
    const matrix = verifyFullMatrix(foreign.value, schedule, run);
    expect(matrix.kind).toBe("IncompleteMatrix");
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.map((f) => f.kind)).toEqual(["INPUT_DRIFT"]);
  });
  test("a run bound to a different schedule is INPUT_DRIFT", async () => {
    const { inputSet, schedule, run } = await completeRun(7, aliases7);
    const drifted = { ...run, scheduleId: sha("other-schedule") };
    const matrix = verifyFullMatrix(inputSet, schedule, drifted);
    expect(matrix.kind).toBe("IncompleteMatrix");
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.some((f) => f.kind === "INPUT_DRIFT")).toBe(true);
  });
  test("a timed-out suite produces a SUITE_TIMEOUT finding and blocks completion", async () => {
    const { inputSet, schedule, run } = await completeRun(7, aliases7, fakeRunner({ incompleteOrdinals: [3] }));
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    expect(matrix.kind).toBe("IncompleteMatrix");
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.some((f) => f.kind === "SUITE_TIMEOUT")).toBe(true);
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.some((f) => f.kind === "MISSING")).toBe(true);
  });
  test("a HARNESS_ERROR cell is preserved as a finding, not rounded to a verdict", async () => {
    const runner = fakeRunner({ verdictFor: (entry, subject) => (entry.globalOrdinal === 2 && subject === HEALTHY_BASELINE ? "HARNESS_ERROR" : "DETECTED") });
    const { inputSet, schedule, run } = await completeRun(7, aliases7, runner);
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.some((f) => f.kind === "HARNESS_ERROR_CELL")).toBe(true);
  });
  test("disagreeing verdicts across 5 measured runs are NON_DETERMINISTIC", async () => {
    const runner = fakeRunner({ verdictFor: (entry, subject) => (entry.arm === "tla" && entry.sample.kind === "MEASURED" && entry.sample.runNo === 3 && subject === "fx-a" ? "NOT_DETECTED" : "DETECTED") });
    const { inputSet, schedule, run } = await completeRun(7, aliases7, runner);
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    expect(matrix.kind === "IncompleteMatrix" && matrix.findings.some((f) => f.kind === "NON_DETERMINISTIC")).toBe(true);
  });
  test("evidence binds a complete matrix and carries the U3/U4/U5 blocked status", async () => {
    const { inputSet, schedule, run } = await completeRun(7, aliases7);
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    const evidence = buildMatrixEvidence({ inputSet, schedule, run, matrix, costRefs: { locIdentities: [], elapsedIdentities: [], timingIdentities: [] } });
    expect(evidence.ok && evidence.value.status).toBe(MATRIX_INTEGRATION_STATUS);
    expect(evidence.ok && /^[0-9a-f]{64}$/.test(evidence.value.evidenceIdentity)).toBe(true);
  });
  test("evidence cannot be built from an incomplete matrix", async () => {
    const { inputSet, schedule, run } = await completeRun(7, aliases7, fakeRunner({ incompleteOrdinals: [5] }));
    const matrix = verifyFullMatrix(inputSet, schedule, run);
    const evidence = buildMatrixEvidence({ inputSet, schedule, run, matrix, costRefs: { locIdentities: [], elapsedIdentities: [], timingIdentities: [] } });
    expect(evidence.ok).toBe(false);
  });
});

describe("full-matrix timing", () => {
  test("five complete measured suites yield the sorted index-2 median with its source run", async () => {
    const { schedule, run } = await completeRun(7, aliases7);
    const timing = aggregateTiming("tla", run, 7000);
    // tla measured durations = 101..105 -> sorted median index 2 = 103 (run 3)
    expect(timing.kind).toBe("CompleteTimingAggregate");
    expect(timing.kind === "CompleteTimingAggregate" && timing.medianMs).toBe(103);
    expect(timing.kind === "CompleteTimingAggregate" && timing.medianSourceRunNo).toBe(3);
    expect(timing.kind === "CompleteTimingAggregate" && timing.preparationRawMs).toBe(7000);
    expect(schedule.entries.length).toBe(12);
  });
  test("an incomplete measured suite produces no median", async () => {
    const { run } = await completeRun(7, aliases7, fakeRunner({ incompleteOrdinals: [2] }));
    const timing = aggregateTiming(run.outcomes[2]!.suite.entry.arm, run, 0);
    expect(timing.kind).toBe("IncompleteTimingAggregate");
    expect("medianMs" in timing).toBe(false);
  });
});
