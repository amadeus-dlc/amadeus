// covers: tools:amadeus-audit otel:audit-emit
// size: medium
//
// audit-merge / audit-fork / guarded emit under the intent-complete drop
// (#1991). `AppendAuditResult`'s non-appended arm carries TWO reasons —
// "intent-complete" | "fatal-latch" — but the #1960 drop checks (PR #1966/#1968)
// were narrowed to fatal-latch in all three places. An intent-complete drop
// therefore reproduced #1960's failure shape on a COMPLETE intent: the merge
// delta landed via raw appendFileSync (bypassing the #1248 post-complete seal,
// which only guards the canonical emit), no AUDIT_MERGED row landed, and the
// handler reported jsonSuccess; audit-fork minted a worktree mirror off an
// AUDIT_FORKED row that never landed.
//
// The fix refuses intent-complete explicitly: audit-merge refuses BEFORE the
// delta append (the sealed ledger is never extended), audit-fork refuses before
// the shard copy (no mirror off a never-landed row), and emitAuditEventGuarded
// throws so an audit-first mutation handler cannot proceed with no ledger row
// behind it. The #1248 seal itself is untouched — it stays a suppression at the
// journal layer (t243 contract preserved).
//
// Also pinned here (#1991 (a)): the merge post-emit loud-fail arm must not
// claim "orphan delta is in <shard>" when entriesMerged === 0 — an empty delta
// skips the append, so there is no orphan.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  auditFilePath,
  birthIntent,
  findAllEvents,
  readAllAuditShards,
  transitionIntentStatusLocked,
  withAuditLock,
  withLockedIntentRegistry,
  worktreePath,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import { handleAuditFork, mergeDeltaUnderLock } from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  JOURNAL_SCHEMA_VERSION_V2,
  serializeJournalEntryV2,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import { emitAuditEventGuarded } from "../../dist/claude/.claude/otel/audit-emit.ts";
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
  resetFatalLatchForTests();
  resetLoggerProviderForTests();
  resetOtelBootstrapForTests();
});

const COORDS = {
  slug: "bolt-complete-merge",
  sourceHash: "0".repeat(64),
  boundary: 0,
  forkTs: "2026-08-02T00:00:00Z",
};

// One well-formed v1 journal record, appended verbatim the way a real
// post-fork delta is (t405/t388 fixture pattern).
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

// Flip the born intent's registry row to "complete" — the SAME transition the
// complete-workflow path runs, which is what the #1248 seal reads
// (intentStatusForAudit → registry row status).
function completeIntent(dirName: string): void {
  withLockedIntentRegistry(proj, (context) => transitionIntentStatusLocked(context, dirName, "complete"));
}

function ensureShard(shardPath: string): void {
  mkdirSync(dirname(shardPath), { recursive: true });
  if (!existsSync(shardPath)) writeFileSync(shardPath, "", "utf-8");
}

// A well-formed v2 row (t405 fixture pattern) for the empty-delta trip fixture.
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

// Corrupt the shard so the journal health probe latches INSIDE the next emit's
// bootstrap (t405 fixture pattern) — used by the empty-delta wording pin.
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

// Stub process.exit with a throwing sentinel AND capture stderr/stdout, so the
// loud-fail arms (which exit in production) are observable in-process
// (t405 runLoudFailArm pattern, stdout added because jsonSuccess writes there).
function runLoudFailArm(run: () => void): { exitCode: number | null; stderr: string; stdout: string } {
  const originalExit = process.exit;
  const originalWrite = process.stderr.write.bind(process.stderr);
  const originalOut = process.stdout.write.bind(process.stdout);
  const observed: { exitCode: number | null; stderr: string; stdout: string } = {
    exitCode: null,
    stderr: "",
    stdout: "",
  };
  (process as unknown as { exit: (c?: number) => never }).exit = ((c?: number) => {
    observed.exitCode = c ?? 0;
    throw new Error("__process_exit__");
  }) as never;
  (process.stderr as unknown as { write: (chunk: string) => boolean }).write = (chunk: string) => {
    observed.stderr += chunk;
    return true;
  };
  (process.stdout as unknown as { write: (chunk: string) => boolean }).write = (chunk: string) => {
    observed.stdout += chunk;
    return true;
  };
  try {
    run();
  } catch (e) {
    if (!(e instanceof Error) || e.message !== "__process_exit__") throw e;
  } finally {
    process.exit = originalExit;
    process.stderr.write = originalWrite;
    process.stdout.write = originalOut;
  }
  return observed;
}

