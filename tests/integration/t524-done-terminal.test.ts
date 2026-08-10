// covers: subcommand:amadeus-orchestrate:report
//
// Issue #2762 — the `done` directive was overloaded. The engine emits
// `kind:"done"` both when the workflow has genuinely ended AND as the plain
// acknowledgement that a `report` committed a transition and the loop should
// keep going. A conductor (and the Stop hook) reading only `kind` cannot tell
// the two apart, so a mid-workflow report ack reads as "stop".
//
// This file pins the fix: every `done` carries an explicit `terminal: boolean`
// discriminator, and the two ambiguous emit sites (the authorized-approval ack
// and the normal report commit ack) resolve it from the SAME `isFinal` the
// engine already computes for the transition itself.
//
// MECHANISM = cli. Every observable is taken at the PROCESS boundary: the real
// `amadeus-orchestrate.ts` is spawned via node:child_process spawnSync (the
// t115 CLI-contract-port shape) and the assertions read its stdout directive
// JSON. Spawning is what keeps this file honest about the self-referential
// hazard — the directive contract under test is the one the live engine emits,
// and nothing in this process can stand in for it. The one in-process piece is
// the schema half (validateDirective), which is a pure function.
//
// FIXTURE DISCIPLINE (mirrors t115): each case uses a FRESH temp project dir
// seeded from the same on-disk state fixtures, cleaned in afterAll. Nothing is
// written under tests/fixtures/**.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// Standalone hermeticity (issue #698): the suite runner injects these guard
// bypasses into every test file's env; default them here so a bare
// `bun test <this file>` behaves the same.
process.env.AMADEUS_SKIP_ARTIFACT_GUARD ??= "1";
process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD ??= "1";

import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seedGoalReceiptForFinalStage,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS_DIR = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const ORCH_TOOL = join(TOOLS_DIR, "amadeus-orchestrate.ts");
const STATE_TOOL = join(TOOLS_DIR, "amadeus-state.ts");

const tempDirs: string[] = [];

afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function projWithState(fixture: string): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, join(FIXTURES_DIR, fixture));
  return p;
}

interface CliResult {
  status: number;
  out: string;
  stdout: string;
}

function spawnTool(tool: string, args: string[], p: string): CliResult {
  const res = spawnSync(BUN, [tool, ...args, "--project-dir", p], {
    encoding: "utf-8",
    env: { ...process.env },
  });
  const stdout = res.stdout ?? "";
  return { status: res.status ?? -1, out: `${stdout}${res.stderr ?? ""}`, stdout };
}

const orchestrate = (args: string[], p: string): CliResult => spawnTool(ORCH_TOOL, args, p);
const state = (args: string[], p: string): CliResult => spawnTool(STATE_TOOL, args, p);

/**
 * Parse the directive JSON the engine wrote to stdout. Contract: stdout is the
 * directive, stderr is advisory (cid:code-generation:stdout-directive-stderr-advisory),
 * so this reads `stdout` only and never the combined stream.
 */
function directive(res: CliResult): Record<string, unknown> {
  const parsed: unknown = JSON.parse(res.stdout.trim());
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`expected a directive object, got: ${res.stdout}`);
  }
  return parsed as Record<string, unknown>;
}

/** Seed the final-stage fixture the completion cases share, gate already open. */
function projAtFinalGate(): string {
  const p = projWithState("state-final-stage.md");
  writeFileSync(
    join(p, "amadeus", "config.json"),
    '{"intent-mirror":{"github":{"issue":{"mode":"off"}}}}\n',
  );
  seedGoalReceiptForFinalStage(p, "feedback-optimization");
  expect(state(["gate-start", "feedback-optimization"], p).status).toBe(0);
  return p;
}

// ============================================================
// THE SCHEMA HALF — `terminal` is a required field of the done directive.
// ============================================================

