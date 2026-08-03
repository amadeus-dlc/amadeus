// covers: subcommand:amadeus-orchestrate:next, subcommand:amadeus-orchestrate:report
// size: medium
//
// U6 activation-policy — the behavioural end-to-end proof over a REAL composed
// plugin graph, driven IN-PROCESS (handleNext / handleReport imported from the
// source tree so the TRUE-path wiring lines register in lcov). Proves FR-7(a):
// `next --stage formal-model-check` with NO `--single` emits a run-stage
// directive once composed; the advisory fires before build-and-test only when
// the spec changed; and a completed formal-model-check single run records the
// verdict (flow 4) so the next judgment is `current`.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __resetGraphCache, compileStageGraph } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { handleNext, handleReport } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  ACTIVATION_PLUGIN,
  ACTIVATION_STATE_FILE,
  ACTIVATION_WATCH_GLOBS,
  recordActivationVerdict,
} from "../../packages/framework/core/tools/amadeus-plugin-activation.ts";
import {
  applyPluginPlan,
  createNodeBackend,
  createNodeLock,
  discoverPlugins,
  type HostSnapshot,
  inspectPlugin,
  type WorkspaceBackend,
  type WorkspaceTransaction,
} from "../../packages/framework/core/tools/amadeus-plugin-compose.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
} from "../harness/fixtures.ts";
import { writeActivationModelAssets } from "../harness/formal-model-fixture.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const BUNDLE_ROOT = join(REPO_ROOT, "plugins");
const STAGE_LANDING = `plugins/${ACTIVATION_PLUGIN}/stages/${ACTIVATION_PLUGIN}.md`;
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const FIX_BUILD_STAGE = join(FIXTURES_DIR, "state-fix-final-construction.md");

let host = "";
// The project root that owns `host` — the real layout puts the plugin host root
// (the harness directory) under the project root, and the watched TLA+ specs are
// a project asset beside it. Tracked separately so cleanup removes the whole
// tree, not just the harness directory.
let hostProjectRoot = "";
let proj = "";
let graphFile = "";

// Create a temp project in the REAL installation layout and return its plugin
// host root: `<projectRoot>/.claude` with the specs at `<projectRoot>/specs/tla`.
// Setting both module-level vars is what keeps afterEach's cleanup total.
function makeHostRoot(prefix: string): string {
  hostProjectRoot = mkdtempSync(join(tmpdir(), prefix));
  const h = join(hostProjectRoot, ".claude");
  mkdirSync(h, { recursive: true });
  writeActivationModelAssets(hostProjectRoot);
  return h;
}

// Overwrite the project's spec — the edit a user actually makes, one level above
// the host root.
function writeProjectSpec(content: string): void {
  writeFileSync(join(hostProjectRoot, "specs", "tla", "FormalElection.tla"), content);
}
const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

let logs: string[] = [];
let errs: string[] = [];
const realLog = console.log;
const realErr = console.error;
const realStderrWrite = process.stderr.write.bind(process.stderr);

function hostSnapshot(backend: WorkspaceBackend): HostSnapshot {
  const paths = new Set<string>();
  const files = new Map<string, Buffer>();
  return { stages: new Map(), paths, files, composition: backend.readComposition() };
}

function makeTx(root: string, backend: WorkspaceBackend): WorkspaceTransaction {
  let n = 0;
  return { backend, verify: () => ({ ok: true }), lock: createNodeLock(root), newTxnId: () => `t322-${++n}` };
}

// Compose the shipped neutral formal-model-check bundle into a fresh temp host
// with a spec tree, and write the plugin-inclusive compiled graph to disk.
function composeAndCompile(): void {
  host = makeHostRoot("amadeus-t322-host-");
  const backend = createNodeBackend(host);
  const descriptor = discoverPlugins(BUNDLE_ROOT).find((p) => p.name === ACTIVATION_PLUGIN);
  if (!descriptor) throw new Error("formal-model-check not discoverable in plugins/");
  const inspected = inspectPlugin(descriptor, hostSnapshot(backend));
  if (inspected.kind !== "ready") throw new Error(`plugin not ready: ${JSON.stringify(inspected)}`);
  expect(applyPluginPlan(inspected.plan, makeTx(host, backend)).kind).toBe("committed");
  expect(existsSync(join(host, STAGE_LANDING))).toBe(true);

  setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
  // compile harvests stage numbers from a base graph; point it at the shipped
  // stock graph (the packages tree ships no committed data/stage-graph.json).
  setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
  __resetGraphCache();
  _resetStageGraphForTests();
  const composed = compileStageGraph();
  graphFile = join(host, "composed-stage-graph.json");
  writeFileSync(graphFile, composed.json);
  setEnv("AMADEUS_STAGE_GRAPH", graphFile);
  __resetGraphCache();
  _resetStageGraphForTests();
}

