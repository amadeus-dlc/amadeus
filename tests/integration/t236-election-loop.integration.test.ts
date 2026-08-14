// t236 — election-cli `open` entrance, in-process.
// Layer: integration (real FS via tmp project dir; in-process main() so the
// wiring lines are lcov-visible — seam-export-handler-amend).
//
// Scope: the entrance to the directive loop — the opt-in gate that decides
// whether an automatically triggered solo election may be created at all, and
// the fail-closed reads around it. The loop AFTER open (distribute → collect →
// tally → render → verify → done) is pinned by the mixed-lifecycle CLI suites.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/framework/core/tools/amadeus-election";
import {
  electionsRoot,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store";

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
  projectDir = mkdtempSync(join(tmpdir(), "election-loop-"));
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
  rmSync(projectDir, { recursive: true, force: true });
});

function writeJson(name: string, value: unknown): string {
  const path = join(projectDir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function writeConfig(mode: string): void {
  writeFileSync(
    join(projectDir, "amadeus", "config.json"),
    JSON.stringify({ "solo-election": { trigger: { mode } } }),
  );
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

    // (2) no configuration at all: automatic firing is NOT the default
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath())).toBe(false);

    // (3) explicitly manual: same refusal, still no store write
    writeConfig("manual");
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath())).toBe(false);

    // (4) opted in: the election is created and every voter gets a blind view
    writeConfig("auto");
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({ electionId: "E-AUTO-OPTIN", views: 2 });
    expect(existsSync(resolveElectionDir(electionsRoot(projectDir), "E-AUTO-OPTIN"))).toBe(true);
  });

  test("invalid automatic solo-election config stops automatic open without writes", () => {
    const definition = writeJson("invalid-auto-def.json", {
      ...DEF,
      electionId: "E-AUTO-INVALID",
      voters: ["subagent-1", "subagent-2"],
    });
    writeConfig("true");

    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(1);
    const error = lastError();
    expect(error.category).toBe("config");
    expect(String(error.nextAction)).toContain("solo-election.trigger.mode expected manual | auto");
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
