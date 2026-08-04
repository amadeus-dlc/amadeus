// covers: file:packages/framework/core/tools/amadeus-orchestrate.ts, function:advisoryLatchDir
// size: medium
//
// U5 advisories-channel (FR-B3) — WHERE the advisory fires and HOW OFTEN.
//
//   1. THREE checkpoints, not one: requirements-analysis (the upstream catch),
//      functional-design (the design-time catch) and build-and-test (the
//      original final safety net). Every other slug stays silent.
//   2. TWO emit paths: the main workflow (emitForSlug) AND `--single`
//      (emitSingleRunStage). The `--single` path is what every stage-runner
//      skill goes through, so a checkpoint that fires only on the main path is
//      invisible to those users.
//   3. A RUN LATCH, because 1 × 2 means the same judgment would otherwise be
//      repeated on every `next`. One raise per (plugin, code) per run —
//      fail-open when the latch itself cannot be used.
//
// Driven IN-PROCESS so the wiring lines register in lcov
// (bun-coverage-spawn-blindspot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { emitActivationAdvisory, handleNext, handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_WATCH_GLOBS,
  type ActivationFs,
  type Advisory,
  type AdvisoryLatchFs,
  advisoryLatchPath,
  defaultActivationFs,
  recordActivationVerdict,
  resolveActivationJudgment,
  unlatchedAdvisories,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";
import { writeActivationModelMap } from "../harness/formal-model-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const FIX_REQUIREMENTS = join(FIXTURES_DIR, "state-mid-inception.md"); // Current Stage = requirements-analysis
const FIX_FUNCTIONAL = join(FIXTURES_DIR, "state-construction-bolt1.md");
const FIX_BUILD = join(FIXTURES_DIR, "state-fix-final-construction.md");

let host = "";
let proj = "";
let latchRoot = "";
const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// A composed host whose spec CHANGED since the recorded verdict, so the
// judgment fires (`changed`) at every checkpoint.
// Laid out the way a real installation is (U8 FR-B3 grounding): the host root is
// the harness directory, the watched spec tree is a PROJECT asset one level up.
// Returns the host root.
function makeChangedHost(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t381-host-"));
  const h = join(root, ".claude");
  mkdirSync(h, { recursive: true });
  mkdirSync(join(root, "specs", "tla"), { recursive: true });
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), "MODULE FormalElection\n");
  writeFileSync(join(root, "specs", "tla", "FormalElection.cfg"), "INIT Init\n");
  writeActivationModelMap(root);
  writeFileSync(
    join(h, ".amadeus-plugin-composition.json"),
    JSON.stringify({ ledger: [], plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]] }),
  );
  recordActivationVerdict(h, ACTIVATION_WATCH_GLOBS, "2026-07-27T00:00:00Z");
  writeFileSync(join(root, "specs", "tla", "FormalElection.tla"), "MODULE FormalElection\nVARIABLES x\n");
  return h;
}

let logs: string[] = [];
let errs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

beforeEach(() => {
  resetAidlcEnv();
  host = "";
  proj = "";
  latchRoot = "";
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
  if (latchRoot) rmSync(latchRoot, { recursive: true, force: true });
  cleanupTestProject(proj);
});

// ===========================================================================
// 1. The checkpoint set (FR-B3): three fire, everything else is silent.
// ===========================================================================

describe("t381 checkpoint set", () => {
  test("an unreadable model map is reported as invalid", () => {
    host = makeChangedHost();
    const brokenMapFs: ActivationFs = {
      ...defaultActivationFs,
      readFileSync: (path) => {
        if (path.endsWith("model-map.json")) throw new Error("synthetic read failure");
        return defaultActivationFs.readFileSync(path);
      },
    };
    expect(resolveActivationJudgment(host, ACTIVATION_WATCH_GLOBS, brokenMapFs)).toEqual({
      kind: "not-ready",
      reason: "model map is invalid",
    });
  });

  test("all three checkpoints raise the advisory, each stamped with its own slug", () => {
    host = makeChangedHost();
    for (const slug of ["requirements-analysis", "functional-design", "build-and-test"]) {
      const sink: string[] = [];
      const raised = emitActivationAdvisory(slug, host, (l) => sink.push(l));
      expect(raised.length).toBe(1);
      expect(raised[0].stage).toBe(slug);
      expect(raised[0].code).toBe("changed");
      // The human channel still gets exactly one line per raise.
      expect(sink.length).toBe(1);
      expect(sink[0]).toBe(raised[0].message);
    }
  });

  test("a non-checkpoint stage stays silent even when the judgment fires", () => {
    host = makeChangedHost();
    for (const slug of ["feasibility", "application-design", "code-generation", "user-stories"]) {
      const sink: string[] = [];
      expect(emitActivationAdvisory(slug, host, (l) => sink.push(l))).toEqual([]);
      expect(sink.length).toBe(0);
    }
  });
});

