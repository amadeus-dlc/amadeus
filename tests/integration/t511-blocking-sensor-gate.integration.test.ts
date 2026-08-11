// covers: function:verifyBlockingSensors, function:verifyStageCompletionGuards, function:handleApprove, function:handleAdvance, function:handleFinalize, function:handleCompleteWorkflow
//
// t511 (integration) — Issue #2671 item (c): the approve-time blocking sensor
// gate, wired and driven against a real project tree.
//
// The pure decision table lives in tests/unit/t511-blocking-sensor-severity.test.ts;
// this file proves the parts that only exist against a filesystem:
//   - the guard is reached from handleApprove (approveUnderLock is the single
//     chokepoint both approve arms share), and a refusal leaves the state file
//     byte-identical — no checkbox flip, no GATE_APPROVED;
//   - the blocking set comes from the compiled graph's sensors_applicable, so a
//     stage whose sensors are all advisory behaves exactly as before even when
//     its audit trail carries SENSOR_FAILED (the green side of the two-sided
//     proof: the ten shipped manifests are all advisory and must be unaffected);
//   - the enforcement cutoff and the AMADEUS_SKIP_BLOCKING_SENSOR_GUARD switch
//     both open the gate.
//
// Severity is injected the way production carries it — through the compiled
// stage graph via the AMADEUS_STAGE_GRAPH seam, patching one row of the SHIPPED
// graph rather than hand-rolling one. The blocking manifest itself
// (tests/fixtures/blocking-sensor/amadeus-blocking-probe.md) is the schema-side
// corpus for the same id; no shipped manifest declares blocking.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { __resetGraphCache } from "../../dist/claude/.claude/tools/amadeus-graph.ts";
import { _resetStageGraphForTests } from "../../dist/claude/.claude/tools/amadeus-lib.ts";
import {
  handleAdvance,
  handleApprove,
  handleCompleteWorkflow,
  handleFinalize,
  verifyBlockingSensors,
} from "../../dist/claude/.claude/tools/amadeus-state.ts";
import {
  AMADEUS_SRC,
  cleanupTestProject,
  createTestProject,
  DEFAULT_RECORD_DIR,
  intentsDirOf,
  seedGoalReceiptForFinalStage,
  seedStateFile,
  seededRecordDir,
} from "../harness/fixtures.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const STAGE = "requirements-analysis";
const SENSOR = "blocking-probe";
const RECORD_ID8 = DEFAULT_RECORD_DIR.replace(/^fixture-/, "");
// Record-dir date prefixes either side of BLOCKING_SENSOR_CUTOFF_YYMMDD (260809).
const POST_CUTOFF = "260810-t511";
const PRE_CUTOFF = "260701-t511";

class ExitSignal extends Error {
  constructor(public readonly code: number) {
    super(`exit ${code}`);
  }
}

function captureExit(fn: () => void): { threw: boolean; stderr: string } {
  let stderr = "";
  const origExit = process.exit.bind(process);
  const origErr = console.error;
  process.exit = ((code?: number) => {
    throw new ExitSignal(code ?? 0);
  }) as typeof process.exit;
  console.error = (...a: unknown[]) => {
    stderr += a.map(String).join(" ");
  };
  let threw = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof ExitSignal) threw = true;
    else throw e;
  } finally {
    process.exit = origExit;
    console.error = origErr;
  }
  return { threw, stderr };
}

let proj: string;
let recordDirName: string;
const savedEnv: Record<string, string | undefined> = {};

function saveEnv(): void {
  for (const key of [
    "CLAUDE_PROJECT_DIR",
    "AMADEUS_SKIP_HUMAN_PRESENCE_GUARD",
    "AMADEUS_SKIP_ARTIFACT_GUARD",
    "AMADEUS_SKIP_BLOCKING_SENSOR_GUARD",
    "AMADEUS_STAGE_GRAPH",
  ]) {
    savedEnv[key] = process.env[key];
  }
}

function restoreEnv(): void {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  __resetGraphCache();
  _resetStageGraphForTests();
}