beforeEach(() => {
  resetAidlcEnv();
  host = "";
  hostProjectRoot = "";
  proj = "";
  graphFile = "";
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
  if (hostProjectRoot) rmSync(hostProjectRoot, { recursive: true, force: true });
  cleanupTestProject(proj);
});

describe("t322 FR-7(a): --single-free reach of a composed plugin stage", () => {
  test("next --stage formal-model-check (NO --single) emits a run-stage directive for it", () => {
    composeAndCompile();
    proj = createTestProject();
    handleNext(["--stage", ACTIVATION_PLUGIN], proj);
    const combined = logs.join("\n");
    expect(combined).toContain('"kind":"run-stage"');
    expect(combined).toContain(`"stage":"${ACTIVATION_PLUGIN}"`);
    expect(combined).not.toContain("is skipped for scope");
  });
});

describe("t322 flow 4: stage completion alone is not a formal verdict", () => {
  test("report --single --stage formal-model-check --result completed does not write SpecHashState", () => {
    composeAndCompile();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE); // an active intent so the audit shard resolves
    handleReport(["--single", "--stage", ACTIVATION_PLUGIN, "--result", "completed"], proj);
    expect(existsSync(join(host, ACTIVATION_STATE_FILE))).toBe(false);
    expect(logs.join("\n")).toContain('"kind":"done"');
  });
});

describe("t322 flow 2: advisory before build-and-test", () => {
  test("composed + spec changed since verdict -> stderr advisory before the build-and-test directive", () => {
    // build-and-test is a stock stage, so the stock graph suffices; the host is
    // composed (formal-model-check) with a recorded verdict and a since-changed spec.
    host = makeHostRoot("amadeus-t322-adv-");
    writeFileSync(
      join(host, ".amadeus-plugin-composition.json"),
      JSON.stringify({ ledger: [], plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]] }),
    );
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T00:00:00Z");
    writeProjectSpec("MODULE FormalElection\nVARIABLES x\n");

    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE); // Current Stage = build-and-test, in-flight
    handleNext([], proj);

    expect(logs.join("\n")).toContain('"stage":"build-and-test"'); // directive still emitted
    expect(errs.join("\n")).toContain(`${ACTIVATION_PLUGIN} spec hash CHANGED`); // advisory on stderr

    // CHANNEL SEPARATION, restated for the U5 advisories channel (FR-B2).
    //
    // This assertion used to read `expect(logs).not.toContain("spec hash
    // CHANGED")` — under U6 the advisory was stderr-ONLY, so ANY occurrence of
    // the text on stdout was pollution. U5 deliberately adds a MACHINE channel:
    // the same decision now also rides the directive as a structured
    // `advisories` entry, so the text legitimately appears on stdout INSIDE the
    // JSON. The property worth pinning is unchanged in spirit and is what we
    // now assert: stdout is still exactly ONE valid JSON directive (nothing is
    // written beside it), and the advisory text appears ONLY inside the
    // structured field — never as loose prose on the directive channel.
    const stdout = logs.join("\n").trim();
    const directive = JSON.parse(stdout) as {
      question: string;
      advisories?: { message: string }[];
    };
    expect(directive.advisories?.length).toBe(1);
    expect(directive.advisories?.[0].message).toContain("spec hash CHANGED");
    // The fail-closed choice question repeats the same verbatim message so it
    // remains visible even when a renderer focuses on the question field.
    const advisoryMessage = directive.advisories?.[0]?.message;
    expect(advisoryMessage).toBeDefined();
    expect(directive.question).toContain(advisoryMessage!);
  });

  test("composed + spec unchanged -> no advisory (current is silent)", () => {
    host = makeHostRoot("amadeus-t322-adv2-");
    writeFileSync(
      join(host, ".amadeus-plugin-composition.json"),
      JSON.stringify({ ledger: [], plugins: [[ACTIVATION_PLUGIN, { stageIndex: [{ slug: ACTIVATION_PLUGIN }] }]] }),
    );
    recordActivationVerdict(host, ACTIVATION_WATCH_GLOBS, "2026-07-27T00:00:00Z"); // matches current

    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE);
    handleNext([], proj);

    expect(logs.join("\n")).toContain('"stage":"build-and-test"');
    expect(errs.join("\n")).not.toContain("spec hash CHANGED");
  });
});
