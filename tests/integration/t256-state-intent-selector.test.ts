// covers: subcommand:amadeus-state:get, subcommand:amadeus-state:set, subcommand:amadeus-state:checkbox, subcommand:amadeus-state:count
//
// t256 — `amadeus-state get/set/checkbox/count` --intent/--space selector
// (Issue #1199). The four active-intent-only verbs previously called
// readStateFile(pd) with no selector, so repairing a NON-active intent's record
// meant a cursor swap → a hook-fire window that could write the WRONG intent
// (#1170-family hazard). This adds a fork/merge-style `--intent <record>` /
// `--space <name>` selector to those four verbs so a non-active record is
// operated on in place, fail-closed on a missing target, byte-identical default.
//
// MECHANISM. Two surfaces at their correct level (mirrors t224):
//   - the pure `extractIntentSelector` parser + the handler wiring lines are
//     driven IN-PROCESS from the SHIPPED dist copy (the runner normalises the
//     dist SF: path back to packages/framework/core/... in lcov — coverage-
//     source-path.ts, so canonical lines register). captureExit converts the
//     error()→process.exit into a throwable so reject-path lines stay lcov-visible.
//   - the ERROR_LOGGED audit ATTRIBUTION (target shard, not the active shard) is
//     driven by SPAWNING the dist tool (a fresh process per case: emitError's
//     _errorEmitInProgress latch appends ERROR_LOGGED once per process, so a
//     spawn is the only faithful way to assert the row lands in the right shard).
//
// FIXTURE DISCIPLINE mirrors t224/t17: a fresh createTestProject() per case with
// a seeded active record (A), plus a hand-built second NON-active record (B)
// under the same intents dir. Nothing is written under tests/fixtures/**.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  extractIntentSelector,
  handleCheckbox,
  handleCount,
  handleGet,
  handleSet,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  intentsDirOf,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const TOOL = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "amadeus-state.ts",
);
const INIT_DONE = join(FIXTURES_DIR, "state-initialization-done.md");
const SECOND_RECORD = "260722-second-fixtureid8";

interface RunResult {
  rc: number;
  stdout: string;
  stderr: string;
  combined: string;
}

function runState(proj: string, args: string[]): RunResult {
  const res = spawnSync(BUN, [TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env: { ...process.env },
  });
  const stdout = res.stdout ?? "";
  const stderr = res.stderr ?? "";
  return { rc: res.status ?? -1, stdout, stderr, combined: `${stdout}${stderr}` };
}

function activeRecordDir(proj: string): string {
  const intentsDir = intentsDirOf(proj);
  const cursor = readFileSync(join(intentsDir, "active-intent"), "utf-8").trim();
  return join(intentsDir, cursor);
}
const activeStateMd = (proj: string) => join(activeRecordDir(proj), "amadeus-state.md");
const secondRecordDir = (proj: string) => join(intentsDirOf(proj), SECOND_RECORD);
const secondStateMd = (proj: string) => join(secondRecordDir(proj), "amadeus-state.md");
const sha = (p: string) => createHash("sha256").update(readFileSync(p)).digest("hex");

/** Build a second, NON-active intent record B with its own state file. The
 *  explicit-selector path resolves state/audit purely from the record dir name
 *  (activeIntent returns the explicit value unvalidated), so B needs only the
 *  record dir + amadeus-state.md — no cursor change, no intents.json row. */
function seedSecondIntent(proj: string): void {
  const dir = secondRecordDir(proj);
  mkdirSync(dir, { recursive: true });
  copyFileSync(INIT_DONE, join(dir, "amadeus-state.md"));
}

/** Concatenated text of every *.md audit shard under <record>/audit (or "" when
 *  the audit dir does not exist — an un-emitted intent). */
function auditText(recordDir: string): string {
  const auditDir = join(recordDir, "audit");
  if (!existsSync(auditDir)) return "";
  return readdirSync(auditDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => readFileSync(join(auditDir, f), "utf-8"))
    .join("\n");
}

let proj = "";
afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(proj);
  proj = "";
});

