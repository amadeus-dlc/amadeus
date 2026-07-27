// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts
// size: medium
//
// U6 activation-policy — the engine glue (advisory, `--single`-free reach,
// verdict record) driven IN-PROCESS so the added orchestrate lines register in
// lcov (spawn-blindspot-seam-export). The exported decision seams
// (emitActivationAdvisory / emitComposedPluginStageIfInstalled /
// recordActivationVerdictIfActivationStage) are called directly, and the three
// call sites inside emitForSlug / Branch 7 / handleSingleReport are exercised
// through the exported handlers (handleNext / handleReport) reading the shipped
// stock graph. Behavioural end-to-end over a composed plugin graph is t322.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import {
  emitActivationAdvisory,
  emitComposedPluginStageIfInstalled,
  handleNext,
  handleReport,
  pluginActivationHostRoot,
  recordActivationVerdictIfActivationStage,
} from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_STATE_FILE,
  ACTIVATION_WATCH_GLOBS,
  recordActivationVerdict,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const MID_IDEATION = join(FIXTURES_DIR, "state-mid-ideation.md");

let host = "";
let proj = "";
const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// A temp host with the formal-model-check spec + (optionally) a composition
// record, so the activation reads resolve against a clean, hermetic root.
function makeHost(composed: boolean): string {
  const h = mkdtempSync(join(tmpdir(), "amadeus-t321-host-"));
  const specDir = join(h, "specs", "tla");
  mkdirSync(specDir, { recursive: true });
  writeFileSync(join(specDir, "FormalElection.tla"), "MODULE FormalElection\n");
  if (composed) {
    writeFileSync(
      join(h, ".amadeus-plugin-composition.json"),
      JSON.stringify({ ledger: [], plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]] }),
    );
  }
  return h;
}

// Capture console.log / console.error / process.stderr.write for the handler
// drives (their output is not asserted here — coverage is the goal — but must be
// silenced and observed).
let logs: string[] = [];
let errs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  resetAidlcEnv();
  host = "";
  proj = "";
  logs = [];
  errs = [];
  console.log = (...a: unknown[]) => { logs.push(a.join(" ")); };
  console.error = (...a: unknown[]) => { errs.push(a.join(" ")); };
  (process.stderr as unknown as { write: (s: string) => boolean }).write = (s: string) => { errs.push(String(s)); return true; };
});

afterEach(() => {
  console.log = realLog;
  console.error = realErr;
  (process.stderr as unknown as { write: typeof realStderrWrite }).write = realStderrWrite;
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  for (const k of Object.keys(savedEnv)) delete savedEnv[k];
  __resetGraphCache();
    _resetStageGraphForTests();
  resetAidlcEnv();
  if (host) rmSync(host, { recursive: true, force: true });
  cleanupTestProject(proj);
});

describe("t321 emitActivationAdvisory (exported seam)", () => {
  test("build-and-test + composed + changed -> one stderr line", () => {
    host = makeHost(true);
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T00:00:00Z");
    writeFileSync(join(host, "specs", "tla", "FormalElection.tla"), "MODULE FormalElection\nVARIABLES x\n");
    const sink: string[] = [];
    emitActivationAdvisory("build-and-test", host, (l) => sink.push(l));
    expect(sink.length).toBe(1);
    expect(sink[0]).toContain("CHANGED");
  });

  test("non-build-and-test slug -> no advisory (guarded call site)", () => {
    host = makeHost(true);
    const sink: string[] = [];
    emitActivationAdvisory("feasibility", host, (l) => sink.push(l));
    expect(sink.length).toBe(0);
  });

  test("build-and-test + 0-plugin -> no advisory", () => {
    host = makeHost(false);
    const sink: string[] = [];
    emitActivationAdvisory("build-and-test", host, (l) => sink.push(l));
    expect(sink.length).toBe(0);
  });
});

describe("t321 emitComposedPluginStageIfInstalled (exported seam, false branches)", () => {
  test("no --stage -> false", () => {
    host = makeHost(true);
    expect(emitComposedPluginStageIfInstalled({}, "poc", null, null, undefined, host)).toBe(false);
  });

  test("--phase present -> false (not a bare stage jump)", () => {
    host = makeHost(true);
    expect(
      emitComposedPluginStageIfInstalled({ stage: ACTIVATION_PLUGIN, phase: "construction" }, "poc", null, null, undefined, host),
    ).toBe(false);
  });

  test("stage not composed -> false (BR-U6-5 limit)", () => {
    host = makeHost(false);
    expect(emitComposedPluginStageIfInstalled({ stage: "code-generation" }, "poc", null, null, undefined, host)).toBe(false);
  });
});

describe("t321 recordActivationVerdictIfActivationStage (exported seam)", () => {
  test("formal-model-check slug -> writes SpecHashState (flow 4)", () => {
    host = makeHost(true);
    recordActivationVerdictIfActivationStage(ACTIVATION_PLUGIN, host);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(true);
  });

  test("any other slug -> no-op (no state written)", () => {
    host = makeHost(true);
    recordActivationVerdictIfActivationStage("build-and-test", host);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(false);
  });
});

describe("t321 wiring call sites via handlers (in-process, stock graph)", () => {
  test("handleNext happy path reaches emitForSlug (advisory call site executes)", () => {
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    host = makeHost(false); // 0-plugin: advisory is a no-op, but the call site runs
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION);
    handleNext([], proj);
    // A run-stage directive was emitted (feasibility); no advisory (0-plugin).
    expect(logs.join("\n")).toContain('"kind":"run-stage"');
  });

  test("pluginActivationHostRoot: realpaths an existing root, and degrades to the raw path when it does not exist", () => {
    // Existing path -> realpath; a non-existent path falls back to the raw value
    // rather than throwing, so an advisory can never break `next`.
    host = makeHost(false);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    expect(pluginActivationHostRoot().length).toBeGreaterThan(0);
    const missing = join(tmpdir(), "amadeus-t321-does-not-exist-xyz");
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", missing);
    expect(pluginActivationHostRoot()).toBe(missing);
  });

  test("handleNext --stage reaches Branch 7 (emitComposedPluginStageIfInstalled call site executes, not composed -> jump)", () => {
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    host = makeHost(false);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject(); // no state -> no-state jump path after the false short-circuit
    handleNext(["--stage", "requirements-analysis"], proj);
    // Not composed -> the short-circuit returned false and the jump path ran.
    expect(logs.join("\n") + errs.join("\n")).toContain("requirements-analysis");
  });

  test("handleReport --single --stage <stock> reaches the verdict call site (no-op for a stock stage)", () => {
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    host = makeHost(true);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, MID_IDEATION); // an active intent so the audit shard resolves
    handleReport(["--single", "--stage", "build-and-test", "--result", "completed"], proj);
    // A stock stage completion writes NO activation state (only formal-model-check does).
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(false);
    expect(logs.join("\n")).toContain('"kind":"done"');
  });
});
