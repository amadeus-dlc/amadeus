// covers: subcommand:amadeus-bolt:start, subcommand:amadeus-bolt:complete, subcommand:amadeus-bolt:fail, subcommand:amadeus-bolt:set-autonomy, subcommand:amadeus-bolt:approve-batch
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

import { normalizeAuditRecord } from "../harness/audit-records.ts";
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
type AuditRecord = { event: string | null; fields?: Record<string, string> };
/** Parse the concatenated JSONL shards into records. */
function auditRecords(proj: string): AuditRecord[] {
  return readAudit(proj)
    .split("\n")
    .filter((l) => l.trim() !== "")
    .map((l) => normalizeAuditRecord(JSON.parse(l)) as unknown as AuditRecord);
}
/** Fields of the FIRST record carrying <ev> ({} when absent). */
function auditFields(proj: string, ev: string): Record<string, string> {
  return auditRecords(proj).find((r) => r.event === ev)?.fields ?? {};
}
function readState(proj: string): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

// Mirror the .sh's setup_construction_project (lines 89-98): seed the
// Construction state fixture (so the active-intent cursor resolves and set-autonomy
// can read/write the record's state), then append the Construction Autonomy Mode
// field (setFieldStrict parses by key, not location, so end-of-file append is fine).
// Bolt's audit shard is created lazily on first emit.
//
// PIN REVISED (#1846): the append is no longer standing in for a gap in the
// ENGINE. The birth scaffold now emits the field in `## Current Status`
// (t393 pins that, and pins set-autonomy succeeding on a BORN state). What the
// append still stands in for is this hand-written FIXTURE, which deliberately
// keeps the old shape — several suites (t17/t116/t147/t186/t188/t211) seed it and
// inject their own autonomy value, and a fixture-level field would take
// precedence over their injection (getField reads the first match). The v4
// state-file guard cases below keep pinning the strict, no-create contract.
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
    // .sh: assert_grep '^\*\*Event\*\*: BOLT_STARTED' — now the record's `event`.
    expect(auditRecords(proj).some((r) => r.event === "BOLT_STARTED")).toBe(true);
  });

  // Test 2: start records Batch number
  test("start records Batch number", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "auth-service", "--batch", "1");
    expect(auditFields(proj, "BOLT_STARTED")["Batch number"]).toBe("1");
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
    expect(auditFields(proj, "BOLT_STARTED")["Bolt names"]).toBe(
      "auth-service,payment-service,user-service",
    );
  });

  // Test 4: start --walking-skeleton true flags Walking skeleton=true
  test("start --walking-skeleton true flags correctly", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "b1", "--batch", "1", "--walking-skeleton", "true");
    expect(auditFields(proj, "BOLT_STARTED")["Walking skeleton"]).toBe("true");
  });

  // Test 21: start without --walking-skeleton defaults to false
  test("start without --walking-skeleton defaults to false", () => {
    proj = mkStartedProject();
    runBolt(proj, "start", "--name", "b1", "--batch", "1");
    expect(auditFields(proj, "BOLT_STARTED")["Walking skeleton"]).toBe("false");
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
  // mkStartedProject, not mkProj: the audit shard only resolves inside a record,
  // and a dir counts as one once it holds amadeus-state.md (#1377). Emitting
  // BOLT_COMPLETED with no resolvable workflow is the #676 hazard, not a fixture.
  test("complete emits BOLT_COMPLETED", () => {
    proj = mkStartedProject();
    runBolt(proj, "complete", "--name", "auth-service", "--batch", "1");
    expect(auditRecords(proj).some((r) => r.event === "BOLT_COMPLETED")).toBe(true);
  });
});

// --- Tests 8, 9: fail records Error summary + Succeeded siblings ------------
describe("t33 fail: BOLT_FAILED audit fields", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 8: fail emits BOLT_FAILED with error summary (mkStartedProject — see
  // test 7: an audit shard resolves only inside a record, #1377)
  test("fail records Error summary", () => {
    proj = mkStartedProject();
    runBolt(proj, "fail", "--name", "auth-service", "--error", "Compilation failed");
    expect(auditFields(proj, "BOLT_FAILED")["Error summary"]).toBe("Compilation failed");
  });

  // Test 9: fail --succeeded-siblings records sibling bolts (mkStartedProject —
  // see test 7)
  test("fail records Succeeded siblings", () => {
    proj = mkStartedProject();
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
    expect(auditFields(proj, "BOLT_FAILED")["Succeeded siblings"]).toBe("payment,user");
  });
});

