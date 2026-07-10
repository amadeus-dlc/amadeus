// covers: subcommand:amadeus-sensor:fire
//
// In-process seam tests for the amadeus-sensor fire hardening (#792, #796).
// The fire path itself is spawn-only (handleFire calls process.exit), so its
// two new judgments were extracted into exported pure helpers that this file
// drives in-process — putting the new logic on the lcov map without a process
// boundary (NFR-2). Imported from dist/claude (the same seam t86 uses) so the
// tests exercise the shipped artifact the dispatcher runs.
//
// Source under test (dist/claude/.claude/tools/amadeus-sensor.ts):
//   stripProjectDir(argv)            — FR-8: pull `--project-dir <path>` out of an
//                                      argv slice (sibling contract with jump/state).
//   scriptErrorOutcome(err, ms)      — FR-9: fold a spawn exception into the
//                                      truth-table script-error family (kind
//                                      "passed" + `script-error: …` note).
//   decideOutcomeOrScriptError(...)  — FR-9: run an injected spawn and classify,
//                                      folding a synchronous throw to script-error
//                                      so SENSOR_FIRED always pairs with a terminal.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { SpawnSyncReturns } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sensorsDir } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  decideOutcomeOrScriptError,
  handleFire,
  main,
  scriptErrorOutcome,
  stripProjectDir,
} from "../../dist/claude/.claude/tools/amadeus-sensor.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seedStateFile,
} from "../harness/fixtures.ts";

describe("amadeus-sensor fire seam — stripProjectDir (FR-8)", () => {
  test("pulls --project-dir out of the middle of the argv, keeps the rest in order", () => {
    const got = stripProjectDir([
      "fire",
      "required-sections",
      "--project-dir",
      "/b",
      "--stage",
      "intent-capture",
    ]);
    expect(got.projectDirArg).toBe("/b");
    expect(got.rest).toEqual([
      "fire",
      "required-sections",
      "--stage",
      "intent-capture",
    ]);
  });

  test("absent --project-dir -> undefined, argv passed through untouched", () => {
    const argv = ["fire", "required-sections", "--stage", "intent-capture"];
    const got = stripProjectDir(argv);
    expect(got.projectDirArg).toBeUndefined();
    expect(got.rest).toEqual(argv);
  });

  test("trailing --project-dir with no value is left in rest (no consume past end)", () => {
    const got = stripProjectDir(["fire", "x", "--project-dir"]);
    expect(got.projectDirArg).toBeUndefined();
    expect(got.rest).toEqual(["fire", "x", "--project-dir"]);
  });
});

describe("amadeus-sensor fire seam — scriptErrorOutcome (FR-9)", () => {
  test("folds an Error into a passed script-error outcome carrying the elapsed ms", () => {
    const out = scriptErrorOutcome(new Error("boom"), 12);
    expect(out.kind).toBe("passed");
    if (out.kind !== "passed") throw new Error("unreachable");
    expect(out.durationMs).toBe(12);
    expect(out.note).toMatch(/^script-error: spawn-threw: /);
    expect(out.note).toContain("boom");
  });
});

// A minimal spawnSync-shaped result for the non-throw path. decideOutcome only
// reads ctx fields on the FAILED/timeout branches; a clean exit-0 PASSED result
// never touches them, so a bare cast context is sufficient here.
function passResult(): SpawnSyncReturns<string> {
  return {
    pid: 1,
    output: ["", '{"pass":true}\n', ""],
    stdout: '{"pass":true}\n',
    stderr: "",
    status: 0,
    signal: null,
  };
}

// biome-ignore lint/suspicious/noExplicitAny: FireContext is unused on the paths under test (throw + clean PASSED)
const fakeCtx = {} as any;

describe("amadeus-sensor fire seam — decideOutcomeOrScriptError (FR-9)", () => {
  test("a synchronous spawn throw folds to the script-error outcome (no rethrow)", () => {
    const out = decideOutcomeOrScriptError(fakeCtx, 60_000, Date.now(), () => {
      throw new RangeError("out of range");
    });
    expect(out.kind).toBe("passed");
    if (out.kind !== "passed") throw new Error("unreachable");
    expect(out.note).toMatch(/^script-error: spawn-threw: /);
    expect(out.note).toContain("out of range");
    expect(out.durationMs).toBeGreaterThanOrEqual(0);
  });

  test("a clean spawn result is classified by the truth table (PASSED)", () => {
    const out = decideOutcomeOrScriptError(
      fakeCtx,
      60_000,
      Date.now(),
      passResult,
    );
    expect(out.kind).toBe("passed");
    if (out.kind !== "passed") throw new Error("unreachable");
    // The happy path carries no script-error note.
    expect(out.note).toBeUndefined();
  });
});