// captureExit — convert error()'s process.exit into a throwable so the reject
// path's lines register in lcov (t224/t-practices-promote-contract idiom).
class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}
function captureExit(fn: () => void): { threw: boolean; stderr: string; stdout: string } {
  let stderr = "";
  let stdout = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  const origLog = console.log;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  console.log = (...a: unknown[]) => {
    stdout += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
    console.log = origLog;
  }
  return { threw, stderr, stdout };
}

// ===========================================================================
// extractIntentSelector — the pure parser (in-process, measured module)
// ===========================================================================

describe("t256 extractIntentSelector", () => {
  test("pulls --intent and --space, leaves operands in rest", () => {
    expect(extractIntentSelector(["--intent", "rec-1", "--space", "sp", "Current Stage"])).toEqual({
      intent: "rec-1",
      space: "sp",
      rest: ["Current Stage"],
    });
  });

  test("no selector -> rest is every arg, selector undefined", () => {
    expect(extractIntentSelector(["Current", "Stage"])).toEqual({
      intent: undefined,
      space: undefined,
      rest: ["Current", "Stage"],
    });
  });

  test("a field=value operand whose value contains an = or -- is preserved", () => {
    expect(extractIntentSelector(["Foo=a=b", "--intent", "rec-1", "Bar=--intent"])).toEqual({
      intent: "rec-1",
      space: undefined,
      rest: ["Foo=a=b", "Bar=--intent"],
    });
  });

  test("selector may appear after the operands", () => {
    expect(extractIntentSelector(["completed", "--intent", "rec-2"])).toEqual({
      intent: "rec-2",
      space: undefined,
      rest: ["completed"],
    });
  });

  test("a trailing --intent with no value is left in rest (not silently dropped)", () => {
    expect(extractIntentSelector(["State", "--intent"])).toEqual({
      intent: undefined,
      space: undefined,
      rest: ["State", "--intent"],
    });
  });
});

// ===========================================================================
// (b) default behaviour unchanged — no selector targets the active intent
// ===========================================================================

describe("t256 default (no selector) targets the active intent", () => {
  test("set/get with no selector still operate on the active record", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    process.env.CLAUDE_PROJECT_DIR = proj;
    const r = captureExit(() => handleSet(["Current Stage=market-research"]));
    expect(r.threw).toBe(false);
    expect(r.stdout).toContain('"updated":true');
    expect(readFileSync(activeStateMd(proj), "utf-8")).toContain("- **Current Stage**: market-research");
    const g = captureExit(() => handleGet(["Current Stage"]));
    expect(g.stdout).toBe("market-research");
  });

  test("count with no selector reads the active record", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    process.env.CLAUDE_PROJECT_DIR = proj;
    const c = captureExit(() => handleCount(["completed"]));
    expect(c.stdout).toBe("3"); // fixture has 3 [x] rows
  });
});

// ===========================================================================
// (a) round-trip to a NON-active intent, active record untouched
// ===========================================================================

describe("t256 --intent round-trip targets a non-active record", () => {
  test("set --intent writes B, leaves the active record A byte-identical", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    process.env.CLAUDE_PROJECT_DIR = proj;
    const beforeA = sha(activeStateMd(proj));
    const r = captureExit(() => handleSet(["--intent", SECOND_RECORD, "Current Stage=application-design"]));
    expect(r.threw).toBe(false);
    expect(r.stdout).toContain('"updated":true');
    expect(readFileSync(secondStateMd(proj), "utf-8")).toContain("- **Current Stage**: application-design");
    // The active record must be untouched (no cursor-swap hazard).
    expect(sha(activeStateMd(proj))).toBe(beforeA);
    expect(readFileSync(activeStateMd(proj), "utf-8")).toContain("- **Current Stage**: intent-capture");
  });

  test("checkbox --intent flips B's checkbox and resyncs B's Completed, A untouched", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    process.env.CLAUDE_PROJECT_DIR = proj;
    const beforeA = sha(activeStateMd(proj));
    const r = captureExit(() => handleCheckbox(["--intent", SECOND_RECORD, "intent-capture=completed"]));
    expect(r.threw).toBe(false);
    const bText = readFileSync(secondStateMd(proj), "utf-8");
    expect(/- \[x\] intent-capture /.test(bText)).toBe(true);
    expect(bText).toContain("- **Completed**: 4"); // 3 seeded + intent-capture
    expect(sha(activeStateMd(proj))).toBe(beforeA);
  });
});

