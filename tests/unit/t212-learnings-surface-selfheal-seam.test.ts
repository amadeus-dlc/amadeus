// In-process coverage seam for the #849 runtime-graph self-heal. The behaviour is
// proven end-to-end by the #849 CLI repro (scratch spawn of the shipped dist),
// which bun's coverage instrumentation cannot see (the spawn blindspot) — so this
// unit test imports handleSurface directly and drives the three self-heal paths
// in-process:
//   1. absent runtime-graph.json  → re-compile once → resolve → exit 0
//   2. malformed runtime-graph.json → re-compile once → resolve → exit 0
//   3. slug absent even after a clean re-compile → fail(1) with a recovery hint
// runtime-graph.json is gitignored + machine-local, so a fresh clone / new
// worktree of an in-flight intent never carries it — the pre-#849 hard fail
// (`runtime-graph.json not found`, exit 1) broke §13 surface structurally there.
// This file exists so the self-heal lines register in lcov (local-lcov-pre-push).

import { afterAll, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { handleSurface } from "../../dist/claude/.claude/tools/amadeus-learnings.ts";
import {
  createTestProject,
  seededAuditShard,
  seededRecordDir,
  seededStateFile,
} from "../harness/fixtures.ts";

const projects: string[] = [];
afterAll(() => {
  for (const p of projects) rmSync(p, { recursive: true, force: true });
});

const SLUG = "units-generation";

// A minimal audit shard: WORKFLOW_STARTED gives compile a real header (not the
// empty-graph short-circuit); STAGE_STARTED/COMPLETED makes compile emit one row
// for `slug`. Mirrors t201's AUDIT_MD.
function auditFor(slug: string): string {
  return `# AI-DLC Audit Log

## Workflow Started
**Timestamp**: 2026-07-11T08:00:00Z
**Event**: WORKFLOW_STARTED
**Workflow ID**: t212-fixture
**Scope**: feature

---

## Stage Started
**Timestamp**: 2026-07-11T08:01:00Z
**Event**: STAGE_STARTED
**Stage**: ${slug}
**Agent**: amadeus-architect-agent

---

## Stage Completed
**Timestamp**: 2026-07-11T08:02:00Z
**Event**: STAGE_COMPLETED
**Stage**: ${slug}

---
`;
}

const MEMORY_MD = `## Interpretations

- 2026-07-11T08:01:30Z — seeded diary entry; used by t212 to prove self-heal surfaces a candidate

## Deviations

## Tradeoffs

## Open questions
`;

// Build a fixture project whose state's Current Stage is `stateSlug` and whose
// audit carries STAGE_STARTED/COMPLETED for `auditSlug` (defaults to stateSlug).
// The per-stage memory.md is seeded for `stateSlug`. runtime-graph.json is NOT
// written — the caller decides (leave absent, or seed malformed).
function mkproj(stateSlug = SLUG, auditSlug = stateSlug): string {
  const pd = createTestProject();
  projects.push(pd);
  writeFileSync(
    seededStateFile(pd),
    `# AI-DLC State Tracking\n- **Current Stage**: ${stateSlug}\n- **Scope**: feature\n`,
  );
  const shard = seededAuditShard(pd);
  mkdirSync(dirname(shard), { recursive: true });
  writeFileSync(shard, auditFor(auditSlug), "utf-8");
  const mem = join(seededRecordDir(pd), "inception", stateSlug, "memory.md");
  mkdirSync(dirname(mem), { recursive: true });
  writeFileSync(mem, MEMORY_MD, "utf-8");
  return pd;
}

const graphPath = (pd: string): string => join(seededRecordDir(pd), "runtime-graph.json");

// fail() ends the CLI via process.exit; in-process we convert that into a
// throwable so the test can assert the exit code and keep running. stdout
// (surface's JSON) + stderr (fail's message) are captured the same way.
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function callSurface(pd: string, slug = SLUG): { status: number; stdout: string; stderr: string } {
  let stdout = "";
  let stderr = "";
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  const origLog = console.log;
  const origExit = process.exit.bind(process);
  process.stdout.write = ((chunk: string | Uint8Array) => {
    stdout += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stdout.write;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf-8");
    return true;
  }) as typeof process.stderr.write;
  console.log = (...a: unknown[]) => {
    stdout += `${a.map(String).join(" ")}\n`;
  };
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  let status = 0;
  try {
    handleSurface(["--slug", slug], pd);
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
    console.log = origLog;
    process.exit = origExit;
  }
  return { status, stdout, stderr };
}

describe("t212 surface runtime-graph self-heal (#849 in-process seam)", () => {
  test("absent runtime-graph.json re-compiles once and surfaces the candidate (exit 0)", () => {
    const pd = mkproj();
    expect(existsSync(graphPath(pd))).toBe(false); // gitignored artifact truly absent

    const r = callSurface(pd);
    expect(r.status).toBe(0);
    // Self-heal wrote the graph on the way through.
    expect(existsSync(graphPath(pd))).toBe(true);
    const out = JSON.parse(r.stdout);
    expect(out.stage_slug).toBe(SLUG);
    expect(out.candidates.length).toBe(1);
    expect(out.candidates[0].source_heading).toBe("Interpretations");
  });

  test("malformed runtime-graph.json re-compiles once and surfaces the candidate (exit 0)", () => {
    const pd = mkproj();
    writeFileSync(graphPath(pd), "{ this is not valid json ", "utf-8");

    const r = callSurface(pd);
    expect(r.status).toBe(0);
    const out = JSON.parse(r.stdout);
    expect(out.stage_slug).toBe(SLUG);
    expect(out.candidates.length).toBe(1);
  });

  test("a re-compile that throws fails (exit 1) with the compile-failure recovery hint", () => {
    // Force compile() itself to throw: make the runtime-graph.json PATH a
    // directory. tryReadRuntimeStageRow sees existsSync==true but readFileSync
    // throws (→ null, funnelling into self-heal), then compile's own graph write
    // cannot land on a directory and throws — exercising the catch branch.
    const pd = mkproj();
    mkdirSync(graphPath(pd), { recursive: true });

    const r = callSurface(pd);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("re-compile failed");
    expect(r.stderr).toContain("Recovery:");
  });

  test("slug absent even after a clean re-compile fails (exit 1) with a recovery hint", () => {
    // State's Current Stage is units-generation (so assertActiveStage passes) but
    // the audit only carries a DIFFERENT stage, so a clean re-compile produces a
    // graph without units-generation — a genuine inconsistency, not a stale graph.
    const pd = mkproj(SLUG, "requirements-analysis");
    expect(existsSync(graphPath(pd))).toBe(false);

    const r = callSurface(pd);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain("even after re-compile");
    expect(r.stderr).toContain("Recovery:");
    // The re-compile did run (fail-safe): a graph now exists, just without our slug.
    expect(existsSync(graphPath(pd))).toBe(true);
  });
});
