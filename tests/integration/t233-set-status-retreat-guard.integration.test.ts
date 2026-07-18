// covers: function:handleSetStatus
//
// t233 — set-status retreat guard (Issue #1170, S2-CRITICAL).
//
// The bug: `set-status` (the statusline-sync writer the sync-statusline hook
// spawns at stage start) was an UNLOCKED read-modify-write that unconditionally
// stamped the target stage's checkbox to `[-]` in-progress and the statusline
// fields to "Running". A set-status arriving AFTER a stage had already been
// completed ([x]) or moved into the awaiting-approval ([?]) gate — a late hook
// firing, or a race against the engine's completion writer — therefore RETREATED
// the run-state, rolling the [x]/[?] back to [-] and dropping the completion.
//
// The fix (handleSetStatus): hold the audit lock across re-read → compare →
// write. With --intent omitted (the sole caller, sync-statusline, never passes
// it) this lock keys on the same workspace sentinel bucket as the engine's
// completion writers (advance/set/checkbox), so the two RMW sections are
// mutually exclusive on the one active-intent state file both write. When the
// re-read shows the stage already `completed` or `awaiting-approval`, the writer
// suppresses the write entirely (an advisory to stderr, exit 0, file
// byte-identical) instead of retreating it. Forward states ([ ]/[-]/[R]/[S] and
// stages with no checkbox line) write exactly as before.
//
// MECHANISM. Two surfaces:
//   - The retreat predicate + suppression (BR-1/BR-2/BR-4/BR-6/BR-8) is driven
//     IN-PROCESS via the exported handleSetStatus (dist copy) so its new lines
//     are lcov-visible and the read→compare→write seam is exercised directly.
//   - The cross-process lock (BR-2 CLI case, BR-3 lost-update) SPAWNS the shipped
//     dist tool — the argv/process boundary — to prove genuine inter-process
//     contention against `amadeus-state set`, mirroring t145's parallel style.
//
// FIXTURE DISCIPLINE: each case builds a fresh temp project via
// createTestProject() and writes an inline state file (distinct single checkbox
// line per slug) under the born record; cleanup runs in afterEach. Nothing is
// written under tests/fixtures/**.

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { handleSetStatus } from "../../dist/claude/.claude/tools/amadeus-utility.ts";
import {
  cleanupTestProject,
  createTestProject,
  seededAuditDir,
  seededAuditShard,
  seededStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const UTIL_TOOL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-utility.ts");
const STATE_TOOL = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "amadeus-state.ts");

// Standalone hermeticity (issue #698): the suite runner injects these guard
// bypasses; default them so a bare `bun test <this file>` behaves identically.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

// A real state file, built inline. `boxes` maps a real stage slug to its
// checkbox marker so each case controls exactly one line per slug. The fields
// under "## Current Status" are the six set-status writes; distinct sentinel
// values let a write be detected.
function buildState(boxes: Array<[string, string]>): string {
  const lines = boxes.map(([slug, marker]) => `- ${marker} ${slug} — EXECUTE`).join("\n");
  return `# AI-DLC State Tracking

## Project Information
- **Project**: t233 fixture
- **Scope**: feature
- **Active Agent**: amadeus-product-agent

## Runtime State
- **Revision Count**: 0

## Current Status
- **Lifecycle Phase**: IDEATION
- **Current Stage**: seed-stage
- **Active Agent**: amadeus-product-agent
- **In Progress**: seed-stage
- **Status**: Idle
- **Last Updated**: 2025-01-01T00:00:00Z

## Stage Progress
<!-- Checkbox states: [ ] pending [-] in-progress [?] awaiting-approval [R] revising [x] completed [S] skipped -->

### CONSTRUCTION PHASE
${lines}
`;
}

function seed(boxes: Array<[string, string]>): string {
  const proj = createTestProject();
  const sf = seededStateFile(proj);
  mkdirSync(join(sf, ".."), { recursive: true });
  writeFileSync(sf, buildState(boxes), "utf-8");
  return proj;
}

