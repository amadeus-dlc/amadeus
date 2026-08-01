// covers: tools:amadeus-audit otel:fatal-latch
// size: medium
//
// audit-merge / audit-fork under the fatal health latch (#1960). Under the
// latch the canonical emit DROPS (`{appended:false, reason:"fatal-latch"}`)
// without throwing (#1856), so an unchecked `result` let `audit-merge` report
// jsonSuccess with no AUDIT_MERGED row behind it — the delta already landed on
// the main shard, and the orphan-delta catch arm (which needs a THROW) never
// ran: an orphan delta with no ERROR_LOGGED correlation, invisible to doctor.
//
// The fix mirrors amadeus-state.ts emitAudit (FR-EVT-4): assertMutationAllowed
// BEFORE the mutation, plus a post-emit fatal-latch outcome check for the case
// where the journal health probe latches INSIDE the bootstrap that the emit
// itself runs (nothing to assert on beforehand). For audit-merge the pre-emit
// assert runs BEFORE the delta append, so a latched process refuses before
// mutating the main shard; the trip-between arm fails loudly on stderr naming
// the orphan delta location instead of returning into jsonSuccess.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  auditFilePath,
  birthIntent,
  findAllEvents,
  readAllAuditShards,
  withAuditLock,
  worktreePath,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handleAuditFork, mergeDeltaUnderLock } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  JOURNAL_SCHEMA_VERSION_V2,
  serializeJournalEntryV2,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { resetOtelBootstrapForTests } from "../../dist/claude/.claude/otel/bootstrap.ts";
import { ensureContextManager } from "../../dist/claude/.claude/otel/context.ts";
import { resetFatalLatchForTests, setFatal } from "../../dist/claude/.claude/otel/fatal-latch.ts";
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
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
});

const COORDS = {
  slug: "bolt-latch-merge",
  sourceHash: "0".repeat(64),
  boundary: 0,
  forkTs: "2026-08-02T00:00:00Z",
};

