// t236 — U5 election-cli directive loop, in-process (Bolt 1 walking-skeleton).
// Layer: integration (real FS via tmp project dir; in-process main() so the
// wiring lines are lcov-visible — seam-export-handler-amend). The spawn-based
// FR-0 demonstration lives in tests/e2e/t237.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../scripts/amadeus-election";

const DEF = {
  electionId: "E-LOOP1",
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
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("distribute");
    expect(run(["notify", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);

    // collecting: pending voters first, tally-ready once both ballots land
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("collect-wait");
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    const b2 = writeJson("b2.json", {
      electionId: "E-LOOP1",
      voter: "bob",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "軽微な留保",
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["vote", "--election", "E-LOOP1", "--file", b2])).toBe(0);
    expect(run(["status", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().pending).toEqual([]);
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("tally-ready");

    // tally -> render -> verify -> recorded
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("render");
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "rendered"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("verify");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "verified"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("done");
  });

  test("report rejects an out-of-order transition with exit 1 on stderr only", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const code = run(["report", "--election", "E-LOOP1", "--result", "tallied"]);
    expect(code).toBe(1);
    expect(errs.length).toBeGreaterThan(0);
    expect(JSON.parse(errs[errs.length - 1] ?? "{}").error).toContain("invalid-transition");
  });

  test("a GoA 8 ballot drives the tallied report into the hold state with a typed reason", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 8,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(lastJson().state).toBe("hold");
    // next still exits 0 — a hold directive is a successful emission
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
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
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    // vote with a non-JSON ballot file
    expect(run(["vote", "--election", "E-LOOP1", "--file", badDef])).toBe(1);
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const tallyPath = join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1", "tally.json",
    );
    // verify mismatch: tamper the stored result (valid JSON, wrong outcome)
    const stored = JSON.parse(readFileSync(tallyPath, "utf8"));
    stored.result = {
      kind: "established",
      outcome: "rejected",
      counts: stored.result.counts,
    };
    writeFileSync(tallyPath, JSON.stringify(stored));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    // readTally catch: corrupt tally.json is treated as unreadable
    writeFileSync(tallyPath, "{broken");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    // restore a consistent tally, then drop record.md -> verify missing branch
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    rmSync(join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1", "record.md",
    ));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
  });

  test("Bolt 4: full record render carries the GoA line and verify round-trips it", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "軽微な留保",
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const recordPath = join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1", "record.md",
    );
    const doc = readFileSync(recordPath, "utf8");
    expect(doc).toContain("GoA[E-LOOP1]: 1x0 2x1 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(doc).toContain("留保");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
    // tampered GoA line -> verify red (render<->verify symmetry)
    writeFileSync(recordPath, doc.replace("2x1", "2x9"));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
  });

  test("Bolt 4: hold-resolved resumes per the reason table and rejects invalid resolutions", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 8,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(lastJson().state).toBe("hold");
    // invalid resolution for reason block
    expect(
      run(["report", "--election", "E-LOOP1", "--result", "hold-resolved", "--resolution", "discussed"]),
    ).toBe(1);
    // reopen resumes collecting (block reason row)
    expect(
      run(["report", "--election", "E-LOOP1", "--result", "hold-resolved", "--resolution", "reopen"]),
    ).toBe(0);
    expect(lastJson().resumedTo).toBe("collecting");
    // missing --resolution is loud
    expect(run(["report", "--election", "E-LOOP1", "--result", "hold-resolved"])).toBe(1);
  });

  test("Bolt 4: notify (subagent default) emits per-voter directives referencing the blind views", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const viewPath = join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1", "views", "alice.json",
    );
    const view = JSON.parse(readFileSync(viewPath, "utf8"));
    expect(Object.keys(view).sort()).toEqual(["electionId", "ordered", "voter"]); // blind keys
    expect(run(["notify", "--election", "E-LOOP1"])).toBe(0);
    const outJson = lastJson();
    const deliveries = outJson.deliveries as Array<{ kind: string }>;
    expect(deliveries.length).toBe(2);
    expect(deliveries.every((d) => d.kind === "directive")).toBe(true);
  });

  test("Bolt 4: notify --transport agmsg delivers via the injected send script and books timeline entries", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const fake = join(projectDir, "fake-send.sh");
    writeFileSync(fake, "#!/bin/sh\nexit 0\n");
    chmodSync(fake, 0o755);
    expect(
      run([
        "notify", "--election", "E-LOOP1",
        "--transport", "agmsg", "--team", "amadeus", "--from", "leader",
        "--send-script", fake,
      ]),
    ).toBe(0);
    const outJson = lastJson();
    const deliveries = outJson.deliveries as Array<{ kind: string }>;
    expect(deliveries.every((d) => d.kind === "delivered")).toBe(true);
    const timeline = JSON.parse(readFileSync(join(
      projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1", "timeline.json",
    ), "utf8"));
    expect(timeline.filter((e: { kind: string }) => e.kind === "distributed").length).toBe(2);
    // missing --team/--from is loud; unknown transport is loud
    expect(run(["notify", "--election", "E-LOOP1", "--transport", "agmsg"])).toBe(1);
    expect(run(["notify", "--election", "E-LOOP1", "--transport", "carrier-pigeon"])).toBe(1);
  });

  test("Bolt 4: residual error branches — hold-resolved guards, blocked views dir, corrupt timeline, reservation tamper", () => {
    // hold-resolved on a non-hold state is rejected
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(
      run(["report", "--election", "E-LOOP1", "--result", "hold-resolved", "--resolution", "reopen"]),
    ).toBe(1);
    // walk to an established tally, then force state=hold on disk: the
    // hold-without-hold-tally guard must reject loudly
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    const edir = join(projectDir, "amadeus", "spaces", "default", "elections", "E-LOOP1");
    const efile = JSON.parse(readFileSync(join(edir, "election.json"), "utf8"));
    writeFileSync(join(edir, "election.json"), JSON.stringify({ ...efile, state: "hold" }));
    expect(
      run(["report", "--election", "E-LOOP1", "--result", "hold-resolved", "--resolution", "reopen"]),
    ).toBe(1);
    writeFileSync(join(edir, "election.json"), JSON.stringify({ ...efile, state: "tallied" }));
    // corrupt timeline.json -> render is loud
    const timelinePath = join(edir, "timeline.json");
    const timelineBytes = readFileSync(timelinePath, "utf8");
    writeFileSync(timelinePath, "{broken");
    expect(run(["render", "--election", "E-LOOP1"])).toBe(1);
    writeFileSync(timelinePath, timelineBytes);
    // reservation transcription tamper -> verify is loud
    const b2 = writeJson("b2.json", {
      electionId: "E-LOOP1",
      voter: "bob",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "軽微な留保",
      submittedAt: "2026-07-19T00:02:00Z",
    });
    writeFileSync(join(edir, "election.json"), JSON.stringify({ ...efile, state: "collecting" }));
    expect(run(["vote", "--election", "E-LOOP1", "--file", b2])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const recordPath = join(edir, "record.md");
    const doc = readFileSync(recordPath, "utf8");
    writeFileSync(recordPath, doc.split("\n").filter((l) => !l.startsWith("- 留保(")).join("\n"));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    // blocked views dir: pre-place a plain file where views/ must go
    const dir2 = join(projectDir, "amadeus", "spaces", "default", "elections", "E-BLOCKV1");
    mkdirSync(dir2, { recursive: true });
    writeFileSync(join(dir2, "views"), "not a dir");
    expect(
      run(["open", "--file", writeJson("def2.json", { ...DEF, electionId: "E-BLOCKV1" })]),
    ).toBe(1);
  });

  test("duplicate vote and unusable verbs fail loudly", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const b1 = writeJson("b1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(1);
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1); // no tally yet
    expect(run(["bogus-verb", "--election", "E-LOOP1"])).toBe(2);
    expect(run([])).toBe(2);
  });
});
