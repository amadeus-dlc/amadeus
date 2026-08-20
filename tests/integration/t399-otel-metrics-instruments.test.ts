// covers: otel:metrics-instruments otel:bootstrap otel:resource-suppliers
// size: medium
//
// U5 (metrics) — the five measurement call sites (#1868 §6) and the wiring that
// makes them fire: the bootstrap's metrics arm, the canonical-event observer
// that derives four of the five, and the harness token-usage seam that supplies
// the fifth. Touches the real filesystem (Signal Stores, cross-process duration
// markers, a spawned hook) so it lives here rather than in the unit layer.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ensureMeterBootstrap, ensureOtelBootstrap } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { birthIntent, docsRoot, recordDir } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitEvent } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetObservabilityConfigCache } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { registeredMeterProjectDir } from "../../dist/claude/.claude/otel/meter-provider.ts";
import {
  markDurationStart,
  observeCanonicalEventForMetrics,
  reclaimStaleDurationMarkers,
  recordGateIteration,
  recordOperationFailure,
  recordStageDuration,
  recordSubagentDuration,
  recordTokenUsage,
  takeDurationStart,
} from "../../dist/claude/.claude/otel/metrics-instruments.ts";
import { runRelay } from "../../dist/claude/.claude/otel/relay.ts";
import { instrumentDef } from "../../dist/claude/.claude/otel/metrics-vocabulary.ts";
import type { InstrumentName } from "../../dist/claude/.claude/otel/metrics-vocabulary.ts";
import { supplyTokenUsage } from "../../dist/claude/.claude/otel/resource-suppliers.ts";
// The canonical copy, driven in-process alongside the shipped one: the shipped
// tree is what a harness runs, but only the canonical tree is what CI measures
// for coverage, and these are two module graphs with two sets of singletons.
import { ensureOtelBootstrap as ensureOtelBootstrapSrc } from "../../packages/framework/core/otel/bootstrap.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  markDurationStart as markDurationStartSrc,
  observeCanonicalEventForMetrics as observeSrc,
  takeDurationStart as takeDurationStartSrc,
} from "../../packages/framework/core/otel/metrics-instruments.ts";
import { AMADEUS_SRC, cleanupTestProject, createTestProject, FIXTURES_DIR } from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  resetOtelPerProject();
  birthIntent(proj, "otel-u5-metrics", "default", "feature");
});
afterEach(() => {
  cleanupTestProject(proj);
  resetOtelPerProject();
});

function metricRecords(): Record<string, unknown>[] {
  const dir = join(docsRoot(proj)!, ".amadeus-otel");
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return [];
  }
  const records: Record<string, unknown>[] = [];
  for (const name of names.sort()) {
    if (!name.startsWith("metrics-") || !name.endsWith(".jsonl")) continue;
    for (const line of readFileSync(join(dir, name), "utf-8").split("\n")) {
      if (line !== "") records.push(JSON.parse(line) as Record<string, unknown>);
    }
  }
  return records;
}

function measurementsOf(name: string): Record<string, unknown>[] {
  return metricRecords().filter((record) => record.name === name);
}

describe("the metrics arm stands up with the canonical emit path (FR-MET, #1868 §6)", () => {
  test("bootstrapping the logs arm registers a Meter for the same workspace", () => {
    expect(registeredMeterProjectDir()).toBeNull();
    ensureOtelBootstrap(proj);
    expect(registeredMeterProjectDir()).toBe(proj);
  });

  test("a second bootstrap for a DIFFERENT workspace is refused, nothing re-registered", () => {
    ensureMeterBootstrap(proj);
    const other = createTestProject();
    try {
      expect(() => ensureMeterBootstrap(other)).toThrow(/metrics already bootstrapped/);
      expect(registeredMeterProjectDir()).toBe(proj);
    } finally {
      cleanupTestProject(other);
    }
  });

  test("re-bootstrapping the same workspace is a no-op, not a double registration", () => {
    ensureMeterBootstrap(proj);
    expect(() => ensureMeterBootstrap(proj)).not.toThrow();
    expect(registeredMeterProjectDir()).toBe(proj);
  });
});

