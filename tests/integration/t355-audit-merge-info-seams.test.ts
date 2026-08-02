// covers: audit:AUDIT_MERGED worktree:info
//
// In-process coverage for the handler-side wiring the Issue #1628 groundwork
// (PR-1) routed through the new format-neutral seams: audit-merge's anchor /
// prefix refusal paths and its delta append, and worktree `info`'s field
// reads. The spawn-driven twins (tests/e2e/t07, e2e worktree flows) prove the
// process boundary; this file drives the same handlers in-process from the
// shipped dist tree so the changed lines register in lcov (t219 precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import { countAuditEvent } from "../harness/audit-records.ts";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  handleAuditMerge,
  mergeDeltaUnderLock,
} from "../../packages/framework/core/tools/amadeus-audit.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  auditFilePath,
  auditLockDir,
  _resetCloneIdForTests,
  releaseAuditLock,
  relativeRecordDir,
  worktreeAuditFilePath,
  worktreePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleInfo } from "../../dist/claude/.claude/tools/amadeus-worktree.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditShard,
  seedStateFile,
} from "../harness/fixtures.ts";

let proj: string | undefined;
let priorProjectDir: string | undefined;

beforeEach(() => {
  resetOtelPerProject();
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
});

afterEach(() => {
  resetOtelPerProject();
  if (priorProjectDir === undefined) delete process.env.CLAUDE_PROJECT_DIR;
  else process.env.CLAUDE_PROJECT_DIR = priorProjectDir;
  cleanupTestProject(proj);
  proj = undefined;
});

// --- exit/stdout/stderr capture (t219 precedent) ---
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureRun(fn: () => void): { exited: boolean; stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  const origLog = console.log.bind(console);
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stdout.write = ((chunk: unknown) => {
    stdout += String(chunk);
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: unknown) => {
    stderr += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  console.log = ((...parts: unknown[]) => {
    stdout += `${parts.join(" ")}\n`;
  }) as typeof console.log;
  let exited = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) exited = true;
    else throw e;
  } finally {
    process.exit = origExit;
    process.stdout.write = origOut;
    process.stderr.write = origErr;
    console.log = origLog;
  }
  return { exited, stdout, stderr };
}

const SLUG = "u1-merge-seam";
const SEED_IDENTITY = { schemaVersion: JOURNAL_SCHEMA_VERSION, cloneId: "seedclone0001", intentId: "seed-intent" };
const seedLine = (seq: number, event: string, ts: string, fields: Record<string, string> = {}) =>
  serializeJournalEntry({ ...SEED_IDENTITY, seq, timestamp: ts, heading: event, event, fields });
const MAIN_LEDGER = seedLine(1, "WORKFLOW_STARTED", "2026-07-28T09:00:00Z");

function seedProject(): string {
  const p = createTestProject();
  seedStateFile(p, "state-init-active.md");
  process.env.CLAUDE_PROJECT_DIR = p;
  const mainShard = seededAuditShard(p);
  mkdirSync(dirname(mainShard), { recursive: true });
  writeFileSync(mainShard, MAIN_LEDGER, "utf-8");
  return p;
}

// Seed a worktree shard: main prefix + AUDIT_FORKED anchor + optional deltas.
// `sourceHash`/`boundary` default to the honest values for MAIN_LEDGER.
function seedWtShard(
  p: string,
  opts: { anchorFields?: Record<string, string>; deltas?: string[] } = {},
): string {
  const wtPath = worktreePath(p, SLUG);
  mkdirSync(wtPath, { recursive: true });
  const wtShard = worktreeAuditFilePath(wtPath, relativeRecordDir(p), p);
  mkdirSync(dirname(wtShard), { recursive: true });
  const fields = opts.anchorFields ?? {
    "Bolt slug": SLUG,
    "Source Audit Hash": createHash("sha256").update(MAIN_LEDGER, "utf-8").digest("hex"),
    "Fork Boundary": "1",
  };
  const anchor = seedLine(2, "AUDIT_FORKED", "2026-07-28T11:00:00Z", fields);
  writeFileSync(wtShard, MAIN_LEDGER + anchor + (opts.deltas ?? []).join(""), "utf-8");
  return wtShard;
}

