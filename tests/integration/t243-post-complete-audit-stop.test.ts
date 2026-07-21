// covers: file:tools/amadeus-lib.ts, file:tools/amadeus-audit.ts, function:clearActiveIntentCursor, function:intentStatusForAudit
//
// Post-complete audit stop + cursor release (#1248, E-CCCRA ruling C).
//
// Two coupled behaviours, both exercised in-process against the SHIPPED dist so
// coverage lands (the CLI entry is a spawn blindspot — bun-coverage-spawn-blindspot):
//   - clearActiveIntentCursor(): completing an intent releases the active-intent
//     cursor when it still points at that intent, and leaves a cursor already
//     moved elsewhere untouched.
//   - the appendAuditEntry gate: once the target intent's registry row is
//     "complete", the audit ledger is sealed — the append is suppressed
//     ({appended:false}), the shard is unchanged, and an advisory lands on stderr.
//     "unknown"/in-flight statuses keep appending (pre-#1248 behaviour).
//
// Falling proof: on the pre-fix dist the gate is absent, so the completed-intent
// appends return {appended:true} and grow the shard — the {appended:false} +
// unchanged-line-count asserts go red; clearActiveIntentCursor is absent, so the
// cursor-release asserts throw. Both surfaces are demonstrated in the report.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  appendAuditEntry,
  handleAuditFork,
  handleAuditMerge,
} from "../../dist/claude/.claude/tools/amadeus-audit.ts";
import {
  activeIntent,
  clearActiveIntentCursor,
  intentStatusForAudit,
  updateIntentStatus,
  worktreePath,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";

// A registry-row shape for a seeded intent. dirName is stored verbatim so the
// row joins to its record dir directly (no slug+id8 hex derivation).
interface SeedIntent {
  dirName: string;
  status: string;
}

const INTENTS_REL = ["amadeus", "spaces", "default", "intents"];

function intentsDirOf(proj: string): string {
  return join(proj, ...INTENTS_REL);
}

function cursorPath(proj: string): string {
  return join(intentsDirOf(proj), "active-intent");
}

// Build a minimal per-intent workspace outside the repo: active-space + clone id
// + memory dir + one record dir (with amadeus-state.md) per intent + the registry
// + optionally the active-intent cursor.
function buildWorkspace(intents: SeedIntent[], cursor?: string): string {
  const proj = mkdtempSync(join(tmpdir(), "amadeus-1248-"));
  const intentsDir = intentsDirOf(proj);
  mkdirSync(join(proj, "amadeus", "spaces", "default", "memory"), { recursive: true });
  writeFileSync(join(proj, "amadeus", "active-space"), "default\n", "utf-8");
  writeFileSync(join(proj, "amadeus", ".amadeus-clone-id"), "testclone1248\n", "utf-8");
  for (const it of intents) {
    mkdirSync(join(intentsDir, it.dirName), { recursive: true });
    writeFileSync(
      join(intentsDir, it.dirName, "amadeus-state.md"),
      "# AI-DLC State\n\n- **Scope**: bugfix\n",
      "utf-8",
    );
  }
  const registry = intents.map((it, i) => ({
    uuid: `00000000-0000-7000-8000-00000000000${i + 1}`,
    slug: it.dirName.replace(/-[^-]+$/, ""),
    dirName: it.dirName,
    status: it.status,
  }));
  writeFileSync(
    join(intentsDir, "intents.json"),
    `${JSON.stringify(registry, null, 2)}\n`,
    "utf-8",
  );
  if (cursor !== undefined) {
    writeFileSync(cursorPath(proj), `${cursor}\n`, "utf-8");
  }
  return proj;
}

// Count "**Event**:" markers across the target intent's audit shard(s); -1 when
// the audit dir does not exist yet.
function shardEventCount(proj: string, dirName: string): number {
  const auditDir = join(intentsDirOf(proj), dirName, "audit");
  if (!existsSync(auditDir)) return -1;
  let count = 0;
  for (const name of readdirSync(auditDir)) {
    const body = readFileSync(join(auditDir, name), "utf-8");
    count += (body.match(/\*\*Event\*\*:/g) ?? []).length;
  }
  return count;
}

// Capture process.stderr writes for the duration of fn().
function withStderrCapture(fn: () => void): string {
  const original = process.stderr.write.bind(process.stderr);
  let captured = "";
  process.stderr.write = ((chunk: string | Uint8Array): boolean => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stderr.write;
  try {
    fn();
  } finally {
    process.stderr.write = original;
  }
  return captured;
}

// Swallow process.stdout writes for the duration of fn() (fork/merge emit JSON).
function withStdoutCapture(fn: () => void): string {
  const original = process.stdout.write.bind(process.stdout);
  let captured = "";
  process.stdout.write = ((chunk: string | Uint8Array): boolean => {
    captured += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
    return true;
  }) as typeof process.stdout.write;
  try {
    fn();
  } finally {
    process.stdout.write = original;
  }
  return captured;
}

let projects: string[] = [];
function track(proj: string): string {
  projects.push(proj);
  return proj;
}

beforeEach(() => {
  projects = [];
});
afterEach(() => {
  for (const p of projects) rmSync(p, { recursive: true, force: true });
});

describe("t243 post-complete audit stop (#1248)", () => {
  test("completion releases the active-intent cursor pointing at the intent", () => {
    const dir = "260720-alpha-aaaaaaaa";
    const proj = track(buildWorkspace([{ dirName: dir, status: "in-flight" }], dir));

    // The complete-workflow path: registry flip → cursor release (the composition
    // handleCompleteWorkflow runs; the handler itself process.exit()s on error, so
    // the two deterministic steps are driven directly here).
    updateIntentStatus(proj, dir, "complete");
    clearActiveIntentCursor(proj, dir);

    expect(existsSync(cursorPath(proj))).toBe(false);
  });

  test("cursor already moved to another intent is left untouched", () => {
    const dirA = "260720-alpha-aaaaaaaa";
    const dirB = "260720-bravo-bbbbbbbb";
    const proj = track(
      buildWorkspace(
        [
          { dirName: dirA, status: "complete" },
          { dirName: dirB, status: "in-flight" },
        ],
        dirB,
      ),
    );

    // Intent A completes but the cursor already points at B — the guard keeps it.
    clearActiveIntentCursor(proj, dirA);

    expect(existsSync(cursorPath(proj))).toBe(true);
    expect(readFileSync(cursorPath(proj), "utf-8").trim()).toBe(dirB);
  });

  test("append to a complete intent is suppressed (explicit intent + advisory)", () => {
    const dir = "260720-alpha-aaaaaaaa";
    const proj = track(buildWorkspace([{ dirName: dir, status: "complete" }], dir));

    expect(intentStatusForAudit(proj, dir)).toBe("complete");

    let result!: ReturnType<typeof appendAuditEntry>;
    const stderr = withStderrCapture(() => {
      result = appendAuditEntry("SENSOR_FIRED", { Sensor: "x" }, proj, dir);
    });

    expect(result.appended).toBe(false);
    if (result.appended === false) expect(result.reason).toBe("intent-complete");
    expect(result.event).toBe("SENSOR_FIRED");
    // Nothing was written: the shard file was never even created by this append.
    expect(shardEventCount(proj, dir)).toBe(-1);
    expect(stderr).toContain("suppressed SENSOR_FIRED append");
    expect(stderr).toContain(dir);
    expect(stderr).toContain("#1248");
  });

  test("lone-intent fallback (no cursor) + complete registry is suppressed", () => {
    const dir = "260720-alpha-aaaaaaaa";
    // No cursor: activeIntent falls to the single record; its complete status gates.
    const proj = track(buildWorkspace([{ dirName: dir, status: "complete" }]));

    expect(activeIntent(proj)).toBe(dir);

    const result = appendAuditEntry("STAGE_COMPLETED", { Stage: "s" }, proj);

    expect(result.appended).toBe(false);
    expect(shardEventCount(proj, dir)).toBe(-1);

    // Clearing an already-absent cursor is a swallowed no-op (best-effort catch).
    expect(() => clearActiveIntentCursor(proj, dir)).not.toThrow();
  });

  test("intentStatusForAudit reports 'unknown' when nothing resolves", () => {
    // Two intents, no cursor → activeIntent is ambiguous (null) → status unknown,
    // so the gate falls through to a normal append (pre-#1248 behaviour).
    const ambiguous = track(
      buildWorkspace([
        { dirName: "260720-alpha-aaaaaaaa", status: "in-flight" },
        { dirName: "260720-bravo-bbbbbbbb", status: "in-flight" },
      ]),
    );
    expect(intentStatusForAudit(ambiguous)).toBe("unknown");

    // A resolvable record with no registry row → unknown (append still proceeds).
    const dir = "260720-alpha-aaaaaaaa";
    const unregistered = track(buildWorkspace([{ dirName: dir, status: "in-flight" }], dir));
    writeFileSync(join(intentsDirOf(unregistered), "intents.json"), "[]\n", "utf-8");
    expect(intentStatusForAudit(unregistered, dir)).toBe("unknown");
    expect(appendAuditEntry("SENSOR_FIRED", { Sensor: "x" }, unregistered, dir).appended).toBe(true);
  });

  test("in-flight intent keeps appending (append lands, shard grows)", () => {
    const dir = "260720-alpha-aaaaaaaa";
    const proj = track(buildWorkspace([{ dirName: dir, status: "in-flight" }], dir));

    const before = shardEventCount(proj, dir);
    const result = appendAuditEntry("SENSOR_FIRED", { Sensor: "x" }, proj, dir);
    const after = shardEventCount(proj, dir);

    expect(result.appended).toBe(true);
    expect(after).toBe(before === -1 ? 1 : before + 1);
  });

  // handleAuditMerge is otherwise spawn-only (t07 e2e); drive it in-process on an
  // in-flight intent so the empty-delta merge path (the AppendAuditResult-typed
  // `result` seam that emits AUDIT_MERGED) is measured (seam-export-handler-amend).
  test("in-process audit fork→merge on an in-flight intent emits AUDIT_MERGED", () => {
    const dir = "260720-alpha-aaaaaaaa";
    const slug = "test-bolt";
    const proj = track(buildWorkspace([{ dirName: dir, status: "in-flight" }], dir));

    // Seed the main audit shard, then create the (non-git) worktree dir the fork
    // only existsSync-checks, so fork copies main→worktree and merge folds it back.
    appendAuditEntry("WORKFLOW_STARTED", { Scope: "bugfix" }, proj, dir);
    mkdirSync(worktreePath(proj, slug), { recursive: true });

    const out = withStdoutCapture(() => {
      handleAuditFork(["--slug", slug], proj);
      handleAuditMerge(["--slug", slug], proj);
    });

    // Both primitives report success on stdout and AUDIT_MERGED lands in the shard.
    expect(out).toContain('"emitted":"AUDIT_FORKED"');
    expect(out).toContain('"emitted":"AUDIT_MERGED"');
    const auditDir = join(intentsDirOf(proj), dir, "audit");
    const shard = readdirSync(auditDir)
      .map((n) => readFileSync(join(auditDir, n), "utf-8"))
      .join("\n");
    expect(shard).toContain("**Event**: AUDIT_MERGED");
  });
});
