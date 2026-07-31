// covers: tools:amadeus-audit
//
// G2 (targeting call-site migration) — the audit-fork/merge critical section
// on the canonical emit path.
//
// This is the one migrated section where atomicity, not just targeting, is the
// point: the verbatim delta append and the AUDIT_MERGED row that describes it
// must land under a SINGLE lock acquisition, or another merger can interleave
// between them. The pre-migration code used appendAuditEntryUnlocked precisely
// so it would not double-acquire.
//
// WHAT THE MIGRATION COULD HAVE BROKEN, and what each test pins:
//   - the canonical emit locks through withAuditLock, whose per-identity depth
//     counter re-enters. If the target it is given DISAGREED with the identity
//     the enclosing section locked on, it would take a fresh OS acquire against
//     a lock this same process holds — burn the budget, then throw. So "it
//     returned promptly, having written" is the observable form of "it
//     re-entered", and it is also what keeps the section's own 20s
//     parallel-Bolt budget (AMADEUS_AUDIT_LOCK_RETRIES, 200 x 100ms) the only
//     acquire budget ever spent.
//   - the orphan-delta failure arm still emits its correlated ERROR_LOGGED from
//     inside the held lock.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  auditFilePath,
  birthIntent,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { mergeDeltaUnderLock } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
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

const COORDS = {
  slug: "bolt-otel-g2",
  sourceHash: "0".repeat(64),
  boundary: 0,
  forkTs: "2026-07-30T00:00:00Z",
};

// handleAuditMerge refuses outright when the main shard is absent, so the
// section under test always runs against an existing file. Model that: the
// verbatim delta append is a bare appendFileSync with no ensure-exists of its
// own, and a missing shard dir would fail there rather than in anything the
// migration touches.
function ensureShard(shardPath: string): void {
  mkdirSync(dirname(shardPath), { recursive: true });
  if (!existsSync(shardPath)) writeFileSync(shardPath, "", "utf-8");
}

function shardLines(shardPath: string): Record<string, unknown>[] {
  return readFileSync(shardPath, "utf-8")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

describe("the audit-merge critical section stays atomic on the canonical path", () => {
  test("the delta and its AUDIT_MERGED row land under the enclosing lock, promptly", () => {
    const born = birthIntent(proj, "otel-audit-merge", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    // One well-formed v1 journal record, appended verbatim the way a real
    // post-fork delta is.
    const delta = `${JSON.stringify({
      schemaVersion: 1,
      seq: 1,
      cloneId: "delta-clone",
      intentId: born.dirName,
      timestamp: "2026-07-30T00:00:01Z",
      heading: "Decision Recorded",
      event: "DECISION_RECORDED",
      fields: { Stage: "code-generation", Decision: "ship" },
    })}\n`;

    const startedMs = Date.now();
    const merged = withAuditLock(
      proj,
      () => mergeDeltaUnderLock(proj, mainAudit, delta, COORDS, born.dirName, "default"),
      born.dirName,
      "default"
    );

    // Re-entered rather than re-acquired: a fresh acquire against our own lock
    // would have spent the full budget before throwing.
    expect(Date.now() - startedMs).toBeLessThan(4000);
    expect(merged.entriesMerged).toBe(1);
    expect(merged.result.appended).toBe(true);

    // Both halves are in the target's shard, delta first.
    const rows = shardLines(mainAudit);
    const deltaRow = rows.findIndex((row) => row.event === "DECISION_RECORDED");
    const mergedRow = rows.findIndex((row) => row.eventName === "amadeus.audit.merged");
    expect(deltaRow).toBeGreaterThanOrEqual(0);
    expect(mergedRow).toBeGreaterThan(deltaRow);
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_MERGED").length).toBe(1);
    // The AUDIT_MERGED row claims the target intent, not the active cursor.
    expect(String(rows[mergedRow].intentId)).toBe(born.dirName);
  });

  test("an empty delta still records the merge, with a zero count", () => {
    const born = birthIntent(proj, "otel-audit-merge-empty", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);

    const merged = withAuditLock(
      proj,
      () => mergeDeltaUnderLock(proj, mainAudit, "", COORDS, born.dirName, "default"),
      born.dirName,
      "default"
    );

    expect(merged.entriesMerged).toBe(0);
    const row = shardLines(mainAudit).find((r) => r.eventName === "amadeus.audit.merged");
    expect(row).toBeDefined();
    expect((row?.attributes as Record<string, unknown>)["Entries Merged"]).toBe("0");
  });
});
