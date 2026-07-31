// covers: tools:amadeus-lib, tools:amadeus-state, tools:amadeus-audit
//
// G2 (targeting call-site migration) — the migrated call sites whose
// correctness IS the targeting.
//
// Each site below used to reach appendAuditEntry / appendAuditEntryUnlocked
// directly, choosing between the two on `holdsAuditLock`. The canonical path
// needs no such choice: withAuditLock's per-identity depth counter makes a
// nested emit re-enter, so ONE call covers both. What the migration must not
// lose is the (intent, space) pair — dropping it does not throw, it writes to
// whatever the active cursor happens to be. These tests pin the pair.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  auditFilePath,
  birthIntent,
  emitErrorAuditRow,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests } from "../../dist/claude/.claude/otel/fatal-latch.ts";
import { resetLoggerProviderForTests } from "../../dist/claude/.claude/otel/logger-provider.ts";
import { cleanupTestProject, createTestProject } from "../harness/fixtures.ts";

let proj: string;
beforeEach(() => {
  proj = createTestProject();
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
  ensureContextManager();
});
afterEach(() => {
  cleanupTestProject(proj);
});

function intentIdsIn(shardPath: string, eventName: string): string[] {
  return readFileSync(shardPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>)
    .filter((row) => row.eventName === eventName)
    .map((row) => String(row.intentId));
}

describe("emitError's audit row (amadeus-lib) — one path, lock held or not", () => {
  test("the row lands on the caller's own bucket when no lock is held", () => {
    const born = birthIntent(proj, "otel-emiterr", "default", "feature");

    emitErrorAuditRow(proj, "amadeus-test", "unit", "boom", born.dirName, "default");

    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "ERROR_LOGGED").length).toBe(1);
    expect(intentIdsIn(auditFilePath(proj, born.dirName, "default"), "amadeus.operation.failed")).toEqual([
      born.dirName,
    ]);
  });

  test("the SAME call re-enters an already-held lock for that identity instead of self-colliding", () => {
    const born = birthIntent(proj, "otel-emiterr-locked", "default", "feature");

    // The pre-migration site branched on holdsAuditLock here to avoid burning
    // the acquire budget against its own lock. The canonical path re-enters, so
    // the branch is gone — and this is what proves the branch was removable and
    // not merely removed. A non-reentrant append would spend 50 x 100ms and
    // then throw; the assertion is that it returns, promptly, having written.
    const startedMs = Date.now();
    withAuditLock(
      proj,
      () => {
        emitErrorAuditRow(proj, "amadeus-test", "in-lock", "boom", born.dirName, "default");
      },
      born.dirName,
      "default"
    );

    expect(Date.now() - startedMs).toBeLessThan(4000);
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "ERROR_LOGGED").length).toBe(1);
  });

  test("a targeted row does NOT leak into the active cursor's ledger", () => {
    const issuer = birthIntent(proj, "otel-emiterr-issuer", "default", "feature");
    const active = birthIntent(proj, "otel-emiterr-active", "default", "feature");

    emitErrorAuditRow(proj, "amadeus-test", "targeted", "boom", issuer.dirName, "default");

    expect(findAllEvents(readAllAuditShards(proj, issuer.dirName, "default"), "ERROR_LOGGED").length).toBe(1);
    expect(findAllEvents(readAllAuditShards(proj, active.dirName, "default"), "ERROR_LOGGED").length).toBe(0);
  });
});
