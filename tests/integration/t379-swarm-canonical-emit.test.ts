// covers: function:emitSwarmAudit, function:observeSubprocessSpan
// size: medium
//
// G1 (call-site migration) — the swarm referee's own emitters.
//
// The referee owns the WHOLE swarm audit taxonomy (six event types) and five
// subprocess boundaries. Both move together here: the audit rows onto the
// canonical Event path through the migration Adapter, the spawns onto the
// Trace API through observeSubprocessSpan.
//
// WHY emitSwarmAudit IS THE SEAM. The six emitters used to each carry their
// own `appendAuditEntry` call, so the bootstrap ordering the canonical path
// requires (emitEvent throws with no Logger Provider registered) would have
// been six chances to get it wrong. One shared seam is the fix, and exporting
// it is what makes the migration drivable in-process — bun's coverage does not
// instrument a spawned CLI, so a CLI-only test would leave these lines dark.
//
// The CLI wiring itself stays pinned by the existing referee twins (t134,
// t135, t251), which drive prepare/finalize end to end.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent, boltDagGenerationOf } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  emitSwarmAudit,
  emitSwarmDegraded,
  emitSwarmStarted,
  emitUnitConverged,
  emitUnitFailed,
  handleAcquire,
  handleConfirmDispatch,
  handleFinalize,
  handleInitialEnqueue,
  handleLateResult,
  handleRecordReconciliation,
  handleSettle,
  handleTerminateBatch,
} from "../../dist/claude/.claude/tools/amadeus-swarm.ts";
import {
  createAuditUnitPoolRepository,
  createUnitPoolCoordinator,
} from "../../dist/claude/.claude/tools/amadeus-unit-pool-runtime.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { resetTracerProviderForTests } from "../../dist/claude/.claude/otel/tracer-provider.ts";
import { observeSubprocessSpan } from "../../dist/claude/.claude/otel/subprocess-span.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
let recordDir: string;

// The bootstrap seam refuses a SECOND workspace in one process by design (one
// workspace per process), and every case here mints a fresh temp project — so
// the per-process records are dropped between cases the same way the provider
// registrations are.
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
  recordDir = birthIntent(proj, "swarm-emit", "default", "feature").recordDir;
});

afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetTracerProviderForTests();
  resetOtelBootstrapForTests();
});

type ShardRecord = {
  schemaVersion?: number;
  eventName?: string;
  event?: string;
  attributes?: Record<string, unknown>;
};

function shardRecords(): ShardRecord[] {
  const dir = join(recordDir, "audit");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((n) => n.endsWith(".jsonl"))
    .sort()
    .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as ShardRecord);
}