// In-process drive of the fire dispatch (main → handleFire) and the list
// subcommand. The seams above cover the extracted pure helpers, but the handler
// bodies that CALL them — main's --project-dir strip + subcommand switch, and
// handleFire's resolve/spawn/emit wiring — are only reachable through the CLI,
// which the spawn-driven t-sensor-fire-hardening case cannot register in lcov.
// These drive the real dispatch against a seeded fixture (state seed required so
// the audit emit resolves the active intent — inprocess-fixture-state-seed).

const STAGE = "intent-capture";
const SENSOR_ID = "required-sections";
const STUB_SRC_DIR = join(FIXTURES_DIR, "v05-mr9-sensor-fire", "scripts");

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

// handleFire always ends via process.exit; in-process we convert that into a
// throwable so the drive returns the exit code. stdout is silenced (the fire
// prints a status line) so it does not pollute the test log.
function driveExit(fn: () => void): number {
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = () => {};
  let status = 0;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
  }
  return status;
}

describe("amadeus-sensor fire seam — dispatch drive (FR-8/FR-9, in-process)", () => {
  let proj: string;
  let scriptDir: string;
  let manifestDir: string;
  let outPath: string;
  const prevEnv: Record<string, string | undefined> = {};

  function setStubManifest(stubBasename: string): void {
    writeFileSync(
      join(manifestDir, `amadeus-${SENSOR_ID}.md`),
      [
        "---",
        `id: ${SENSOR_ID}`,
        "kind: deterministic",
        `command: bun .claude/tools/${stubBasename}`,
        "default_severity: advisory",
        "description: fire-seam fork manifest",
        "timeout_seconds: 5",
        "---",
        "# stub",
        "",
      ].join("\n"),
      "utf-8",
    );
  }

  beforeEach(() => {
    proj = createTestProject();
    seedStateFile(proj, "state-construction-bolt1.md");
    scriptDir = mkdtempSync(join(tmpdir(), "amadeus-fire-seam-scripts-"));
    manifestDir = mkdtempSync(join(tmpdir(), "amadeus-fire-seam-manifests-"));
    for (const stub of [
      "amadeus-sensor-stub-pass.ts",
      "amadeus-sensor-stub-fail.ts",
    ]) {
      copyFileSync(join(STUB_SRC_DIR, stub), join(scriptDir, stub));
    }
    outPath = join(proj, "artifact.md");
    writeFileSync(outPath, "# artifact\n\n## one\n\n## two\n", "utf-8");
    for (const k of [
      "CLAUDE_PROJECT_DIR",
      "AMADEUS_SENSORS_DIR",
      "AMADEUS_SENSOR_SCRIPT_DIR",
    ]) {
      prevEnv[k] = process.env[k];
    }
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_SENSORS_DIR = manifestDir;
    process.env.AMADEUS_SENSOR_SCRIPT_DIR = scriptDir;
  });

  afterEach(() => {
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    cleanupTestProject(proj);
    cleanupTestProject(scriptDir);
    cleanupTestProject(manifestDir);
  });

  test("main dispatches `fire` and the passing fire path exits 0", () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    const status = driveExit(() =>
      main(["fire", SENSOR_ID, "--stage", STAGE, "--output-path", outPath]),
    );
    expect(status).toBe(0);
  });

  test("a FAILED fire whose detail write cannot mkdir folds to script-error and still exits 0", () => {
    setStubManifest("amadeus-sensor-stub-fail.ts");
    // Plant a regular FILE where the detail dir must be created so step 7's
    // mkdirSync throws → the detail-write-failed catch runs (finalOutcome folds
    // to a passed script-error) and the fire still pairs its terminal + exits 0.
    const detailDir = join(sensorsDir(proj), STAGE);
    mkdirSync(sensorsDir(proj), { recursive: true });
    writeFileSync(detailDir, "not a directory\n", "utf-8");
    const status = driveExit(() =>
      handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]),
    );
    expect(status).toBe(0);
  });

  test("main dispatches `list` in-process (own argv, no exit)", () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    // list returns without process.exit; driveExit sees status 0 (no throw).
    expect(driveExit(() => main(["list"]))).toBe(0);
  });
});
