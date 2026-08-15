// covers: subcommand:amadeus-state:park, subcommand:amadeus-state:unpark, audit:WORKFLOW_PARKED
// size: small
//
// RFC-0001 FR-3 / ADR-4 — the park autonomy guard is GONE.
//
// #365's guard refused `park` under `Construction Autonomy Mode: autonomous`
// whenever the record's presence ledger held no unconsumed `HUMAN_TURN`, on the
// premise that "an unattended run has no human to resume it and must keep
// moving". RFC-0001's D1/D5 reject exactly that premise: a non-interactive full
// run that reaches a ruling it may not make has to be able to stop, and the
// state tool was the layer making that structurally impossible. The refusal is
// removed outright (no flag, no env off-switch, no compatibility arm).
//
// What the removal does NOT touch is the accounting: `WORKFLOW_PARKED` is still
// a presence resolution, so an outstanding turn is still spent by the park it
// licenses (one turn = one park). That half is now asserted through the ledger
// predicate rather than through a refusal, because there is no refusal left to
// observe it with.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { outstandingHumanTurns } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedAuditFile,
  seededAuditShard,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STATE_TOOL = join(REPO_ROOT, "packages/framework/core/tools/amadeus-state.ts");
const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");

let proj = "";

/**
 * Run the real CLI with the suite runner's presence bypass stripped: the guard
 * deliberately never honoured `AMADEUS_SKIP_HUMAN_PRESENCE_GUARD`, and R-4
 * requires that no env var reaches the paths that replace it either.
 */
function runState(args: string[], extraEnv: NodeJS.ProcessEnv = {}) {
  const env = { ...process.env, ...extraEnv };
  if (extraEnv.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD === undefined) {
    delete env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD;
  }
  const res = spawnSync(process.execPath, [STATE_TOOL, ...args, "--project-dir", proj], {
    encoding: "utf-8",
    env,
  });
  return { rc: res.status, combined: `${res.stdout}${res.stderr}` };
}

function stateText(): string {
  return readFileSync(seededStateFile(proj), "utf-8");
}

/**
 * Edit the state file directly. `amadeus-state.ts set` refuses the fields these
 * cases need (it will not insert an absent bullet, and it guards `Status`), so
 * the fixture is shaped on disk and only `park` runs through the CLI.
 */
function patchState(find: string, replace: string): void {
  const path = seededStateFile(proj);
  const before = readFileSync(path, "utf-8");
  if (!before.includes(find)) throw new Error(`fixture does not contain ${JSON.stringify(find)}`);
  writeFileSync(path, before.replace(find, replace), "utf-8");
}

function declareAutonomous(): void {
  patchState("## Runtime State", "## Runtime State\n- **Construction Autonomy Mode**: autonomous");
}

/** One HUMAN_TURN row in the record's own shard — the ledger the predicates read. */
function seedHumanTurn(timestamp: string): void {
  appendFileSync(
    seededAuditShard(proj),
    `${JSON.stringify({
      schemaVersion: 1,
      seq: 4,
      cloneId: "fixturecloneid01",
      intentId: "fixture-0f14ce29",
      timestamp,
      heading: "Human Turn",
      event: "HUMAN_TURN",
      fields: {},
    })}\n`,
    "utf-8",
  );
}

beforeEach(() => {
  resetAidlcEnv();
  proj = createTestProject();
  seedStateFile(proj, MID_IDEATION); // Current Stage: feasibility
  seedAuditFile(proj);
});

afterEach(() => {
  cleanupTestProject(proj);
  resetAidlcEnv();
});

describe("t1241 park under autonomous mode (FR-3: the guard is removed)", () => {
  // R-1 / FP-1 — the falling proof. Before the removal this exits non-zero with
  // "Refusing to park: Construction Autonomy Mode is autonomous ...".
  test("an unattended autonomous run CAN park", () => {
    declareAutonomous();
    expect(outstandingHumanTurns(proj)).toHaveLength(0);

    const res = runState(["park"]);

    expect(res.rc).toBe(0);
    expect(stateText()).toContain("- **Parked**:");
    expect(stateText()).toContain("- **Parked At Stage**: feasibility");
  });

  // R-2 — the accounting is unchanged: the park still resolves the turn that
  // was outstanding, so one turn licenses exactly one park.
  test("a park still consumes an outstanding HUMAN_TURN", () => {
    declareAutonomous();
    seedHumanTurn("2026-08-14T09:00:00Z");
    expect(outstandingHumanTurns(proj)).toHaveLength(1);

    expect(runState(["park"]).rc).toBe(0);

    expect(outstandingHumanTurns(proj)).toHaveLength(0);
    expect(runState(["unpark"]).rc).toBe(0);
    // The second park is now ACCEPTED (the refusal is gone) and finds nothing
    // left to consume — the turn was spent by the first one, not re-credited.
    expect(runState(["park"]).rc).toBe(0);
    expect(outstandingHumanTurns(proj)).toHaveLength(0);
  });

  // R-3 — the refusals that are NOT the autonomy guard survive untouched.
  test("a completed workflow is still refused", () => {
    patchState("- **Status**: Running", "- **Status**: Completed");
    const res = runState(["park"]);
    expect(res.rc).not.toBe(0);
    expect(res.combined).toContain("already Completed");
    expect(stateText()).not.toContain("- **Parked**:");
  });

  test("a state file without a Current Stage is still refused", () => {
    patchState("- **Current Stage**: feasibility", "- **Current Stage**:");
    const res = runState(["park"]);
    expect(res.rc).not.toBe(0);
    expect(res.combined).toContain("no Current Stage");
    expect(stateText()).not.toContain("- **Parked**:");
  });

  // R-4 — no env var is an off-switch in either direction. The bypass the old
  // guard refused to honour must not become meaningful now that the guard is
  // gone: park's verdict is identical with the variable set.
  test("AMADEUS_SKIP_HUMAN_PRESENCE_GUARD changes nothing", () => {
    declareAutonomous();
    const res = runState(["park"], { AMADEUS_SKIP_HUMAN_PRESENCE_GUARD: "1" });
    expect(res.rc).toBe(0);
    expect(stateText()).toContain("- **Parked**:");
  });

  // R-5 — the rule's prose goes with the rule. A guard explanation left behind
  // in the source is a claim the code no longer honours (FR-8, UI truthfulness).
  test("the guard's premise is not left behind in the source", () => {
    const source = readFileSync(
      join(REPO_ROOT, "packages/framework/core/tools/amadeus-state.ts"),
      "utf-8",
    );
    expect(source).not.toContain("must keep moving");
    expect(source).not.toContain("Refusing to park");
    expect(source).toContain("function handlePark"); // the predicate is not vacuous
  });
});
