// covers: file:packages/framework/core/tools/amadeus-directive.ts, file:packages/framework/core/tools/amadeus-orchestrate.ts
// size: medium
//
// U5 advisories-channel (FR-B2) — the MACHINE-CONSUMABLE advisory channel. The
// stderr line was human-only: a conductor had no structured field to read, so
// the nudge could not be relayed. This file pins the structured half:
//
//   1. The directive validator ACCEPTS `advisories` on run-stage (it is a
//      strict unknown-key rejecter, so the field must be allowlisted) and
//      rejects a malformed entry.
//   2. `next` carries the field on stdout ONLY when an advisory actually fires
//      (business-logic-model.md I2 — silence is preserved byte-for-byte), and
//      the stderr line is still written (L5 — the channels are additive).
//
// Driven IN-PROCESS (handleNext imported from source) so the added lines
// register in lcov — bun --coverage does not instrument spawned children
// (bun-coverage-spawn-blindspot).

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { __resetGraphCache } from "../../packages/framework/core/tools/amadeus-graph.ts";
import { _resetStageGraphForTests, docsRoot } from "../../packages/framework/core/tools/amadeus-lib.ts";
import { validateDirective } from "../../packages/framework/core/tools/amadeus-directive.ts";
import { handleNext } from "../../packages/framework/core/tools/amadeus-orchestrate.ts";
import {
  applyProductionAutonomyMode,
  previewProductionAutonomyGrant,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  resetAidlcEnv,
  seedStateFile,
  seededStateFile,
} from "../harness/fixtures.ts";
import {
  FIXTURE_ADVISORY_CODE,
  FIXTURE_HOLD_MESSAGE,
  FIXTURE_PLUGIN,
  installFixturePlugin,
  composeFixturePlugin,
} from "../harness/conformance-fixture.ts";
import { plantV1AuditRow } from "../harness/v1-audit-fixture.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";

const REPO_ROOT = join(import.meta.dir, "..", "..");
const STOCK_GRAPH = join(REPO_ROOT, "dist", "claude", ".claude", "tools", "data", "stage-graph.json");
const FIX_BUILD_STAGE = join(FIXTURES_DIR, "state-fix-final-construction.md");

let host = "";
let proj = "";
const savedEnv: Record<string, string | undefined> = {};
function setEnv(k: string, v: string | undefined): void {
  if (!(k in savedEnv)) savedEnv[k] = process.env[k];
  if (v === undefined) delete process.env[k];
  else process.env[k] = v;
}

// A hermetic project in the REAL installation layout (U8 FR-B3 grounding): the
// host root is the harness directory and the plugin source is a PROJECT asset
// one level up, so the two roots stay distinguishable. The composition record —
// host state — gates the whole advisory (BR-U6-4 0-plugin zero-impact) and stays
// on the host root. Returns the host root.
function makeHost(composed: boolean): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-t378-host-"));
  const h = join(root, ".claude");
  mkdirSync(h, { recursive: true });
  installFixturePlugin(root);
  if (composed) composeFixturePlugin(h);
  return h;
}

// A composed host with no recorded verdict, so the declared evaluator holds.
function makeChangedHost(): string {
  return makeHost(true);
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
  resetOtelPerProject();
  if (host) rmSync(host, { recursive: true, force: true });
  cleanupTestProject(proj);
});

// ===========================================================================
// 1. The directive contract: advisories is an ALLOWLISTED, SHAPE-CHECKED field
// ===========================================================================

function runStageFixture(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: "run-stage",
    stage: "build-and-test",
    phase: "construction",
    lead_agent: "amadeus-quality-agent",
    support_agents: [],
    mode: "inline",
    gate: true,
    memory_path: "x/memory.md",
    consumes: [],
    produces: ["x/out.md"],
    rules_in_context: [],
    sensors_applicable: [],
    stage_file: "stages/x.md",
    ...extra,
  };
}

