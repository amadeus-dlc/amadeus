// covers: function:resolveSensorsForStage, function:evaluateBlockingSensors
//
// t511 (unit) — Issue #2671 論点 (c): the `blocking` sensor severity, in its two
// pure layers.
//
//   1. CARRIAGE (amadeus-graph.ts resolveSensorsForStage): a manifest's
//      default_severity reaches the compiled stage node's sensors_applicable
//      row. The audit row is untouched by design (its 8-field contract is
//      pinned by t92), so the graph is the ONLY runtime carrier of severity —
//      a consumer that reads only SENSOR_* audit rows cannot tell an advisory
//      sensor from a blocking one.
//   2. DECISION (amadeus-state.ts evaluateBlockingSensors): given the blocking
//      sensor ids declared for a stage and the intent's audit text, decide
//      whether the stage may be completed. Fail-closed on every uncertainty:
//        - no SENSOR_FIRED for the sensor at this stage  -> never-fired
//        - a fired output whose latest terminal is not PASSED -> unresolved
//        - a fired output with no terminal at all        -> unresolved
//      A re-fire that PASSED after a FAILED resolves the output; the judgement
//      is per (Sensor ID, Output path), scoped to the stage by `Stage slug`.
//
// Both layers are driven in-process off the SHIPPED tree (dist/claude), the
// same seam discipline as t-phase-check-gate-seam: a stale dist reds here.
// This file is deliberately fs-free (inline manifests + inline JSONL audit
// text) so it classifies small; the fs-driven guard wiring and the approve
// path live in tests/integration/t511-blocking-sensor-gate.integration.test.ts.

import { describe, expect, test } from "bun:test";
import {
  resolveSensorsForStage,
  type SensorFile,
} from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import type { SensorSeverity } from "../../dist/claude/.claude/tools/amadeus-sensor-schema.ts";
import { evaluateBlockingSensors } from "../../dist/claude/.claude/tools/amadeus-state.ts";

// --- Layer 1 helpers: a minimal sensor roster -------------------------------

function sensorFile(id: string, severity: SensorSeverity): SensorFile {
  return {
    id,
    path: `.claude/sensors/amadeus-${id}.md`,
    manifest: {
      id,
      kind: "deterministic",
      command: `bun .claude/tools/amadeus-sensor-${id}.ts`,
      default_severity: severity,
      description: `t511 ${severity} sensor`,
      matches: "**/intents/**",
    },
  };
}

const ROSTER = new Map<string, SensorFile>([
  ["advisory-probe", sensorFile("advisory-probe", "advisory")],
  ["blocking-probe", sensorFile("blocking-probe", "blocking")],
]);

// resolveSensorsForStage only reads slug + sensors off the stage; the cast
// keeps the fixture to those two fields instead of hand-building a full
// GraphStage (30+ required fields) that the function never touches.
function stageWithSensors(sensors: string[]): Parameters<typeof resolveSensorsForStage>[0] {
  return { slug: "requirements-analysis", sensors } as Parameters<
    typeof resolveSensorsForStage
  >[0];
}

// --- Layer 2 helpers: inline audit records ----------------------------------

let seq = 0;
function auditLine(
  event: string,
  fields: Record<string, string>,
  timestamp: string,
): string {
  seq += 1;
  return JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "t511clone",
    intentId: "260810-t511-fixture",
    timestamp,
    heading: event,
    event,
    fields,
  });
}

function sensorRow(
  event: string,
  sensorId: string,
  outputPath: string,
  timestamp: string,
  stageSlug = "requirements-analysis",
): string {
  return auditLine(
    event,
    {
      "Fire id": timestamp.replace(/\D/g, "").slice(-8),
      "Sensor ID": sensorId,
      "Stage slug": stageSlug,
      "Output path": outputPath,
    },
    timestamp,
  );
}

const OUT = "amadeus/spaces/default/intents/260810-t511/inception/requirements-analysis/requirements.md";
const OUT2 = "amadeus/spaces/default/intents/260810-t511/inception/requirements-analysis/scan-notes.md";

