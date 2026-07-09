// covers: subcommand:amadeus-bolt:start, subcommand:amadeus-bolt:complete, subcommand:amadeus-bolt:fail, subcommand:amadeus-bolt:set-autonomy
//
// bun:test port of tests/unit/t33-tool-bolt.sh (TAP plan 25), mechanism = cli.
// Faithful 1:1 migration: each of the 25 .sh assertions is preserved at
// equal-or-stronger fidelity by SPAWNING the real CLI via node:child_process
// spawnSync(BUN, [TOOL, sub, ...args]) and asserting on the PROCESS boundary —
// exit code (res.status), stdout/stderr (combined like the .sh's `2>&1`), and
// the on-disk amadeus-docs/audit.md / amadeus-state.md the tool mutates.
//
// amadeus-bolt is IDEMPOTENCY/AUDIT-SENSITIVE: start/complete/fail/set-autonomy
// WRITE audit rows. Every case gets a FRESH temp project so audit state never
// bleeds between cases. The .sh's per-case create_test_project +
// seed_audit_file is mirrored exactly.
//
// SPAWN vs IN-PROCESS split: ALL 25 assertions are CLI-contract assertions —
// they test the exit code, stdout JSON ack, or the audit/state file the
// process wrote. None is a pure-function assertion, so all 25 stay spawns
// (25 CLI invocations, matching the .sh's 25 `bun "$TOOL" ...` calls:
// start x12, set-autonomy x8, complete x2, fail x2, bogus-subcommand x1).
// The .sh has NO duplicate-row idempotency assertion (no command is re-run
// and grepped for a single audit row); the closest are Test 17 (a FAILED
// set-autonomy must leave NO orphan AUTONOMY_MODE_SET — audit-first) and
// Test 24 (BOLT_STARTED precedes BOLT_COMPLETED ordering). Both are preserved
// verbatim. Reported honestly in the structured notes.
//
// .sh assertion helper semantics preserved:
//   assert_grep      -> grep -q basic-regex   -> readFileSync + .match(RegExp)
//   assert_not_grep  -> ! grep -q             -> expect(...).not.toMatch / not.toContain
//   assert_contains  -> grep -qF fixed-string -> expect(out).toContain(...)
//   assert_eq RC 1   -> string-eq on $?       -> expect(res.status).toBe(1)
//
// FIXTURE DISCIPLINE: temp projects via the shipped fixtures.ts helpers
// (createTestProject / seedAuditFile / seedStateFile / cleanupTestProject) and
// per-case mkdtemp dirs. NOTHING is written under tests/fixtures/**.

import { afterEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  DEFAULT_SPACE,
  FIXTURES_DIR,
  removeWorkspaceRecord,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

// P9 per-intent layout: the flat amadeus-docs/ root is retired. Bolt's audit lands
// in a per-clone shard under the record (or the bare space record root when no
// state seeds a resolvable cursor); state lives in the active intent's record.
// We PIN a deterministic clone-id on disk so every SPAWNED bolt invocation in a
// project writes the SAME shard — that keeps the lifecycle test's positional
// "BOLT_STARTED precedes BOLT_COMPLETED" assertion deterministic (two spawns =
// one shard, append order preserved) and lets reads glob a single shard.
const PINNED_CLONE_ID = "testcloneid33";
/** createTestProject + pin the clone-id (so spawned tools share one audit shard). */
function mkProj(): string {
  const p = createTestProject();
  writeFileSync(join(p, "amadeus", ".amadeus-clone-id"), `${PINNED_CLONE_ID}\n`, "utf-8");
  return p;
}

// #676: start's pre-audit guard (both worktree and non-worktree paths) requires
// a readable active workflow state before it will emit BOLT_STARTED. mkProj()
// alone seeds the active-intent cursor + record dir but no amadeus-state.md, so
// every `start` fixture that expects BOLT_STARTED to succeed must seed one —
// mirrors setupConstructionProject's seeding but without the Construction
// Autonomy Mode append (start itself never reads that field; only
// set-autonomy does).
function mkStartedProject(): string {
  const p = mkProj();
  seedStateFile(p, join(FIXTURES_DIR, "state-construction.md"));
  return p;
}

const BUN = process.execPath; // the bun running this test
const TOOL = join(
  import.meta.dir,
  "..",
  "..",
  "dist", "claude",
  ".claude",
  "tools",
  "amadeus-bolt.ts",
);

interface RunResult {
  status: number;
  out: string; // stdout+stderr combined, mirroring the .sh's `2>&1`
}

// Spawn the real CLI in the project dir. Passes --project-dir like every .sh
// invocation (the authoritative project seam) and combines stdout+stderr.
function runBolt(proj: string, ...args: string[]): RunResult {
  const res = spawnSync(BUN, [TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    cwd: proj,
  });
  return { status: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

function readAudit(proj: string): string {
  return readAllAuditShards(proj);
}
function readState(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

// Mirror the .sh's setup_construction_project (lines 89-98): seed the
// Construction state fixture (so the active-intent cursor resolves and set-autonomy
// can read/write the record's state), then append the Construction Autonomy Mode
// field (the fixture pre-dates it; setFieldStrict parses by key, not location, so
// end-of-file append is fine). Bolt's audit shard is created lazily on first emit.
function setupConstructionProject(): string {
  const proj = mkProj();
  seedStateFile(proj, join(FIXTURES_DIR, "state-construction.md"));
  const statePath = seededStateFile(proj);
  writeFileSync(
    statePath,
    `${readFileSync(statePath, "utf-8")}\n- **Construction Autonomy Mode**: gated\n`,
    "utf-8",
  );
  return proj;
}

// --- Tests 1-4, 21: start writes the expected BOLT_STARTED audit fields -----
describe("t33 start: BOLT_STARTED audit emission", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 1: start emits BOLT_STARTED
  test("start emits BOLT_STARTED", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "auth-service", "--batch", "1");
    // .sh: assert_grep '^\*\*Event\*\*: BOLT_STARTED' (line-anchored literal)
    expect(readAudit(proj)).toMatch(/^\*\*Event\*\*: BOLT_STARTED/m);
  });

  // Test 2: start records Batch number
  test("start records Batch number", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "auth-service", "--batch", "1");
    expect(readAudit(proj)).toContain("**Batch number**: 1");
  });

  // Test 3: start accepts CSV bolt names (parallel batch)
  test("start records CSV bolt names", () => {
    proj = mkStartedProject();
    runBolt(
      proj,
      "start",
      "--name",
      "auth-service,payment-service,user-service",
      "--batch",
      "2",
    );
    expect(readAudit(proj)).toContain("auth-service,payment-service,user-service");
  });

  // Test 4: start --walking-skeleton true flags Walking skeleton=true
  test("start --walking-skeleton true flags correctly", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "b1", "--batch", "1", "--walking-skeleton", "true");
    expect(readAudit(proj)).toContain("**Walking skeleton**: true");
  });

  // Test 21: start without --walking-skeleton defaults to false
  test("start without --walking-skeleton defaults to false", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "b1", "--batch", "1");
    expect(readAudit(proj)).toContain("**Walking skeleton**: false");
  });
});

// --- Tests 5, 6, 18, 19, 20: start input validation exits 1 -----------------
describe("t33 start: input validation", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 5: start missing --name exits 1
  test("start missing --name exits 1", () => {
    proj = mkProj();
    expect(runBolt(proj, "start", "--batch", "1").status).toBe(1);
  });

  // Test 6: start missing --batch exits 1
  test("start missing --batch exits 1", () => {
    proj = mkProj();
    expect(runBolt(proj, "start", "--name", "b1").status).toBe(1);
  });

  // Test 18: start --batch non-numeric exits 1
  test("start --batch non-numeric exits 1", () => {
    proj = mkProj();
    expect(runBolt(proj, "start", "--name", "b1", "--batch", "not-a-number").status).toBe(1);
  });

  // Test 19: start --batch 0 exits 1 (must be positive)
  test("start --batch 0 exits 1 (must be positive)", () => {
    proj = mkProj();
    expect(runBolt(proj, "start", "--name", "b1", "--batch", "0").status).toBe(1);
  });

  // Test 20: parseFlags rejects --flag without value (no silent flag-as-value)
  test("start --name without value (followed by --batch) errors cleanly", () => {
    proj = mkProj();
    expect(runBolt(proj, "start", "--name", "--batch", "1").status).toBe(1);
  });
});