// Capture process.stdout/stderr writes across one in-process handleSetStatus
// call. Restores the originals even if the call throws.
function callInProcess(
  proj: string,
  stage: string,
): { stdout: string; stderr: string } {
  const outChunks: string[] = [];
  const errChunks: string[] = [];
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  // biome-ignore lint/suspicious/noExplicitAny: test-only stream stub
  process.stdout.write = ((s: any) => {
    outChunks.push(String(s));
    return true;
  }) as typeof process.stdout.write;
  // biome-ignore lint/suspicious/noExplicitAny: test-only stream stub
  process.stderr.write = ((s: any) => {
    errChunks.push(String(s));
    return true;
  }) as typeof process.stderr.write;
  try {
    handleSetStatus(proj, { stage });
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
  return { stdout: outChunks.join(""), stderr: errChunks.join("") };
}

function readState(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

function checkboxMarker(content: string, slug: string): string | null {
  const m = new RegExp(`^- (\\[.\\]) ${slug} —`, "m").exec(content);
  return m ? m[1] : null;
}

function fieldValue(content: string, name: string): string | null {
  const m = new RegExp(`^- \\*\\*${name}\\*\\*:\\s*(.*)$`, "m").exec(content);
  return m ? m[1].trim() : null;
}

let projects: string[] = [];
function track(p: string): string {
  projects.push(p);
  return p;
}
afterEach(() => {
  for (const p of projects) cleanupTestProject(p);
  projects = [];
});

describe("t233 set-status retreat guard (mechanism in-process seam)", () => {
  // BR-1: completed [x] and awaiting-approval [?] are suppressed — the state
  // file stays byte-identical (no field write, no checkbox flip).
  test("BR-1 completed [x] target: write suppressed, state byte-identical", () => {
    const proj = track(seed([["reverse-engineering", "[x]"]]));
    const before = readState(proj);
    callInProcess(proj, "reverse-engineering");
    expect(readState(proj)).toBe(before);
  });

  test("BR-1 awaiting-approval [?] target: write suppressed, state byte-identical", () => {
    const proj = track(seed([["requirements-analysis", "[?]"]]));
    const before = readState(proj);
    callInProcess(proj, "requirements-analysis");
    expect(readState(proj)).toBe(before);
  });

  // BR-2: the suppressed path emits the advisory to stderr and nothing to
  // stdout, and completes (no throw / no exit) — in-process capture.
  test("BR-2 retreat emits stderr advisory, no stdout, completes", () => {
    const proj = track(seed([["reverse-engineering", "[x]"]]));
    const { stdout, stderr } = callInProcess(proj, "reverse-engineering");
    expect(stdout).toBe("");
    expect(stderr).toBe(
      'set-status: retreat write suppressed for "reverse-engineering" (checkbox=completed)\n',
    );
  });

  // BR-4: forward states write exactly as before — Current Stage + checkbox
  // [-] land, stdout carries the updated JSON.
  test("BR-4 pending [ ] target: write succeeds", () => {
    const proj = track(seed([["code-generation", "[ ]"]]));
    const { stdout } = callInProcess(proj, "code-generation");
    const after = readState(proj);
    expect(checkboxMarker(after, "code-generation")).toBe("[-]");
    expect(fieldValue(after, "Current Stage")).toBe("code-generation");
    expect(fieldValue(after, "Status")).toBe("Running");
    expect(stdout).toContain('"updated":true');
  });

  test("BR-4 in-progress [-] target: write succeeds (idempotent forward)", () => {
    const proj = track(seed([["functional-design", "[-]"]]));
    callInProcess(proj, "functional-design");
    const after = readState(proj);
    expect(checkboxMarker(after, "functional-design")).toBe("[-]");
    expect(fieldValue(after, "Current Stage")).toBe("functional-design");
  });

  test("BR-4 revising [R] target: write succeeds", () => {
    const proj = track(seed([["nfr-design", "[R]"]]));
    callInProcess(proj, "nfr-design");
    const after = readState(proj);
    expect(checkboxMarker(after, "nfr-design")).toBe("[-]");
    expect(fieldValue(after, "Current Stage")).toBe("nfr-design");
  });

  // BR-8: skipped [S] and a known stage with NO checkbox line both write as
  // before (skipped is not in the suppress set; an absent line is forward).
  test("BR-8 skipped [S] target: write succeeds (not a retreat)", () => {
    const proj = track(seed([["market-research", "[S]"]]));
    callInProcess(proj, "market-research");
    const after = readState(proj);
    expect(checkboxMarker(after, "market-research")).toBe("[-]");
    expect(fieldValue(after, "Current Stage")).toBe("market-research");
  });

  test("BR-8 known stage with no checkbox line: write succeeds", () => {
    // Seed a line for a DIFFERENT stage so the target stage has no checkbox row.
    const proj = track(seed([["code-generation", "[ ]"]]));
    const { stdout } = callInProcess(proj, "deployment-execution");
    const after = readState(proj);
    // No line was added for the target (setCheckbox no-ops on absent slug), but
    // the statusline fields advanced — the forward path ran.
    expect(checkboxMarker(after, "deployment-execution")).toBeNull();
    expect(fieldValue(after, "Current Stage")).toBe("deployment-execution");
    expect(stdout).toContain('"updated":true');
  });

  // BR-6: the retreat no-op adds no audit line (set-status never emits audit;
  // the guard must not introduce one). Seed a shard and assert it is unchanged.
  test("BR-6 retreat no-op appends nothing to the audit shard", () => {
    const proj = track(seed([["reverse-engineering", "[x]"]]));
    const shard = seededAuditShard(proj);
    mkdirSync(seededAuditDir(proj), { recursive: true });
    const seedShard = "# Audit Trail\n\n**Event**: WORKFLOW_STARTED\n";
    writeFileSync(shard, seedShard, "utf-8");
    const auditBefore = readAuditDir(proj);
    callInProcess(proj, "reverse-engineering");
    expect(readAuditDir(proj)).toBe(auditBefore);
  });
});

function readAuditDir(proj: string): string {
  const dir = seededAuditDir(proj);
  if (!existsSync(dir)) return "";
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => `${f}::${readFileSync(join(dir, f), "utf-8")}`)
    .join("\n");
}

describe("t233 set-status retreat guard (mechanism cli — cross-process)", () => {
  function utilSync(proj: string, args: string[]) {
    return Bun.spawnSync({
      cmd: [BUN, UTIL_TOOL, ...args, "--project-dir", proj],
      stdout: "pipe",
      stderr: "pipe",
      env: { ...process.env },
    });
  }

  // BR-2 (cli face): a spawned set-status against a completed stage exits 0 and
  // prints the advisory to stderr; the state file is unchanged.
  test("BR-2 cli: retreat on [x] exits 0 with stderr advisory, no state change", () => {
    const proj = track(seed([["reverse-engineering", "[x]"]]));
    const before = readState(proj);
    const r = utilSync(proj, ["set-status", "--stage", "reverse-engineering"]);
    expect(r.exitCode).toBe(0);
    expect(r.stderr.toString()).toContain("retreat write suppressed");
    expect(r.stdout.toString()).toBe("");
    expect(readState(proj)).toBe(before);
  });

  // BR-3: set-status ∥ `amadeus-state set` in parallel. The completed checkbox
  // must NOT roll back (the guard suppresses the retreat under contention), and
  // the concurrent field write must land — no lost update in either direction.
  test("BR-3 parallel set-status ∥ state set: completed [x] survives, field write lands", async () => {
    const proj = track(seed([["reverse-engineering", "[x]"]]));
    const procs = [
      Bun.spawn({
        cmd: [BUN, UTIL_TOOL, "set-status", "--stage", "reverse-engineering", "--project-dir", proj],
        stdout: "ignore",
        stderr: "ignore",
        env: { ...process.env },
      }),
      Bun.spawn({
        cmd: [BUN, STATE_TOOL, "set", "Revision Count=7", "--project-dir", proj],
        stdout: "ignore",
        stderr: "ignore",
        env: { ...process.env },
      }),
    ];
    await Promise.all(procs.map((c) => c.exited));
    const codes = await Promise.all(procs.map((c) => c.exited));
    expect(codes).toEqual([0, 0]);
    const after = readState(proj);
    // The completion was preserved despite the concurrent set-status retreat.
    expect(checkboxMarker(after, "reverse-engineering")).toBe("[x]");
    // The concurrent field write survived (no lost update the other way).
    expect(fieldValue(after, "Revision Count")).toBe("7");
  });
});