/** The active record dir after the date-prefix rename. */
function recordDir(): string {
  return join(intentsDirOf(proj), recordDirName);
}

function stateFile(): string {
  return join(recordDir(), "amadeus-state.md");
}

/**
 * Rename the seeded record dir so its name carries a date prefix, and re-point
 * the cursor + registry at it. The enforcement cutoff reads the intent's birth
 * date off the record dir name (YYMMDD-...), exactly as the E-OC1 questions gate
 * does, and the stock fixture dir name ("fixture-<id8>") carries no date at all.
 */
function redateRecord(prefix: string): void {
  // Rename from the CURRENT record dir, not the seeded default, so a second
  // call (a test that re-dates what beforeEach already dated) is well-defined.
  const from = recordDir();
  recordDirName = `${prefix}-${RECORD_ID8}`;
  renameSync(from, recordDir());
  const intentsDir = intentsDirOf(proj);
  writeFileSync(join(intentsDir, "active-intent"), `${recordDirName}\n`, "utf-8");
  const registry = readFileSync(join(intentsDir, "intents.json"), "utf-8");
  writeFileSync(
    join(intentsDir, "intents.json"),
    registry.replace(/"slug": "[^"]*"/, `"slug": "${prefix}"`),
    "utf-8",
  );
}

/**
 * Patch one stage row of the shipped graph so the probe sensor is APPLICABLE to
 * that stage at the given severity.
 *
 * Both severities matter. `blocking` is the gate's subject; `advisory` is the
 * control — seeding a SENSOR_FAILED for a sensor the stage does not declare
 * would only prove that a NON-APPLICABLE sensor cannot gate, which no plausible
 * regression would violate. Making the probe applicable-but-advisory is what
 * pins "the gate reads severity", so a guard that blocked on any failed sensor
 * regardless of severity goes red.
 */
function useGraphWithSensor(stage: string, severity: "advisory" | "blocking"): void {
  const shipped = readFileSync(join(AMADEUS_SRC, "tools", "data", "stage-graph.json"), "utf-8");
  const graph = JSON.parse(shipped) as {
    slug: string;
    sensors_applicable?: { id: string; path: string; matches?: string; severity?: string }[];
  }[];
  const node = graph.find((entry) => entry.slug === stage);
  if (node === undefined) throw new Error(`shipped graph has no ${stage} stage`);
  node.sensors_applicable = [
    ...(node.sensors_applicable ?? []),
    {
      id: SENSOR,
      path: `.claude/sensors/amadeus-${SENSOR}.md`,
      matches: "**/intents/**",
      severity,
    },
  ];
  const path = join(proj, `stage-graph-with-${severity}.json`);
  writeFileSync(path, JSON.stringify(graph), "utf-8");
  process.env.AMADEUS_STAGE_GRAPH = path;
  __resetGraphCache();
  _resetStageGraphForTests();
}

function useGraphWithBlockingSensor(stage: string = STAGE): void {
  useGraphWithSensor(stage, "blocking");
}

function useGraphWithAdvisorySensor(stage: string = STAGE): void {
  useGraphWithSensor(stage, "advisory");
}

/** Write SENSOR_* rows into an audit shard the record's readers glob. */
function seedSensorAudit(
  rows: { event: string; sensor?: string; stage?: string; ts: string }[],
  stage: string = STAGE,
): void {
  const dir = join(recordDir(), "audit");
  mkdirSync(dir, { recursive: true });
  const output = join(recordDir(), `${stage}-output.md`);
  const outputBytes = `# ${stage} output\n`;
  writeFileSync(output, outputBytes, "utf-8");
  const outputPath = relative(proj, output);
  const outputDigest = `sha256:${createHash("sha256").update(outputBytes).digest("hex")}`;
  let activeFireId = "";
  const lines = rows.map((row, index) => {
    if (row.event === "SENSOR_FIRED") activeFireId = `fire${index}`;
    return JSON.stringify({
      schemaVersion: 1,
      seq: index + 1,
      cloneId: "fixturecloneid01",
      intentId: recordDirName,
      timestamp: row.ts,
      heading: row.event,
      event: row.event,
      fields: {
        "Fire id": activeFireId,
        "Sensor ID": row.sensor ?? SENSOR,
        "Stage slug": row.stage ?? stage,
        "Output path": outputPath,
        "Output digest": outputDigest,
      },
    });
  });
  writeFileSync(join(dir, "t511-seeded.jsonl"), `${lines.join("\n")}\n`, "utf-8");
}

