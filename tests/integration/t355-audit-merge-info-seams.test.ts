// covers: audit:AUDIT_MERGED worktree:info
//
// In-process coverage for the handler-side wiring the Issue #1628 groundwork
// (PR-1) routed through the new format-neutral seams: audit-merge's anchor /
// prefix refusal paths and its delta append, and worktree `info`'s field
// reads. The spawn-driven twins (tests/e2e/t07, e2e worktree flows) prove the
// process boundary; this file drives the same handlers in-process from the
// shipped dist tree so the changed lines register in lcov (t219 precedent).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
  appendAuditEntry,
  formatAuditRecord,
  handleAuditMerge,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  auditFilePath,
  relativeRecordDir,
  worktreeAuditFilePath,
  worktreePath,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
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
  priorProjectDir = process.env.CLAUDE_PROJECT_DIR;
});

afterEach(() => {
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
const MAIN_LEDGER = "# AI-DLC Audit Log\n";

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
    "Source Audit Hash": createHash("sha256").update(MAIN_LEDGER).digest("hex"),
    "Fork Boundary": String(Buffer.byteLength(MAIN_LEDGER, "utf-8")),
  };
  const anchor = formatAuditRecord({
    heading: "Audit Forked",
    timestamp: "2026-07-28T11:00:00Z",
    event: "AUDIT_FORKED",
    fields,
  });
  writeFileSync(wtShard, MAIN_LEDGER + anchor + (opts.deltas ?? []).join(""), "utf-8");
  return wtShard;
}

const delta = (event: string, ts: string) =>
  formatAuditRecord({ heading: event, timestamp: ts, event, fields: { "Bolt slug": SLUG } });

describe("audit-merge in-process (anchor / prefix / delta paths)", () => {
  test("happy path: appends the delta verbatim and emits AUDIT_MERGED with the count", () => {
    proj = seedProject();
    seedWtShard(proj, {
      deltas: [delta("BOLT_STARTED", "2026-07-28T11:01:00Z"), delta("BOLT_COMPLETED", "2026-07-28T11:02:00Z")],
    });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(false);
    const out = JSON.parse(run.stdout);
    expect(out.emitted).toBe("AUDIT_MERGED");
    expect(out.entries_merged ?? out.entriesMerged ?? out["Entries Merged"]).toBeDefined();
    const main = readFileSync(auditFilePath(proj), "utf-8");
    expect(main).toContain("**Event**: BOLT_STARTED");
    expect(main).toContain("**Event**: BOLT_COMPLETED");
    expect(main).toContain("**Event**: AUDIT_MERGED");
    expect(main).toContain("**Entries Merged**: 2");
  });

  test("malformed anchor (missing Fork Boundary) refuses via jsonError", () => {
    proj = seedProject();
    seedWtShard(proj, {
      anchorFields: {
        "Bolt slug": SLUG,
        "Source Audit Hash": createHash("sha256").update(MAIN_LEDGER).digest("hex"),
      },
    });
    const run = captureRun(() => handleAuditMerge(["--slug", SLUG], proj as string));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("missing Fork Boundary");
  });

  test("prefix-hash mismatch refuses with the tampering classification", () => {
    proj = seedProject();
    seedWtShard(proj, {
      anchorFields: {
        "Bolt slug": SLUG,
        "Source Audit Hash": "0".repeat(64),
        "Fork Boundary": String(Buffer.byteLength(MAIN_LEDGER, "utf-8")),
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
    appendAuditEntry(
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
    appendAuditEntry(
      "WORKTREE_CREATED",
      { "Bolt slug": SLUG, "Worktree path": `${proj}/.amadeus-worktrees/${SLUG}` },
      proj,
    );
    const run = captureRun(() => handleInfo(["--slug", SLUG]));
    expect(run.exited).toBe(true);
    expect(run.stderr).toContain("malformed WORKTREE_CREATED block");
  });
});