describe("audit-merge under the intent-complete drop (#1991)", () => {
  test("a merge targeting a complete intent refuses BEFORE the delta append — sealed shard byte-unchanged", () => {
    const born = birthIntent(proj, "complete-merge-pre", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    const before = readFileSync(mainAudit, "utf-8");
    completeIntent(born.dirName);

    const observed = runLoudFailArm(() => {
      withAuditLock(
        proj,
        () => mergeDeltaUnderLock(proj, mainAudit, deltaFor(born.dirName), COORDS, born.dirName, "default"),
        born.dirName,
        "default",
      );
    });

    // Loud, non-success refusal naming the seal, with the correlation tags.
    expect(observed.exitCode).toBe(1);
    expect(observed.stderr).toContain("#1248");
    expect(observed.stderr).toContain(`[slug=${COORDS.slug}]`);
    expect(observed.stderr).toContain(`[fork-emitted:${COORDS.forkTs}]`);
    // No success was reported.
    expect(observed.stdout).not.toContain("AUDIT_MERGED");
    // The sealed ledger was NOT extended: delta never landed, no AUDIT_MERGED row.
    expect(readFileSync(mainAudit, "utf-8")).toBe(before);
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_MERGED").length).toBe(0);
  });

  test("a latch tripping with an EMPTY delta does not claim an orphan delta (#1991 (a))", () => {
    const born = birthIntent(proj, "complete-merge-empty", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    // Latch trips INSIDE the emit's bootstrap (t405 trip fixture); the delta is
    // empty, so the append was skipped — there is no orphan on the shard.
    corruptShard(mainAudit, born.dirName);
    resetFatalLatchForTests();
    resetLoggerProviderForTests();
    resetOtelBootstrapForTests();

    const observed = runLoudFailArm(() => {
      withAuditLock(
        proj,
        () => mergeDeltaUnderLock(proj, mainAudit, "", COORDS, born.dirName, "default"),
        born.dirName,
        "default",
      );
    });

    expect(observed.exitCode).toBe(1);
    // Honest wording: the empty delta skipped the append, so the message must
    // not claim an orphan delta is sitting in the shard.
    expect(observed.stderr).not.toContain("orphan delta (0 record(s)) is in");
    expect(observed.stderr).toContain("empty delta");
    expect(observed.stderr).toContain(mainAudit);
    expect(observed.stderr).toContain(`[slug=${COORDS.slug}]`);
  });
});

describe("audit-fork under the intent-complete drop (#1991)", () => {
  test("a fork targeting a complete intent refuses — no worktree mirror off a never-landed AUDIT_FORKED row", () => {
    const born = birthIntent(proj, "complete-fork-pre", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    const slug = "bolt-complete-fork";
    const wtPath = worktreePath(proj, slug);
    mkdirSync(wtPath, { recursive: true });
    completeIntent(born.dirName);

    const observed = runLoudFailArm(() => {
      handleAuditFork(["--slug", slug, "--intent", born.dirName, "--space", "default"], proj);
    });

    // Loud refusal naming the drop reason, not jsonSuccess.
    expect(observed.exitCode).toBe(1);
    expect(observed.stderr).toContain("intent-complete");
    expect(observed.stdout).not.toContain("AUDIT_FORKED");
    // No AUDIT_FORKED row landed, and no worktree audit mirror was minted.
    expect(findAllEvents(readAllAuditShards(proj, born.dirName, "default"), "AUDIT_FORKED").length).toBe(0);
    const wtEntries = existsSync(wtPath) ? readdirSync(wtPath, { recursive: true }) : [];
    expect(wtEntries.filter((e) => String(e).endsWith(".md") || String(e).endsWith(".jsonl")).length).toBe(0);
  });
});

describe("emitAuditEventGuarded under the intent-complete drop (#1991)", () => {
  test("an intent-complete drop refuses the mutation behind it (throws, not silent success)", () => {
    const born = birthIntent(proj, "complete-guarded", "default", "feature");
    const mainAudit = auditFilePath(proj, born.dirName, "default");
    ensureShard(mainAudit);
    const before = readFileSync(mainAudit, "utf-8");
    completeIntent(born.dirName);

    // The suppression advisory lands on stderr; capture it so the throw is the
    // only observable outcome asserted on.
    expect(
      runLoudFailArm(() => {
        expect(() =>
          emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "gated" }, proj, born.dirName, "default"),
        ).toThrow(/intent-complete/);
      }).exitCode,
    ).toBe(null);
    expect(readFileSync(mainAudit, "utf-8")).toBe(before);
  });

  test("an in-flight intent keeps the guarded emit appending (green control)", () => {
    const born = birthIntent(proj, "inflight-guarded", "default", "feature");

    const result = emitAuditEventGuarded("AUTONOMY_MODE_SET", { Mode: "gated" }, proj, born.dirName, "default");

    expect(result.appended).toBe(true);
    expect(readFileSync(auditFilePath(proj, born.dirName, "default"), "utf-8")).toContain("gated");
  });
});