describe("every instrument records through the store (FR-MET)", () => {
  beforeEach(() => {
    ensureOtelBootstrap(proj);
  });

  test("the four canonical-derived instruments each write one record with their dimensions", () => {
    recordStageDuration(1234, { stage: "code-generation", phase: "construction" });
    recordGateIteration({ stage: "code-generation" });
    recordOperationFailure({ operation: "Bash" });
    recordSubagentDuration(4321, { agentType: "amadeus-developer-agent" });

    expect(measurementsOf("amadeus.stage.duration")).toEqual([
      expect.objectContaining({
        kind: "histogram",
        value: 1234,
        attributes: { "amadeus.stage": "code-generation", "amadeus.phase": "construction" },
      }),
    ]);
    expect(measurementsOf("amadeus.gate.iterations")).toEqual([
      expect.objectContaining({ kind: "counter", value: 1, attributes: { "amadeus.stage": "code-generation" } }),
    ]);
    expect(measurementsOf("amadeus.operation.failures")).toEqual([
      expect.objectContaining({ kind: "counter", value: 1, attributes: { "amadeus.operation": "Bash" } }),
    ]);
    expect(measurementsOf("amadeus.subagent.duration")).toEqual([
      expect.objectContaining({
        kind: "histogram",
        value: 4321,
        attributes: { "amadeus.agent.type": "amadeus-developer-agent" },
      }),
    ]);
  });

  test("a duration the clock ran backwards on is clamped to zero, not recorded negative (r3695363611)", () => {
    // Both durations are a subtraction across two processes: the start is
    // parked in a marker file and the end reads its own clock. An NTP step or
    // a manual clock change between the halves makes that difference negative,
    // and a negative sample in a duration histogram is not a slow run — it is
    // an impossible one, and it poisons every aggregate computed over it.
    recordStageDuration(-5_000, { stage: "code-generation", phase: "construction" });
    recordSubagentDuration(-1, { agentType: "amadeus-developer-agent" });

    expect(measurementsOf("amadeus.stage.duration").map((record) => record.value)).toEqual([0]);
    expect(measurementsOf("amadeus.subagent.duration").map((record) => record.value)).toEqual([0]);
  });

  test("token usage splits into one observation per GenAI token type", () => {
    recordTokenUsage({ inputTokens: 900, outputTokens: 120, model: "claude-fable-5" });
    expect(measurementsOf("gen_ai.client.token.usage").map((record) => record.attributes)).toEqual([
      { "gen_ai.token.type": "input", "gen_ai.request.model": "claude-fable-5" },
      { "gen_ai.token.type": "output", "gen_ai.request.model": "claude-fable-5" },
    ]);
    expect(measurementsOf("gen_ai.client.token.usage").map((record) => record.value)).toEqual([900, 120]);
  });

  test("a harness that cannot name the model still records the counts (fail-open dimension)", () => {
    recordTokenUsage({ inputTokens: 5, outputTokens: 7 });
    expect(measurementsOf("gen_ai.client.token.usage").map((record) => record.attributes)).toEqual([
      { "gen_ai.token.type": "input" },
      { "gen_ai.token.type": "output" },
    ]);
  });

  test("no measurement carries a dimension outside its instrument's set", () => {
    recordStageDuration(1, { stage: "s", phase: "construction" });
    recordGateIteration({ stage: "s" });
    recordOperationFailure({ operation: "Bash" });
    recordSubagentDuration(1, { agentType: "a" });
    recordTokenUsage({ inputTokens: 1, outputTokens: 1, model: "m" });
    for (const record of metricRecords()) {
      const keys = Object.keys(record.attributes as Record<string, unknown>);
      const allowed = instrumentDef(record.name as InstrumentName).attributeKeys;
      expect(keys.filter((key) => !allowed.includes(key)), `${String(record.name)} leaked a dimension`).toEqual([]);
    }
  });
});

describe("no Meter means no measurement, never a throw (FR-MET)", () => {
  test("every instrument is a silent no-op before the metrics arm stands up", () => {
    expect(registeredMeterProjectDir()).toBeNull();
    expect(() => {
      recordStageDuration(10, { stage: "s", phase: "construction" });
      recordGateIteration({ stage: "s" });
      recordOperationFailure({ operation: "Bash" });
      recordSubagentDuration(10, { agentType: "a" });
      recordTokenUsage({ inputTokens: 1, outputTokens: 2, model: "m" });
    }).not.toThrow();
    expect(metricRecords()).toEqual([]);
  });
});