// ===========================================================================
// (c) fail-closed — a non-existent intent/space is a loud error (CLI exit 1),
// no silent fallback onto the active record. Driven by SPAWN so the exit code
// (main()'s try/catch -> error() -> process.exit(1)) is the real CLI contract.
// ===========================================================================

describe("t256 fail-closed on a missing target (spawn — exit 1)", () => {
  test("set --intent <ghost> exits non-zero, both records untouched", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    const beforeA = sha(activeStateMd(proj));
    const beforeB = sha(secondStateMd(proj));
    const r = runState(proj, ["set", "--intent", "ghost-record", "Current Stage=x"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("State file not found");
    // No silent fallback onto the active record.
    expect(sha(activeStateMd(proj))).toBe(beforeA);
    expect(sha(secondStateMd(proj))).toBe(beforeB);
  });

  test("checkbox --intent <ghost> exits non-zero", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const r = runState(proj, ["checkbox", "--intent", "ghost-record", "intent-capture=completed"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("State file not found");
  });

  test("get --intent <ghost> exits non-zero", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const r = runState(proj, ["get", "--intent", "ghost-record", "Current Stage"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("State file not found");
  });

  test("count --space <nonexistent> exits non-zero", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    const r = runState(proj, ["count", "--space", "no-such-space", "completed"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("State file not found");
  });
});

// ===========================================================================
// (e) get/count read the TARGET intent (distinct from the active record)
// ===========================================================================

describe("t256 get/count read the selected record", () => {
  test("get/count --intent read B's own values, not A's", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    process.env.CLAUDE_PROJECT_DIR = proj;
    // Make B distinct by DIRECT edit (independent of the code under test) so the
    // read is not circular.
    const bMd = secondStateMd(proj);
    const bContent = readFileSync(bMd, "utf-8")
      .replace("- **Current Stage**: intent-capture", "- **Current Stage**: reverse-engineering")
      .replace("- [x] state-init — EXECUTE", "- [ ] state-init — EXECUTE");
    Bun.write(bMd, bContent);
    const g = captureExit(() => handleGet(["--intent", SECOND_RECORD, "Current Stage"]));
    expect(g.stdout).toBe("reverse-engineering");
    // A still reads its own value.
    const gA = captureExit(() => handleGet(["Current Stage"]));
    expect(gA.stdout).toBe("intent-capture");
    // count reflects B's checkbox universe (one [x] removed -> 2).
    const c = captureExit(() => handleCount(["--intent", SECOND_RECORD, "completed"]));
    expect(c.stdout).toBe("2");
    const cA = captureExit(() => handleCount(["completed"]));
    expect(cA.stdout).toBe("3");
  });
});

// ===========================================================================
// (d) audit ATTRIBUTION — a set/checkbox ERROR_LOGGED lands in the TARGET
// shard, never the active record's shard (#1170 closure). SPAWN (fresh process).
// ===========================================================================

describe("t256 error audit row attributes to the target shard (spawn)", () => {
  test("set --intent <B> with a missing field logs ERROR_LOGGED to B's shard only", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    const r = runState(proj, ["set", "--intent", SECOND_RECORD, "Ghost Field=x"]);
    expect(r.rc).not.toBe(0);
    expect(r.combined).toContain("Field not found in state file:");
    // The ERROR_LOGGED row belongs to B (the intent the op targeted) …
    expect(auditText(secondRecordDir(proj))).toContain("ERROR_LOGGED");
    // … and must NOT pollute the active record A's shard (the #1170 hazard).
    expect(auditText(activeRecordDir(proj))).not.toContain("ERROR_LOGGED");
  });

  test("a successful set --intent <B> emits NO audit row in either shard (rides no event)", () => {
    proj = createTestProject();
    seedStateFile(proj, INIT_DONE);
    seedSecondIntent(proj);
    const r = runState(proj, ["set", "--intent", SECOND_RECORD, "Current Stage=feasibility"]);
    expect(r.rc).toBe(0);
    expect(readFileSync(secondStateMd(proj), "utf-8")).toContain("- **Current Stage**: feasibility");
    expect(auditText(secondRecordDir(proj))).not.toContain("ERROR_LOGGED");
    expect(auditText(activeRecordDir(proj))).not.toContain("ERROR_LOGGED");
  });
});