const delta = (seq: number, event: string, ts: string) =>
  seedLine(seq, event, ts, { "Bolt slug": SLUG });

describe("audit-merge in-process (anchor / prefix / delta paths)", () => {
  test("happy path: appends the delta verbatim and emits AUDIT_MERGED with the count", () => {
    proj = seedProject();
    seedWtShard(proj, {
      deltas: [delta(3, "BOLT_STARTED", "2026-07-28T11:01:00Z"), delta(4, "BOLT_COMPLETED", "2026-07-28T11:02:00Z")],
    });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(false);
    const out = JSON.parse(run.stdout);
    expect(out.emitted).toBe("AUDIT_MERGED");
    expect(out.entries_merged ?? out.entriesMerged ?? out["Entries Merged"]).toBeDefined();
    const main = readFileSync(auditFilePath(proj), "utf-8");
    expect(main).toContain('"event":"BOLT_STARTED"');
    expect(main).toContain('"event":"BOLT_COMPLETED"');
    // AUDIT_MERGED is migrated onto the canonical path, so the row is schema v2.
    expect(countAuditEvent(main, "AUDIT_MERGED")).toBeGreaterThan(0);
    expect(main).toContain('"Entries Merged":"2"');

    const replay = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(replay.exited).toBe(false);
    expect(JSON.parse(replay.stdout)).toMatchObject({ emitted: "AUDIT_MERGED", reentrant: true });
  });

  test("a missing worktree audit directory is classified before merge", () => {
    proj = seedProject();
    mkdirSync(worktreePath(proj, SLUG), { recursive: true });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("worktree audit not found");
  });

  test("multiple fork shards are rejected as ambiguous evidence", () => {
    proj = seedProject();
    const first = seedWtShard(proj);
    writeFileSync(join(dirname(first), "second.jsonl"), readFileSync(first, "utf-8"), "utf-8");
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("ambiguous worktree audit evidence");
  });

  test("clone regeneration refuses when the original source shard vanished", () => {
    proj = seedProject();
    const originalMain = auditFilePath(proj);
    seedWtShard(proj);
    rmSync(originalMain);
    writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), "newclone0002\n", "utf-8");
    _resetCloneIdForTests();
    writeFileSync(auditFilePath(proj), "", "utf-8");

    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("main audit source shard not found");
  });

  test("malformed anchor (missing Fork Boundary) refuses via jsonError", () => {
    proj = seedProject();
    seedWtShard(proj, {
      anchorFields: {
        "Bolt slug": SLUG,
        "Source Audit Hash": createHash("sha256").update(MAIN_LEDGER, "utf-8").digest("hex"),
      },
    });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("missing Fork Boundary");
  });

  test("a valid AUDIT_FORKED anchor without a trailing separator is rejected", () => {
    proj = seedProject();
    const shard = seedWtShard(proj);
    writeFileSync(shard, readFileSync(shard, "utf-8").trimEnd(), "utf-8");

    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));

    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("no separator after AUDIT_FORKED block");
  });

  // E-U8PRE O-L1: the section now runs under withAuditLock with the extended
  // env-tunable budget passed through explicitly. A spent budget arrives as
  // AuditLockAcquireError and must still surface as audit-merge's own JSON
  // error, not as an escaping throw.
  test("a spent lock budget refuses with the in-flight-merge classification", () => {
    proj = seedProject();
    seedWtShard(proj, { deltas: [delta(3, "BOLT_STARTED", "2026-07-28T11:01:00Z")] });
    const priorRetries = process.env.AMADEUS_AUDIT_LOCK_RETRIES;
    process.env.AMADEUS_AUDIT_LOCK_RETRIES = "0";
    // A live, freshly stamped holder this process did not take through
    // withAuditLock: no depth entry, so no reentrancy and no stale reap.
    const lockDir = auditLockDir(proj);
    mkdirSync(lockDir, { recursive: true });
    writeFileSync(
      join(lockDir, "owner.json"),
      JSON.stringify({ pid: process.pid, startedAtMs: Math.floor(performance.timeOrigin) }),
      "utf-8",
    );
    let run: { exited: boolean; stderr: string };
    try {
      run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    } finally {
      releaseAuditLock(proj);
      if (priorRetries === undefined) delete process.env.AMADEUS_AUDIT_LOCK_RETRIES;
      else process.env.AMADEUS_AUDIT_LOCK_RETRIES = priorRetries;
    }
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("Failed to acquire audit lock");
    expect(run.stderr).toContain("another merge in flight?");
  });

  // The orphan-delta arm: the delta append fails AFTER the lock is held, so the
  // section emits ERROR_LOGGED with the correlation tags doctor scans for and
  // exits non-zero. Driven through the exported section seam because the handler
  // routes both appends at the same shard — a broken shard would take the
  // ERROR_LOGGED write down with it and the arm would never be reached.
  test("a failed delta append emits ERROR_LOGGED with the correlation tags", () => {
    proj = seedProject();
    const unwritableDelta = join(proj, "no-such-dir", "main.jsonl");
    const run = captureRun(() =>
      mergeDeltaUnderLock(
        proj as string,
        unwritableDelta,
        delta(3, "BOLT_STARTED", "2026-07-28T11:01:00Z"),
        { slug: SLUG, sourceHash: "0".repeat(64), boundary: 1, forkTs: "2026-07-28T11:00:00Z" },
      ),
    );
    expect(run.exited).toBe(true);
    const main = readFileSync(auditFilePath(proj), "utf-8");
    expect(countAuditEvent(main, "ERROR_LOGGED")).toBeGreaterThan(0);
    expect(main).toContain(`[slug=${SLUG}]`);
    expect(main).toContain("[fork-emitted:2026-07-28T11:00:00Z]");
    expect(countAuditEvent(main, "AUDIT_MERGED")).toBe(0);
  });

  test("a partially present delta is refused instead of duplicated", () => {
    proj = seedProject();
    const first = delta(3, "BOLT_STARTED", "2026-07-28T11:01:00Z");
    const second = delta(4, "BOLT_COMPLETED", "2026-07-28T11:02:00Z");
    const mainAudit = auditFilePath(proj);
    writeFileSync(mainAudit, MAIN_LEDGER + first, "utf-8");
    const run = captureRun(() =>
      mergeDeltaUnderLock(
        proj as string,
        mainAudit,
        first + second,
        { slug: SLUG, sourceHash: "0".repeat(64), boundary: 1, forkTs: "2026-07-28T11:00:00Z" },
      ),
    );
    expect(run.exited).toBe(true);
    expect(readFileSync(mainAudit, "utf-8")).toContain("partial audit delta evidence");
  });

  test("prefix-hash mismatch refuses with the tampering classification", () => {
    proj = seedProject();
    seedWtShard(proj, {
      anchorFields: {
        "Bolt slug": SLUG,
        "Source Audit Hash": "0".repeat(64),
        "Fork Boundary": "1",
      },
    });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("tampering suspected");
  });
});