// --- #676: non-worktree start pre-audit state guard -------------------------
// Regression for GitHub #676: only the --worktree path pre-checked
// readStateFile() before emitAudit("BOLT_STARTED", ...); the non-worktree path
// emitted unconditionally. When no active intent resolves, that let `start`
// succeed and write an orphan BOLT_STARTED into the bare-space-root audit
// shard (amadeus/spaces/<space>/intents/audit/) instead of failing before any
// audit side effect. Fixed by requiring the same readStateFile() pre-check on
// both paths (AC-676-1/2/3).
describe("t33 start: non-worktree pre-audit state guard (#676)", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // AC-676-1: no active workflow state resolvable -> non-worktree start is
  // rejected BEFORE BOLT_STARTED is emitted, and no bare audit shard is
  // created under the space-root intents/audit/ fallback path.
  test("start rejects before BOLT_STARTED when no active workflow state resolves, and creates no bare audit shard", () => {
    proj = mkProj();
    // Remove the active-intent cursor + record dir entirely so recordDir()
    // resolves to null and auditFilePath()/stateFilePath() would otherwise
    // fall back to the bare space record root (amadeus/spaces/<space>/intents/).
    removeWorkspaceRecord(proj);

    const res = runBolt(proj, "start", "--name", "orphan", "--batch", "1");

    expect(res.status).not.toBe(0);
    expect(res.out).not.toContain('"emitted":"BOLT_STARTED"');
    expect(readAudit(proj)).not.toContain("BOLT_STARTED");
    // The bare-fallback shard directory itself must never be created.
    const bareAuditDir = join(proj, "amadeus", "spaces", "default", "intents", "audit");
    expect(existsSync(bareAuditDir)).toBe(false);
  });

  // AC-676-3: an explicit --intent/--space selector that resolves to a valid
  // state still succeeds as before.
  test("start succeeds when an explicit --intent/--space selector resolves a valid state", () => {
    proj = mkStartedProject();
    const res = runBolt(
      proj,
      "start",
      "--name",
      "b1",
      "--batch",
      "1",
      "--intent",
      DEFAULT_RECORD_DIR,
      "--space",
      DEFAULT_SPACE,
    );
    expect(res.status).toBe(0);
    expect(res.out).toContain('"emitted":"BOLT_STARTED"');
  });
});

// --- Tests 22, 7: start/complete JSON ack + BOLT_COMPLETED ------------------
describe("t33 start/complete: JSON ack + completion audit", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 22: start prints JSON ack on stdout
  test("start prints JSON with emitted field", () => {
    proj = mkStartedProject();
    const res = runBolt(proj, "start", "--name", "b1", "--batch", "1");
    // .sh: assert_contains "$OUT" '"emitted":"BOLT_STARTED"' (fixed-string)
    expect(res.out).toContain('"emitted":"BOLT_STARTED"');
  });

  // Test 7: complete emits BOLT_COMPLETED
  test("complete emits BOLT_COMPLETED", () => {
    proj = mkProj();
    runBolt(proj, "complete", "--name", "auth-service", "--batch", "1");
    expect(readAudit(proj)).toMatch(/^\*\*Event\*\*: BOLT_COMPLETED/m);
  });
});

// --- Tests 8, 9: fail records Error summary + Succeeded siblings ------------
describe("t33 fail: BOLT_FAILED audit fields", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 8: fail emits BOLT_FAILED with error summary
  test("fail records Error summary", () => {
    proj = mkProj();
    runBolt(proj, "fail", "--name", "auth-service", "--error", "Compilation failed");
    expect(readAudit(proj)).toContain("**Error summary**: Compilation failed");
  });

  // Test 9: fail --succeeded-siblings records sibling bolts
  test("fail records Succeeded siblings", () => {
    proj = mkProj();
    runBolt(
      proj,
      "fail",
      "--name",
      "auth",
      "--error",
      "boom",
      "--succeeded-siblings",
      "payment,user",
    );
    expect(readAudit(proj)).toContain("**Succeeded siblings**: payment,user");
  });
});

