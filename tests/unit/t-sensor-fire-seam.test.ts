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
import { spawnSync, type SpawnSyncReturns } from "node:child_process";
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  _resetStageGraphForTests,
  sensorsDir,
} from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  decideOutcomeOrScriptError,
  handleFire,
  main,
  prepareSensorChildEnv,
  runCliIfMain,
  scriptErrorOutcome,
  stripProjectDir,
} from "../../dist/claude/.claude/tools/amadeus-sensor.ts";
import { __resetGraphCache } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededRecordDir,
  seedStateFile,
} from "../harness/fixtures.ts";
import { resetObservabilityConfigCache } from "../../dist/claude/.claude/tools/amadeus-observability.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  clearIntentContextForTests,
  currentIntentContext,
} from "../../dist/claude/.claude/otel/context.ts";

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
const DEFAULT_STAGE_GRAPH = join(
  import.meta.dir,
  "..",
  "..",
  "dist",
  "claude",
  ".claude",
  "tools",
  "data",
  "stage-graph.json",
);

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

// handleFire always ends via process.exit; in-process we convert that into a
// throwable so the drive returns the exit code. stdout is silenced (the fire
// prints a status line) so it does not pollute the test log.
// handleFire is async, and since the dispatcher resolves its canonical emitter
// through a lazy import the FIRST await now precedes the audit emit. Driving it
// without awaiting would leave the emit running in a floating promise that
// outlives the case — bootstrapping the Logger Provider for a temp project the
// next case's afterEach has already deleted. So the drive awaits.
async function driveExit(fn: () => void | Promise<void>): Promise<number> {
  const origExit = process.exit.bind(process);
  const origLog = console.log;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.log = () => {};
  let status = 0;
  try {
    await fn();
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    console.log = origLog;
  }
  return status;
}

async function driveExitWithStderr(
  fn: () => void | Promise<void>,
): Promise<{ status: number; stderr: string }> {
  const origExit = process.exit.bind(process);
  const origErr = process.stderr.write.bind(process.stderr);
  let stderr = "";
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  process.stderr.write = ((chunk: string | Uint8Array) => {
    stderr += chunk.toString();
    return true;
  }) as typeof process.stderr.write;
  let status = 0;
  try {
    await fn();
  } catch (e) {
    if (e instanceof ExitSignal) status = e.code;
    else throw e;
  } finally {
    process.exit = origExit;
    process.stderr.write = origErr;
  }
  return { status, stderr };
}