// ===========================================================================
// 2. The run latch (business-logic-model L4): once per (plugin, code) per run.
// ===========================================================================

function latchDir(): string {
  latchRoot = mkdtempSync(join(tmpdir(), "amadeus-t381-latch-"));
  return join(latchRoot, "session-a");
}

const CHANGED: Advisory = {
  plugin: ACTIVATION_PLUGIN,
  code: "changed",
  message: "advisory: changed",
  stage: "requirements-analysis",
};
const NEVER_RUN: Advisory = {
  plugin: ACTIVATION_PLUGIN,
  code: "never-run",
  message: "advisory: never-run",
  stage: "requirements-analysis",
};

describe("t381 run latch", () => {
  test("the first raise passes and writes a marker; the second is suppressed", () => {
    const dir = latchDir();
    expect(unlatchedAdvisories(dir, [CHANGED]).length).toBe(1);
    expect(existsSync(advisoryLatchPath(dir, ACTIVATION_PLUGIN, "changed"))).toBe(true);
    expect(unlatchedAdvisories(dir, [CHANGED])).toEqual([]);
  });

  test("the latch is keyed by (plugin, code) — a different code is not suppressed", () => {
    const dir = latchDir();
    expect(unlatchedAdvisories(dir, [CHANGED]).length).toBe(1);
    expect(unlatchedAdvisories(dir, [NEVER_RUN]).length).toBe(1);
    expect(readdirSync(dir).sort()).toEqual([
      `${ACTIVATION_PLUGIN}.changed`,
      `${ACTIVATION_PLUGIN}.never-run`,
    ]);
  });

  test("the marker holds the emit instant (an inspectable record, not an empty flag)", () => {
    const dir = latchDir();
    unlatchedAdvisories(dir, [CHANGED], "2026-08-01T03:04:05Z");
    expect(Bun.file(advisoryLatchPath(dir, ACTIVATION_PLUGIN, "changed")).text()).resolves.toBe(
      "2026-08-01T03:04:05Z\n",
    );
  });

  test("an unreadable latch fails OPEN — the advisory is raised (BR-U5-3)", () => {
    const throwing: AdvisoryLatchFs = {
      existsSync: () => { throw new Error("EIO"); },
      mkdirSync: () => {},
      writeFileSync: () => {},
    };
    expect(unlatchedAdvisories("/nowhere", [CHANGED], "now", throwing).length).toBe(1);
  });

  test("an unwritable latch still raises the advisory (only de-duplication is lost)", () => {
    const readOnly: AdvisoryLatchFs = {
      existsSync: () => false,
      mkdirSync: () => { throw new Error("EACCES"); },
      writeFileSync: () => { throw new Error("EACCES"); },
    };
    expect(unlatchedAdvisories("/nowhere", [CHANGED], "now", readOnly).length).toBe(1);
  });

  test("emitActivationAdvisory honours the latch across the two emit paths", () => {
    host = makeChangedHost();
    const dir = latchDir();
    // Path A raises at requirements-analysis...
    expect(emitActivationAdvisory("requirements-analysis", host, () => {}, dir).length).toBe(1);
    // ...so path B at a LATER checkpoint in the same run says nothing: the
    // judgment is the same (plugin, code) and the human already saw it.
    expect(emitActivationAdvisory("build-and-test", host, () => {}, dir)).toEqual([]);
  });
});

// ===========================================================================
// 3. End-to-end over the two emit paths.
// ===========================================================================

function seedComposedProject(): void {
  host = makeChangedHost();
  setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  __resetGraphCache();
  _resetStageGraphForTests();
  proj = createTestProject();
}