describe("worktree info in-process (field reads over the shared accessor)", () => {
  test("happy path: emits path, branch, and merge_held=false", () => {
    proj = seedProject();
    plantV1AuditRow(
      "WORKTREE_CREATED",
      {
        "Bolt slug": SLUG,
        "Worktree path": `${proj}/.amadeus-worktrees/${SLUG}`,
        "Branch name": `bolt/${SLUG}`,
      },
      proj,
    );
    const run = captureRun(() => handleInfo(["--slug", SLUG]));
    expect(run.exited).toBe(false);
    const out = JSON.parse(run.stdout);
    expect(out.slug).toBe(SLUG);
    expect(out.path).toBe(`${proj}/.amadeus-worktrees/${SLUG}`);
    expect(out.branch_name).toBe(`bolt/${SLUG}`);
    expect(out.merge_held).toBe(false);
  });

  test("malformed WORKTREE_CREATED (missing Branch name) exits with an error", () => {
    proj = seedProject();
    plantV1AuditRow(
      "WORKTREE_CREATED",
      { "Bolt slug": SLUG, "Worktree path": `${proj}/.amadeus-worktrees/${SLUG}` },
      proj,
    );
    const run = captureRun(() => handleInfo(["--slug", SLUG]));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("malformed WORKTREE_CREATED block");
  });
});
