import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AdapterExecution,
  CleanupTarget,
  LiveAdapter,
  LiveJourney,
  LiveRunContext,
  ScratchReceipt,
} from "../harness/live-e2e/adapter.ts";
import type { ResourceRegistrar } from "../harness/live-e2e/resources.ts";
import { runLiveJourney } from "../harness/live-e2e/lifecycle.ts";
import {
  appendRunReceipt,
  inspectLedgerLock,
  parseRunLedger,
  recoverRunReceipt,
  type RecordedLiveRunReceipt,
} from "../harness/live-e2e/ledger.ts";
import { LIVE_CAPABILITIES } from "../harness/live-e2e/registry.ts";

function fixtureRoot(): string {
  return mkdtempSync(join(tmpdir(), "amadeus-live-kernel-"));
}

function receipt(id = "a".repeat(64)): RecordedLiveRunReceipt {
  return {
    kind: "recorded",
    schemaVersion: 1,
    receiptId: id,
    journeyId: "fake-journey",
    adapterId: "codex-exec",
    recordedAt: "2026-08-03T00:00:00.000Z",
    gitSha: "a".repeat(40),
    measuredVersion: "0.146.0",
    outcome: {
      status: "success",
      code: "AMADEUS_LIVE_E2E:PASS:SUCCESS",
      diagnostic: "anchors passed",
      evidence: [],
    },
    attemptCount: 1,
    timeoutMs: 50,
    cleanup: {
      attemptedResourceIds: ["scratch"],
      releasedResourceIds: ["scratch"],
      retainedResourceIds: [],
      failures: [],
      leakFindings: [],
    },
    durability: "file-only",
  };
}

class FakeAdapter implements LiveAdapter {
  readonly capability = LIVE_CAPABILITIES[0];
  prepareThrows = false;
  cleanupThrows = false;
  execution: AdapterExecution = {
    exitCode: 0,
    timedOut: false,
    aborted: false,
    stdoutDigest: "stdout-digest",
    stderrDigest: "stderr-digest",
    structured: { status: "ok" },
  };
  events: string[] = [];

  async preflight() {
    this.events.push("preflight");
    return { kind: "ready" as const, measuredVersion: "0.146.0", findings: [] };
  }

  async prepare(context: Parameters<LiveAdapter["prepare"]>[0]) {
    this.events.push("prepare");
    context.registrar.registerPlanned({
      id: "adapter-partial",
      kind: "credential-binding",
      locator: "env:OPENAI_API_KEY",
      credentialBearing: true,
    });
    if (this.prepareThrows) throw new Error("prepare exploded with sk-secret");
    context.registrar.markCreated("adapter-partial");
    return {
      ok: true as const,
      value: {
        cwd: context.scratch.projectDir,
        executable: "fake",
        args: [],
        environmentKeys: ["PATH"],
        resolveEnvironment: () => ({ PATH: "/bin" }),
        registeredResourceIds: ["adapter-partial"],
      },
    };
  }

  async execute(_run: Parameters<LiveAdapter["execute"]>[0], signal: AbortSignal) {
    this.events.push("execute");
    if (this.execution.timedOut) {
      await new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve()));
    }
    return this.execution;
  }

  async cleanup(target: CleanupTarget) {
    this.events.push("cleanup");
    if (this.cleanupThrows) throw new Error("cleanup failed");
    return {
      attemptedResourceIds: target.registeredResources.map((resource) => resource.id),
      releasedResourceIds: target.registeredResources.map((resource) => resource.id),
      retainedResourceIds: [],
      failures: [],
      leakFindings: [],
    };
  }
}

function journey(): LiveJourney {
  return {
    id: "fake-journey",
    prompt: "not persisted",
    timeoutMs: 20,
    retryPolicy: { maxAttempts: 1 },
    assert: (execution) => ({
      passed: execution.exitCode === 0 && execution.structured?.status === "ok",
      evidence: [],
      diagnostic: execution.exitCode === 0 ? "anchors passed" : "exit mismatch",
    }),
  };
}

function context(root: string, adapter: FakeAdapter): LiveRunContext {
  return {
    env: { AMADEUS_CODEX_EXEC_LIVE: "1" },
    gitSha: "a".repeat(40),
    now: () => new Date("2026-08-03T00:00:00.000Z"),
    ledgerPath: join(root, "runs.jsonl"),
    durability: "file-only",
    credentialSource: {
      canLease: async () => true,
      lease: async () => ({ key: "OPENAI_API_KEY", expose: () => "sk-secret", release: async () => {} }),
    },
    allocator: {
      allocate: async (registrar: ResourceRegistrar): Promise<ScratchReceipt> => {
        adapter.events.push("allocate");
        const scratch = join(root, "scratch");
        registrar.registerPlanned({
          id: "scratch",
          kind: "scratch-root",
          locator: "scratch",
          credentialBearing: false,
        });
        mkdirSync(join(scratch, "project"), { recursive: true });
        registrar.markCreated("scratch");
        return {
          root: scratch,
          homeDir: join(scratch, "home"),
          projectDir: join(scratch, "project"),
          state: "ready",
        };
      },
    },
    leakCheck: async () => [],
  };
}

