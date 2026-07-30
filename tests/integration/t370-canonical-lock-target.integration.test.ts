// covers: function:withAuditLock, function:AuditLockAcquireError, function:appendJournalRecordV2
// size: medium
//
// Pre-U8 Bolt P1 (E-U8PRE, composite ruling B):
//   O-L1 — the v2 journal append re-enters a lock this process already holds.
//     Before: appendJournalRecordV2 took a BARE acquireAuditLock, so a call
//     from inside a held section hit EEXIST against its own lock, burned the
//     retry budget and threw (and once the holder aged past the stale
//     threshold, the reaper stole the live lock out from under the outer
//     critical section). withAuditLock's per-identity depth counter is the
//     structural fix.
//   O-L1 retry budget — withAuditLock's 50x100ms was hard-coded, so moving the
//     bare-acquire holders onto it would have silently shrunk audit-merge's
//     env-tunable 200x100ms=20s budget to 5s (E-U8PRE reservations, both
//     voters). The budget is a parameter.
//   O-T1 — emitEvent takes a per-call target, and the target drives BOTH the
//     shard the row lands in AND the row's own intentId. A target honoured only
//     for shard selection writes a row into the target ledger that claims the
//     ISSUER's intent — the shape migration-adapter.ts fails closed over.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  auditLockDir,
  birthIntent,
  holdsAuditLock,
  releaseAuditLock,
  withAuditLock,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { appendJournalRecordV2 } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  isJournalEntryV2,
  type JournalEntryV2,
  JOURNAL_SCHEMA_VERSION_V2,
  readJournalRecords,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { createAuditLogExporter } from "../../dist/claude/.claude/otel/audit-log-exporter.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { createLocalLogExporter } from "../../dist/claude/.claude/otel/local-log-exporter.ts";
import {
  emitEvent,
  registerLoggerProvider,
  resetLoggerProviderForTests,
} from "../../dist/claude/.claude/otel/logger-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;

beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  ensureContextManager();
});

afterEach(() => {
  cleanupTestProject(proj);
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
});

function journalRow(): Omit<JournalEntryV2, "seq"> {
  return {
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId: crypto.randomUUID(),
    timestamp: "2026-07-30T00:00:00Z",
    eventName: "amadeus.session.started",
    attributes: { Event: "SESSION_STARTED", Source: "test" },
    intentId: "unused",
    space: "default",
    cloneId: "clone-1",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: crypto.randomUUID(),
    canonical: true,
  };
}

function shardRecords(record: string): JournalEntryV2[] {
  const dir = join(record, "audit");
  if (!existsSync(dir)) return [];
  const out: JournalEntryV2[] = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    for (const entry of readJournalRecords(readFileSync(join(dir, name), "utf-8"))) {
      if (isJournalEntryV2(entry)) out.push(entry);
    }
  }
  return out;
}

// A live, freshly stamped lock dir that this process did NOT take through
// withAuditLock: no depth entry, so no reentrancy and no stale reap either.
function plantForeignLock(): string {
  const lockDir = auditLockDir(proj);
  mkdirSync(lockDir, { recursive: true });
  writeFileSync(
    join(lockDir, "owner.json"),
    JSON.stringify({ pid: process.pid, startedAtMs: Math.floor(performance.timeOrigin) }),
    "utf-8",
  );
  return lockDir;
}

describe("O-L1 — reentrant v2 journal append", () => {
  test("appends from inside a lock this process already holds", () => {
    const born = birthIntent(proj, "lock-reentry", "default", "feature");
    const outcome = withAuditLock(proj, () => appendJournalRecordV2(journalRow(), proj));
    expect(outcome).toEqual({ appended: true });
    expect(shardRecords(born.recordDir).map((r) => r.eventName)).toEqual([
      "amadeus.session.started",
    ]);
  });

  test("the outer holder still owns the lock after the nested append returns", () => {
    birthIntent(proj, "lock-depth", "default", "feature");
    let heldInside = false;
    let lockDirInside = false;
    withAuditLock(proj, () => {
      appendJournalRecordV2(journalRow(), proj);
      heldInside = holdsAuditLock(proj);
      lockDirInside = existsSync(auditLockDir(proj));
    });
    expect(heldInside).toBe(true);
    expect(lockDirInside).toBe(true);
    expect(existsSync(auditLockDir(proj))).toBe(false);
  });

  test("still fails closed when a FOREIGN live holder owns the lock", () => {
    birthIntent(proj, "lock-foreign", "default", "feature");
    plantForeignLock();
    try {
      expect(() => appendJournalRecordV2(journalRow(), proj)).toThrow(
        /Failed to acquire audit lock/,
      );
    } finally {
      releaseAuditLock(proj);
    }
  }, 30_000);
});

describe("O-L1 — withAuditLock retry budget is a parameter", () => {
  test("honours a caller-supplied budget instead of the 50x100ms default", () => {
    birthIntent(proj, "lock-budget", "default", "feature");
    plantForeignLock();
    const startedAt = performance.now();
    try {
      expect(() =>
        withAuditLock(proj, () => "unreachable", undefined, undefined, {
          maxRetries: 0,
          retryMs: 0,
        }),
      ).toThrow(/Failed to acquire audit lock/);
    } finally {
      releaseAuditLock(proj);
    }
    // The 50x100ms default would take ~5s; a honoured 0x0ms budget is instant.
    expect(performance.now() - startedAt).toBeLessThan(1_000);
  });

  test("runs the section normally when a budget is supplied and the lock is free", () => {
    birthIntent(proj, "lock-budget-free", "default", "feature");
    let ran = 0;
    withAuditLock(proj, () => { ran += 1; }, undefined, undefined, { maxRetries: 2, retryMs: 1 });
    expect(ran).toBe(1);
    expect(existsSync(auditLockDir(proj))).toBe(false);
  });
});

describe("O-T1 — per-call emit target drives shard AND row identity", () => {
  test("targets another intent's ledger and stamps THAT intent's id", () => {
    // Birth order sets the cursor: the issuer is born last, so the cursor points
    // at it and ONLY the per-call target names the other intent.
    const target = birthIntent(proj, "emit-target", "default", "feature");
    const issuer = birthIntent(proj, "emit-issuer", "default", "feature");
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });

    const outcome = emitEvent(
      "amadeus.session.started",
      { Source: "test" },
      { intent: target.dirName },
    );
    expect(outcome.appended).toBe(true);

    const targetRows = shardRecords(target.recordDir);
    expect(targetRows).toHaveLength(1);
    // Shard AND identity must agree: a row in the target ledger claiming the
    // issuer's intentId is the defect this test exists to forbid.
    expect(targetRows[0].intentId).toBe(target.dirName);
    expect(shardRecords(issuer.recordDir)).toHaveLength(0);
  });

  test("resolves identity from the active cursor when no target is given", () => {
    const issuer = birthIntent(proj, "emit-default", "default", "feature");
    registerLoggerProvider({
      projectDir: proj,
      auditExporter: createAuditLogExporter({ projectDir: proj }),
      logExporter: createLocalLogExporter({ projectDir: proj }),
    });
    expect(emitEvent("amadeus.session.started", { Source: "test" }).appended).toBe(true);
    const rows = shardRecords(issuer.recordDir);
    expect(rows).toHaveLength(1);
    expect(rows[0].intentId).toBe(issuer.dirName);
  });
});