describe("amadeus-sensor fire seam — dispatch drive (FR-8/FR-9, in-process)", () => {
  let proj: string;
  let scriptDir: string;
  let manifestDir: string;
  let outPath: string;
  let stageGraphDir: string | undefined;
  const prevEnv: Record<string, string | undefined> = {};

  function useBundleStageGraph(): void {
    stageGraphDir = mkdtempSync(join(tmpdir(), "amadeus-fire-seam-graph-"));
    const graph = JSON.parse(readFileSync(DEFAULT_STAGE_GRAPH, "utf-8")) as Array<
      Record<string, unknown>
    >;
    const stage = graph.find((candidate) => candidate.slug === STAGE);
    if (!stage) throw new Error(`stage graph is missing ${STAGE}`);
    stage.bundle = "book";
    stage.required_sections = ["Overview", "Details"];
    writeFileSync(
      join(stageGraphDir, "stage-graph.json"),
      `${JSON.stringify(graph, null, 2)}\n`,
      "utf-8",
    );
    process.env.AMADEUS_STAGE_GRAPH = join(stageGraphDir, "stage-graph.json");
    _resetStageGraphForTests();
    __resetGraphCache();
  }

  function setStubManifest(stubBasename: string, timeoutSeconds = 5): void {
    writeFileSync(
      join(manifestDir, `amadeus-${SENSOR_ID}.md`),
      [
        "---",
        `id: ${SENSOR_ID}`,
        "kind: deterministic",
        `command: bun .claude/tools/${stubBasename}`,
        "default_severity: advisory",
        "description: fire-seam fork manifest",
        `timeout_seconds: ${timeoutSeconds}`,
        "---",
        "# stub",
        "",
      ].join("\n"),
      "utf-8",
    );
  }

  beforeEach(() => {
    proj = createTestProject();
    // The dispatcher emits through the canonical path now, and BOTH the Logger
    // Provider registration and the bootstrap record are per-PROCESS. Without
    // this reset a case inherits the registration a previous case made for its
    // own (since-deleted) temp project, and the emit resolves a shard under a
    // workspace that no longer exists.
    resetOtelPerProject();
    seedStateFile(proj, "state-construction-bolt1.md");
    scriptDir = mkdtempSync(join(tmpdir(), "amadeus-fire-seam-scripts-"));
    manifestDir = mkdtempSync(join(tmpdir(), "amadeus-fire-seam-manifests-"));
    for (const stub of [
      "amadeus-sensor-stub-pass.ts",
      "amadeus-sensor-stub-fail.ts",
      "amadeus-sensor-stub-slow.ts",
    ]) {
      copyFileSync(join(STUB_SRC_DIR, stub), join(scriptDir, stub));
    }
    outPath = join(proj, "artifact.md");
    writeFileSync(outPath, "# artifact\n\n## one\n\n## two\n", "utf-8");
    for (const k of [
      "CLAUDE_PROJECT_DIR",
      "AMADEUS_SENSORS_DIR",
      "AMADEUS_SENSOR_SCRIPT_DIR",
      "AMADEUS_STAGE_GRAPH",
    ]) {
      prevEnv[k] = process.env[k];
    }
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_SENSORS_DIR = manifestDir;
    process.env.AMADEUS_SENSOR_SCRIPT_DIR = scriptDir;
  });

  afterEach(() => {
    resetOtelPerProject();
    for (const [k, v] of Object.entries(prevEnv)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    _resetStageGraphForTests();
    __resetGraphCache();
    cleanupTestProject(proj);
    cleanupTestProject(scriptDir);
    cleanupTestProject(manifestDir);
    if (stageGraphDir) cleanupTestProject(stageGraphDir);
    stageGraphDir = undefined;
  });

  test("main dispatches `fire` and the passing fire path exits 0", async () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    const status = await driveExit(() =>
      main(["fire", SENSOR_ID, "--stage", STAGE, "--output-path", outPath]),
    );
    expect(status).toBe(0);
  });

  test("marker artifact still emits the stage bundle warning", async () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    useBundleStageGraph();
    const markerPath = join(proj, "artifact-questions.md");
    writeFileSync(markerPath, "Question: what remains unresolved?\n", "utf-8");
    const result = await driveExitWithStderr(() =>
      handleFire([
        SENSOR_ID,
        "--stage",
        STAGE,
        "--output-path",
        markerPath,
      ]),
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toContain(
      'stage "intent-capture" declares bundle "book"',
    );
  });

  test("required sections are forwarded to the sensor script", async () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    useBundleStageGraph();
    expect(
      await driveExit(() =>
        handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]),
      ),
    ).toBe(0);
  });

  test("a FAILED fire whose detail write cannot mkdir folds to script-error and still exits 0", async () => {
    setStubManifest("amadeus-sensor-stub-fail.ts");
    // Plant a regular FILE where the detail dir must be created so step 7's
    // mkdirSync throws → the detail-write-failed catch runs (finalOutcome folds
    // to a passed script-error) and the fire still pairs its terminal + exits 0.
    const detailDir = join(sensorsDir(proj), STAGE);
    mkdirSync(sensorsDir(proj), { recursive: true });
    writeFileSync(detailDir, "not a directory\n", "utf-8");
    const status = await driveExit(() =>
      handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]),
    );
    expect(status).toBe(0);
  });

  // The canonical event names the fire appended to this project's shard.
  function shardEvents(projectDir: string): string[] {
    const dir = join(seededRecordDir(projectDir), "audit");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((n) => n.endsWith(".jsonl"))
      .flatMap((n) => readFileSync(join(dir, n), "utf-8").split("\n"))
      .filter((l) => l.startsWith("{"))
      .map((l) => (JSON.parse(l) as { eventName?: string }).eventName ?? "");
  }

  // The three terminal rows leave emitTerminal by different arms, and only the
  // passing one had an in-process driver — so the FAILED and BUDGET_OVERRIDE
  // emits were dark to coverage even though handleFire reaches them here.
  test("a genuinely failing fire emits the SENSOR_FAILED terminal row", async () => {
    setStubManifest("amadeus-sensor-stub-fail.ts");
    expect(await driveExit(() => handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]))).toBe(0);
    const events = shardEvents(proj);
    expect(events).toContain("amadeus.sensor.fired");
    expect(events).toContain("amadeus.sensor.failed");
  });

  test("a fire that outruns its budget emits the SENSOR_BUDGET_OVERRIDE terminal row", async () => {
    // The slow stub sleeps 5s; a 1s manifest budget makes the dispatcher SIGTERM
    // it and take branch a.
    setStubManifest("amadeus-sensor-stub-slow.ts", 1);
    expect(await driveExit(() => handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]))).toBe(0);
    expect(shardEvents(proj)).toContain("amadeus.sensor.budget.override");
  });

  test("main dispatches `list` in-process (own argv, no exit)", async () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    // list returns without process.exit; driveExit sees status 0 (no throw).
    expect(await driveExit(() => main(["list"]))).toBe(0);
  });

  test("handleFire completes trace attachment before dispatching the sensor script (FR-TRC-5 ordering)", async () => {
    setStubManifest("amadeus-sensor-stub-pass.ts");
    // Enable the attach seam (default is disabled) with a resolvable intent
    // record so attachProcessTraceContext restores an anchor.
    writeFileSync(
      join(proj, "amadeus", "config.json"),
      `${JSON.stringify({ observability: { enabled: true, otlp: { endpoint: "http://g:4318" } } })}\n`,
      "utf-8",
    );
    resetObservabilityConfigCache();
    clearIntentContextForTests();
    let status = 0;
    const origExit = process.exit.bind(process);
    process.exit = ((code?: number) => {
      throw new ExitSignal(code ?? 0);
    }) as typeof process.exit;
    try {
      await handleFire([SENSOR_ID, "--stage", STAGE, "--output-path", outPath]);
    } catch (e) {
      if (e instanceof ExitSignal) status = e.code;
      else throw e;
    } finally {
      process.exit = origExit;
    }
    expect(status).toBe(0);
    // Ordering contract: when handleFire has dispatched, the process must have
    // joined the intent trace — the attach cannot still be floating.
    expect(currentIntentContext()).not.toBeNull();
  });

  test("child env waits for trace attachment before injecting TRACEPARENT", async () => {
    let releaseAttach: (() => void) | undefined;
    let attached = false;
    let loadCalled = false;
    const childEnv = prepareSensorChildEnv(
      proj,
      { FOO: "bar" },
      {
        attach: () =>
          new Promise<void>((resolve) => {
            releaseAttach = () => {
              attached = true;
              resolve();
            };
          }),
        loadContext: async () => {
          loadCalled = true;
          expect(attached).toBe(true);
          return {
            injectToSubprocess: (env) => ({
              ...env,
              TRACEPARENT: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
            }),
          };
        },
      },
    );

    await Promise.resolve();
    expect(loadCalled).toBe(false);
    expect(releaseAttach).toBeDefined();
    releaseAttach!();
    expect(await childEnv).toEqual({
      FOO: "bar",
      TRACEPARENT: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
    });
  });

  test("child env fails open when the OTel context cannot be loaded", async () => {
    const input = { FOO: "bar" };
    const childEnv = await prepareSensorChildEnv(proj, input, {
      attach: async () => {},
      loadContext: async () => {
        throw new Error("otel tree unavailable");
      },
    });
    expect(childEnv).toEqual(input);
    expect(childEnv).not.toBe(input);
  });

  test("partial tool tree without otel still starts the sensor CLI", () => {
    const partialRoot = mkdtempSync(join(tmpdir(), "amadeus-sensor-partial-"));
    try {
      const toolsDir = join(partialRoot, "tools");
      cpSync(join(import.meta.dir, "../../dist/claude/.claude/tools"), toolsDir, {
        recursive: true,
      });
      expect(existsSync(join(partialRoot, "otel"))).toBe(false);
      const result = spawnSync("bun", [join(toolsDir, "amadeus-sensor.ts"), "--help"], {
        encoding: "utf-8",
      });
      expect(result.status).toBe(0);
      expect(result.stdout).toContain("Usage: amadeus-sensor");
    } finally {
      cleanupTestProject(partialRoot);
    }
  });

  test("CLI entry wrapper dispatches only when import.meta.main is true", async () => {
    await runCliIfMain(false, []);
    await runCliIfMain(true, ["list"]);
  });
});