const FIRED = { event: "SENSOR_FIRED", ts: "2026-08-10T01:00:00Z" };
const FAILED = { event: "SENSOR_FAILED", ts: "2026-08-10T01:00:01Z" };
const PASSED = { event: "SENSOR_PASSED", ts: "2026-08-10T01:00:02Z" };

/** Seed the produces + phase-check artifacts so ONLY the sensor gate can refuse. */
function seedArtifacts(): void {
  const stageDir = join(recordDir(), "inception", STAGE);
  mkdirSync(stageDir, { recursive: true });
  writeFileSync(join(stageDir, "requirements.md"), "# reqs\n");
  writeFileSync(join(stageDir, "requirements-analysis-questions.md"), "# questions\n");
  const verification = join(recordDir(), "verification");
  mkdirSync(verification, { recursive: true });
  writeFileSync(join(verification, "phase-check-inception.md"), "# phase-check\n");
}

describe("t511 — approve refuses on an unresolved blocking sensor (#2671 c)", () => {
  beforeEach(() => {
    proj = createTestProject();
    recordDirName = DEFAULT_RECORD_DIR;
    resetOtelPerProject();
    seedStateFile(proj, "state-mid-inception.md");
    const seeded = join(seededRecordDir(proj), "amadeus-state.md");
    writeFileSync(
      seeded,
      readFileSync(seeded, "utf-8").replace(`- [-] ${STAGE}`, `- [?] ${STAGE}`),
    );
    redateRecord(POST_CUTOFF);
    seedArtifacts();
    saveEnv();
    process.env.CLAUDE_PROJECT_DIR = proj;
    process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
    delete process.env.AMADEUS_SKIP_ARTIFACT_GUARD;
    delete process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD;
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("refuses approve while the latest terminal is SENSOR_FAILED, leaving state untouched", () => {
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED]);
    const before = readFileSync(stateFile(), "utf-8");
    const r = captureExit(() => handleApprove([STAGE]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain(SENSOR);
    expect(r.stderr).toContain("SENSOR_FAILED");
    expect(readFileSync(stateFile(), "utf-8")).toBe(before);
  });

  test("refuses approve when the blocking sensor never fired (fail-closed)", () => {
    useGraphWithBlockingSensor();
    seedSensorAudit([]);
    const before = readFileSync(stateFile(), "utf-8");
    const r = captureExit(() => handleApprove([STAGE]));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("no SENSOR_FIRED row");
    expect(r.stderr).toContain("amadeus-sensor.ts fire");
    expect(readFileSync(stateFile(), "utf-8")).toBe(before);
  });

  test("approves once the sensor's latest terminal is SENSOR_PASSED", () => {
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED, { event: "SENSOR_FIRED", ts: "2026-08-10T01:00:01Z" }, PASSED]);
    const r = captureExit(() => handleApprove([STAGE]));
    expect(r.threw).toBe(false);
    expect(readFileSync(stateFile(), "utf-8")).toContain(`- [x] ${STAGE}`);
  });

  test("the direct CLI initializes blocking-gate constants before approve dispatch", () => {
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, PASSED]);
    const result = spawnSync(
      process.execPath,
      [join(AMADEUS_SRC, "tools", "amadeus-state.ts"), "approve", STAGE],
      { cwd: proj, env: process.env, encoding: "utf-8" },
    );
    expect(`${result.stdout}${result.stderr}`).not.toContain("before initialization");
    if (result.status !== 0) throw new Error(`${result.stdout}${result.stderr}`);
    expect(result.status).toBe(0);
    expect(readFileSync(stateFile(), "utf-8")).toContain(`- [x] ${STAGE}`);
  });

  test("an APPLICABLE advisory sensor's SENSOR_FAILED does not block approve", () => {
    // The probe is declared on the stage at advisory severity, so the failing
    // verdict is in scope and only its severity keeps the gate open — the green
    // side of the two-sided proof. (The ten shipped manifests are all advisory,
    // so this is the shape every real stage has today.)
    useGraphWithAdvisorySensor();
    seedSensorAudit([FIRED, FAILED]);
    const r = captureExit(() => handleApprove([STAGE]));
    expect(r.threw).toBe(false);
    expect(readFileSync(stateFile(), "utf-8")).toContain(`- [x] ${STAGE}`);
  });

  test("the off-switch opens the gate", () => {
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED]);
    process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD = "1";
    const r = captureExit(() => handleApprove([STAGE]));
    expect(r.threw).toBe(false);
  });
});