describe("t378 directive contract: advisories field", () => {
  test("a well-formed advisories array is accepted on run-stage", () => {
    const result = validateDirective(
      runStageFixture({
        advisories: [
          {
            plugin: FIXTURE_PLUGIN,
            code: "changed",
            message: "advisory: x",
            stage: "build-and-test",
            target: `${FIXTURE_PLUGIN}:${FIXTURE_ADVISORY_CODE}`,
            reason: "model changed",
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
  });

  test("an entry with a non-slug plugin code is rejected", () => {
    const result = validateDirective(
      runStageFixture({
        advisories: [{ plugin: "p", code: "Not A Slug", message: "m", stage: "s" }],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain("advisories[0].code");
  });

  test("each of plugin/message/stage must be a string, and every offender is named", () => {
    const result = validateDirective(
      runStageFixture({
        advisories: [{ plugin: 1, code: "changed", message: null, stage: [] }],
      }),
    );
    expect(result.valid).toBe(false);
    const errors = result.valid === false ? result.errors.join("; ") : "";
    // All three are reported in one pass — a validator that stopped at the
    // first offender would hide the rest behind a fix-and-rerun loop.
    expect(errors).toContain("advisories[0].plugin must be string, got number");
    expect(errors).toContain("advisories[0].message must be string, got null");
    expect(errors).toContain("advisories[0].stage must be string, got array");
  });

  test("optional target and reason fields reject non-string values", () => {
    const result = validateDirective(
      runStageFixture({
        advisories: [{
          plugin: "p",
          code: "changed",
          message: "m",
          stage: "s",
          target: 1,
          reason: {},
        }],
      }),
    );
    expect(result.valid).toBe(false);
    const errors = result.valid === false ? result.errors.join("; ") : "";
    expect(errors).toContain("advisories[0].target must be string, got number");
    expect(errors).toContain("advisories[0].reason must be string, got object");
  });

  test("a non-object entry is rejected", () => {
    const result = validateDirective(runStageFixture({ advisories: ["nope"] }));
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain("advisories[0] must be object");
  });

  test("a non-array advisories is rejected", () => {
    const result = validateDirective(runStageFixture({ advisories: "nope" }));
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.join("; ")).toContain("advisories must be array");
  });
});

// ===========================================================================
// 2. next: the field appears ONLY when an advisory fires (I1/I2), and the
//    stderr line is still written (L5 — additive, not a replacement).
// ===========================================================================

// ===========================================================================
// 3. The consuming NORM: a field nobody is told to read is not a channel.
//    stage-protocol.md must instruct the conductor to relay each advisory —
//    in the canonical source AND in every shipped harness copy.
// ===========================================================================

describe("t378 stage-protocol relay norm", () => {
  const PROTOCOL_REL = join("amadeus-common", "protocols", "stage-protocol.md");

  // Discover each harness's protocol copy from disk. TWO discoveries, joined:
  //   * the harness SET comes from packages/framework/harness/<n>/manifest.ts —
  //     the same rule the packager uses, so a newly added harness widens this
  //     sweep automatically instead of being silently missed;
  //   * the dot-dir NAME comes from the built tree, because it is NOT always
  //     `.<harness>` (kimi ships `.kimi-code`, kiro-ide ships `.kiro`) and
  //     guessing it would skip those trees while still "passing".
  // Every manifest-bearing harness must yield exactly one copy.
  function protocolCopies(): string[] {
    const canonical = join(REPO_ROOT, "packages", "framework", "core", PROTOCOL_REL);
    const harnessRoot = join(REPO_ROOT, "packages", "framework", "harness");
    const harnesses = readdirSync(harnessRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory() && existsSync(join(harnessRoot, e.name, "manifest.ts")))
      .map((e) => e.name)
      .sort();
    expect(harnesses.length).toBeGreaterThan(0);

    const shipped: string[] = [];
    for (const harness of harnesses) {
      const distHarness = join(REPO_ROOT, "dist", harness);
      const found = readdirSync(distHarness, { withFileTypes: true })
        .filter((e) => e.isDirectory() && e.name.startsWith("."))
        .map((e) => join(distHarness, e.name, PROTOCOL_REL))
        .filter((p) => existsSync(p));
      expect({ harness, copies: found.length }).toEqual({ harness, copies: 1 });
      shipped.push(found[0]);
    }
    expect(shipped.length).toBe(harnesses.length);
    return [canonical, ...shipped];
  }

  test("every copy tells the conductor to surface directive.advisories", () => {
    for (const path of protocolCopies()) {
      const text = readFileSync(path, "utf-8");
      expect(text).toContain("`advisories`");
      // The norm has to name the ACTION, not merely the field.
      expect(text.toLowerCase()).toContain("surface every entry");
    }
  });
});

describe("t378 next holds before stage body", () => {
  test("firing condition -> await-advisory-choice replaces run-stage and preserves the stderr line", () => {
    host = makeChangedHost();
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE); // Current Stage = build-and-test
    handleNext([], proj);

    const directive = JSON.parse(logs.join("\n").trim()) as {
      kind: string;
      stage: string;
      question?: string;
      options?: string[];
      advisories?: { plugin: string; code: string; message: string; checkpoint: string }[];
    };
    expect(directive.kind).toBe("await-advisory-choice");
    expect(directive.stage).toBe("build-and-test");
    expect(directive.options).toEqual(["今すぐ実行する", "リスクを承知して延期する"]);
    expect(directive.advisories?.length).toBe(1);
    expect(directive.advisories?.[0].code).toBe(FIXTURE_ADVISORY_CODE);
    expect(directive.advisories?.[0].checkpoint).toBe("build-and-test");
    expect(directive.question).toBe(
      `${directive.advisories?.[0].message}\n\n各advisoryについて次のいずれかを選択してください。`,
    );
    // stderr is preserved (L5): the human channel did not move.
    expect(errs.join("\n")).toContain(FIXTURE_HOLD_MESSAGE);
  });

  test("silent condition (0-plugin) -> the advisories KEY is absent, not an empty array", () => {
    host = makeHost(false);
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE);
    handleNext([], proj);

    const raw = logs.join("\n").trim();
    expect(raw).toContain('"stage":"build-and-test"');
    expect(raw).not.toContain("advisories");
  });

  // #2253 FR-ADV-1: under a full grant the hold is ruled by the autonomy ladder
  // first, and a `run-now` ruling lets the ORIGINAL directive through untouched
  // — the run continues unattended instead of waiting on a human turn.
  test("full grant -> the ladder rules run-now and run-stage passes through with a receipt", () => {
    host = makeChangedHost();
    setEnv("AMADEUS_STAGE_GRAPH", STOCK_GRAPH);
    setEnv("AMADEUS_PLUGINS_HOST_ROOT", host);
    __resetGraphCache();
    _resetStageGraphForTests();
    proj = createTestProject();
    seedStateFile(proj, FIX_BUILD_STAGE);
    plantV1AuditRow("HUMAN_TURN", {}, proj);
    const stateContent = readFileSync(seededStateFile(proj), "utf8");
    const preview = previewProductionAutonomyGrant({ projectDir: proj, stateContent });
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(applyProductionAutonomyMode({
      projectDir: proj,
      stateContent,
      mode: "full",
      confirmedDisplayDigest: preview.preview.displayDigest,
    })).toMatchObject({ ok: true, projection: { mode: "full" } });

    handleNext([], proj);

    const directive = JSON.parse(logs.join("\n").trim()) as { kind: string; stage?: string };
    expect(directive.kind).toBe("run-stage");
    expect(directive.stage).toBe("build-and-test");
    // The ruling was accepted as a receipt whose provenance is the decision.
    const store = JSON.parse(
      readFileSync(join(docsRoot(proj), ".amadeus-advisory-choice.json"), "utf-8"),
    ) as { receipts: { choice: string; provenance: { kind: string } }[] };
    expect(store.receipts).toHaveLength(1);
    expect(store.receipts[0].choice).toBe("run-now");
    expect(store.receipts[0].provenance.kind).toBe("auto-decision");
  });
});
