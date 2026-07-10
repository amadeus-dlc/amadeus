// covers: subcommand:amadeus-jump:execute, subcommand:amadeus-state:advance
//
// Audit-integrity regression for the transition-parameter guards (#787 / #789,
// FR-4 / FR-5, NFR-5). Both bugs share one class: a caller-supplied transition
// parameter is accepted without re-deriving it from the stage graph, so a
// mis-specified direction / order silently regresses Current Stage, leaves a
// downstream [x] in place, and mints a FALSE forward-form audit trail.
//
// Mechanism = cli: the handlers are non-exported and error() ends the process,
// so the behavioural contract is asserted by SPAWNING the shipped dist CLI
// (the process boundary the false audit / state regression is observable at).
// The pure decision helpers are covered in-process by the two *-direction-seam
// unit tests (the spawn-blindspot seam); this file pins the observable audit +
// state effects the seam cannot see.
//
// FALLING PROOF (against the pre-fix bytes):
//   jump: `execute --target requirements-analysis --direction forward` from a
//     construction-phase state exited 0, set Current Stage=requirements-analysis
//     (a regression), demoted `- [x] requirements-analysis` → `- [-]`, and
//     emitted STAGE_JUMPED Direction=FORWARD (+ PHASE_COMPLETED construction→
//     inception). Post-fix: exit 1, state untouched, zero STAGE_JUMPED.
//   state: `advance reverse-engineering approval-handoff` (a past slug) exited
//     0, established the backward move, and emitted PHASE_COMPLETED inception→
//     ideation (forward-form for a backward move). Post-fix: exit 1, state
//     untouched, zero PHASE_COMPLETED.

import { afterAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cleanupTestProject,
  createTestProject,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const REPO_ROOT = join(import.meta.dir, "..", "..");
const TOOLS = join(REPO_ROOT, "dist", "claude", ".claude", "tools");
const JUMP = join(TOOLS, "amadeus-jump.ts");
const STATE = join(TOOLS, "amadeus-state.ts");
const FIXTURE = join(REPO_ROOT, "tests", "fixtures", "state-construction-bolt1.md");

const tempDirs: string[] = [];
afterAll(() => {
  for (const d of tempDirs) cleanupTestProject(d);
});

function proj(): string {
  const p = createTestProject();
  tempDirs.push(p);
  seedStateFile(p, FIXTURE);
  return p;
}

interface CliResult {
  status: number;
  stdout: string;
  stderr: string;
}

function run(tool: string, args: string[], p: string): CliResult {
  const res = spawnSync(BUN, [tool, ...args, "--project-dir", p], {
    encoding: "utf-8",
  });
  return {
    status: res.status ?? -1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

function readState(p: string): string {
  return readFileSync(seededStateFile(p), "utf-8");
}

// The audit trail is a dir of per-clone shards; the spawned tool mints its own
// clone-id. Read every shard by globbing the record's audit/ dir.
function readAudit(p: string): string {
  const { readdirSync } = require("node:fs") as typeof import("node:fs");
  const { dirname } = require("node:path") as typeof import("node:path");
  const recordDir = dirname(seededStateFile(p));
  const auditDir = join(recordDir, "audit");
  let body = "";
  try {
    for (const f of readdirSync(auditDir)) {
      if (f.endsWith(".md")) body += readFileSync(join(auditDir, f), "utf-8");
    }
  } catch {
    // No audit dir → no events emitted (the clean, post-fix expectation).
  }
  return body;
}

function eventCount(body: string, ev: string): number {
  const re = new RegExp(`^\\*\\*Event\\*\\*: ${ev}$`);
  return body.split("\n").filter((l) => re.test(l)).length;
}

function fieldOf(content: string, field: string): string {
  const m = content.match(new RegExp(`^- \\*\\*${field}\\*\\*: (.*)$`, "m"));
  return m ? m[1].trim() : "";
}

describe("t-transition-guard-audit: jump execute direction reconciliation (FR-4, #787)", () => {
  test("mis-specified --direction forward to an earlier stage is rejected loudly", () => {
    const p = proj();
    const r = run(
      JUMP,
      ["execute", "--target", "requirements-analysis", "--direction", "forward", "--scope", "feature"],
      p,
    );
    // Loud rejection naming the correct direction.
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("backward");
  });

  test("rejected jump leaves Current Stage and downstream checkbox untouched", () => {
    const p = proj();
    run(
      JUMP,
      ["execute", "--target", "requirements-analysis", "--direction", "forward", "--scope", "feature"],
      p,
    );
    const state = readState(p);
    // No regression: Current Stage still functional-design.
    expect(fieldOf(state, "Current Stage")).toBe("functional-design");
    // The earlier stage is NOT demoted from [x] to [-].
    expect(state).toContain("- [x] requirements-analysis");
    expect(state).not.toContain("- [-] requirements-analysis");
  });

  test("rejected jump emits no STAGE_JUMPED (no false FORWARD audit)", () => {
    const p = proj();
    run(
      JUMP,
      ["execute", "--target", "requirements-analysis", "--direction", "forward", "--scope", "feature"],
      p,
    );
    const audit = readAudit(p);
    expect(eventCount(audit, "STAGE_JUMPED")).toBe(0);
  });

  test("a correctly-specified backward jump still works (guard does not over-reject)", () => {
    const p = proj();
    const r = run(
      JUMP,
      ["execute", "--target", "requirements-analysis", "--direction", "backward", "--scope", "feature"],
      p,
    );
    expect(r.status).toBe(0);
    const state = readState(p);
    expect(fieldOf(state, "Current Stage")).toBe("requirements-analysis");
  });
});

describe("t-transition-guard-audit: state advance order guard (FR-5, #789)", () => {
  test("2-arg advance to a past slug is rejected loudly (jump's job)", () => {
    const p = proj();
    const r = run(STATE, ["advance", "reverse-engineering", "approval-handoff"], p);
    expect(r.status).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("jump");
  });

  test("rejected advance leaves Current Stage and downstream checkbox untouched", () => {
    const p = proj();
    run(STATE, ["advance", "reverse-engineering", "approval-handoff"], p);
    const state = readState(p);
    expect(fieldOf(state, "Current Stage")).toBe("functional-design");
    expect(state).toContain("- [x] approval-handoff");
    expect(state).not.toContain("- [-] approval-handoff");
  });

  test("rejected advance emits no forward-form PHASE_COMPLETED", () => {
    const p = proj();
    run(STATE, ["advance", "reverse-engineering", "approval-handoff"], p);
    const audit = readAudit(p);
    expect(eventCount(audit, "PHASE_COMPLETED")).toBe(0);
  });

  test("a correctly-ordered forward 2-arg advance still works (guard does not over-reject)", () => {
    // completed=delivery-planning is already [x], so the artifact guard is
    // skipped (that gate is orthogonal to this direction guard); next=
    // functional-design is strictly forward, so advanceDirectionCheck passes.
    const p = proj();
    const r = run(STATE, ["advance", "delivery-planning", "functional-design"], p);
    expect(r.status).toBe(0);
    const state = readState(p);
    expect(fieldOf(state, "Current Stage")).toBe("functional-design");
  });
});