describe("t381 both emit paths enforce the advisory hold", () => {
  test.each([
    ["requirements-analysis", FIX_REQUIREMENTS],
    ["functional-design", FIX_FUNCTIONAL],
    ["build-and-test", FIX_BUILD],
  ] as const)("%s emits the same hold contract on main and --single paths", (slug, fixture) => {
    seedComposedProject();
    seedStateFile(proj, fixture);
    handleNext([], proj);
    const main = JSON.parse(logs.join("\n").trim()) as {
      kind: string;
      advisories?: Array<{ message: string; checkpoint: string; spec_identity: string; advisory_instance: string }>;
    };

    cleanupTestProject(proj);
    proj = createTestProject();
    seedStateFile(proj, fixture);
    logs = [];
    handleNext(["--single", "--stage", slug], proj);
    const single = JSON.parse(logs.join("\n").trim()) as typeof main;

    expect(main.kind).toBe("await-advisory-choice");
    expect(single.kind).toBe("await-advisory-choice");
    expect(main.advisories?.[0].message).toBe(single.advisories?.[0].message);
    expect(main.advisories?.[0].checkpoint).toBe(slug);
    expect(single.advisories?.[0].checkpoint).toBe(slug);
    expect(main.advisories?.[0].spec_identity).toBe(single.advisories?.[0].spec_identity);
    expect(main.advisories?.[0].advisory_instance).not.toBe(single.advisories?.[0].advisory_instance);
  });

  test("main workflow: next at requirements-analysis carries advisories (CP1 reachable)", () => {
    seedComposedProject();
    seedStateFile(proj, FIX_REQUIREMENTS);
    handleNext([], proj);
    const directive = JSON.parse(logs.join("\n").trim()) as {
      stage: string;
      kind: string;
      advisories?: { checkpoint: string; code: string }[];
    };
    expect(directive.kind).toBe("await-advisory-choice");
    expect(directive.stage).toBe("requirements-analysis");
    expect(directive.advisories?.length).toBe(1);
    expect(directive.advisories?.[0].checkpoint).toBe("requirements-analysis");
  });

  test("receiptなしのmain / --single reportはstage実行済みを装っても拒否される", () => {
    seedComposedProject();
    seedStateFile(proj, FIX_REQUIREMENTS);
    handleNext([], proj);
    logs = [];
    handleReport(["--stage", "requirements-analysis", "--result", "completed"], proj);
    expect(JSON.parse(logs.join("\n")).kind).toBe("error");
    expect(logs.join("\n")).toContain("unresolved advisory choice");

    cleanupTestProject(proj);
    proj = createTestProject();
    seedStateFile(proj, FIX_REQUIREMENTS);
    logs = [];
    handleNext(["--single", "--stage", "requirements-analysis"], proj);
    logs = [];
    handleReport(["--single", "--stage", "requirements-analysis", "--result", "completed"], proj);
    expect(JSON.parse(logs.join("\n")).kind).toBe("error");
    expect(logs.join("\n")).toContain("unresolved advisory choice");
  });

  test("廃止済みstanding-grant carrierはadvisory処理前に拒否される", () => {
    seedComposedProject();
    seedStateFile(proj, FIX_REQUIREMENTS);
    handleNext([], proj);
    logs = [];
    setEnv("AMADEUS_OPERATING_MODE", "solo");
    handleReport([
      "--stage", "requirements-analysis",
      "--result", "completed",
      "--standing-grant-id", "cafe0001",
      "--standing-grant-route-id", "00000000-0000-4000-8000-000000000001",
    ], proj);
    expect(JSON.parse(logs.join("\n")).kind).toBe("error");
    expect(logs.join("\n")).toContain("Standing-grant approval carriers are retired");
  });

  test("--single (the stage-runner path) carries advisories too", () => {
    seedComposedProject();
    handleNext(["--single", "--stage", "functional-design"], proj);
    const directive = JSON.parse(logs.join("\n").trim()) as {
      stage: string;
      kind: string;
      advisories?: { checkpoint: string; code: string }[];
    };
    expect(directive.kind).toBe("await-advisory-choice");
    expect(directive.stage).toBe("functional-design");
    expect(directive.advisories?.length).toBe(1);
    expect(directive.advisories?.[0].checkpoint).toBe("functional-design");
    expect(errs.join("\n")).toContain("spec hash CHANGED");
  });

  test("--single on a NON-checkpoint stage carries no advisories key", () => {
    seedComposedProject();
    handleNext(["--single", "--stage", "application-design"], proj);
    const raw = logs.join("\n").trim();
    expect(raw).toContain('"stage":"application-design"');
    expect(raw).not.toContain("advisories");
  });
});