describe("live E2E lifecycle", () => {
  test("gate denial performs no preflight, scratch, process, or ledger work", async () => {
    const root = fixtureRoot();
    const adapter = new FakeAdapter();
    const denied = context(root, adapter);
    denied.env = { AMADEUS_CODEX_EXEC_LIVE: "1", GITHUB_ACTIONS: "true" };
    try {
      const result = await runLiveJourney(adapter, journey(), denied);
      expect(result).toMatchObject({
        ok: true,
        value: { kind: "skipped", outcome: { code: "AMADEUS_LIVE_E2E:SKIP:CI_FORBIDDEN" } },
      });
      expect(adapter.events).toEqual([]);
      expect(Bun.file(denied.ledgerPath).size).toBe(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("partial prepare failure still snapshots resources and cleans without leaking secrets", async () => {
    const root = fixtureRoot();
    const adapter = new FakeAdapter();
    adapter.prepareThrows = true;
    try {
      const result = await runLiveJourney(adapter, journey(), context(root, adapter));
      expect(result).toMatchObject({
        ok: true,
        value: {
          kind: "recorded",
          outcome: {
            code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED",
          },
        },
      });
      expect(adapter.events).toEqual(["preflight", "allocate", "prepare", "cleanup"]);
      expect(JSON.stringify(result)).not.toContain("sk-secret");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("timeout aborts execution and cleanup failure takes precedence", async () => {
    const root = fixtureRoot();
    const adapter = new FakeAdapter();
    adapter.execution = { ...adapter.execution, timedOut: true };
    adapter.cleanupThrows = true;
    try {
      const result = await runLiveJourney(adapter, journey(), context(root, adapter));
      expect(result).toMatchObject({
        ok: true,
        value: {
          outcome: {
            code: "AMADEUS_LIVE_E2E:FAIL:EXECUTION_FAILED",
          },
        },
      });
      expect(JSON.stringify(result)).toContain("TIMEOUT:JOURNEY_TIMEOUT");
      expect(adapter.events).toContain("cleanup");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("ledger append is atomic, byte preserving, idempotent, and conflict closed", async () => {
    const root = fixtureRoot();
    const ledger = join(root, "runs.jsonl");
    try {
      const first = receipt();
      expect(await appendRunReceipt(ledger, first)).toEqual({ ok: true, value: "appended" });
      const firstBytes = readFileSync(ledger, "utf8");
      expect(await appendRunReceipt(ledger, first)).toEqual({
        ok: true,
        value: "already-present",
      });
      expect(readFileSync(ledger, "utf8")).toBe(firstBytes);
      expect(await appendRunReceipt(ledger, { ...first, journeyId: "conflict" })).toMatchObject({
        ok: false,
        error: { kind: "receipt-conflict" },
      });
      expect(parseRunLedger(firstBytes)).toMatchObject({ ok: true });
      expect(parseRunLedger(`${firstBytes}{broken\n`)).toMatchObject({
        ok: false,
        error: { kind: "malformed-line" },
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a live owner lock is never stolen and a dead owner can be recovered", async () => {
    const root = fixtureRoot();
    const ledger = join(root, "runs.jsonl");
    const lock = `${ledger}.lock`;
    try {
      mkdirSync(lock, { recursive: true });
      writeFileSync(
        join(lock, "owner.json"),
        JSON.stringify({ pid: process.pid, startedAtMs: Date.now() - 1000, token: "live" }),
      );
      expect(inspectLedgerLock(ledger)).toMatchObject({ ok: true, value: { kind: "owned-alive" } });
      expect(await appendRunReceipt(ledger, receipt(), { maxRetries: 0 })).toMatchObject({
        ok: false,
        error: { kind: "lock-timeout" },
      });

      writeFileSync(
        join(lock, "owner.json"),
        JSON.stringify({ pid: 2_147_483_647, startedAtMs: 1, token: "dead" }),
      );
      expect(await appendRunReceipt(ledger, receipt(), { maxRetries: 1, retryMs: 1 })).toEqual({
        ok: true,
        value: "appended",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a durable pending marker blocks green reads until explicit recovery", async () => {
    const root = fixtureRoot();
    const ledger = join(root, "runs.jsonl");
    const recorded = { ...receipt(), durability: "file-and-directory" as const };
    let directoryFsyncCalls = 0;
    try {
      const failed = await appendRunReceipt(ledger, recorded, {
        fsyncDirectory: () => {
          directoryFsyncCalls += 1;
          if (directoryFsyncCalls === 2) throw new Error("injected directory fsync failure");
        },
      });
      expect(failed).toMatchObject({ ok: false, error: { kind: "fsync-failed" } });
      expect(parseRunLedger(readFileSync(ledger, "utf8"), { ledgerPath: ledger })).toMatchObject({
        ok: false,
        error: { kind: "pending-durability" },
      });
      expect(await recoverRunReceipt(ledger, recorded)).toEqual({
        ok: true,
        value: "already-present",
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