describe("t511 — severity carriage through the compiled stage graph (#2671 c)", () => {
  test("a blocking manifest puts severity on its sensors_applicable row", () => {
    const rows = resolveSensorsForStage(stageWithSensors(["blocking-probe"]), ROSTER);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe("blocking-probe");
    expect(rows[0].severity).toBe("blocking");
  });

  test("an advisory manifest leaves severity absent (the framework default)", () => {
    const rows = resolveSensorsForStage(stageWithSensors(["advisory-probe"]), ROSTER);
    expect(rows).toHaveLength(1);
    expect(rows[0].severity).toBeUndefined();
  });

  test("a mixed roster carries severity per row, not per stage", () => {
    const rows = resolveSensorsForStage(
      stageWithSensors(["advisory-probe", "blocking-probe"]),
      ROSTER,
    );
    expect(rows.map((r) => r.severity)).toEqual([undefined, "blocking"]);
  });
});

describe("t511 — evaluateBlockingSensors decision table (#2671 c)", () => {
  test("no blocking sensors declared -> nothing to judge", () => {
    expect(evaluateBlockingSensors([], "", "requirements-analysis")).toBeNull();
  });

  test("latest terminal PASSED -> the stage may complete", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toBeNull();
  });

  test("latest terminal FAILED -> unresolved, naming the sensor and output", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_FAILED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
    ].join("\n");
    const finding = evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
    );
    expect(finding).not.toBeNull();
    expect(finding?.kind).toBe("unresolved");
    expect(finding?.sensorId).toBe("blocking-probe");
    expect(finding?.kind === "unresolved" ? finding.outputPath : "").toBe(OUT);
    expect(finding?.kind === "unresolved" ? finding.terminal : "").toBe("SENSOR_FAILED");
  });

  test("a re-fire that PASSED resolves an earlier FAILED on the same output", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_FAILED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T02:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T02:00:01Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toBeNull();
  });

  test("a PASSED output does not excuse a FAILED sibling output", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT2, "2026-08-10T01:00:02Z"),
      sensorRow("SENSOR_FAILED", "blocking-probe", OUT2, "2026-08-10T01:00:03Z"),
    ].join("\n");
    const finding = evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
    );
    expect(finding?.kind === "unresolved" ? finding.outputPath : "").toBe(OUT2);
  });

  test("a fire with no terminal row is unresolved, not a pass", () => {
    const audit = sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z");
    const finding = evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
    );
    expect(finding?.kind).toBe("unresolved");
    expect(finding?.kind === "unresolved" ? finding.terminal : "x").toBeNull();
  });

  test("SENSOR_BUDGET_OVERRIDE closes the pair but is not a pass", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_BUDGET_OVERRIDE", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
    ].join("\n");
    const finding = evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
    );
    expect(finding?.kind === "unresolved" ? finding.terminal : "").toBe(
      "SENSOR_BUDGET_OVERRIDE",
    );
  });

  test("never fired for this stage -> fail-closed refusal (未発火 = fail-closed)", () => {
    const audit = sensorRow(
      "SENSOR_PASSED",
      "blocking-probe",
      OUT,
      "2026-08-10T01:00:01Z",
      "functional-design",
    );
    const finding = evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
    );
    expect(finding?.kind).toBe("never-fired");
    expect(finding?.sensorId).toBe("blocking-probe");
  });

  test("an empty audit is never-fired, not a vacuous pass", () => {
    expect(
      evaluateBlockingSensors(["blocking-probe"], "", "requirements-analysis")?.kind,
    ).toBe("never-fired");
  });

  test("an advisory sensor's FAILED is invisible to the gate (only declared ids judged)", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "advisory-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_FAILED", "advisory-probe", OUT, "2026-08-10T01:00:01Z"),
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:02Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:03Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toBeNull();
  });

  test("same-timestamp FAILED and PASSED resolve to the failure (fail-closed tie-break)", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_FAILED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis")?.kind,
    ).toBe("unresolved");
  });
});