describe("a broken store degrades the measurement, never the caller (FR-EVT-6)", () => {
  test("an unwritable store swallows the write and later measurements still land", () => {
    ensureOtelBootstrap(proj);
    // Real injection rather than a stubbed writer: a plain file where the
    // store directory belongs makes the exporter's mkdir fail the way a
    // damaged workspace would.
    const storeDir = join(recordDir(proj)!, ".amadeus-otel");
    rmSync(storeDir, { recursive: true, force: true });
    writeFileSync(storeDir, "not a directory", "utf-8");
    expect(() => recordGateIteration({ stage: "code-generation" })).not.toThrow();
    expect(metricRecords()).toEqual([]);

    rmSync(storeDir);
    recordGateIteration({ stage: "code-generation" });
    expect(measurementsOf("amadeus.gate.iterations").length).toBe(1);
  });

  test("a measurement failure never reaches the emit that triggered it", () => {
    ensureOtelBootstrap(proj);
    const outcome = emitEvent("amadeus.stage.started", { Stage: "code-generation", Agent: "amadeus-developer-agent" });
    expect(outcome.appended).toBe(true);
  });
});

describe("durations pair across process boundaries (#1868 §6)", () => {
  test("a parked start instant is consumed exactly once", () => {
    markDurationStart(proj, "stage", "code-generation", 1_000);
    expect(takeDurationStart(proj, "stage", "code-generation")).toBe(1_000);
    expect(takeDurationStart(proj, "stage", "code-generation")).toBeNull();
  });

  test("a key that is not a legal filename still pairs", () => {
    markDurationStart(proj, "subagent", "../../etc/passwd", 42);
    expect(takeDurationStart(proj, "subagent", "../../etc/passwd")).toBe(42);
  });

  test("the markers are not Signal Store files — the Relay's selectors ignore them", () => {
    markDurationStart(proj, "stage", "code-generation", 1_000);
    const names = readdirSync(join(docsRoot(proj)!, ".amadeus-otel"));
    expect(names).toContain("pending-stage-code-generation.start");
    expect(names.filter((name) => name.endsWith(".jsonl"))).toEqual([]);
  });

  test("the real Relay selector ignores marker files", async () => {
    writeFileSync(
      join(proj, "amadeus", "config.json"),
      `${JSON.stringify({ observability: { enabled: true, otlp: { endpoint: "http://collector.test" } } })}\n`,
      "utf-8",
    );
    resetObservabilityConfigCache();
    markDurationStart(proj, "stage", "code-generation", Date.now());
    const posted: string[] = [];
    const summary = await runRelay(proj, {
      post: async (url) => {
        posted.push(url);
        return { ok: true, detail: "" };
      },
    });
    expect(summary.status).toBe("flushed");
    expect(summary.result?.sent).toBe(0);
    expect(posted).toEqual([]);
  });

  test("reclaims stale markers while preserving fresh markers", () => {
    const dir = join(docsRoot(proj)!, ".amadeus-otel");
    markDurationStart(proj, "stage", "stale", Date.now());
    const stalePath = join(dir, "pending-stage-stale.start");
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    utimesSync(stalePath, old, old);
    markDurationStart(proj, "stage", "fresh", Date.now());

    expect(() => reclaimStaleDurationMarkers(proj)).not.toThrow();
    expect(statSync(join(dir, "pending-stage-fresh.start")).mtimeMs).toBeGreaterThan(old.getTime());
    expect(() => statSync(stalePath)).toThrow();
  });

  test("reports marker cleanup failures loudly and continues", () => {
    const dir = join(docsRoot(proj)!, ".amadeus-otel");
    const blockedPath = join(dir, "pending-stage-blocked.start");
    mkdirSync(join(blockedPath, "child"), { recursive: true });
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    utimesSync(blockedPath, old, old);
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...parts: unknown[]) => errors.push(parts.join(" "));
    try {
      expect(() => reclaimStaleDurationMarkers(proj)).not.toThrow();
    } finally {
      console.error = originalError;
    }
    expect(statSync(blockedPath).isDirectory()).toBe(true);
    expect(errors.join("\n")).toContain("stale-marker cleanup skipped");
  });

  test("reports a sweep failure loudly and remains fail-open", () => {
    const originalError = console.error;
    const errors: string[] = [];
    console.error = (...parts: unknown[]) => errors.push(parts.join(" "));
    try {
      expect(() => reclaimStaleDurationMarkers(null as unknown as string)).not.toThrow();
    } finally {
      console.error = originalError;
    }
    expect(errors.join("\n")).toContain("stale-marker sweep skipped");
  });
});