describe("each named emitter travels the canonical Event path", () => {
  // #1953 / FR-5a: the generation stamp is only worth emitting if it SURVIVES the
  // write. An attribute the event registry does not declare is dropped by the
  // redaction policy while the append still reports success, so an emitter-only
  // change would look green and store nothing. This drives the real emitter and
  // reads the stored row back, which is the only place that gap is visible.
  test("SWARM_STARTED stores the plan generation of the compiled Bolt DAG", () => {
    const batches = [["u1", "u2"]];
    mkdirSync(join(recordDir, "inception", "units-generation"), { recursive: true });
    writeFileSync(
      join(recordDir, "inception", "units-generation", "unit-of-work-dependency.md"),
      "# Unit dependencies\n\n```yaml\nunits:\n  - name: u1\n    depends_on: []\n  - name: u2\n    depends_on: []\n```\n",
    );
    writeFileSync(
      join(recordDir, "runtime-graph.json"),
      JSON.stringify({
        bolt_dag: { units: batches.flat().map((name) => ({ name, depends_on: [] })), batches },
      }),
    );

    emitSwarmStarted(proj, "1", ["u1", "u2"], "4");

    const emitted = shardRecords().filter(
      (r) => r.schemaVersion === 2 && r.eventName === "amadeus.swarm.started",
    );
    expect(emitted.length).toBe(1);
    expect(emitted[0]?.attributes?.["Plan generation"]).toBe(boltDagGenerationOf(batches));
  });

  // The referee's six emitters are thin wrappers whose whole content is the
  // event type and the field NAMES. Driving them (rather than calling
  // emitSwarmAudit with a hand-copied field set) is what makes this a test of
  // the production vocabulary instead of a copy of it: rename a field in the
  // wrapper and the assertion below fails, which a duplicated table would not.
  const emitters: readonly [string, string, () => void, Record<string, string>][] = [
    [
      "SWARM_STARTED",
      "amadeus.swarm.started",
      () => emitSwarmStarted(proj, "1", ["u1", "u2"], "4"),
      { "Batch number": "1", "Unit names": "u1,u2", "Concurrency cap": "4" },
    ],
    [
      "SWARM_DEGRADED",
      "amadeus.swarm.degraded",
      () => emitSwarmDegraded(proj, "1", "codex-ultra"),
      { "Batch number": "1", "Requested driver": "codex-ultra", "Fallback driver": "subagent" },
    ],
    [
      "SWARM_UNIT_CONVERGED",
      "amadeus.swarm.unit.converged",
      () => emitUnitConverged(proj, "1", "u1"),
      { "Batch number": "1", "Unit name": "u1" },
    ],
    [
      "SWARM_UNIT_FAILED",
      "amadeus.swarm.unit.failed",
      () => emitUnitFailed(proj, "1", "u1", "error"),
      { "Batch number": "1", "Unit name": "u1", Reason: "error" },
    ],
  ];

  for (const [legacy, canonical, emit, expected] of emitters) {
    test(`[migration-equivalence] ${legacy} lands as ${canonical} with the fields the emitter names`, () => {
      emit();
      const rows = shardRecords();
      const emitted = rows.filter((r) => r.schemaVersion === 2 && r.eventName === canonical);
      expect(emitted.length).toBe(1);
      expect(emitted[0]?.attributes?.Event).toBe(legacy);
      for (const [key, value] of Object.entries(expected)) {
        expect(emitted[0]?.attributes?.[key]).toBe(value);
      }
      expect(rows.filter((r) => r.schemaVersion !== 2).length).toBe(0);
    });
  }
});

describe("the swarm taxonomy travels the canonical Event path", () => {
  // One case per event type: the registry lookup is BY legacy event type, so a
  // type the registry does not carry would throw here rather than round off.
  const taxonomy: readonly [string, string, Record<string, string>][] = [
    ["SWARM_STARTED", "amadeus.swarm.started", { "Batch number": "1", "Unit names": "u1,u2", "Concurrency cap": "4" }],
    ["SWARM_DEGRADED", "amadeus.swarm.degraded", { "Batch number": "1", "Requested driver": "codex-ultra", "Fallback driver": "subagent" }],
    ["SWARM_UNIT_CONVERGED", "amadeus.swarm.unit.converged", { "Batch number": "1", "Unit name": "u1" }],
    ["SWARM_UNIT_FAILED", "amadeus.swarm.unit.failed", { "Batch number": "1", "Unit name": "u1", Reason: "error" }],
    ["SWARM_BATON_RETURNED", "amadeus.swarm.baton.returned", { "Batch number": "1", "Unit name": "u1", Reason: "error" }],
    ["SWARM_COMPLETED", "amadeus.swarm.completed", { "Batch number": "1", "Converged count": "1", "Failed count": "0" }],
  ];

  for (const [legacy, canonical, fields] of taxonomy) {
    test(`${legacy} lands as ${canonical}`, () => {
      emitSwarmAudit(legacy, fields, proj);
      const rows = shardRecords();
      const emitted = rows.filter((r) => r.schemaVersion === 2 && r.eventName === canonical);
      expect(emitted.length).toBe(1);
      // The legacy readers still resolve it: the v1 type rides as an attribute.
      expect(emitted[0]?.attributes?.Event).toBe(legacy);
      // Every field the referee recorded survived the write.
      for (const [key, value] of Object.entries(fields)) {
        expect(emitted[0]?.attributes?.[key]).toBe(value);
      }
      expect(rows.filter((r) => r.schemaVersion !== 2).length).toBe(0);
    });
  }

  test("the seam stands the provider up itself — no caller ordering to get wrong", () => {
    // No bootstrap call here: an unbootstrapped emit throws, so a green
    // assertion IS the proof that the seam owns the ordering.
    expect(() => emitSwarmAudit("SWARM_COMPLETED", { "Batch number": "9", "Converged count": "0", "Failed count": "0" }, proj)).not.toThrow();
    expect(shardRecords().length).toBe(1);
  });

  test("repeated emits reuse the one registration", () => {
    emitSwarmAudit("SWARM_UNIT_CONVERGED", { "Batch number": "1", "Unit name": "u1" }, proj);
    emitSwarmAudit("SWARM_UNIT_CONVERGED", { "Batch number": "1", "Unit name": "u2" }, proj);
    expect(shardRecords().length).toBe(2);
  });
});

