// covers: subcommand:amadeus-bolt:approve-batch, function:verifyBatchApprovalPresence
//
// D7 (FR-12, RFC-0001 appendix C): approve-batch records the human's approval
// at a gated swarm's BATCH-END gate, but ran with NO presence verification — an
// AI agent invoking the subcommand directly committed the approval
// unconditionally, with no evidence a real human acted. This pins the fix:
// verifyBatchApprovalPresence (amadeus-lib.ts) refuses INSIDE withAuditLock, as
// the callback's first operation, before any state read, idempotency
// shortcut, or GATE_APPROVED emission — closing the TOCTOU window between
// checking presence and recording the approval (functional-design-questions.md
// Q2).
//
// R-1: no presence -> refusal, no GATE_APPROVED emitted, state untouched.
// R-2: the presence check sits INSIDE withAuditLock and BEFORE the idempotent
//      shortcut - a presence-less re-call against an already-approved batch is
//      refused uniformly (falsifying the "idempotent, so allowed" loophole).
// R-6: verifyBatchApprovalPresence holds no predicate of its own and reuses
//      humanActedSinceGate (intent-based deduplication).
// R-7: a presence refusal leaves no new audit trace - the audit shard and the
//      state file are byte-identical before and after the refusal.
//
// Mechanism: in-process via the exported handleBoltCommand seam (the t507
// precedent). process.exit is trapped (t214 precedent) since a presence
// refusal calls the shared error() helper, which exits the process — an
// in-process CLI error path must not tear down the test runner.
//
// WHY ONE PROJECT FOR THE WHOLE FILE. The audit emitter bootstraps OTel logs
// once per process and refuses to re-bootstrap for a second workspace ("one
// workspace per process"), so the arms below run in sequence against a shared
// fixture project.

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Isolate this run's audit-lock dirs (#831) BEFORE the tool import, so the
// locks approve-batch takes never alias a concurrent run's real lock in the
// shared tmpdir.
const LOCK_BASE_DIR = mkdtempSync(join(tmpdir(), "amadeus-tabpg-locks-"));
process.env.AMADEUS_LOCK_BASE_DIR = LOCK_BASE_DIR;

// tests/run-tests.ts sets AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1 for the whole
// suite (most approve/advance-shaped tests drive the gate without recording a
// HUMAN_TURN — verifyBatchApprovalPresence honours the same suite-wide
// off-switch the sibling amadeus-state.ts presence guards use). THIS file is
// the dedicated guard test for D7/FR-12, so it clears the var — mirroring the
// t188-human-presence-gate precedent — to exercise REAL enforcement
// regardless of whether it runs standalone or under the full suite.
delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;

import { handleBoltCommand } from "../../packages/framework/core/tools/amadeus-bolt.ts";
import {
  getField,
  SWARM_BATCH_APPROVALS_FIELD,
} from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditDir,
  seededAuditShard,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

resetAidlcEnv();

const STATE_FIXTURE = join(FIXTURES_DIR, "state-construction.md");

let proj: string;

function readState(p: string): string {
  return readFileSync(seededStateFile(p), "utf-8");
}

/** Byte snapshot of every .jsonl shard in the record's audit dir. */
function snapshotAudit(p: string): Record<string, string> {
  const dir = seededAuditDir(p);
  const snapshot: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    snapshot[name] = readFileSync(join(dir, name), "utf-8");
  }
  return snapshot;
}

function gateApprovedCount(p: string): number {
  let count = 0;
  for (const content of Object.values(snapshotAudit(p))) {
    for (const line of content.split("\n")) {
      if (!line.trim()) continue;
      let row: { event?: string; attributes?: { Event?: string } };
      try {
        row = JSON.parse(line) as typeof row;
      } catch {
        continue; // a shard header or other non-JSON separator line
      }
      if (row.event === "GATE_APPROVED" || row.attributes?.Event === "GATE_APPROVED") count += 1;
    }
  }
  return count;
}

// Plant a HUMAN_TURN block directly into the fixture's audit shard — the same
// technique t188's recordHumanTurn uses: a TEST FIXTURE, not the production
// path (the audit CLI refuses to append HUMAN_TURN — #685).
function recordHumanTurn(p: string): void {
  const shard = seededAuditShard(p);
  const existing = readFileSync(shard, "utf-8");
  const seq = existing.split("\n").filter((l) => l.trim() !== "").length + 1;
  const ts = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const row = `${JSON.stringify({
    schemaVersion: 1,
    seq,
    cloneId: "fixturecloneid01",
    intentId: "fixture-0f14ce29",
    timestamp: ts,
    heading: "Human Turn",
    event: "HUMAN_TURN",
    fields: {},
  })}\n`;
  writeFileSync(shard, existing + row);
}

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

// Convert process.exit + console.* into captured values so an in-process run
// of the CLI error path (verifyBatchApprovalPresence's refusal -> error()) does
// not tear down the test runner (t214 precedent).
function boltCapture(subcommand: string, args: string[], p: string): { rc: number; out: string } {
  let stdout = "";
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = (...a: unknown[]) => {
    stdout += `${a.map(String).join(" ")}\n`;
  };
  console.error = (...a: unknown[]) => {
    stderr += `${a.map(String).join(" ")}\n`;
  };
  let rc = 0;
  try {
    handleBoltCommand(subcommand, args, p);
  } catch (e) {
    if (e instanceof ExitSignal) rc = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
    console.error = origErr;
  }
  return { rc, out: stdout + stderr };
}

