// covers: cli:amadeus-log(answer), function:handleAnswer, function:declaredIntentAutonomyMode, file:packages/framework/core/tools/amadeus-log.ts
// size: medium

// RFC-0001 R-21 (#3116). `amadeus-log answer` skips the human-presence check in
// autonomous Construction, because a Bolt answering its own question is not a
// human and there is none to wait for. That carve-out used to key off
// `Construction Autonomy Mode`, which semi now projects to `autonomous` (FR-6) —
// so without this change the projection would silently switch off the presence
// guard for every semi answer, widening exactly the fail-open FR-12 is closing.
//
// The carve-out is bound to the DECLARED Intent mode instead: `full` is the mode
// that means "nobody is watching", and it is the one this exempts.
//
// MECHANISM. cli, following t188's idiom: spawn the real dist tool with the
// suite-wide presence bypass REMOVED from its env, so the guard is under test
// rather than the bypass.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  FIXTURE_CLONE_ID,
  resetAidlcEnv,
  seededAuditShard,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";
import { findAllEvents, readAllAuditShards } from "../../dist/claude/.claude/tools/amadeus-lib.ts";

const BUN = process.execPath;
const LOG = join(AMADEUS_SRC, "tools", "amadeus-log.ts");
const MID_IDEATION = "state-mid-ideation.md";

function guardedLog(proj: string, args: string[]): { rc: number; out: string } {
  const env = { ...process.env };
  env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
  delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  const r = spawnSync(BUN, [LOG, ...args, "--project-dir", proj], { encoding: "utf-8", env });
  return { rc: r.status ?? -1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

function recordHumanTurn(proj: string): void {
  const shard = seededAuditShard(proj);
  mkdirSync(dirname(shard), { recursive: true });
  const seq = existsSync(shard)
    ? readFileSync(shard, "utf-8").split("\n").filter((l) => l.trim() !== "").length + 1
    : 1;
  appendFileSync(
    shard,
    `${JSON.stringify({
      schemaVersion: 1,
      seq,
      cloneId: FIXTURE_CLONE_ID,
      intentId: DEFAULT_RECORD_DIR,
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
      heading: "Human Turn",
      event: "HUMAN_TURN",
      fields: {},
    })}\n`,
    "utf-8",
  );
}

// The mid-ideation fixture carries neither autonomy field, and setField is a
// no-op for an absent field, so the pair is written directly.
function declareModes(proj: string, mode: string, projection: string): void {
  const sf = seededStateFile(proj);
  writeFileSync(
    sf,
    `${readFileSync(sf, "utf-8")}\n- **Intent Autonomy Mode**: ${mode}\n- **Construction Autonomy Mode**: ${projection}\n`,
    "utf-8",
  );
}

// The presence guard fails OPEN on an empty ledger (presence not tracked yet),
// so every case below puts a non-HUMAN_TURN event on it first — otherwise the
// carve-out under test would not be what decides the outcome.
function seedLedger(proj: string): void {
  const r = guardedLog(proj, ["decision", "--stage", "feasibility", "--decision", "Seed a non-human ledger event"]);
  expect(r.rc).toBe(0);
}

function answers(proj: string): number {
  return findAllEvents(readAllAuditShards(proj), "QUESTION_ANSWERED").length;
}

let proj: string;

describe("R-21: the answer-path presence carve-out follows the declared mode", () => {
  beforeEach(() => {
    resetAidlcEnv();
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
  });

  afterEach(() => cleanupTestProject(proj));

  test("semi REFUSES an answer with no human turn, even though it projects to autonomous", () => {
    seedLedger(proj);
    declareModes(proj, "semi", "autonomous");
    const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
    expect(r.rc).not.toBe(0);
    expect(r.out).toContain("a real human has not acted");
    expect(answers(proj)).toBe(0);
  });

  test("semi COMMITS the same answer once a human turn is on the ledger", () => {
    seedLedger(proj);
    declareModes(proj, "semi", "autonomous");
    recordHumanTurn(proj);
    const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
    expect(r.rc).toBe(0);
    expect(answers(proj)).toBe(1);
  });

  test("full keeps its carve-out: an unattended answer still records", () => {
    seedLedger(proj);
    declareModes(proj, "full", "autonomous");
    const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
    expect(r.rc).toBe(0);
    expect(answers(proj)).toBe(1);
  });

  test("none is unaffected — it was never exempt", () => {
    seedLedger(proj);
    declareModes(proj, "none", "gated");
    const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
    expect(r.rc).not.toBe(0);
    expect(answers(proj)).toBe(0);
  });

  // Fail-closed (election E-260816-R21-PRESENCE-BYPASS, binding reservation 1):
  // the carve-out opens on a READ mode of `full` and on nothing else. A record
  // the predicate cannot read a mode from — the row missing, the value empty, the
  // value hand-edited to something outside the domain — keeps the presence guard.
  // Each of these carries an `autonomous` projection, so under the retired
  // predicate (which read the projection) every one of them would have bypassed.
  test("a mode the predicate cannot read keeps the guard, whatever the projection says", () => {
    for (const row of ["- **Intent Autonomy Mode**:", "- **Intent Autonomy Mode**:   ", "- **Intent Autonomy Mode**: Full"]) {
      cleanupTestProject(proj);
      proj = createTestProject();
      seedStateFile(proj, MID_IDEATION);
      const sf = seededStateFile(proj);
      writeFileSync(sf, `${readFileSync(sf, "utf-8")}\n${row}\n- **Construction Autonomy Mode**: autonomous\n`, "utf-8");
      seedLedger(proj);
      const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
      expect(r.rc).not.toBe(0);
      expect(r.out).toContain("a real human has not acted");
      expect(answers(proj)).toBe(0);
    }
  });

  // The projection alone must not open the carve-out either: a record whose
  // scheduling field says autonomous with no declaration row behind it at all is
  // exactly the out-of-band write the divergence check refuses elsewhere.
  test("an autonomous projection with no declared mode does NOT exempt the answer", () => {
    const sf = seededStateFile(proj);
    writeFileSync(sf, `${readFileSync(sf, "utf-8")}\n- **Construction Autonomy Mode**: autonomous\n`, "utf-8");
    seedLedger(proj);
    const r = guardedLog(proj, ["answer", "--stage", "feasibility", "--details", "my answer"]);
    expect(r.rc).not.toBe(0);
    expect(answers(proj)).toBe(0);
  });
});
