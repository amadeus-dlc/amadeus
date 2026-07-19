// t236 — U5 election-cli directive loop, in-process (Bolt 1 walking-skeleton).
// Layer: integration (real FS via tmp project dir; in-process main() so the
// wiring lines are lcov-visible — seam-export-handler-amend). The spawn-based
// FR-0 demonstration lives in tests/e2e/t237.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../scripts/amadeus-election";

const DEF = {
  electionId: "E-LOOP-1",
  kind: "zero-confirm",
  question: "学習候補 0 件でよいか",
  choices: [{ internalNo: 1, label: "0件で可" }],
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

describe("t236 election directive loop", () => {
  test("zero-confirm election walks open -> distribute -> collect -> tally -> render -> verify -> recorded", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);

    // open -> distribute directive
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("distribute");
    expect(run(["notify", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "distributed"])).toBe(0);

    // collecting: pending voters first, tally-ready once both ballots land
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("collect-wait");
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP-1",
      voter: "alice",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    const b2 = writeJson("b2.json", {
      electionId: "E-LOOP-1",
      voter: "bob",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "軽微な留保",
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b1])).toBe(0);
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b2])).toBe(0);
    expect(run(["status", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().pending).toEqual([]);
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("tally-ready");

    // tally -> render -> verify -> recorded
    expect(run(["tally", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "tallied"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("render");
    expect(run(["render", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "rendered"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("verify");
    expect(run(["verify", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "verified"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    expect(lastJson().kind).toBe("done");
  });

  test("report rejects an out-of-order transition with exit 1 on stderr only", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const code = run(["report", "--election", "E-LOOP-1", "--result", "tallied"]);
    expect(code).toBe(1);
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.parse(errs[errs.length - 1] ?? "{}").error).toContain("invalid-transition");
  });

  test("a GoA 8 ballot drives the tallied report into the hold state with a typed reason", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP-1",
      voter: "alice",
      choiceInternalNo: 1,
      goa: 8,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "tallied"])).toBe(0);
    expect(lastJson().state).toBe("hold");
    // next still exits 0 — a hold directive is a successful emission
    expect(run(["next", "--election", "E-LOOP-1"])).toBe(0);
    const directive = lastJson();
    expect(directive.kind).toBe("hold");
    expect(directive.reason).toBe("block");
  });

  test("unreadable inputs and verify failure branches are loud", () => {
    // open with a non-JSON definition file
    const badDef = join(projectDir, "bad.json");
    writeFileSync(badDef, "not json {");
    expect(run(["open", "--file", badDef])).toBe(1);
    // set up a real election through tally
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP-1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP-1",
      voter: "alice",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    // vote with a non-JSON ballot file
    expect(run(["vote", "--election", "E-LOOP-1", "--file", badDef])).toBe(1);
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP-1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP-1"])).toBe(0);
    const tallyPath = join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP-1", "tally.json",
    );
    // verify mismatch: tamper the stored result (valid JSON, wrong outcome)
    const stored = JSON.parse(readFileSync(tallyPath, "utf8"));
    stored.result = {
      kind: "established",
      outcome: "rejected",
      counts: stored.result.counts,
    };
    writeFileSync(tallyPath, JSON.stringify(stored));
    expect(run(["verify", "--election", "E-LOOP-1"])).toBe(1);
    // readTally catch: corrupt tally.json is treated as unreadable
    writeFileSync(tallyPath, "{broken");
    expect(run(["verify", "--election", "E-LOOP-1"])).toBe(1);
    // restore a consistent tally, then drop record.md -> verify missing branch
    expect(run(["tally", "--election", "E-LOOP-1"])).toBe(0);
    rmSync(join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP-1", "record.md",
    ));
    expect(run(["verify", "--election", "E-LOOP-1"])).toBe(1);
  });

  test("duplicate vote and unusable verbs fail loudly", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP-1",
      voter: "alice",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b1])).toBe(0);
    expect(run(["vote", "--election", "E-LOOP-1", "--file", b1])).toBe(1);
    expect(run(["verify", "--election", "E-LOOP-1"])).toBe(1); // no tally yet
    expect(run(["bogus-verb", "--election", "E-LOOP-1"])).toBe(2);
    expect(run([])).toBe(2);
  });
});
