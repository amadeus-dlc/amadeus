import { describe, expect, test } from "bun:test";
import { spawnSync } from "bun";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const script = join(import.meta.dir, "..", "..", "packages", "framework", "core", "tools", "amadeus-election-v2-cli.ts");

function runCli(project: string, args: readonly string[]) {
  const process = spawnSync(["bun", script, ...args, "--project", project]);
  return { code: process.exitCode ?? 1, stdout: process.stdout.toString().trim(), stderr: process.stderr.toString().trim() };
}

function writeMixedBallot(
  project: string,
  voter: "alice" | "bob",
  questionIds: readonly string[],
  rerun: boolean,
): string {
  const path = join(project, `${voter}-${rerun ? "rerun" : "initial"}.json`);
  const responses = questionIds.map((questionId) => ({
    questionId,
    choiceInternalNo: !rerun && voter === "bob" && questionId === "q-split" ? 2 : 1,
    goa: !rerun && voter === "bob" && questionId === "q-block" ? 8 : 1,
    reservation: null,
    rationale: null,
  }));
  writeFileSync(path, JSON.stringify({
    schemaVersion: 2,
    kind: "original",
    electionId: "E-V2-MIXED-EXECUTOR",
    voter,
    voterKind: "member",
    responses,
    submittedAt: rerun ? `2026-08-13T01:00:0${voter === "alice" ? 0 : 1}Z` : `2026-08-13T00:00:0${voter === "alice" ? 0 : 1}Z`,
  }));
  return path;
}

interface ProcessDirective {
  readonly kind: string;
  readonly verb: string;
  readonly targetQuestionIds: readonly string[];
  readonly held?: unknown;
  readonly preservedResultDigest: string | null;
  readonly expectedRunId: string | null;
}

interface MixedRunState {
  readonly kinds: string[];
  collectingRuns: number;
  preservedDigest: string | null;
}

