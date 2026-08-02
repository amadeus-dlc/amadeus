// covers: subcommand:amadeus-bolt:complete, subcommand:amadeus-audit:audit-merge

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import {
  JOURNAL_SCHEMA_VERSION,
  serializeJournalEntry,
} from "../../dist/claude/.claude/tools/amadeus-journal.ts";
import {
  handleBoltCommand,
  handleComplete,
  runBoltCli,
} from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  assessAuditMergeRecovery,
  assessBoltCompletionRecovery,
  assessStateMergeRecovery,
} from "../../packages/framework/core/tools/amadeus-merge-recovery.ts";
import {
  relativeRecordDir,
  worktreePath,
  worktreeStateFilePath,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import { auditRowsFrom } from "../harness/audit-records.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditDir,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const BOLT_TOOL = join(AMADEUS_SRC, "tools", "amadeus-bolt.ts");

type Run = { status: number; out: string };

function runBolt(projectDir: string, args: string[]): Run {
  const result = spawnSync(BUN, [BOLT_TOOL, "--project-dir", projectDir, ...args], {
    cwd: projectDir,
    encoding: "utf-8",
  });
  return {
    status: result.status ?? -1,
    out: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

function setupProject(slug: string): string {
  const projectDir = createTestProject();
  seedStateFile(projectDir, "state-construction.md");
  seedAuditFile(projectDir);
  mkdirSync(join(projectDir, ".amadeus", "worktrees", `bolt-${slug}`), { recursive: true });
  return projectDir;
}

function directArgs(
  projectDir: string,
  handler: (args: string[], explicitProjectDir?: string) => void,
  args: string[],
): Run {
  let status = 0;
  let out = "";
  const originalExit = process.exit.bind(process);
  const originalLog = console.log.bind(console);
  const originalConsoleError = console.error.bind(console);
  const originalError = process.stderr.write.bind(process.stderr);
  class ExitSignal extends Error {
    constructor(readonly code: number) {
      super(`exit ${code}`);
    }
  }
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = ((value: unknown) => {
    out += `${String(value)}\n`;
  }) as typeof console.log;
  console.error = ((value: unknown) => {
    out += `${String(value)}\n`;
  }) as typeof console.error;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    out += String(chunk);
    return true;
  }) as typeof process.stderr.write;
  try {
    handler(args, projectDir);
  } catch (error) {
    if (error instanceof ExitSignal) status = error.code;
    else throw error;
  } finally {
    process.exit = originalExit;
    console.log = originalLog;
    console.error = originalConsoleError;
    process.stderr.write = originalError;
  }
  return { status, out };
}

function start(projectDir: string, slug: string, batch = "2"): Run {
  return directCommand(projectDir, "start", [
    "--name",
    slug,
    "--batch",
    batch,
    "--worktree",
    "--slug",
    slug,
  ]);
}

function directCommand(projectDir: string, command: string, args: string[]): Run {
  return directArgs(projectDir, (commandArgs, explicitProjectDir) => {
    handleBoltCommand(command, commandArgs, explicitProjectDir);
  }, args);
}

function completeArgs(projectDir: string, args: string[]): Run {
  return directArgs(projectDir, handleComplete, args);
}

function complete(projectDir: string, slug: string, batch = "2"): Run {
  return directCommand(projectDir, "complete", [
    "--name",
    slug,
    "--batch",
    batch,
    "--merge",
    "--slug",
    slug,
  ]);
}

function allAudit(projectDir: string): string {
  return readdirSync(seededAuditDir(projectDir))
    .filter((name) => name.endsWith(".jsonl"))
    .sort()
    .map((name) => readFileSync(join(seededAuditDir(projectDir), name), "utf-8"))
    .join("\n");
}

function eventCount(projectDir: string, event: string, slug?: string): number {
  return auditRowsFrom(allAudit(projectDir)).filter(
    (row) => row.event === event && (slug === undefined || row.fields["Bolt slug"] === slug),
  ).length;
}

function boltRefs(projectDir: string): string {
  return (
    readFileSync(seededStateFile(projectDir), "utf-8")
      .split("\n")
      .find((line) => line.includes("Bolt Refs")) ?? ""
  );
}

function worktreeAuditDir(projectDir: string, slug: string): string {
  return join(
    projectDir,
    ".amadeus",
    "worktrees",
    `bolt-${slug}`,
    "amadeus",
    "spaces",
    DEFAULT_SPACE,
    "intents",
    DEFAULT_RECORD_DIR,
    "audit",
  );
}

let evidenceSeq = 1000;
function appendEvidence(
  projectDir: string,
  event: string,
  slug: string,
  fields: Record<string, string> = {},
  timestamp = "2026-08-02T13:00:00.000Z",
): void {
  const shard = readdirSync(seededAuditDir(projectDir)).find((name) => name.endsWith(".jsonl"));
  if (shard === undefined) throw new Error("fixture audit shard is missing");
  appendFileSync(
    join(seededAuditDir(projectDir), shard),
    serializeJournalEntry({
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      cloneId: "t414evidence",
      intentId: DEFAULT_RECORD_DIR,
      seq: evidenceSeq++,
      timestamp,
      heading: event,
      event,
      fields: { "Bolt slug": slug, ...fields },
    }),
    "utf-8",
  );
}

function stateEvidenceProject(
  slug: string,
  overrides: Record<string, string> = {},
): { projectDir: string; sourceState: string } {
  const projectDir = setupProject(slug);
  projects.push(projectDir);
  writeFileSync(seededStateFile(projectDir), "- **Bolt Refs**: []\n", "utf-8");
  const sourceState = "- **Status**: running\n";
  const worktreeState = worktreeStateFilePath(
    worktreePath(projectDir, slug),
    relativeRecordDir(projectDir),
  );
  mkdirSync(dirname(worktreeState), { recursive: true });
  writeFileSync(worktreeState, sourceState, "utf-8");
  appendEvidence(projectDir, "STATE_FORKED", slug);
  appendEvidence(projectDir, "STATE_MERGED", slug, {
    "Worktree path": worktreePath(projectDir, slug),
    "Source state hash": createHash("sha256").update(sourceState).digest("hex"),
    "Target state hash": "a".repeat(64),
    "Conflict resolution": "none",
    ...overrides,
  });
  return { projectDir, sourceState };
}

let projects: string[] = [];

beforeEach(() => {
  resetAidlcEnv();
  resetOtelPerProject();
});
afterEach(() => {
  for (const projectDir of projects) cleanupTestProject(projectDir);
  projects = [];
  resetOtelPerProject();
});

describe("t414 complete --merge partial-success recovery", () => {
  test("covers the source start, fail, and abort lifecycle handlers", () => {
    const projectDir = setupProject("direct-lifecycle");
    projects.push(projectDir);

    const plainStart = directCommand(projectDir, "start", [
      "--name",
      "plain",
      "--batch",
      "1",
    ]);
    expect(plainStart.status).toBe(0);
    expect(plainStart.out).toContain('"emitted":"BOLT_STARTED"');

    const failed = directCommand(projectDir, "fail", [
      "--name",
      "direct-lifecycle",
      "--error",
      "expected failure",
      "--slug",
      "direct-lifecycle",
      "--succeeded-siblings",
      "plain",
    ]);
    expect(failed.status).toBe(0);
    expect(failed.out).toContain('"emitted":"BOLT_FAILED"');

    const aborted = directCommand(projectDir, "abort", [
      "--name",
      "direct-lifecycle",
      "--slug",
      "direct-lifecycle",
      "--reason",
      "operator request",
    ]);
    expect(aborted.status).toBe(0);
    expect(aborted.out).toContain('"reason":"aborted"');
    expect(aborted.out).toContain('"discarded":false');

    const worktreeStart = start(projectDir, "direct-lifecycle");
    expect(worktreeStart.status).toBe(0);
    expect(directCommand(projectDir, "hold-merge", [
      "--slug",
      "direct-lifecycle",
    ]).out).toContain('"merge_held":true');
    expect(directCommand(projectDir, "release-merge", [
      "--slug",
      "direct-lifecycle",
    ]).out).toContain('"merge_held":false');

    for (const [event, eventArgs] of [
      ["MERGE_DISPATCH_INVOKED", ["--practices-excerpt", "merge practice"]],
      [
        "MERGE_DISPATCH_RETURNED",
        [
          "--strategy",
          "squash",
          "--target",
          "main",
          "--confidence",
          "1",
          "--notes",
          "ready",
        ],
      ],
      ["MERGE_DISPATCH_FALLBACK", ["--reason", "timeout", "--defaults", "squash main"]],
    ] as const) {
      const dispatched = directCommand(projectDir, "dispatch-event", [
        "--event",
        event,
        "--slug",
        "direct-lifecycle",
        ...eventArgs,
      ]);
      expect(dispatched.status).toBe(0);
      expect(dispatched.out).toContain(`"emitted":"${event}"`);
    }

    appendFileSync(
      seededStateFile(projectDir),
      "\n- **Construction Autonomy Mode**: autonomous\n",
      "utf-8",
    );
    const autonomy = directCommand(projectDir, "set-autonomy", ["--mode", "gated"]);
    expect(autonomy.status, autonomy.out).toBe(0);
    expect(autonomy.out).toContain('"mode":"gated"');

    const approval = directCommand(projectDir, "approve-batch", ["--batch", "2"]);
    expect(approval.status).toBe(0);
    expect(approval.out).toContain('"approved_batches":[2]');

    const unknown = directCommand(projectDir, "unknown", []);
    expect(unknown.status).toBe(1);
    expect(unknown.out).toContain("Unknown subcommand: unknown");

    const cliStart = directArgs(projectDir, () => {
      runBoltCli([
        "--project-dir",
        projectDir,
        "start",
        "--name",
        "cli-start",
        "--batch",
        "3",
      ]);
    }, []);
    expect(cliStart.status).toBe(0);
    expect(cliStart.out).toContain('"emitted":"BOLT_STARTED"');

    const cliUnknown = directArgs(projectDir, () => {
      runBoltCli(["--project-dir", projectDir, "unknown"]);
    }, []);
    expect(cliUnknown.status).toBe(1);
    expect(cliUnknown.out).toContain("Unknown subcommand: unknown");
  });

  test("rejects an invalid batch before emitting completion evidence", () => {
    const projectDir = setupProject("invalid-batch");
    projects.push(projectDir);

    const result = completeArgs(projectDir, ["--name", "invalid-batch", "--batch", "0"]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("Must be a positive integer");
    expect(eventCount(projectDir, "BOLT_COMPLETED")).toBe(0);
  });

  test("rejects csv merge requests before emitting completion evidence", () => {
    const projectDir = setupProject("csv");
    projects.push(projectDir);

    const result = completeArgs(projectDir, [
      "--name",
      "csv,other",
      "--batch",
      "2",
      "--merge",
      "--slug",
      "csv",
    ]);

    expect(result.status).toBe(1);
    expect(result.out).toContain("requires a single bolt name");
    expect(eventCount(projectDir, "BOLT_COMPLETED", "csv")).toBe(0);
  });

  test("refuses a held merge through the source completion handler", () => {
    const projectDir = setupProject("held");
    projects.push(projectDir);
    expect(start(projectDir, "held").status).toBe(0);
    expect(runBolt(projectDir, ["hold-merge", "--slug", "held"]).status).toBe(0);

    const result = complete(projectDir, "held");

    expect(result.status).toBe(1);
    expect(result.out).toContain('"reason":"merge-held"');
    expect(eventCount(projectDir, "BOLT_COMPLETED", "held")).toBe(0);
  });

  test("reports a source state-merge failure without minting merge evidence", () => {
    const projectDir = setupProject("state-failure");
    projects.push(projectDir);
    expect(start(projectDir, "state-failure").status).toBe(0);
    rmSync(
      worktreeStateFilePath(
        worktreePath(projectDir, "state-failure"),
        relativeRecordDir(projectDir),
      ),
      { force: true },
    );

    const result = complete(projectDir, "state-failure");

    expect(result.status).toBe(1);
    expect(result.out).toContain('"reason":"state-merge-failed"');
    expect(eventCount(projectDir, "STATE_MERGED", "state-failure")).toBe(0);
  });

  test("rejects mismatched completion evidence in the current fork cycle", () => {
    const projectDir = setupProject("completion-mismatch");
    projects.push(projectDir);
    expect(start(projectDir, "completion-mismatch", "2").status).toBe(0);
    appendEvidence(projectDir, "BOLT_COMPLETED", "completion-mismatch", {
      "Bolt names": "completion-mismatch",
      "Batch number": "99",
    }, "9999-08-02T13:00:00.000Z");

    const result = complete(projectDir, "completion-mismatch", "2");

    expect(result.status).toBe(1);
    expect(result.out).toContain('"reason":"bolt-completion-evidence-invalid"');
  });

  test("resumes after STATE_MERGED when audit merge failed without duplicating lifecycle evidence", () => {
    const projectDir = setupProject("partial");
    projects.push(projectDir);
    expect(start(projectDir, "partial").status).toBe(0);

    const auditDir = worktreeAuditDir(projectDir, "partial");
    const auditName = readdirSync(auditDir).find((name) => name.endsWith(".jsonl"));
    expect(auditName).toBeDefined();
    const auditPath = join(auditDir, auditName!);
    const hiddenPath = `${auditPath}.saved`;
    renameSync(auditPath, hiddenPath);

    const first = complete(projectDir, "partial");
    expect(first.status).toBe(1);
    expect(boltRefs(projectDir)).not.toContain("partial");
    expect(eventCount(projectDir, "STATE_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "partial")).toBe(1);

    renameSync(hiddenPath, auditPath);
    const retry = complete(projectDir, "partial");
    expect(retry.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "partial")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "partial")).toBe(1);
  });

  test("finds the unique fork shard after the main clone cursor is regenerated", () => {
    const projectDir = setupProject("cursor");
    projects.push(projectDir);
    expect(start(projectDir, "cursor").status).toBe(0);

    const worktreeShard = readdirSync(worktreeAuditDir(projectDir, "cursor")).find((name) =>
      name.endsWith(".jsonl"),
    );
    expect(worktreeShard).toBeDefined();
    const marker = serializeJournalEntry({
      schemaVersion: JOURNAL_SCHEMA_VERSION,
      cloneId: "t414cursor",
      intentId: DEFAULT_RECORD_DIR,
      seq: 999,
      timestamp: "2026-08-02T13:00:00.000Z",
      heading: "Hook Dropped",
      event: "HOOK_DROPPED",
      fields: { Hook: "t414-cursor-delta", Reason: "target-shard-proof" },
    });
    appendFileSync(
      join(worktreeAuditDir(projectDir, "cursor"), worktreeShard!),
      marker,
      "utf-8",
    );

    rmSync(join(projectDir, "amadeus", ".amadeus-clone-id"), { force: true });
    const result = complete(projectDir, "cursor");

    expect(result.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "cursor")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "cursor")).toBe(1);
    const sourceShard = readFileSync(
      join(seededAuditDir(projectDir), worktreeShard!),
      "utf-8",
    );
    expect(sourceShard).toContain("t414-cursor-delta");
    const otherShards = readdirSync(seededAuditDir(projectDir))
      .filter((name) => name.endsWith(".jsonl") && name !== worktreeShard)
      .map((name) => readFileSync(join(seededAuditDir(projectDir), name), "utf-8"))
      .join("\n");
    expect(otherShards).not.toContain("t414-cursor-delta");
  });

  test("a fully merged Bolt replays as an idempotent success", () => {
    const projectDir = setupProject("replay");
    projects.push(projectDir);
    expect(start(projectDir, "replay").status).toBe(0);
    const completed = complete(projectDir, "replay");
    expect(completed.status, completed.out).toBe(0);

    const replay = complete(projectDir, "replay");
    expect(replay.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "replay")).toBe(1);
    expect(eventCount(projectDir, "AUDIT_MERGED", "replay")).toBe(1);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "replay")).toBe(1);
  });

  test("a new fork cycle with the same slug ignores prior merge evidence", () => {
    const projectDir = setupProject("redo");
    projects.push(projectDir);
    expect(start(projectDir, "redo", "2").status).toBe(0);
    expect(complete(projectDir, "redo", "2").status).toBe(0);

    expect(start(projectDir, "redo", "3").status).toBe(0);
    const second = complete(projectDir, "redo", "3");

    expect(second.status).toBe(0);
    expect(eventCount(projectDir, "STATE_MERGED", "redo")).toBe(2);
    expect(eventCount(projectDir, "AUDIT_MERGED", "redo")).toBe(2);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "redo")).toBe(2);
  });

  test("same-timestamp lifecycle rows are separated by ledger order", () => {
    const projectDir = setupProject("tied");
    projects.push(projectDir);
    const shard = readdirSync(seededAuditDir(projectDir)).find((name) => name.endsWith(".jsonl"));
    expect(shard).toBeDefined();
    const timestamp = "2026-08-02T13:00:00.000Z";
    const entries: Array<{ event: string; fields: Record<string, string> }> = [
      { event: "STATE_FORKED", fields: { "Bolt slug": "tied" } },
      {
        event: "BOLT_COMPLETED",
        fields: { "Bolt slug": "tied", "Bolt names": "tied", "Batch number": "2" },
      },
      { event: "STATE_FORKED", fields: { "Bolt slug": "tied" } },
      {
        event: "BOLT_COMPLETED",
        fields: { "Bolt slug": "tied", "Bolt names": "tied", "Batch number": "3" },
      },
    ];
    const rows = entries.map(({ event, fields }, index) =>
      serializeJournalEntry({
        schemaVersion: JOURNAL_SCHEMA_VERSION,
        cloneId: "t414tied",
        intentId: DEFAULT_RECORD_DIR,
        seq: 100 + index,
        timestamp,
        heading: event,
        event,
        fields,
      }),
    );
    appendFileSync(join(seededAuditDir(projectDir), shard!), rows.join(""), "utf-8");

    expect(assessBoltCompletionRecovery(projectDir, "tied", "tied", "3")).toEqual({
      status: "verified",
    });
    expect(assessBoltCompletionRecovery(projectDir, "tied", "tied", "2")).toMatchObject({
      status: "invalid",
    });
  });

  test("state merge recovery rejects each unverifiable evidence shape", () => {
    const missingState = createTestProject();
    projects.push(missingState);
    expect(assessStateMergeRecovery(missingState, "missing")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("cannot read main state"),
    });

    const missingRefs = setupProject("missing-refs");
    projects.push(missingRefs);
    writeFileSync(seededStateFile(missingRefs), "- **Status**: running\n", "utf-8");
    expect(assessStateMergeRecovery(missingRefs, "missing-refs")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("Bolt Refs field"),
    });

    const stillReferenced = setupProject("referenced");
    projects.push(stillReferenced);
    writeFileSync(seededStateFile(stillReferenced), "- **Bolt Refs**: [referenced]\n", "utf-8");
    appendEvidence(stillReferenced, "STATE_FORKED", "referenced");
    appendEvidence(stillReferenced, "STATE_MERGED", "referenced");
    expect(assessStateMergeRecovery(stillReferenced, "referenced")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("remains in Bolt Refs"),
    });

    const missingWorktreeState = setupProject("missing-worktree-state");
    projects.push(missingWorktreeState);
    writeFileSync(seededStateFile(missingWorktreeState), "- **Bolt Refs**: []\n", "utf-8");
    appendEvidence(missingWorktreeState, "STATE_FORKED", "missing-worktree-state");
    appendEvidence(missingWorktreeState, "STATE_MERGED", "missing-worktree-state");
    expect(assessStateMergeRecovery(missingWorktreeState, "missing-worktree-state")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("worktree state is missing"),
    });

    const wrongPath = stateEvidenceProject("wrong-path", { "Worktree path": "/wrong" });
    expect(assessStateMergeRecovery(wrongPath.projectDir, "wrong-path")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("Worktree path"),
    });
    const wrongHash = stateEvidenceProject("wrong-hash", { "Source state hash": "0".repeat(64) });
    expect(assessStateMergeRecovery(wrongHash.projectDir, "wrong-hash")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("Source state hash"),
    });
    const malformed = stateEvidenceProject("malformed", { "Target state hash": "bad" });
    expect(assessStateMergeRecovery(malformed.projectDir, "malformed")).toMatchObject({
      status: "invalid",
      detail: expect.stringContaining("required evidence is malformed"),
    });
    const verified = stateEvidenceProject("verified");
    expect(assessStateMergeRecovery(verified.projectDir, "verified")).toEqual({
      status: "verified",
    });
  });

  test("audit merge recovery distinguishes pending, mismatched, ambiguous, and verified evidence", () => {
    const pending = setupProject("audit-pending");
    projects.push(pending);
    appendEvidence(pending, "STATE_FORKED", "audit-pending");
    expect(
      assessAuditMergeRecovery(pending, "audit-pending", { sourceHash: "a", boundary: 1 }, 2),
    ).toEqual({ status: "pending" });

    const mismatched = setupProject("audit-mismatch");
    projects.push(mismatched);
    appendEvidence(mismatched, "STATE_FORKED", "audit-mismatch");
    appendEvidence(mismatched, "AUDIT_MERGED", "audit-mismatch", {
      "Source Audit Hash": "wrong",
      "Fork Boundary": "1",
      "Entries Merged": "2",
    });
    expect(
      assessAuditMergeRecovery(mismatched, "audit-mismatch", { sourceHash: "a", boundary: 1 }, 2),
    ).toMatchObject({ status: "invalid", detail: expect.stringContaining("does not match") });

    const ambiguous = setupProject("audit-ambiguous");
    projects.push(ambiguous);
    appendEvidence(ambiguous, "STATE_FORKED", "audit-ambiguous");
    for (let index = 0; index < 2; index++) {
      appendEvidence(ambiguous, "AUDIT_MERGED", "audit-ambiguous", {
        "Source Audit Hash": "a",
        "Fork Boundary": "1",
        "Entries Merged": "2",
      });
    }
    expect(
      assessAuditMergeRecovery(ambiguous, "audit-ambiguous", { sourceHash: "a", boundary: 1 }, 2),
    ).toMatchObject({ status: "invalid", detail: expect.stringContaining("ambiguous") });

    const verified = setupProject("audit-verified");
    projects.push(verified);
    appendEvidence(verified, "STATE_FORKED", "audit-verified");
    appendEvidence(verified, "AUDIT_MERGED", "audit-verified", {
      "Source Audit Hash": "a",
      "Fork Boundary": "1",
      "Entries Merged": "2",
    });
    expect(
      assessAuditMergeRecovery(verified, "audit-verified", { sourceHash: "a", boundary: 1 }, 2),
    ).toEqual({ status: "verified" });
  });

  test("never-merged slug fails closed without minting BOLT_COMPLETED", () => {
    const projectDir = setupProject("never");
    projects.push(projectDir);

    const result = complete(projectDir, "never");
    expect(result.status).toBe(1);
    expect(eventCount(projectDir, "STATE_MERGED", "never")).toBe(0);
    expect(eventCount(projectDir, "BOLT_COMPLETED", "never")).toBe(0);
  });

  test("STATE_MERGED evidence for another slug cannot authorize recovery", () => {
    const projectDir = setupProject("target");
    projects.push(projectDir);
    mkdirSync(join(projectDir, ".amadeus", "worktrees", "bolt-other"), { recursive: true });
    expect(start(projectDir, "other").status).toBe(0);
    expect(complete(projectDir, "other").status).toBe(0);

    const result = complete(projectDir, "target");
    expect(result.status).toBe(1);
    expect(result.out).toContain("has no canonical STATE_MERGED evidence");
    expect(eventCount(projectDir, "BOLT_COMPLETED", "target")).toBe(0);
  });

  test("ambiguous STATE_MERGED evidence fails closed", () => {
    const projectDir = setupProject("ambiguous");
    projects.push(projectDir);
    expect(start(projectDir, "ambiguous").status).toBe(0);

    const auditDir = worktreeAuditDir(projectDir, "ambiguous");
    const auditName = readdirSync(auditDir).find((name) => name.endsWith(".jsonl"))!;
    const auditPath = join(auditDir, auditName);
    const hiddenPath = `${auditPath}.saved`;
    renameSync(auditPath, hiddenPath);
    expect(complete(projectDir, "ambiguous").status).toBe(1);

    const stateMergedLine = allAudit(projectDir)
      .split("\n")
      .find((line) => line.includes('"STATE_MERGED"'));
    expect(stateMergedLine).toBeDefined();
    writeFileSync(join(seededAuditDir(projectDir), "tampered.jsonl"), `${stateMergedLine}\n`);
    renameSync(hiddenPath, auditPath);

    const retry = complete(projectDir, "ambiguous");
    expect(retry.status).toBe(1);
    expect(retry.out).toContain("ambiguous STATE_MERGED evidence");
    expect(eventCount(projectDir, "AUDIT_MERGED", "ambiguous")).toBe(0);
  });
});