describe("the canonical event observer derives four instruments (#1868 §6)", () => {
  beforeEach(() => {
    ensureOtelBootstrap(proj);
  });

  test("stage started then completed records one duration carrying the graph's phase", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.stage.started", { Stage: "code-generation", Agent: "developer" });
    observeCanonicalEventForMetrics(proj, "amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
    const measured = measurementsOf("amadeus.stage.duration");
    expect(measured.length).toBe(1);
    expect(measured[0]!.attributes).toEqual({ "amadeus.stage": "code-generation", "amadeus.phase": "construction" });
    expect(measured[0]!.value as number).toBeGreaterThanOrEqual(0);
  });

  test("a completion with no parked start measures nothing rather than guessing", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
    expect(measurementsOf("amadeus.stage.duration")).toEqual([]);
  });

  test("a stage absent from the graph records the duration without the phase dimension", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.stage.started", { Stage: "no-such-stage", Agent: "developer" });
    observeCanonicalEventForMetrics(proj, "amadeus.stage.completed", { Stage: "no-such-stage", Details: "done" });
    expect(measurementsOf("amadeus.stage.duration")[0]!.attributes).toEqual({ "amadeus.stage": "no-such-stage" });
  });

  test("a revision counts one gate iteration; the paired rejection is not double counted", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.gate.rejected", { Stage: "code-generation" });
    observeCanonicalEventForMetrics(proj, "amadeus.stage.revising", { Stage: "code-generation", "Revision count": "1" });
    expect(measurementsOf("amadeus.gate.iterations").length).toBe(1);
  });

  test("a failure counts against the low-cardinality Tool, not the argv-derived Command", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.operation.failed", {
      Tool: "Bash",
      Command: "git push --force origin some-very-unique-branch",
      Error: "boom",
    });
    expect(measurementsOf("amadeus.operation.failures")[0]!.attributes).toEqual({ "amadeus.operation": "Bash" });
  });

  test("subagent started then completed records one duration", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.subagent.started", { "Agent Type": "amadeus-quality-agent" });
    observeCanonicalEventForMetrics(proj, "amadeus.subagent.completed", { "Agent Type": "amadeus-quality-agent" });
    expect(measurementsOf("amadeus.subagent.duration")[0]!.attributes).toEqual({
      "amadeus.agent.type": "amadeus-quality-agent",
    });
  });

  test("an event outside the derivation set measures nothing", () => {
    observeCanonicalEventForMetrics(proj, "amadeus.session.started", { Source: "startup" });
    expect(metricRecords()).toEqual([]);
  });

  test("a malformed attribute bag never throws back into the emit path", () => {
    expect(() => observeCanonicalEventForMetrics(proj, "amadeus.stage.completed", { Stage: 42 })).not.toThrow();
    expect(() => observeCanonicalEventForMetrics(proj, "amadeus.operation.failed", {})).not.toThrow();
    expect(metricRecords()).toEqual([]);
  });
});