function observeMixedHold(directive: ProcessDirective, state: MixedRunState): void {
  if (directive.kind !== "hold") return;
  expect(directive.held).toEqual([
    { questionId: "q-block", reason: "block" },
    { questionId: "q-split", reason: "tie" },
  ]);
  expect(directive.targetQuestionIds).toEqual(["q-block", "q-split"]);
  expect(directive.preservedResultDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  state.preservedDigest = directive.preservedResultDigest;
}

function collectMixedBallots(
  project: string,
  directive: ProcessDirective,
  state: MixedRunState,
): boolean {
  if (directive.kind !== "collect-wait") return false;
  state.collectingRuns++;
  const rerun = directive.targetQuestionIds.length === 2;
  expect(directive.targetQuestionIds).toEqual(
    rerun ? ["q-block", "q-split"] : ["q-established", "q-block", "q-split"],
  );
  for (const voter of ["alice", "bob"] as const) {
    expect(runCli(project, [
      "vote",
      "--election",
      "E-V2-MIXED-EXECUTOR",
      "--file",
      writeMixedBallot(project, voter, directive.targetQuestionIds, rerun),
    ]).code).toBe(0);
  }
  return true;
}

function expectPreservedTargets(directive: ProcessDirective, preservedDigest: string | null): void {
  if (preservedDigest === null || directive.expectedRunId !== "run-1") return;
  expect(directive.preservedResultDigest).toBe(preservedDigest);
  expect(directive.targetQuestionIds).toEqual(["q-block", "q-split"]);
}

function executeMixedLifecycle(project: string, directivePath: string): MixedRunState {
  const state: MixedRunState = { kinds: [], collectingRuns: 0, preservedDigest: null };
  for (let guard = 0; guard < 30; guard++) {
    const next = runCli(project, ["next", "--election", "E-V2-MIXED-EXECUTOR"]);
    expect(next).toMatchObject({ code: 0, stderr: "" });
    const directive = JSON.parse(next.stdout) as ProcessDirective;
    state.kinds.push(directive.kind);
    if (directive.kind === "done") break;
    observeMixedHold(directive, state);
    if (collectMixedBallots(project, directive, state)) continue;
    expectPreservedTargets(directive, state.preservedDigest);
    writeFileSync(directivePath, next.stdout);
    expect(runCli(project, [directive.verb, "--election", "E-V2-MIXED-EXECUTOR", "--file", directivePath]).code).toBe(0);
    expect(runCli(project, ["report", "--election", "E-V2-MIXED-EXECUTOR", "--file", directivePath])).toMatchObject({ code: 0, stderr: "" });
  }
  return state;
}

describe("t555 election v2 directive-only executor", () => {
  test("carries a multi-question election to done using only verb and report fields", () => {
    const project = mkdtempSync(join(tmpdir(), "election-v2-executor-"));
    const definitionPath = join(project, "definition.json");
    const ballotPath = join(project, "ballot.json");
    const directivePath = join(project, "directive.json");
    mkdirSync(join(project, "amadeus", "spaces", "default", "elections"), { recursive: true });
    writeFileSync(definitionPath, JSON.stringify({
      schemaVersion: 2,
      electionId: "E-V2-EXECUTOR",
      kind: "decision",
      questions: [
        { questionId: "q-a", text: "A?", choices: [{ internalNo: 1, label: "yes" }] },
        { questionId: "q-b", text: "B?", choices: [{ internalNo: 1, label: "yes" }] },
      ],
      voters: ["alice"],
    }));
    writeFileSync(ballotPath, JSON.stringify({
      schemaVersion: 2,
      kind: "original",
      electionId: "E-V2-EXECUTOR",
      voter: "alice",
      voterKind: "member",
      responses: [
        { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
        { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
      ],
      submittedAt: "2026-08-13T00:00:00Z",
    }));
    const cli = (args: readonly string[]) => {
      const process = spawnSync(["bun", script, ...args, "--project", project]);
      return { code: process.exitCode ?? 1, stdout: process.stdout.toString().trim(), stderr: process.stderr.toString().trim() };
    };
    try {
      expect(cli(["open", "--file", definitionPath]).code).toBe(0);
      const kinds: string[] = [];
      let voted = false;
      for (let guard = 0; guard < 20; guard++) {
        const next = cli(["next", "--election", "E-V2-EXECUTOR"]);
        expect(next).toMatchObject({ code: 0, stderr: "" });
        const directive = JSON.parse(next.stdout);
        kinds.push(directive.kind);
        if (directive.kind === "done") break;
        if (directive.kind === "collect-wait") {
          if (!voted) {
            expect(cli(["vote", "--election", "E-V2-EXECUTOR", "--file", ballotPath]).code).toBe(0);
            voted = true;
          }
          continue;
        }
        writeFileSync(directivePath, next.stdout);
        expect(cli([directive.verb, "--election", "E-V2-EXECUTOR", "--file", directivePath]).code).toBe(0);
        const reported = cli(["report", "--election", "E-V2-EXECUTOR", "--file", directivePath]);
        expect(reported).toMatchObject({ code: 0, stderr: "" });
      }
      expect(kinds).toEqual(["distribute", "collect-wait", "tally-ready", "render", "verify", "done"]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });

  test("carries a mixed result through a hold-only rerun without reconstructing directives", () => {
    const project = mkdtempSync(join(tmpdir(), "election-v2-mixed-executor-"));
    const definitionPath = join(project, "definition.json");
    const directivePath = join(project, "directive.json");
    mkdirSync(join(project, "amadeus", "spaces", "default", "elections"), { recursive: true });
    writeFileSync(definitionPath, JSON.stringify({
      schemaVersion: 2,
      electionId: "E-V2-MIXED-EXECUTOR",
      kind: "decision",
      questions: [
        { questionId: "q-established", text: "Established?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
        { questionId: "q-block", text: "Blocked?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
        { questionId: "q-split", text: "Split?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
      ],
      voters: ["alice", "bob"],
    }));
    try {
      expect(runCli(project, ["open", "--file", definitionPath]).code).toBe(0);
      const state = executeMixedLifecycle(project, directivePath);
      expect(state.collectingRuns).toBe(2);
      expect(state.kinds).toEqual([
        "distribute",
        "collect-wait",
        "tally-ready",
        "hold",
        "collect-wait",
        "tally-ready",
        "render",
        "verify",
        "done",
      ]);
    } finally {
      rmSync(project, { recursive: true, force: true });
    }
  });
});
