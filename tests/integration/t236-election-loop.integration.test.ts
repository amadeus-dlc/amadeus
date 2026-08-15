// t236 — election-cli `open` entrance, in-process.
// Layer: integration (real FS via tmp project dir; in-process main() so the
// wiring lines are lcov-visible — seam-export-handler-amend).
//
// Scope: the entrance to the directive loop — the opt-in gate that decides
// whether an automatically triggered solo election may be created at all, and
// the fail-closed reads around it. The loop AFTER open (distribute → collect →
// tally → render → verify → done) is pinned by the mixed-lifecycle CLI suites.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { main } from "../../packages/framework/core/tools/amadeus-election";
import {
  electionsRoot,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store";
import type { AutonomyMode } from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { applyProductionAutonomyMode } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import { mintHumanPresence } from "../../packages/framework/core/tools/amadeus-presence-reservation.ts";
import { resetOtelPerProject } from "../harness/otel-reset.ts";
import {
  cleanupTestProject,
  createTestProject,
  FIXTURES_DIR,
  seededStateFile,
  seedStateFile,
} from "../harness/fixtures.ts";

const CONSTRUCTION = join(FIXTURES_DIR, "state-construction.md");

const DEF = {
  schemaVersion: 2,
  electionId: "E-LOOP1",
  kind: "zero-confirm",
  questions: [
    {
      questionId: "q1",
      text: "学習候補 0 件でよいか",
      choices: [{ internalNo: 1, label: "0件で可" }],
    },
  ],
  voters: ["alice", "bob"],
};

let projectDir = "";
let logs: string[] = [];
let errs: string[] = [];
const origLog = console.log;
const origErr = console.error;

function run(argv: string[]): number {
  logs = [];
  errs = [];
  return main(argv, projectDir);
}

function lastJson(): Record<string, unknown> {
  return JSON.parse(logs[logs.length - 1] ?? "null");
}

function lastError(): Record<string, unknown> {
  return JSON.parse(errs[errs.length - 1] ?? "null");
}

beforeEach(() => {
  projectDir = createTestProject();
  mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  console.log = (line: string) => {
    logs.push(String(line));
  };
  console.error = (line: string) => {
    errs.push(String(line));
  };
});

afterEach(() => {
  console.log = origLog;
  console.error = origErr;
  cleanupTestProject(projectDir);
});

function writeJson(name: string, value: unknown): string {
  const path = join(projectDir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

// RFC-0001 ADR-8: the automatic-open gate is DERIVED from the active Intent's
// declared Autonomy Mode (deriveSoloElectionTrigger), not read from config —
// there is no config leaf to write any more. Declares a real mode through the
// same production API applyProductionAutonomyMode uses in normal operation.
function declareMode(mode: AutonomyMode): void {
  seedStateFile(projectDir, CONSTRUCTION);
  resetOtelPerProject();
  mintHumanPresence({
    projectDir,
    capability: { kind: "unavailable", reason: "in-process test driver" },
  });
  const applied = applyProductionAutonomyMode({
    projectDir,
    stateContent: readFileSync(seededStateFile(projectDir), "utf-8"),
    mode,
  });
  if (!applied.ok) throw new Error(`${mode} declaration failed: ${applied.error}`);
}

function registryPath(): string {
  return join(electionsRoot(projectDir), "elections.json");
}

describe("t236 election open entrance", () => {
  test("automatic solo open is opt-in and fails closed before store writes", () => {
    const definition = writeJson("auto-def.json", {
      ...DEF,
      electionId: "E-AUTO-OPTIN",
      voters: ["subagent-1", "subagent-2"],
    });

    // (1) a trigger outside the closed vocabulary is refused outright
    expect(run(["open", "--trigger", "unexpected", "--file", definition])).toBe(1);
    expect(lastError()).toMatchObject({
      category: "decode",
      nextAction: "use --trigger manual or --trigger auto",
    });
    expect(existsSync(registryPath())).toBe(false);

    // (2) no active Intent projection at all: automatic firing is NOT the
    // default (deriveSoloElectionTrigger falls closed to "none" -> "manual").
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath())).toBe(false);

    // (3) Intent Autonomy Mode declared "none": same refusal, still no store write
    declareMode("none");
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath())).toBe(false);

    // (4) Intent Autonomy Mode declared "semi": the election is created and
    // every voter gets a blind view.
    declareMode("semi");
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({ electionId: "E-AUTO-OPTIN", views: 2 });
    expect(existsSync(resolveElectionDir(electionsRoot(projectDir), "E-AUTO-OPTIN"))).toBe(true);
  });

  // R-1/R-8 (config-visibility, RFC-0001 ADR-8): there is no longer a
  // "solo-election.trigger.mode" config leaf to be invalid, so this scenario
  // is replaced by its structural analogue — an active Intent whose state
  // file exists but carries no declared Autonomy Mode (a pre-declaration
  // state, the same shape a freshly-birthed intent has). The gate must still
  // fail closed to manual rather than crash or silently default to auto.
  test("an active Intent with an undeclared Autonomy Mode stops automatic open without writes", () => {
    const definition = writeJson("undeclared-auto-def.json", {
      ...DEF,
      electionId: "E-AUTO-UNDECLARED",
      voters: ["subagent-1", "subagent-2"],
    });
    seedStateFile(projectDir, CONSTRUCTION);

    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath())).toBe(false);
  });

  test("an omitted --trigger opens manually, bypassing the opt-in gate entirely", () => {
    // The gate governs AUTOMATIC firing only: a human-driven open never consults
    // the configuration, so a manual workspace can still hold an election.
    expect(run(["open", "--file", writeJson("manual.json", DEF)])).toBe(0);
    expect(lastJson()).toEqual({ electionId: "E-LOOP1", views: 2 });
  });

  test("open rejects a definition whose id cannot be a single path segment", () => {
    for (const [index, electionId] of ["", "..", "E/ESCAPE", "E\\ESCAPE"].entries()) {
      expect(run(["open", "--file", writeJson(`bad-${index}.json`, { ...DEF, electionId })])).toBe(1);
      expect(existsSync(registryPath())).toBe(false);
    }
    // A non-string id is a decode failure, not a store failure.
    expect(run(["open", "--file", writeJson("non-string.json", { ...DEF, electionId: 42 })])).toBe(1);
    expect(lastError()).toMatchObject({ category: "decode" });
  });

  test("a malformed definition file is refused before any store write", () => {
    const path = join(projectDir, "broken.json");
    writeFileSync(path, "{not json");
    expect(run(["open", "--file", path])).toBe(1);
    expect(lastError()).toMatchObject({
      category: "decode",
      nextAction: "fix the input file and retry",
    });
    expect(existsSync(registryPath())).toBe(false);
  });
});