beforeAll(() => {
  proj = createTestProject();
  seedStateFile(proj, STATE_FIXTURE);
  seedAuditFile(proj); // SESSION_STARTED/ARTIFACT_CREATED/SUBAGENT_COMPLETED — ledger
  // non-empty (presence tracking active) but carries NO HUMAN_TURN.
});

afterAll(() => {
  cleanupTestProject(proj);
  delete process.env.AMADEUS_LOCK_BASE_DIR;
  try {
    rmSync(LOCK_BASE_DIR, { recursive: true, force: true });
  } catch {
    // best-effort
  }
});

describe("D7: approve-batch refuses without a fresh human presence (FR-12)", () => {
  test("R-1/R-7: no HUMAN_TURN on the ledger -> refuse, no GATE_APPROVED, state/audit byte-unchanged", () => {
    const stateBefore = readState(proj);
    const auditBefore = snapshotAudit(proj);
    const gateApprovedBefore = gateApprovedCount(proj);

    const { rc, out } = boltCapture("approve-batch", ["--batch", "1"], proj);

    expect(rc).not.toBe(0);
    expect(out.toLowerCase()).toMatch(/presence|human/);
    // No batch landed in the state field at all (it was never inserted).
    expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBeNull();
    // R-7: byte-identical audit + state — the refusal leaves no trace.
    expect(readState(proj)).toBe(stateBefore);
    expect(snapshotAudit(proj)).toEqual(auditBefore);
    expect(gateApprovedCount(proj)).toBe(gateApprovedBefore);
  });

  // Establishes a LEGITIMATE approval of batch 1 (fresh HUMAN_TURN present),
  // consuming that turn — the ledger the next test needs (an already-approved
  // batch whose presence has since been spent).
  test("setup: a fresh HUMAN_TURN legitimately approves batch 1", () => {
    recordHumanTurn(proj);
    const { rc } = boltCapture("approve-batch", ["--batch", "1"], proj);
    expect(rc).toBe(0);
    expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBe("1");
    expect(gateApprovedCount(proj)).toBe(1);
  });

  test("R-2: a presence-less re-approve of an ALREADY-approved batch still refuses (no idempotency bypass)", () => {
    const stateBefore = readState(proj);
    const auditBefore = snapshotAudit(proj);
    const gateApprovedBefore = gateApprovedCount(proj);

    // batch 1 is already approved (previous test) and the HUMAN_TURN that
    // approved it has been consumed by that GATE_APPROVED — no fresh presence.
    const { rc, out } = boltCapture("approve-batch", ["--batch", "1"], proj);

    expect(rc).not.toBe(0);
    expect(out.toLowerCase()).toMatch(/presence|human/);
    // Must NOT take the idempotent {already_approved:true} shortcut — presence
    // is checked before state is even read.
    expect(out).not.toContain("already_approved");
    expect(readState(proj)).toBe(stateBefore);
    expect(snapshotAudit(proj)).toEqual(auditBefore);
    expect(gateApprovedCount(proj)).toBe(gateApprovedBefore);
  });

  test("non-regression: a fresh HUMAN_TURN still approves a NEW batch normally", () => {
    recordHumanTurn(proj);
    const { rc } = boltCapture("approve-batch", ["--batch", "2"], proj);
    expect(rc).toBe(0);
    expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBe("1, 2");
    expect(gateApprovedCount(proj)).toBe(2);
  });

  // Discovered while implementing D7 (not in the original FD text, but required
  // for consistency — see the doc comment on verifyBatchApprovalPresence):
  // amadeus-state.ts's sibling presence guards (assertHumanPresentForGateResolution
  // / handleDelegateApproval / handleDelegateRejection) all honour
  // humanPresenceGuardDisabled(), the suite-wide deterministic off-switch
  // (AMADEUS_SKIP_HUMAN_PRESENCE_GUARD) tests/run-tests.ts sets globally so the
  // rest of the approve/advance-shaped test suite need not seed a HUMAN_TURN.
  // verifyBatchApprovalPresence must honour the SAME switch, or every existing
  // approve-batch test the suite runs (t33, t145, t507, ...) would need bespoke
  // presence-seeding to keep passing under the full suite.
  test("suite-wide off-switch: AMADEUS_SKIP_HUMAN_PRESENCE_GUARD=1 bypasses presence (matches sibling gates)", () => {
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    try {
      // No recordHumanTurn — the bypass alone must let this through.
      const { rc } = boltCapture("approve-batch", ["--batch", "3"], proj);
      expect(rc).toBe(0);
      expect(getField(readState(proj), SWARM_BATCH_APPROVALS_FIELD)).toBe("1, 2, 3");
    } finally {
      delete process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
    }
  });
});

describe("R-6: verifyBatchApprovalPresence reuses humanActedSinceGate (no independent predicate)", () => {
  test("the source calls humanActedSinceGate and does not call scanPresenceLedger directly", () => {
    const src = readFileSync(
      join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools", "amadeus-lib.ts"),
      "utf-8",
    );
    const fnStart = src.indexOf("function verifyBatchApprovalPresence");
    expect(fnStart).toBeGreaterThan(-1);
    const fnBody = src.slice(fnStart, src.indexOf("\n}", fnStart) + 2);
    expect(fnBody).toContain("humanActedSinceGate(");
    expect(fnBody).not.toContain("scanPresenceLedger(");
  });
});
