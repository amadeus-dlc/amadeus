// covers: function:main, function:openElectionV2, function:statusElectionV2
// size: medium
import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main as dispatchMain } from "../../packages/framework/core/tools/amadeus-election.ts";
import {
  main,
  nextElectionV2,
  openElectionV2,
  reportElectionV2,
  statusElectionV2,
  voteElectionV2,
} from "../../packages/framework/core/tools/amadeus-election-v2-cli.ts";
import { electionsRoot, resolveElectionDir } from "../../packages/framework/core/tools/amadeus-election-store.ts";
import { ElectionV2Store } from "../../packages/framework/core/tools/amadeus-election-v2-store.ts";

const definition = {
  schemaVersion: 2 as const,
  electionId: "E-V2-INPROCESS",
  kind: "decision",
  questions: [
    { questionId: "q-a", text: "A?", choices: [{ internalNo: 1, label: "yes" }] },
    { questionId: "q-b", text: "B?", choices: [{ internalNo: 1, label: "yes" }] },
  ],
  voters: ["alice"],
};

const ballot = {
  schemaVersion: 2,
  kind: "original",
  electionId: definition.electionId,
  voter: "alice",
  voterKind: "member",
  responses: [
    { questionId: "q-a", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
    { questionId: "q-b", choiceInternalNo: 1, goa: 1, reservation: null, rationale: null },
  ],
  submittedAt: "2026-08-13T00:00:00Z",
};

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "election-v2-inprocess-"));
  roots.push(dir);
  mkdirSync(join(dir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  return dir;
}

function run(argv: readonly string[]): { code: number; stdout: string; stderr: string } {
  const logs: string[] = [];
  const errors: string[] = [];
  const log = console.log;
  const err = console.error;
  console.log = (value?: unknown) => {
    logs.push(String(value ?? ""));
  };
  console.error = (value?: unknown) => {
    errors.push(String(value ?? ""));
  };
  try {
    return { code: main([...argv]), stdout: logs.join("\n"), stderr: errors.join("\n") };
  } finally {
    console.log = log;
    console.error = err;
  }
}

function expectFailure(result: { code: number; stderr: string }, category: string): void {
  expect(result.code).toBe(1);
  expect(JSON.parse(result.stderr)).toMatchObject({ category });
}

describe("t559 election v2 CLI in-process", () => {
  test("main walks open through done and rejects malformed argv", () => {
    const dir = project();
    const definitionPath = join(dir, "definition.json");
    const ballotPath = join(dir, "ballot.json");
    const directivePath = join(dir, "directive.json");
    writeFileSync(definitionPath, JSON.stringify(definition));
    writeFileSync(ballotPath, JSON.stringify(ballot));

    expect(run([])).toMatchObject({ code: 2 });
    expect(run(["open", "--unknown", "x", "--project", dir])).toMatchObject({ code: 2 });
    expect(run(["open", "--file", "--project", dir])).toMatchObject({ code: 2 });
    expect(run(["open", "--file", join(dir, "missing.json"), "--project", dir])).toMatchObject({ code: 1 });
    expect(run(["status", "--project", dir])).toMatchObject({ code: 2 });
    expect(run(["open", "--file", definitionPath, "--project", dir])).toMatchObject({ code: 0 });

    const kinds: string[] = [];
    let voted = false;
    for (let guard = 0; guard < 20; guard++) {
      const next = run(["next", "--election", definition.electionId, "--project", dir]);
      expect(next.code).toBe(0);
      const directive = JSON.parse(next.stdout) as { kind: string; verb: string | null };
      kinds.push(directive.kind);
      if (directive.kind === "done") break;
      if (directive.kind === "collect-wait") {
        if (!voted) {
          expect(run(["vote", "--election", definition.electionId, "--file", ballotPath, "--project", dir]).code).toBe(0);
          voted = true;
        }
        continue;
      }
      writeFileSync(directivePath, next.stdout);
      expect(run([String(directive.verb), "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
      expect(run(["report", "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
    }
    expect(kinds).toEqual(["distribute", "collect-wait", "tally-ready", "render", "verify", "done"]);
    expect(run(["status", "--election", definition.electionId, "--project", dir]).code).toBe(0);

    writeFileSync(directivePath, JSON.stringify({ schemaVersion: 2, kind: "done" }));
    expect(run(["notify", "--election", definition.electionId, "--file", directivePath, "--project", dir])).toMatchObject({ code: 1 });
    writeFileSync(directivePath, JSON.stringify({
      schemaVersion: 2,
      kind: "done",
      electionId: definition.electionId,
      targetQuestionIds: ["q-a", "q-b"],
      preservedResultDigest: null,
      expectedState: "recorded",
      expectedRunId: null,
      verb: null,
      report: null,
    }));
    expect(run(["unknown", "--election", definition.electionId, "--file", directivePath, "--project", dir])).toMatchObject({ code: 2 });
    expect(run(["vote", "--election", definition.electionId, "--file", join(dir, "missing.json"), "--project", dir])).toMatchObject({ code: 1 });
  });

  test("exported helpers cover draft, decode, stale, and report-null arms", () => {
    const dir = project();
    const root = electionsRoot(dir);
    expect(ElectionV2Store.create(root, definition).ok).toBe(true);
    expect(nextElectionV2(root, definition.electionId)).toMatchObject({
      ok: false,
      error: { category: "invalid-transition" },
    });
    expect(statusElectionV2(root, definition.electionId)).toMatchObject({
      ok: false,
      error: { category: "invalid-transition" },
    });
    expect(openElectionV2(root, { not: "an election" })).toMatchObject({
      ok: false,
      error: { category: "decode" },
    });
    expect(openElectionV2(root, { ...definition, electionId: "E-V2-OPEN" }).ok).toBe(true);
    expect(statusElectionV2(root, "E-V2-OPEN").ok).toBe(true);
    expect(voteElectionV2(root, definition.electionId, ballot, "2026-08-13T00:00:01Z")).toMatchObject({
      ok: false,
      error: { category: "invalid-transition" },
    });

    const opened = nextElectionV2(root, "E-V2-OPEN");
    if (!opened.ok || opened.value.kind !== "distribute") throw new Error("expected distribute");
    expect(reportElectionV2(root, { ...opened.value, report: null, verb: null, kind: "done" }, "2026-08-13T00:00:02Z")).toMatchObject({
      ok: false,
      error: { category: "invalid-transition" },
    });
    expect(reportElectionV2(root, {
      ...opened.value,
      targetQuestionIds: ["q-z"],
    }, "2026-08-13T00:00:03Z")).toMatchObject({
      ok: false,
      error: { category: "stale-directive" },
    });
  });

  test("main parses every directive kind and the remaining error arms", () => {
    const dir = project();
    const definitionPath = join(dir, "definition.json");
    const directivePath = join(dir, "directive.json");
    writeFileSync(definitionPath, JSON.stringify({
      ...definition,
      electionId: "E-V2-HOLD",
      questions: [
        { questionId: "q-yes", text: "Yes?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
        { questionId: "q-tie", text: "Tie?", choices: [{ internalNo: 1, label: "yes" }, { internalNo: 2, label: "no" }] },
      ],
      voters: ["alice", "bob"],
    }));
    expect(run(["open", "--file", definitionPath, "--project", dir]).code).toBe(0);

    const common = {
      schemaVersion: 2,
      electionId: "E-V2-HOLD",
      targetQuestionIds: ["q-yes", "q-tie"],
      preservedResultDigest: null,
      expectedState: "open",
      expectedRunId: null,
    };
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "collect-wait",
      verb: null,
      report: null,
      pending: ["alice"],
    }));
    expectFailure(run(["report", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "invalid-transition");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "collect-wait",
      verb: null,
      report: null,
      pending: [1],
    }));
    expectFailure(run(["report", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "decode");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "hold",
      verb: "notify",
      report: "distributed",
      expectedState: "tallied",
      held: [{ questionId: "q-tie", reason: "tie" }],
    }));
    expectFailure(run(["notify", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "stale-directive");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "hold",
      verb: "notify",
      report: "distributed",
      held: [{ questionId: "q-tie", reason: "not-a-reason" }],
    }));
    expectFailure(run(["notify", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "decode");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "tally-ready",
      verb: "tally",
      report: "tallied",
      candidateRunId: "run-1",
    }));
    expectFailure(run(["tally", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "store");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "render",
      verb: "render",
      report: "rendered",
    }));
    expectFailure(run(["render", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "stale-directive");
    writeFileSync(directivePath, JSON.stringify({
      ...common,
      kind: "verify",
      verb: "verify",
      report: "verified",
    }));
    expectFailure(run(["verify", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "stale-directive");

    const next = run(["next", "--election", "E-V2-HOLD", "--project", dir]);
    expect(next.code).toBe(0);
    writeFileSync(directivePath, next.stdout);
    const viewsPath = join(resolveElectionDir(electionsRoot(dir), "E-V2-HOLD").dir, "views");
    rmSync(viewsPath, { recursive: true, force: true });
    writeFileSync(viewsPath, "blocked");
    expectFailure(run(["notify", "--election", "E-V2-HOLD", "--file", directivePath, "--project", dir]), "store");
  });

  test("vote and verify fail closed when the store or record is missing", () => {
    const dir = project();
    const definitionPath = join(dir, "definition.json");
    const ballotPath = join(dir, "ballot.json");
    const directivePath = join(dir, "directive.json");
    writeFileSync(definitionPath, JSON.stringify(definition));
    writeFileSync(ballotPath, JSON.stringify(ballot));
    expect(run(["open", "--file", definitionPath, "--project", dir]).code).toBe(0);
    const distribute = run(["next", "--election", definition.electionId, "--project", dir]);
    writeFileSync(directivePath, distribute.stdout);
    expect(run(["notify", "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
    writeFileSync(join(resolveElectionDir(electionsRoot(dir), definition.electionId).dir, "pending"), "blocked");
    expect(run(["vote", "--election", definition.electionId, "--file", ballotPath, "--project", dir]).code).toBe(1);
    rmSync(join(resolveElectionDir(electionsRoot(dir), definition.electionId).dir, "pending"));
    expect(run(["vote", "--election", definition.electionId, "--file", ballotPath, "--project", dir]).code).toBe(0);
    const tallyReady = run(["next", "--election", definition.electionId, "--project", dir]);
    writeFileSync(directivePath, tallyReady.stdout);
    expect(run(["tally", "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
    const render = run(["next", "--election", definition.electionId, "--project", dir]);
    writeFileSync(directivePath, render.stdout);
    expect(run(["render", "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(0);
    rmSync(join(resolveElectionDir(electionsRoot(dir), definition.electionId).dir, "record.md"), { force: true });
    const verify = run(["next", "--election", definition.electionId, "--project", dir]);
    writeFileSync(directivePath, verify.stdout);
    expect(run(["verify", "--election", definition.electionId, "--file", directivePath, "--project", dir]).code).toBe(1);
  });

  test("published dispatcher forwards the second-argument project dir to v2", () => {
    const dir = project();
    const definitionPath = join(dir, "definition.json");
    writeFileSync(definitionPath, JSON.stringify(definition));
    const logs: string[] = [];
    const errors: string[] = [];
    const log = console.log;
    const err = console.error;
    console.log = (value?: unknown) => {
      logs.push(String(value ?? ""));
    };
    console.error = (value?: unknown) => {
      errors.push(String(value ?? ""));
    };
    try {
      expect(dispatchMain(["open", "--file", definitionPath], dir)).toBe(0);
      expect(dispatchMain(["status", "--election", definition.electionId], dir)).toBe(0);
    } finally {
      console.log = log;
      console.error = err;
    }
    expect(errors.join("\n")).toBe("");
    expect(JSON.parse(logs[1] ?? "{}")).toMatchObject({
      electionId: definition.electionId,
      schemaVersion: 2,
      state: "open",
    });
  });
});