// --- Tests 10-14, 23: set-autonomy happy path + validation ------------------
describe("t33 set-autonomy: emission, state update, validation", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 10: set-autonomy emits AUTONOMY_MODE_SET
  test("set-autonomy emits AUTONOMY_MODE_SET", () => {
    proj = setupConstructionProject();
    runBolt(proj, "set-autonomy", "--mode", "autonomous");
    expect(readAudit(proj)).toMatch(/^\*\*Event\*\*: AUTONOMY_MODE_SET/m);
  });

  // Test 11: set-autonomy updates Construction Autonomy Mode in state file
  test("set-autonomy updates state field", () => {
    proj = setupConstructionProject();
    runBolt(proj, "set-autonomy", "--mode", "autonomous");
    // .sh: assert_grep 'Construction Autonomy Mode.*autonomous' (basic regex)
    expect(readState(proj)).toMatch(/Construction Autonomy Mode.*autonomous/);
  });

  // Test 12: set-autonomy --mode gated is accepted
  test("set-autonomy --mode gated updates state", () => {
    proj = setupConstructionProject();
    runBolt(proj, "set-autonomy", "--mode", "gated");
    expect(readState(proj)).toMatch(/Construction Autonomy Mode.*gated/);
  });

  // Test 13: set-autonomy --mode bogus exits 1
  test("set-autonomy --mode bogus exits 1", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "set-autonomy", "--mode", "bogus").status).toBe(1);
  });

  // Test 14: set-autonomy missing --mode exits 1
  test("set-autonomy missing --mode exits 1", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "set-autonomy").status).toBe(1);
  });

  // Test 23: set-autonomy JSON ack includes state_updated:true
  test("set-autonomy JSON ack includes state_updated:true", () => {
    proj = setupConstructionProject();
    const res = runBolt(proj, "set-autonomy", "--mode", "autonomous");
    expect(res.out).toContain('"state_updated":true');
  });
});

// --- Tests 15, 17: v4 state-file guard (no Construction Autonomy Mode field) -
describe("t33 set-autonomy: v4 state-file guard (audit-first)", () => {
  let proj = "";
  // Minimal v4-shaped state file WITHOUT the Construction Autonomy Mode field
  // (mirrors the heredoc in .sh Tests 15 & 17).
  const V4_STATE = `# AIDLC State
- **Scope**: feature
- **Status**: Running
## Stage Progress
- [-] feasibility — EXECUTE
`;
  function seedV4(): void {
    proj = mkProj();
    // Write the v4-shaped state into the default intent's record so the cursor
    // resolves (set-autonomy reads/guards on the record's state).
    writeFileSync(seededStateFile(proj), V4_STATE, "utf-8");
  }
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 15: set-autonomy errors cleanly when state field is absent
  test("set-autonomy exits 1 when Construction Autonomy Mode absent (v4 state file guard)", () => {
    seedV4();
    expect(runBolt(proj, "set-autonomy", "--mode", "autonomous").status).toBe(1);
  });

  // Test 17: set-autonomy on v4 state file leaves NO orphan audit (audit-first).
  // Regression: previously emitted AUTONOMY_MODE_SET before validating the
  // state field, leaving an orphan audit row when the field was absent. ONE
  // process invocation drives BOTH assertions, exactly as the .sh did.
  test("set-autonomy on v4 state file exits 1 AND leaves no orphan AUTONOMY_MODE_SET in audit", () => {
    seedV4();
    const res = runBolt(proj, "set-autonomy", "--mode", "autonomous");
    expect(res.status).toBe(1); // .sh: assert_eq "$RC" "1"
    // .sh: assert_not_grep "AUTONOMY_MODE_SET" in audit.md
    expect(readAudit(proj)).not.toContain("AUTONOMY_MODE_SET");
  });
});

// --- Test 16: unknown subcommand exits 1 -----------------------------------
describe("t33 dispatch: unknown subcommand", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  test("unknown subcommand exits 1", () => {
    proj = mkProj();
    expect(runBolt(proj, "bogus").status).toBe(1);
  });
});

// --- Test 24: full bolt lifecycle — start precedes complete in audit --------
describe("t33 lifecycle: BOLT_STARTED precedes BOLT_COMPLETED", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  test("bolt lifecycle: BOLT_STARTED precedes BOLT_COMPLETED for same bolt", () => {
    proj = mkStartedProject();
    runBolt(
      proj,
      "start",
      "--name",
      "auth-service",
      "--batch",
      "1",
      "--walking-skeleton",
      "true",
    );
    runBolt(proj, "complete", "--name", "auth-service", "--batch", "1");
    // .sh: grep -n line numbers, assert START_LINE < COMPLETE_LINE.
    const lines = readAudit(proj).split("\n");
    const startLine = lines.findIndex((l) => /^\*\*Event\*\*: BOLT_STARTED/.test(l));
    const completeLine = lines.findIndex((l) => /^\*\*Event\*\*: BOLT_COMPLETED/.test(l));
    expect(startLine).toBeGreaterThanOrEqual(0);
    expect(completeLine).toBeGreaterThanOrEqual(0);
    expect(startLine).toBeLessThan(completeLine);
  });
});