describe("the referee's subprocess boundaries are Trace API spans", () => {
  // The referee's five spawns (runTool, the check command, three git probes)
  // all reach the same wrapper. What the migration must preserve is the call
  // shape: the wrapper returns the callback's own result untouched, so a
  // migrated site reads its `status` exactly as before.
  test("the span wrapper returns the spawn result unchanged", () => {
    const result = observeSubprocessSpan(proj, "git", () => ({ status: 0, stdout: "main\n" }));
    expect(result.status).toBe(0);
    expect(result.stdout).toBe("main\n");
  });

  test("a throwing spawn propagates rather than being swallowed", () => {
    expect(() =>
      observeSubprocessSpan(proj, "git", () => {
        throw new Error("spawn failed");
      })
    ).toThrow(/spawn failed/);
  });
});

describe("finalize drives the taxonomy through the seam", () => {
  // The six emitters are one-line delegations to emitSwarmAudit, and finalize is
  // what reaches them. Driving the CLI handler in-process (rather than spawning
  // it) is what puts those lines under coverage — bun does not instrument a
  // spawned process. finalize ends in process.exit, so the exit is intercepted
  // the same way the learnings persist seam does it.
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }

  function callFinalize(args: string[]): number {
    const origExit = process.exit.bind(process);
    const origLog = console.log;
    process.exit = ((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as typeof process.exit;
    console.log = () => {};
    try {
      handleFinalize(args);
      return 0;
    } catch (e) {
      if (e instanceof ExitSignal) return e.code;
      throw e;
    } finally {
      process.exit = origExit;
      console.log = origLog;
    }
  }

  test("a claimed unit with no worktree fails, returns the baton and closes the batch", () => {
    // Finalize requires an initialized terminal pool. Drive one Unit through its
    // complete pool lifecycle without creating a worktree; re-verification then
    // fails on the absent worktree and writes the failure trio.
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
    pool.initialEnqueue({ idempotencyKey: "init", batchId: "1", cap: 1, units: [{ unitId: "u1", dependsOn: [] }] });
    pool.acquire({ idempotencyKey: "acquire", batchId: "1" });
    const attempt = pool.readProjection("1").active[0];
    pool.confirmDispatch({ idempotencyKey: "confirm", batchId: "1", attemptId: attempt.attemptId, nativeHandle: "native-u1" });
    pool.settleRelease({ idempotencyKey: "settle", batchId: "1", attemptId: attempt.attemptId, outcome: "succeeded" });
    const code = callFinalize([
      "--batch",
      "1",
      "--units",
      "u1",
      "--claimed",
      "u1",
      "--check-cmd",
      "true",
      "--project-dir",
      proj,
    ]);
    expect(code).toBe(2);

    const emitted = shardRecords()
      .filter((r) => r.schemaVersion === 2)
      .map((r) => r.eventName);
    expect(emitted).toContain("amadeus.swarm.unit.failed");
    expect(emitted).toContain("amadeus.swarm.baton.returned");
    expect(emitted).toContain("amadeus.swarm.completed");
    // Never a converged row for a unit that did not land on the trunk.
    expect(emitted).not.toContain("amadeus.swarm.unit.converged");
  });

  test("finalize rejects a batch whose fixed pool was never initialized", () => {
    expect(callFinalize([
      "--batch",
      "2",
      "--units",
      "u2",
      "--claimed",
      "u2",
      "--check-cmd",
      "true",
      "--project-dir",
      proj,
    ])).toBe(2);
  });

  test("finalize rejects a claimed Unit whose pool outcome was not successful", () => {
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
    pool.initialEnqueue({ idempotencyKey: "init-3", batchId: "3", cap: 1, units: [{ unitId: "u3", dependsOn: [] }] });
    pool.acquire({ idempotencyKey: "acquire-3", batchId: "3" });
    const attempt = pool.readProjection("3").active[0];
    pool.confirmDispatch({ idempotencyKey: "confirm-3", batchId: "3", attemptId: attempt.attemptId, nativeHandle: "native-u3" });
    pool.settleRelease({ idempotencyKey: "settle-3", batchId: "3", attemptId: attempt.attemptId, outcome: "failed" });

    expect(callFinalize([
      "--batch",
      "3",
      "--units",
      "u3",
      "--claimed",
      "u3",
      "--check-cmd",
      "true",
      "--project-dir",
      proj,
    ])).toBe(2);
  });
});

describe("fixed-pool CLI handlers are driven in-process", () => {
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }

  function callHandler(run: () => void): number {
    const origExit = process.exit.bind(process);
    const origLog = console.log;
    const origError = console.error;
    process.exit = ((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as typeof process.exit;
    console.log = () => {};
    console.error = () => {};
    try {
      run();
      return 0;
    } catch (error) {
      if (error instanceof ExitSignal) return error.code;
      throw error;
    } finally {
      process.exit = origExit;
      console.log = origLog;
      console.error = origError;
    }
  }

  const projectArgs = () => ["--project-dir", proj];

  test("the pool subcommands commit one complete lifecycle through the audit repository", () => {
    expect(callHandler(() => handleInitialEnqueue([
      "--batch", "4", "--units", "u1,u2", "--cap", "1", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleAcquire([
      "--batch", "4", "--idempotency-key", "delivery-u1", ...projectArgs(),
    ]))).toBe(0);

    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
    const first = pool.readProjection("4").active[0];
    expect(callHandler(() => handleConfirmDispatch([
      "--batch", "4", "--attempt", first.attemptId, "--native-handle", "native-u1", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleSettle([
      "--batch", "4", "--attempt", first.attemptId, "--outcome", "succeeded", ...projectArgs(),
    ], "settle-release"))).toBe(0);
    expect(callHandler(() => handleLateResult([
      "--batch", "4", "--attempt", first.attemptId, "--outcome", "failed", ...projectArgs(),
    ]))).toBe(0);

    const second = pool.readProjection("4").active[0];
    expect(callHandler(() => handleSettle([
      "--batch", "4", "--attempt", second.attemptId, "--outcome", "dispatch-not-started", ...projectArgs(),
    ], "settle-release-requeue"))).toBe(0);
    const retried = pool.readProjection("4").active[0];
    expect(callHandler(() => handleConfirmDispatch([
      "--batch", "4", "--attempt", retried.attemptId, "--native-handle", "native-u2", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleSettle([
      "--batch", "4", "--attempt", retried.attemptId, "--outcome", "failed", ...projectArgs(),
    ], "settle-release-cancel-dependents"))).toBe(0);
    expect(pool.readProjection("4")).toMatchObject({ phase: "terminal", result: "partial-failure" });
  });

  test("reconciliation and explicit termination handlers preserve their typed outcomes", () => {
    expect(callHandler(() => handleInitialEnqueue([
      "--batch", "5", "--units", "u1,u2", "--cap", "1", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleAcquire([
      "--batch", "5", "--idempotency-key", "delivery-uncertain", ...projectArgs(),
    ]))).toBe(0);
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
    const uncertain = pool.readProjection("5").active[0];
    expect(callHandler(() => handleRecordReconciliation([
      "--batch", "5", "--attempt", uncertain.attemptId,
      "--reconciliation-kind", "worker-start", "--effect", "unknown", ...projectArgs(),
    ]))).toBe(0);
    expect(pool.readProjection("5")).toMatchObject({ phase: "terminal", result: "terminated" });

    expect(callHandler(() => handleInitialEnqueue([
      "--batch", "6", "--units", "u3,u4", "--cap", "1", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleTerminateBatch([
      "--batch", "6", "--result", "cancelled", "--queued-outcome", "cancelled", ...projectArgs(),
    ]))).toBe(0);
    expect(pool.readProjection("6")).toMatchObject({ phase: "terminal", result: "cancelled" });
  });

  test("pool subcommands reject incomplete or out-of-domain native facts", () => {
    expect(callHandler(() => handleInitialEnqueue([
      "--batch", "7", "--units", "u1", "--cap", "0", ...projectArgs(),
    ]))).toBe(1);
    expect(callHandler(() => handleAcquire(["--batch", "7", ...projectArgs()]))).toBe(1);
    expect(callHandler(() => handleConfirmDispatch([
      "--batch", "7", "--attempt", "attempt", ...projectArgs(),
    ]))).toBe(1);
    expect(callHandler(() => handleRecordReconciliation([
      "--batch", "7", "--attempt", "attempt", "--effect", "invalid", ...projectArgs(),
    ]))).toBe(1);
    expect(callHandler(() => handleSettle([
      "--batch", "7", "--attempt", "attempt", "--outcome", "failed", ...projectArgs(),
    ], "settle-release-requeue"))).toBe(1);
    expect(callHandler(() => handleTerminateBatch([
      "--batch", "7", "--result", "invalid", "--queued-outcome", "cancelled", ...projectArgs(),
    ]))).toBe(1);
    expect(callHandler(() => handleTerminateBatch([
      "--batch", "7", "--result", "cancelled", "--queued-outcome", "invalid", ...projectArgs(),
    ]))).toBe(1);
    expect(callHandler(() => handleLateResult([
      "--batch", "7", "--outcome", "failed", ...projectArgs(),
    ]))).toBe(1);
  });

  test("finalize records a typed conductor reason for an unclaimed terminal Unit", () => {
    expect(callHandler(() => handleInitialEnqueue([
      "--batch", "8", "--units", "u8", "--cap", "1", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleAcquire([
      "--batch", "8", "--idempotency-key", "delivery-u8", ...projectArgs(),
    ]))).toBe(0);
    const pool = createUnitPoolCoordinator(createAuditUnitPoolRepository(proj));
    const attempt = pool.readProjection("8").active[0];
    expect(callHandler(() => handleConfirmDispatch([
      "--batch", "8", "--attempt", attempt.attemptId, "--native-handle", "native-u8", ...projectArgs(),
    ]))).toBe(0);
    expect(callHandler(() => handleSettle([
      "--batch", "8", "--attempt", attempt.attemptId, "--outcome", "failed", ...projectArgs(),
    ], "settle-release"))).toBe(0);

    expect(callHandler(() => handleFinalize([
      "--batch", "8", "--units", "u8", "--reasons", "u8=budget-exhausted",
      "--check-cmd", "true", ...projectArgs(),
    ]))).toBe(2);
    const records = shardRecords().filter((record) => record.schemaVersion === 2);
    const emitted = records.map((record) => record.eventName);
    const failed = records.find((record) => record.eventName === "amadeus.swarm.unit.failed");
    expect(emitted).toContain("amadeus.swarm.unit.failed");
    expect(failed?.attributes?.Reason).toBe("budget-exhausted");
    expect(emitted).toContain("amadeus.swarm.baton.returned");
    expect(emitted).toContain("amadeus.swarm.completed");
  });
});
