// Spawn-driven integration for core-repair batch3 U6 (#744 / #749).
//
// These cases exercise the shipped dist CLIs end-to-end through the process
// boundary — the behavioural depth the in-process seam (t-batch3-orchestrate-
// seam) cannot reach: the loud-reject exit codes and the emitted directive gate.
//
// #744 — PHASE_NUMBERS raw lookup surfaced all-lowercase Object.prototype
//        members. `--phase constructor` (orchestrate next / jump resolve) and
//        `lookup validate-phase constructor` (state) must LOUD-REJECT instead of
//        crashing on / accepting the prototype value. Normal phase names are
//        unchanged.
// #749 — `--stage <first construction stage> --single` must NOT stall at
//        gate:"unresolved"; the single run resolves the skeleton-gate stage to a
//        determinate gated boolean and still never advances the main pointer.

import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const BUN = process.execPath;
const ORCHESTRATE = join(AMADEUS_SRC, "tools", "amadeus-orchestrate.ts");
const JUMP = join(AMADEUS_SRC, "tools", "amadeus-jump.ts");
const STATE = join(AMADEUS_SRC, "tools", "amadeus-state.ts");

const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");
const MID_INCEPTION = join(FIXTURES_DIR, "state-mid-inception.md");

interface RunResult {
  rc: number;
  out: string;
}

function run(tool: string, args: string[], proj?: string): RunResult {
  const full = proj ? [tool, ...args, "--project-dir", proj] : [tool, ...args];
  const res = spawnSync(BUN, full, {
    encoding: "utf-8",
    ...(proj ? { cwd: proj } : {}),
  });
  return { rc: res.status ?? -1, out: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

let proj = "";
beforeAll(() => {
  resetAidlcEnv();
});
afterEach(() => {
  resetAidlcEnv();
  cleanupTestProject(proj);
  proj = "";
});

// ===========================================================================
// #744 — orchestrate next --phase constructor loud-rejects (no prototype leak).
// ===========================================================================
describe("t-batch3 spawn: orchestrate --phase (#744)", () => {
  test("--phase constructor is rejected as unknown (not a prototype value)", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const r = run(ORCHESTRATE, ["next", "--phase", "constructor"], proj);
    // next relays the jump tool's verbatim rejection as an error directive
    // (rather than crashing on the prototype value or routing to a run-stage).
    expect(r.out).toContain('"kind":"error"');
    expect(r.out).toContain("Unknown phase");
    expect(r.out).not.toContain('"kind":"run-stage"');
  });

  test("--phase construction (a real phase) still resolves", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const r = run(ORCHESTRATE, ["next", "--phase", "construction"], proj);
    expect(r.out).not.toContain("Unknown phase");
  });
});

// ===========================================================================
// #744 — jump resolve --phase constructor loud-rejects.
// ===========================================================================
describe("t-batch3 spawn: jump --phase (#744)", () => {
  test("resolve --phase constructor is rejected as unknown", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    const r = run(JUMP, ["resolve", "--phase", "constructor"], proj);
    expect(r.out).toContain("Unknown phase");
    expect(r.rc).not.toBe(0);
  });
});

// ===========================================================================
// #744 — state lookup validate-phase constructor returns valid:false.
// ===========================================================================
describe("t-batch3 spawn: state validate-phase (#744)", () => {
  test("validate-phase constructor is valid:false (not a prototype value)", () => {
    const r = run(STATE, ["lookup", "validate-phase", "constructor"]);
    expect(r.out).toContain('"valid":false');
  });

  test("validate-phase construction stays valid:true", () => {
    const r = run(STATE, ["lookup", "validate-phase", "construction"]);
    expect(r.out).toContain('"valid":true');
    expect(r.out).toContain('"canonical":"construction"');
  });
});

// ===========================================================================
// #749 — --single on the first construction stage resolves the gate (no
// gate:"unresolved" stall) and never advances the main Current Stage.
// ===========================================================================
describe("t-batch3 spawn: --single gate resolution (#749)", () => {
  test("--stage code-generation --single does not stall at gate:\"unresolved\"", () => {
    proj = createTestProject();
    seedStateFile(proj, MID_INCEPTION);
    const r = run(ORCHESTRATE, ["next", "--stage", "code-generation", "--single"], proj);
    expect(r.out).toContain('"kind":"run-stage"');
    expect(r.out).not.toContain('"gate":"unresolved"');
  });
});