describe("t511 — enforcement cutoff and guard unit (#2671 c)", () => {
  beforeEach(() => {
    proj = createTestProject();
    recordDirName = DEFAULT_RECORD_DIR;
    resetOtelPerProject();
    seedStateFile(proj, "state-mid-inception.md");
    saveEnv();
    process.env.CLAUDE_PROJECT_DIR = proj;
    delete process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD;
  });
  afterEach(() => {
    restoreEnv();
    cleanupTestProject(proj);
  });

  test("an intent born before the cutoff is not retroactively blocked", () => {
    redateRecord(PRE_CUTOFF);
    seedArtifacts();
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED]);
    const r = captureExit(() => verifyBlockingSensors(proj, { slug: STAGE, name: "Requirements Analysis" }));
    expect(r.threw).toBe(false);
  });

  test("an intent born on/after the cutoff is blocked by the same trail", () => {
    redateRecord(POST_CUTOFF);
    seedArtifacts();
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED]);
    const r = captureExit(() => verifyBlockingSensors(proj, { slug: STAGE, name: "Requirements Analysis" }));
    expect(r.threw).toBe(true);
    expect(r.stderr).toContain("unresolved verdict");
  });

  test("a stage with no blocking sensor returns before reading the audit", () => {
    redateRecord(POST_CUTOFF);
    seedSensorAudit([FIRED, FAILED]);
    const r = captureExit(() => verifyBlockingSensors(proj, { slug: STAGE, name: "Requirements Analysis" }));
    expect(r.threw).toBe(false);
  });

  test("a record dir with no date prefix is outside enforcement", () => {
    // The stock fixture record name ("fixture-<id8>") parses to NaN — the same
    // shape the E-OC1 gate treats as un-dated, hence unenforced.
    seedArtifacts();
    useGraphWithBlockingSensor();
    seedSensorAudit([FIRED, FAILED]);
    const r = captureExit(() => verifyBlockingSensors(proj, { slug: STAGE, name: "Requirements Analysis" }));
    expect(r.threw).toBe(false);
  });
});

// --- Completion-path coverage (#2671 申し送り1 / #2683 前提3) ------------------
//
// approveUnderLock is not the only writer that marks a stage [x]. `advance`,
// `finalize` and `complete-workflow` each flip the checkbox under their own
// lock, and each already runs verifyStageArtifacts on that transition — the
// blocking-sensor gate has to sit on the same four transitions or the three
// direct-CLI paths stay an unguarded rubber-stamp backdoor (the same reasoning
// t185 records for the artifact guard).
//
// These arms bypass the ARTIFACT guard (AMADEUS_SKIP_ARTIFACT_GUARD=1) so the
// blocking-sensor gate is the ONLY thing that can refuse: it isolates the
// assertion to this gate and simultaneously proves the two switches are
// independent (skipping artifact checks must NOT skip sensor verdicts). The
// artifact layer on these same three paths is t185's subject.