// --- Tests 10-14, 23: set-autonomy happy path + validation ------------------
describe("t33 set-autonomy: emission, state update, validation", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  // Test 10: the removed legacy mode cannot mint authority.
  test("set-autonomy rejects the legacy autonomous mode without emitting authority", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "set-autonomy", "--mode", "autonomous").status).toBe(1);
    expect(auditRecords(proj).some((r) => r.event === "AUTONOMY_MODE_SET")).toBe(false);
  });

  // Test 11: set-autonomy updates Construction Autonomy Mode in state file
  test("set-autonomy legacy autonomous mode leaves state unchanged", () => {
    proj = setupConstructionProject();
    runBolt(proj, "set-autonomy", "--mode", "autonomous");
    expect(readState(proj)).toMatch(/Construction Autonomy Mode.*gated/);
  });

  // Test 12: gated was also a legacy spelling and is rejected.
  test("set-autonomy rejects the legacy gated mode", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "set-autonomy", "--mode", "gated").status).toBe(1);
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

  // Test 23: a rejected legacy request never acknowledges a state update.
  test("set-autonomy legacy request has no state_updated acknowledgement", () => {
    proj = setupConstructionProject();
    const res = runBolt(proj, "set-autonomy", "--mode", "autonomous");
    expect(res.status).toBe(1);
    expect(res.out).not.toContain('"state_updated":true');
  });
});

// --- approve-batch: the gated swarm's batch-end gate (issue #1612) ----------
// Under `Construction Autonomy Mode: gated` the engine fans a batch out and then
// stops at a batch-end gate, refusing the next batch until the human records the
// approval here. The subcommand appends the 1-origin batch number to
// `Swarm Gated Batch Approvals` and emits GATE_APPROVED (existing taxonomy).
describe("t33 approve-batch: gated swarm batch-end gate", () => {
  let proj = "";
  afterEach(() => {
    cleanupTestProject(proj);
    proj = "";
  });

  test("approve-batch emits GATE_APPROVED", () => {
    proj = setupConstructionProject();
    runBolt(proj, "approve-batch", "--batch", "1");
    expect(auditRecords(proj).some((r) => r.event === "GATE_APPROVED")).toBe(true);
  });

  test("approve-batch records the batch number in state", () => {
    proj = setupConstructionProject();
    runBolt(proj, "approve-batch", "--batch", "1");
    expect(readState(proj)).toMatch(/Swarm Gated Batch Approvals\*\*: 1/);
  });

  test("approve-batch appends a second batch without dropping the first", () => {
    proj = setupConstructionProject();
    runBolt(proj, "approve-batch", "--batch", "1");
    runBolt(proj, "approve-batch", "--batch", "3");
    expect(readState(proj)).toMatch(/Swarm Gated Batch Approvals\*\*: 1, 3/);
  });

  test("approve-batch is idempotent: re-approving records no second GATE_APPROVED", () => {
    proj = setupConstructionProject();
    runBolt(proj, "approve-batch", "--batch", "1");
    const res = runBolt(proj, "approve-batch", "--batch", "1");
    expect(res.status).toBe(0);
    expect(res.out).toContain('"already_approved":true');
    // .sh-style count assertion: exactly ONE GATE_APPROVED row, not two.
    expect(auditRecords(proj).filter((r) => r.event === "GATE_APPROVED").length).toBe(1);
    expect(readState(proj)).toMatch(/Swarm Gated Batch Approvals\*\*: 1$/m);
  });

  test("approve-batch --batch bogus exits 1", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "approve-batch", "--batch", "bogus").status).toBe(1);
  });

  test("approve-batch --batch 0 exits 1 (batch numbers are 1-origin)", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "approve-batch", "--batch", "0").status).toBe(1);
  });

  test("approve-batch missing --batch exits 1", () => {
    proj = setupConstructionProject();
    expect(runBolt(proj, "approve-batch").status).toBe(1);
  });

  test("approve-batch on a rejected batch number leaves no orphan GATE_APPROVED", () => {
    proj = setupConstructionProject();
    runBolt(proj, "approve-batch", "--batch", "-2");
    expect(readAudit(proj)).not.toContain("GATE_APPROVED");
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
    // .sh: grep -n line numbers, assert START_LINE < COMPLETE_LINE. Record order
    // in the JSONL ledger is the same evidence.
    const events = auditRecords(proj).map((r) => r.event);
    const startLine = events.indexOf("BOLT_STARTED");
    const completeLine = events.indexOf("BOLT_COMPLETED");
    expect(startLine).toBeGreaterThanOrEqual(0);
    expect(completeLine).toBeGreaterThanOrEqual(0);
    expect(startLine).toBeLessThan(completeLine);
  });
});
