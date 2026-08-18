// covers: function:resolveSensorsForStage, function:evaluateBlockingSensors, file:packages/framework/core/tools/amadeus-sensor.ts
//
// t511 (unit) — Issue #2671 item (c): the `blocking` sensor severity, in its two
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
//      A fire invalidates that output's previous terminal (the artifact
//      changed), so a re-fire that PASSED resolves an earlier FAILED while a
//      re-fire still in flight reopens an earlier PASSED. The judgement is per
//      (Sensor ID, Output path), scoped to the stage by `Stage slug`.
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
import {
  digestFile,
  resolveScriptPath,
  spawnFailedOutcome,
} from "../../dist/claude/.claude/tools/amadeus-sensor.ts";

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

function v2AuditLine(
  event: string,
  attributes: Record<string, unknown>,
  timestamp: string,
): string {
  seq += 1;
  return JSON.stringify({
    schemaVersion: 2,
    eventId: `evt-${seq}`,
    seq,
    timestamp,
    eventName: `amadeus.sensor.${event.toLowerCase()}`,
    attributes: { Event: event, ...attributes },
    intentId: "260810-t511-fixture",
    space: "default",
    cloneId: "t511clone",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: `260810-t511-fixture:t511clone:${seq}`,
    canonical: true,
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
  test("a projected plugin sensor command resolves inside the plugin subtree", () => {
    expect(resolveScriptPath(
      "bun .claude/plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts",
    )).toEndWith(
      "/dist/claude/.claude/plugins/github-pr-convergence/tools/amadeus-sensor-pr-convergence-report-format.ts",
    );
  });

  test("the test seam overrides projected host-tool commands by basename", () => {
    const previous = process.env.AMADEUS_SENSOR_SCRIPT_DIR;
    process.env.AMADEUS_SENSOR_SCRIPT_DIR = "/tmp/t511-sensor-scripts";
    try {
      expect(resolveScriptPath(
        "bun .claude/tools/amadeus-sensor-stub-pass.ts",
      )).toBe("/tmp/t511-sensor-scripts/amadeus-sensor-stub-pass.ts");
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_SENSOR_SCRIPT_DIR;
      else process.env.AMADEUS_SENSOR_SCRIPT_DIR = previous;
    }
  });

  test("a {{HARNESS_DIR}}/ placeholder command resolves relative to the harness root", () => {
    const previous = process.env.AMADEUS_SENSOR_SCRIPT_DIR;
    delete process.env.AMADEUS_SENSOR_SCRIPT_DIR;
    try {
      expect(resolveScriptPath(
        "bun {{HARNESS_DIR}}/tools/amadeus-sensor-placeholder-probe.ts",
      )).toEndWith("/dist/claude/.claude/tools/amadeus-sensor-placeholder-probe.ts");
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_SENSOR_SCRIPT_DIR;
      else process.env.AMADEUS_SENSOR_SCRIPT_DIR = previous;
    }
  });

  test("a bare script command with no directory falls back to sibling resolution", () => {
    const previous = process.env.AMADEUS_SENSOR_SCRIPT_DIR;
    delete process.env.AMADEUS_SENSOR_SCRIPT_DIR;
    try {
      expect(resolveScriptPath(
        "bun amadeus-sensor-bare-probe.ts",
      )).toEndWith("/dist/claude/.claude/tools/amadeus-sensor-bare-probe.ts");
    } finally {
      if (previous === undefined) delete process.env.AMADEUS_SENSOR_SCRIPT_DIR;
      else process.env.AMADEUS_SENSOR_SCRIPT_DIR = previous;
    }
  });

  test("a vanished output hashes to a deterministic missing marker", () => {
    expect(digestFile("/definitely/missing/t511-output.md")).toBe("missing");
  });

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

  test("a digest-bound PASS becomes stale when the output bytes change", () => {
    const digest = `sha256:${"a".repeat(64)}`;
    const fields = {
      "Fire id": "digest01",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      "Output digest": digest,
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", { ...fields, "Duration ms": "1" }, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis", () => digest)).toBeNull();
    expect(evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
      () => `sha256:${"b".repeat(64)}`,
    )?.kind).toBe("stale");
  });

  test("a later passed output supersedes a passed path removed by an artifact move", () => {
    const oldDigest = `sha256:${"a".repeat(64)}`;
    const newDigest = `sha256:${"b".repeat(64)}`;
    const oldFields = {
      "Fire id": "old-path",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      "Output digest": oldDigest,
    };
    const newFields = {
      "Fire id": "new-path",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT2,
      "Output digest": newDigest,
    };
    const audit = [
      auditLine("SENSOR_FIRED", oldFields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", oldFields, "2026-08-10T01:00:01Z"),
      auditLine("SENSOR_FIRED", newFields, "2026-08-10T02:00:00Z"),
      auditLine("SENSOR_PASSED", newFields, "2026-08-10T02:00:01Z"),
    ].join("\n");
    expect(evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
      (path) => path === OUT2 ? newDigest : null,
    )).toBeNull();
  });

  test("an absent output remains stale without a newer passed path", () => {
    const digest = `sha256:${"a".repeat(64)}`;
    const fields = {
      "Fire id": "only-path",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      "Output digest": digest,
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", fields, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
      () => null,
    )?.kind).toBe("stale");
  });

  test("a legacy PASS without a digest must be re-fired before completion", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(evaluateBlockingSensors(
      ["blocking-probe"],
      audit,
      "requirements-analysis",
      () => `sha256:${"a".repeat(64)}`,
    )?.kind).toBe("stale");
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

  test("a re-fire after a PASSED reopens the output until its own terminal lands", () => {
    // PASSED → FIRED with no terminal yet: the artifact was edited again and the
    // re-fire is still in flight. Reading the stale PASSED would approve a stage
    // whose newest verdict does not exist yet.
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T02:00:00Z"),
    ].join("\n");
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

  test("SENSOR_PASSED with Note script-error: exit-2 is not a pass (#2988)", () => {
    const fields = {
      "Fire id": "exit2",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      Note: "script-error: exit-2",
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", fields, "2026-08-10T01:00:01Z"),
    ].join("\n");
    const finding = evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis");
    expect(finding).toEqual({
      kind: "script-error",
      sensorId: "blocking-probe",
      outputPath: OUT,
      note: "script-error: exit-2",
    });
  });

  test("spawn-failed remains a distinct script-error and is rejected by the blocking gate (#3029)", () => {
    const outcome = spawnFailedOutcome("ENOENT", 1);
    expect(outcome.kind).toBe("passed");
    if (outcome.kind !== "passed") throw new Error("spawnFailedOutcome must produce a passed audit outcome");
    expect(outcome).toEqual({
      kind: "passed",
      durationMs: 1,
      note: "script-error: spawn-failed: ENOENT",
    });
    const note = outcome.note ?? "";
    expect(note).toBe("script-error: spawn-failed: ENOENT");
    const fields = {
      "Fire id": "spawn-failed",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      Note: note,
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", fields, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis")).toEqual({
      kind: "script-error",
      sensorId: "blocking-probe",
      outputPath: OUT,
      note: "script-error: spawn-failed: ENOENT",
    });
  });

  test("SENSOR_PASSED with Note script-error: bad-output is not a pass (#2988)", () => {
    const fields = {
      "Fire id": "badout",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      Note: "script-error: bad-output",
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", fields, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis")?.kind,
    ).toBe("script-error");
  });

  test("SENSOR_PASSED with a non-string v2 Note fails closed (#2988)", () => {
    const fields = {
      "Fire id": "malformed-note",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      v2AuditLine(
        "SENSOR_PASSED",
        { ...fields, Note: { diagnostic: "script-error: exit-2" } },
        "2026-08-10T01:00:01Z",
      ),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toEqual({
      kind: "script-error",
      sensorId: "blocking-probe",
      outputPath: OUT,
      note: "script-error: note-unreadable",
    });
  });

  test("SENSOR_PASSED with Note tool-unavailable fails closed for blocking sensors (#3029)", () => {
    const fields = {
      "Fire id": "tu127",
      "Sensor ID": "blocking-probe",
      "Stage slug": "requirements-analysis",
      "Output path": OUT,
      Note: "tool-unavailable",
    };
    const audit = [
      auditLine("SENSOR_FIRED", fields, "2026-08-10T01:00:00Z"),
      auditLine("SENSOR_PASSED", fields, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toEqual({
      kind: "tool-unavailable",
      sensorId: "blocking-probe",
      outputPath: OUT,
      note: "tool-unavailable",
    });
  });

  test("note-less SENSOR_PASSED remains a pass (#2988)", () => {
    const audit = [
      sensorRow("SENSOR_FIRED", "blocking-probe", OUT, "2026-08-10T01:00:00Z"),
      sensorRow("SENSOR_PASSED", "blocking-probe", OUT, "2026-08-10T01:00:01Z"),
    ].join("\n");
    expect(
      evaluateBlockingSensors(["blocking-probe"], audit, "requirements-analysis"),
    ).toBeNull();
  });
});