type CompletionPath = {
  readonly label: string;
  readonly stage: string;
  readonly fixture: string;
  /** Seed anything the path needs before the record dir is re-dated. */
  readonly seedExtra?: (project: string) => void;
  readonly run: (stage: string) => void;
};

const COMPLETION_PATHS: readonly CompletionPath[] = [
  {
    label: "advance",
    stage: STAGE,
    fixture: "state-mid-inception.md",
    run: (stage) => handleAdvance([stage]),
  },
  {
    label: "finalize",
    stage: STAGE,
    fixture: "state-mid-inception.md",
    run: (stage) => handleFinalize([stage]),
  },
  {
    label: "complete-workflow",
    stage: "build-and-test",
    fixture: "state-fix-final-construction.md",
    seedExtra: (project) => seedGoalReceiptForFinalStage(project, "build-and-test"),
    run: (stage) => handleCompleteWorkflow([stage]),
  },
];

for (const path of COMPLETION_PATHS) {
  describe(`t511 — ${path.label} runs the blocking-sensor gate (#2671 申し送り1)`, () => {
    beforeEach(() => {
      proj = createTestProject();
      recordDirName = DEFAULT_RECORD_DIR;
      resetOtelPerProject();
      seedStateFile(proj, path.fixture);
      path.seedExtra?.(proj);
      redateRecord(POST_CUTOFF);
      saveEnv();
      process.env.CLAUDE_PROJECT_DIR = proj;
      process.env.AMADEUS_SKIP_HUMAN_PRESENCE_GUARD = "1";
      process.env.AMADEUS_SKIP_ARTIFACT_GUARD = "1";
      delete process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD;
    });
    afterEach(() => {
      restoreEnv();
      cleanupTestProject(proj);
    });

    test("refuses while the latest terminal is SENSOR_FAILED, leaving state untouched", () => {
      useGraphWithBlockingSensor(path.stage);
      seedSensorAudit([FIRED, FAILED], path.stage);
      const before = readFileSync(stateFile(), "utf-8");
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(true);
      expect(r.stderr).toContain(SENSOR);
      expect(r.stderr).toContain("SENSOR_FAILED");
      expect(readFileSync(stateFile(), "utf-8")).toBe(before);
    });

    test("refuses when the blocking sensor never fired (fail-closed)", () => {
      useGraphWithBlockingSensor(path.stage);
      seedSensorAudit([], path.stage);
      const before = readFileSync(stateFile(), "utf-8");
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(true);
      expect(r.stderr).toContain("no SENSOR_FIRED row");
      expect(readFileSync(stateFile(), "utf-8")).toBe(before);
    });

    test("completes once the sensor's latest terminal is SENSOR_PASSED", () => {
      useGraphWithBlockingSensor(path.stage);
      seedSensorAudit([FIRED, PASSED], path.stage);
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(false);
      expect(readFileSync(stateFile(), "utf-8")).toContain(`- [x] ${path.stage}`);
    });

    test("an APPLICABLE advisory sensor's SENSOR_FAILED does not block this path", () => {
      // Declared on the stage at advisory severity: the failing verdict is in
      // scope and only its severity keeps the gate open — the green side of the
      // two-sided proof for this path.
      useGraphWithAdvisorySensor(path.stage);
      seedSensorAudit([FIRED, FAILED], path.stage);
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(false);
      expect(readFileSync(stateFile(), "utf-8")).toContain(`- [x] ${path.stage}`);
    });

    test("an intent born before the cutoff is not retroactively blocked", () => {
      redateRecord(PRE_CUTOFF);
      useGraphWithBlockingSensor(path.stage);
      seedSensorAudit([FIRED, FAILED], path.stage);
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(false);
    });

    test("the off-switch opens the gate", () => {
      useGraphWithBlockingSensor(path.stage);
      seedSensorAudit([FIRED, FAILED], path.stage);
      process.env.AMADEUS_SKIP_BLOCKING_SENSOR_GUARD = "1";
      const r = captureExit(() => path.run(path.stage));
      expect(r.threw).toBe(false);
    });
  });
}