describe("the real emit path drives the observer (FR-MET)", () => {
  test("emitting the stage pair through emitEvent measures the duration", () => {
    ensureOtelBootstrap(proj);
    emitEvent("amadeus.stage.started", { Stage: "code-generation", Agent: "amadeus-developer-agent" });
    emitEvent("amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
    expect(measurementsOf("amadeus.stage.duration").length).toBe(1);
  });

  test("emitting the subagent pair through emitEvent measures the duration (U4)", () => {
    // Until U4 registered amadeus.subagent.started, this derivation existed but
    // could never fire in production: emitEvent rejects an unregistered name,
    // so the only caller was a test reaching past it. This asserts the whole
    // production path — registry admission, emit, observer — not the observer
    // in isolation.
    ensureOtelBootstrap(proj);
    emitEvent("amadeus.subagent.started", { "Agent Type": "amadeus-developer-agent", Purpose: "do the thing" });
    emitEvent("amadeus.subagent.completed", { "Agent Type": "amadeus-developer-agent" });
    expect(measurementsOf("amadeus.subagent.duration")).toEqual([
      expect.objectContaining({
        kind: "histogram",
        attributes: { "amadeus.agent.type": "amadeus-developer-agent" },
      }),
    ]);
  });

  test("measurements never reach the canonical journal (FR-EXP-4)", () => {
    ensureOtelBootstrap(proj);
    emitEvent("amadeus.stage.started", { Stage: "code-generation", Agent: "amadeus-developer-agent" });
    emitEvent("amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
    const auditDir = join(recordDir(proj)!, "audit");
    const journal = readdirSync(auditDir)
      .filter((name) => name.endsWith(".jsonl"))
      .map((name) => readFileSync(join(auditDir, name), "utf-8"))
      .join("\n");
    expect(journal).toContain("amadeus.stage.completed");
    expect(journal).not.toContain("amadeus.stage.duration");
  });
});

describe("the harness token-usage seam reaches the meter (FR-MET-3)", () => {
  test("a supply before the metrics arm stands up is dropped, not thrown", () => {
    expect(() => supplyTokenUsage({ inputTokens: 1, outputTokens: 2, model: "m" })).not.toThrow();
    expect(metricRecords()).toEqual([]);
  });

  test("a supply after bootstrap records both token types", () => {
    ensureOtelBootstrap(proj);
    supplyTokenUsage({ inputTokens: 11, outputTokens: 22, model: "claude-fable-5" });
    expect(measurementsOf("gen_ai.client.token.usage").map((record) => record.value)).toEqual([11, 22]);
  });
});

describe("walking skeleton — the SessionStart hook's supply reaches a store row (#1868 §1)", () => {
  test("a store record written by the hook's own process carries the conversation id", () => {
    writeFileSync(
      join(recordDir(proj)!, "amadeus-state.md"),
      readFileSync(join(FIXTURES_DIR, "state-mid-ideation.md"), "utf-8")
    );
    const child = new URL("../helpers/otel-session-start-store-child.ts", import.meta.url).pathname;
    const result = Bun.spawnSync({
      cmd: [process.execPath, child, proj],
      stdin: new TextEncoder().encode(
        JSON.stringify({ session_id: "conv-u5-metrics", source: "startup", cwd: proj })
      ),
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env, CLAUDE_PROJECT_DIR: proj },
    });
    const stderr = new TextDecoder().decode(result.stderr);
    expect(stderr, "child failed").toBe("");
    expect(result.exitCode).toBe(0);

    const records = metricRecords();
    expect(records.length).toBeGreaterThan(0);
    const resource = records[0]!.resource as Record<string, string>;
    expect(resource["session.id"], "the hook's supply line did not reach the resource bag").toBe("conv-u5-metrics");
  });
});

describe("the canonical copy behaves identically (dist is a projection, not a fork)", () => {
  // The stage-graph loader memoises its parse per process, so a case that
  // points the env seam somewhere new is only measuring its own path if the
  // memo is dropped on BOTH sides of the swap. Driving that through the
  // exported reset seam is what makes these two cases independent of the order
  // they are declared in — before, the unreadable-graph case was unreachable
  // once any earlier case had loaded a graph successfully.
  function withStageGraph(path: string, fn: () => void): void {
    const saved = process.env.AMADEUS_STAGE_GRAPH;
    process.env.AMADEUS_STAGE_GRAPH = path;
    _resetStageGraphForTests();
    try {
      fn();
    } finally {
      if (saved === undefined) delete process.env.AMADEUS_STAGE_GRAPH;
      else process.env.AMADEUS_STAGE_GRAPH = saved;
      _resetStageGraphForTests();
    }
  }

  test("an unreadable stage graph costs the phase dimension, not the measurement", () => {
    withStageGraph(join(proj, "no-such-stage-graph.json"), () => {
      ensureOtelBootstrapSrc(proj);
      observeSrc(proj, "amadeus.stage.started", { Stage: "code-generation", Agent: "developer" });
      observeSrc(proj, "amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
      expect(measurementsOf("amadeus.stage.duration")[0]!.attributes).toEqual({ "amadeus.stage": "code-generation" });
    });
  });

  test("the stage pair resolves the phase from the graph", () => {
    // The canonical tree ships no compiled stage graph — that data file is a
    // packaging artefact — so point the loader's documented env seam at the
    // shipped one rather than asserting the phase is unresolvable here.
    withStageGraph(join(AMADEUS_SRC, "tools", "data", "stage-graph.json"), () => {
      ensureOtelBootstrapSrc(proj);
      observeSrc(proj, "amadeus.stage.started", { Stage: "code-generation", Agent: "developer" });
      observeSrc(proj, "amadeus.stage.completed", { Stage: "code-generation", Details: "done" });
      expect(measurementsOf("amadeus.stage.duration")[0]!.attributes).toEqual({
        "amadeus.stage": "code-generation",
        "amadeus.phase": "construction",
      });
    });
  });

  test("a marker the filesystem refuses to read as a file yields no measurement", () => {
    markDurationStartSrc(proj, "stage", "code-generation", 1_000);
    // Replace the marker with a directory: the read (macOS) or the removal
    // (both platforms) throws, and the pairing degrades to "no start parked".
    const marker = join(recordDir(proj)!, ".amadeus-otel", "pending-stage-code-generation.start");
    rmSync(marker, { force: true });
    mkdirSync(join(marker, "occupied"), { recursive: true });
    expect(takeDurationStartSrc(proj, "stage", "code-generation")).toBeNull();
  });
});