// One well-formed v1 journal record, appended verbatim the way a real
// post-fork delta is (t388 fixture pattern).
function deltaFor(intentId: string): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    seq: 1,
    cloneId: "delta-clone",
    intentId,
    timestamp: "2026-08-02T00:00:01Z",
    heading: "Decision Recorded",
    event: "DECISION_RECORDED",
    fields: { Stage: "code-generation", Decision: "ship" },
  })}\n`;
}

// A well-formed v2 row so a duplicated idempotencyKey corrupts a shard in a
// way the health probe latches on (t395 fixture pattern) while every reader
// that merely splits/hashes lines (fork boundary, prefix hash) stays happy.
function v2Row(seq: number, event: string, eventId: string, intentId: string): string {
  return serializeJournalEntryV2({
    schemaVersion: JOURNAL_SCHEMA_VERSION_V2,
    eventId,
    seq,
    timestamp: "2026-08-02T00:00:00Z",
    eventName: "amadeus.decision.recorded",
    attributes: { Event: event, Stage: "code-generation", Decision: "approve" },
    intentId,
    space: "default",
    cloneId: "abc123def456",
    traceId: null,
    spanId: null,
    traceFlags: 0,
    idempotencyKey: eventId,
    canonical: true,
  });
}

// Corrupt the shard so the journal health probe (FR-EVT-5) latches the
// process INSIDE the bootstrap the next canonical emit runs: two rows sharing
// one idempotencyKey after merge provenance — uniqueness violation.
function corruptShard(shardPath: string, intentId: string): void {
  const twice = "11111111-1111-4111-8111-111111111111";
  mkdirSync(dirname(shardPath), { recursive: true });
  writeFileSync(
    shardPath,
    [
      v2Row(1, "AUDIT_MERGED", "22222222-2222-4222-8222-222222222222", intentId),
      v2Row(2, "SENSOR_FIRED", twice, intentId),
      v2Row(3, "SENSOR_FIRED", twice, intentId),
    ].join(""),
    "utf-8",
  );
}

function ensureShard(shardPath: string): void {
  mkdirSync(dirname(shardPath), { recursive: true });
  if (!existsSync(shardPath)) writeFileSync(shardPath, "", "utf-8");
}

// Capture stderr for one call so the loud refusal can be asserted on.
function captureStderr(run: () => void): string {
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  (process.stderr as unknown as { write: (chunk: string) => boolean }).write = (chunk: string) => {
    captured += chunk;
    return true;
  };
  try {
    run();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

// Stub process.exit with a throwing sentinel AND capture stderr, so the
// loud-fail arm (which exits in production) is observable in-process.
function runLoudFailArm(run: () => void): { exitCode: number | null; stderr: string } {
  const originalExit = process.exit;
  const originalWrite = process.stderr.write.bind(process.stderr);
  const observed: { exitCode: number | null; stderr: string } = { exitCode: null, stderr: "" };
  (process as unknown as { exit: (c?: number) => never }).exit = ((c?: number) => {
    observed.exitCode = c ?? 0;
    throw new Error("__process_exit__");
  }) as never;
  (process.stderr as unknown as { write: (chunk: string) => boolean }).write = (chunk: string) => {
    observed.stderr += chunk;
    return true;
  };
  try {
    run();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "__process_exit__") throw e;
  } finally {
    process.exit = originalExit;
    process.stderr.write = originalWrite;
  }
  return observed;
}

describe("audit-merge under the fatal health latch (#1960)", () => {
  test("a latched process refuses the merge BEFORE mutating the main shard", () => {
    const born = birthIntent(proj, "latch-merge-pre", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    const before = readFileSync(mainAudit, "utf-8");

    setFatal("journal health probe failed: unparseable journal line");
    expect(() =>
      withAuditLock(
        proj,
        () => mergeDeltaUnderLock(proj, mainAudit, deltaFor(born.dirName), COORDS, born.dirName, "default"),
        born.dirName,
        "default",
      ),
    ).toThrow(/fatal health latch/);

    // No mutation: the delta did NOT land, no AUDIT_MERGED row appeared.
    expect(readFileSync(mainAudit, "utf-8")).toBe(before);
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_MERGED").length).toBe(0);
  });

  test("a latch tripping between the delta append and the emit fails loudly naming the orphan delta", () => {
    const born = birthIntent(proj, "latch-merge-trip", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    // Corrupt the shard, then reset the process-local otel state: the latch is
    // UNSET when the merge starts (pre-emit assert passes, delta appends), and
    // the health probe latches inside the emit's own bootstrap.
    corruptShard(mainAudit, born.dirName);
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();

    const observed = runLoudFailArm(() => {
      withAuditLock(
        proj,
        () => mergeDeltaUnderLock(proj, mainAudit, deltaFor(born.dirName), COORDS, born.dirName, "default"),
        born.dirName,
        "default",
      );
    });

    // Loud, non-success: exit 1 with the orphan delta location on stderr.
    expect(observed.exitCode).toBe(1);
    expect(observed.stderr).toContain(mainAudit);
    expect(observed.stderr).toContain(`[slug=${COORDS.slug}]`);
    expect(observed.stderr).toContain(`[fork-emitted:${COORDS.forkTs}]`);
    // The orphan state is real (delta landed, no AUDIT_MERGED row) — the point
    // is that it is now NAMED instead of reported as success.
    const shardText = readFileSync(mainAudit, "utf-8");
    expect(shardText).toContain("DECISION_RECORDED");
    expect(shardText).not.toContain("amadeus.audit.merged");
  });

  test("an unlatched merge still lands the delta and its AUDIT_MERGED row", () => {
    const born = birthIntent(proj, "latch-merge-green", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);

    const merged = withAuditLock(
      proj,
      () => mergeDeltaUnderLock(proj, mainAudit, deltaFor(born.dirName), COORDS, born.dirName, "default"),
      born.dirName,
      "default",
    );

    expect(merged.entriesMerged).toBe(1);
    expect(merged.result.appended).toBe(true);
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_MERGED").length).toBe(1);
  });
});

describe("audit-fork under the fatal health latch (#1960)", () => {
  test("a latched process refuses the fork before emitting or copying the shard", () => {
    const born = birthIntent(proj, "latch-fork-pre", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    const slug = "bolt-latch-fork";
    mkdirSync(worktreePath(proj, slug), { recursive: true });

    setFatal("journal health probe failed: unparseable journal line");
    expect(() =>
      handleAuditFork(["--slug", slug, "--intent", born.dirName, "--space", "default"], proj),
    ).toThrow(/fatal health latch/);

    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_FORKED").length).toBe(0);
  });

  test("a latch tripping inside the fork emit refuses before the shard copy", () => {
    const born = birthIntent(proj, "latch-fork-trip", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    corruptShard(mainAudit, born.dirName);
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();
    const slug = "bolt-latch-fork-trip";
    const wtPath = worktreePath(proj, slug);
    mkdirSync(wtPath, { recursive: true });

    captureStderr(() => {
      expect(() =>
        handleAuditFork(["--slug", slug, "--intent", born.dirName, "--space", "default"], proj),
      ).toThrow(/fatal health latch/);
    });

    // No worktree audit mirror was created off a fork row that never landed.
    const wtEntries = existsSync(wtPath) ? readdirSync(wtPath, { recursive: true }) : [];
    expect(wtEntries.filter((e) => String(e).endsWith(".md") || String(e).endsWith(".jsonl")).length).toBe(0);
  });
});
