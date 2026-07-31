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
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { birthIntent } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { emitSwarmAudit, handleFinalize } from "../../dist/claude/.claude/tools/amadeus-swarm.ts";
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
    // No prepare ran, so the unit has no worktree: finalize refuses the merge
    // and writes the failure trio. Exit 2 is the "conductor takes the baton"
    // signal, which is what makes this the honest driver for those emitters.
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
});