describe("t524 done.terminal is required by the directive schema", () => {
  test("a done without terminal is rejected, naming the missing field", () => {
    const result = validateDirective({ kind: "done", reason: "Workflow complete." });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("unreachable");
    expect(result.errors.join(" | ")).toContain("done: missing required field: terminal");
  });

  test("a done whose terminal is not a boolean is rejected", () => {
    const result = validateDirective({ kind: "done", reason: "x", terminal: "true" });
    expect(result.valid).toBe(false);
    if (result.valid) throw new Error("unreachable");
    expect(result.errors.join(" | ")).toContain("done: terminal must be boolean, got string");
  });

  test("both terminal values are accepted", () => {
    expect(validateDirective({ kind: "done", reason: "x", terminal: true }).valid).toBe(true);
    expect(validateDirective({ kind: "done", reason: "x", terminal: false }).valid).toBe(true);
  });
});

// ============================================================
// THE AMBIGUOUS SITES — a report ack mid-workflow vs. the final approve.
// ============================================================

describe("t524 report acks carry terminal resolved from finality", () => {
  test("non-gated mid-workflow advance acks with terminal:false and points at the next run", () => {
    const p = projWithState("state-pre-workspace-detection.md");
    const report = orchestrate(["report", "--result", "completed"], p);

    expect(report.status).toBe(0);
    const d = directive(report);
    expect(d.kind).toBe("done");
    expect(d.terminal).toBe(false);
    // The non-terminal wording must still tell the conductor to keep going.
    expect(String(d.reason)).toContain("Run next to continue.");
  }, 30000);

  test("gated mid-workflow approve acks with terminal:false", () => {
    const p = projWithState("state-mid-ideation.md");
    expect(state(["gate-start", "feasibility"], p).status).toBe(0);

    const report = orchestrate(["report", "--result", "approved"], p);

    expect(report.status).toBe(0);
    const d = directive(report);
    expect(d.kind).toBe("done");
    expect(d.terminal).toBe(false);
  }, 30000);

  test("the final gated approve acks with terminal:true and drops the continue wording", () => {
    const p = projAtFinalGate();

    const report = orchestrate(["report", "--result", "approved"], p);

    expect(report.status).toBe(0);
    const d = directive(report);
    expect(d.kind).toBe("done");
    expect(d.terminal).toBe(true);
    // The bug this fixes: the terminal ack used to say "run next to continue".
    expect(String(d.reason)).not.toContain("Run next to continue.");
    expect(state(["get", "Status"], p).stdout.trim()).toBe("Completed");
  }, 30000);

  test("re-reporting an already-completed workflow is a terminal done", () => {
    const p = projAtFinalGate();
    expect(orchestrate(["report", "--result", "approved"], p).status).toBe(0);

    const second = orchestrate(["report", "--result", "approved"], p);

    const d = directive(second);
    expect(d.kind).toBe("done");
    expect(String(d.reason)).toContain("already completed");
    expect(d.terminal).toBe(true);
  }, 30000);

  test("the stale re-report guard answers with a NON-terminal done", () => {
    // Walk to: feasibility [x], scope-definition the gate-held Current Stage.
    const p = projWithState("state-mid-ideation.md");
    expect(state(["gate-start", "feasibility"], p).status).toBe(0);
    expect(state(["approve", "feasibility"], p).status).toBe(0);
    expect(state(["gate-start", "scope-definition"], p).status).toBe(0);
    expect(readFileSync(seededStateFile(p), "utf-8")).toContain("[?] scope-definition");

    const replay = orchestrate(["report", "--stage", "feasibility", "--result", "approved"], p);

    const d = directive(replay);
    expect(d.kind).toBe("done");
    expect(String(d.reason)).toContain("idempotent re-report");
    // The workflow has NOT ended — it is held at scope-definition's gate.
    expect(d.terminal).toBe(false);
  }, 30000);
});

// ============================================================
// THE NEXT-PATH SITES — every done `next` can emit is genuinely terminal.
// ============================================================

describe("t524 next-path done directives are terminal", () => {
  test("next on a completed workflow emits a terminal done", () => {
    const p = projAtFinalGate();
    expect(orchestrate(["report", "--result", "approved"], p).status).toBe(0);

    const after = orchestrate(["next"], p);

    const d = directive(after);
    expect(d.kind).toBe("done");
    expect(d.terminal).toBe(true);
  }, 30000);
});
