// t236 — U5 election-cli directive loop, in-process (Bolt 1 walking-skeleton).
// Layer: integration (real FS via tmp project dir; in-process main() so the
// wiring lines are lcov-visible — seam-export-handler-amend). The spawn-based
// FR-0 demonstration lives in tests/e2e/t237.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/framework/core/tools/amadeus-election";
import {
  electionsRoot,
  resolveElectionDir,
  Store,
} from "../../packages/framework/core/tools/amadeus-election-store";

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
const origHome = process.env.HOME;

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
  if (origHome === undefined) delete process.env.HOME;
  else process.env.HOME = origHome;
  rmSync(projectDir, { recursive: true, force: true });
});

function writeJson(name: string, value: unknown): string {
  const path = join(projectDir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function electionPath(...segments: string[]): string {
  return join(resolveElectionDir(electionsRoot(projectDir), "E-LOOP1").dir, ...segments);
}

describe("t236 election directive loop", () => {
  test("automatic solo open is opt-in and fails closed before store writes", () => {
    const definition = writeJson("auto-def.json", {
      ...DEF,
      electionId: "E-AUTO-OPTIN",
      voters: ["subagent-1", "subagent-2"],
    });
    const registryPath = join(electionsRoot(projectDir), "elections.json");

    expect(run(["open", "--trigger", "unexpected", "--file", definition])).toBe(1);
    expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain(
      'unknown trigger "unexpected"',
    );
    expect(existsSync(registryPath)).toBe(false);

    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath)).toBe(false);

    mkdirSync(join(projectDir, "amadeus"), { recursive: true });
    writeFileSync(
      join(projectDir, "amadeus", "config.json"),
      JSON.stringify({ "solo-election": { trigger: { mode: "manual" } } }),
    );
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({
      opened: null,
      reason: "solo-election-manual-trigger-required",
    });
    expect(existsSync(registryPath)).toBe(false);

    writeFileSync(
      join(projectDir, "amadeus", "config.json"),
      JSON.stringify({ "solo-election": { trigger: { mode: "auto" } } }),
    );
    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(0);
    expect(lastJson()).toEqual({ opened: "E-AUTO-OPTIN", views: 2 });
    expect(
      existsSync(
        resolveElectionDir(electionsRoot(projectDir), "E-AUTO-OPTIN").dir,
      ),
    ).toBe(true);
  });

  test("invalid automatic solo-election config stops automatic open without writes", () => {
    const definition = writeJson("invalid-auto-def.json", {
      ...DEF,
      electionId: "E-AUTO-INVALID",
      voters: ["subagent-1", "subagent-2"],
    });
    mkdirSync(join(projectDir, "amadeus"), { recursive: true });
    writeFileSync(
      join(projectDir, "amadeus", "config.json"),
      JSON.stringify({ "solo-election": { trigger: { mode: "true" } } }),
    );

    expect(run(["open", "--trigger", "auto", "--file", definition])).toBe(1);
    expect(errs.at(-1)).toContain(
      "solo-election.trigger.mode expected manual | auto",
    );
    expect(existsSync(join(electionsRoot(projectDir), "elections.json"))).toBe(
      false,
    );
  });

  test("open accepts natural multi-segment ids and rejects malformed ids loudly", () => {
    expect(run(["open", "--file", writeJson("natural.json", { ...DEF, electionId: "E-SDE-CG4" })])).toBe(0);
    for (const [i, electionId] of ["e-lower", "E--EMPTY", "E-TRAIL-", "-E-LEAD"].entries()) {
      expect(run(["open", "--file", writeJson(`bad-${i}.json`, { ...DEF, electionId })])).toBe(1);
      expect(errs.at(-1)).toContain("^E-[A-Z0-9]+(-[A-Z0-9]+)*$");
    }
    expect(run(["open", "--file", writeJson("non-string.json", { ...DEF, electionId: 42 })])).toBe(1);
  });

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
    const tallyPath = electionPath("tally.json");
    // verify mismatch: tamper the stored result (valid JSON, wrong choice count)
    const stored = JSON.parse(readFileSync(tallyPath, "utf8"));
    stored.result = {
      kind: "established",
      winner: { internalNo: 1, label: "0件で可" },
      choiceCounts: [{ internalNo: 1, label: "0件で可", count: 99 }],
      goa: stored.result.goa,
    };
    writeFileSync(tallyPath, JSON.stringify(stored));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    // readTally catch: corrupt tally.json is treated as unreadable
    writeFileSync(tallyPath, "{broken");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    // restore a consistent tally, then drop record.md -> verify missing branch
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    rmSync(electionPath("record.md"));
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
    const recordPath = electionPath("record.md");
    const doc = readFileSync(recordPath, "utf8");
    expect(doc).toContain("GoA[E-LOOP1]: 1x0 2x1 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(doc).toContain("留保");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
    // tampered GoA line -> verify red (render<->verify symmetry)
    writeFileSync(recordPath, doc.replace("2x1", "2x9"));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
  });

  // Issue #1457: verifySelf's ballot-count and freq classes must compare two
  // INDEPENDENTLY read values. Both tests below tamper exactly one side and
  // assert the named finding kind — they are red while the caller derives both
  // sides from the materialized tally (the self-reference this fix removes).
  test("#1457: a ledger that outgrows the materialized tally is a ballot-count finding", () => {
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
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);

    // A ballot lands on the ledger after materialization: ledger 2, tally 1.
    const ledgerPath = electionPath("ledger.json");
    const ledger = JSON.parse(readFileSync(ledgerPath, "utf8"));
    ledger.ballots.push({
      ...ledger.ballots[0],
      voter: "bob",
      submittedAt: "2026-07-19T00:03:00Z",
    });
    writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    const finding = JSON.parse(errs[errs.length - 1] ?? "{}").error as string;
    expect(finding).toContain("ballot-count");
    expect(finding).toContain('"expected":2');
    expect(finding).toContain('"actual":1');
  });

  test("#1457: a tampered stored GoA frequency is a freq-mismatch finding", () => {
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
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);

    // The stored GoA line still parses — only its bins are wrong, so the
    // frequency class (not the parse guard) is the branch under test.
    const recordPath = electionPath("record.md");
    const doc = readFileSync(recordPath, "utf8");
    writeFileSync(recordPath, doc.replace("1x1 2x0", "1x0 2x1"));
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    const finding = JSON.parse(errs[errs.length - 1] ?? "{}").error as string;
    expect(finding).toContain("freq-mismatch");
    expect(finding).toContain('"expected":"0,1,0,0,0,0,0,0"');
    expect(finding).toContain('"actual":"1,0,0,0,0,0,0,0"');
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
    const viewPath = electionPath("views", "alice.json");
    const view = JSON.parse(readFileSync(viewPath, "utf8"));
    // blind keys — #1772 added question (and per-choice description) so a voter
    // can read the motion; the BR-2 core ban is unchanged.
    expect(Object.keys(view).sort()).toEqual(["electionId", "ordered", "question", "voter"]);
    expect(run(["notify", "--election", "E-LOOP1"])).toBe(0);
    const outJson = lastJson();
    const deliveries = outJson.deliveries as Array<{ kind: string }>;
    expect(deliveries.length).toBe(2);
    expect(deliveries.every((d) => d.kind === "directive")).toBe(true);
  });

  // #1772: open used to write views that carried neither the question nor the
  // per-choice description, so a voter reading only their view could not tell
  // what the motion was or what each choice meant.
  test("#1772: open writes the question and per-choice description into each blind view", () => {
    const def = {
      ...DEF,
      choices: [
        { internalNo: 1, label: "0件で可", description: "候補なしを確定する。" },
        { internalNo: 2, label: "追加議論", description: "候補を再募集する。" },
      ],
    };
    expect(run(["open", "--file", writeJson("def.json", def)])).toBe(0);
    for (const voter of ["alice", "bob"]) {
      const view = JSON.parse(readFileSync(electionPath("views", `${voter}.json`), "utf8"));
      expect(view.question).toBe(def.question);
      const byNo = new Map(
        (view.ordered as Array<{ internalNo: number; description?: string }>).map((o) => [
          o.internalNo,
          o.description,
        ]),
      );
      expect(byNo.get(1)).toBe("候補なしを確定する。");
      expect(byNo.get(2)).toBe("候補を再募集する。");
    }
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
    const timeline = JSON.parse(readFileSync(electionPath("timeline.json"), "utf8"));
    expect(timeline.filter((e: { kind: string }) => e.kind === "distributed").length).toBe(2);
    // missing --team/--from is loud; unknown transport is loud
    expect(run(["notify", "--election", "E-LOOP1", "--transport", "agmsg"])).toBe(1);
    expect(run(["notify", "--election", "E-LOOP1", "--transport", "carrier-pigeon"])).toBe(1);
  });

  test("FR-8a: notify --transport agmsg resolves the default send.sh below HOME", () => {
    const home = join(projectDir, "home");
    const send = join(home, ".agents", "skills", "agmsg", "scripts", "send.sh");
    const sendLog = join(projectDir, "default-send.log");
    mkdirSync(join(send, ".."), { recursive: true });
    writeFileSync(send, `#!/bin/sh\nprintf '%s|%s|%s\\n' "$1" "$2" "$3" >>"${sendLog}"\n`);
    chmodSync(send, 0o755);
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const notified = Bun.spawnSync({
      cmd: [
        "bun", join(import.meta.dir, "../../packages/framework/core/tools/amadeus-election.ts"),
        "notify", "--election", "E-LOOP1",
        "--transport", "agmsg", "--team", "amadeus", "--from", "leader",
        "--project", projectDir,
      ],
      env: { ...process.env, HOME: home },
      stdout: "pipe",
      stderr: "pipe",
    });
    expect(notified.exitCode, notified.stderr.toString()).toBe(0);
    expect(readFileSync(sendLog, "utf8").trim().split("\n")).toEqual([
      "amadeus|leader|alice",
      "amadeus|leader|bob",
    ]);
  });

  test("M1 closure (#1235): a human hold ruling persists — record.md renders the ruling, never a stale 保留", () => {
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
    // the origin repro from review #1235 M1: human rules rejected...
    expect(
      run(["report", "--election", "E-LOOP1", "--result", "hold-resolved", "--resolution", "rejected"]),
    ).toBe(0);
    // ...the ruling is durable in tally.json...
    const tallyFile = JSON.parse(readFileSync(electionPath("tally.json"), "utf8"));
    expect(tallyFile.resolutions.length).toBe(1);
    expect(tallyFile.resolutions[0].resolution).toBe("rejected");
    // ...and the rendered record shows the ruling, NOT 保留 (the old symptom)
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("render");
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const doc = readFileSync(electionPath("record.md"), "utf8");
    expect(doc).toContain("裁定: 不採用");
    expect(doc).not.toContain("裁定: 保留");
    expect(doc).toContain("hold 裁定履歴: block → rejected");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "rendered"])).toBe(0);
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "verified"])).toBe(0);
    expect(run(["next", "--election", "E-LOOP1"])).toBe(0);
    expect(lastJson().kind).toBe("done");
  });

  test("Bolt 4: residual error branches — hold-resolved guards, corrupt timeline, reservation tamper", () => {
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
    const edir = electionPath();
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
    // m3 isolation: the failure is specifically the reservation-transcription
    // check (not a timeline-order finding firing first)
    expect(JSON.parse(errs[errs.length - 1] ?? "{}").error).toContain("reservation");
  });

  // Issue #1458: the default (subagent) transport returns directives only, so
  // notify books nothing. The transport design comment says the record is
  // "minted single-stage later by reportDelivery at U5 report time" — that
  // wiring was missing, leaving the distributed events (and therefore the
  // record.md 配信 segments) absent on every default-transport election.
  test("#1458: the subagent-default loop books distributed events at report time", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["notify", "--election", "E-LOOP1"])).toBe(0);
    expect((lastJson().deliveries as Array<{ kind: string }>).every((d) => d.kind === "directive")).toBe(true);
    // pre-fix: notify booked nothing because no outcome was "delivered"
    const afterNotify = JSON.parse(readFileSync(electionPath("timeline.json"), "utf8"));
    expect(afterNotify.filter((e: { kind: string }) => e.kind === "distributed").length).toBe(0);

    // the conductor reports completion -> reportDelivery mints one record per voter
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const booked = (
      JSON.parse(readFileSync(electionPath("timeline.json"), "utf8")) as Array<{
        kind: string;
        voter?: string;
        detail: string;
      }>
    ).filter((e) => e.kind === "distributed");
    expect(booked.map((e) => e.voter)).toEqual(["alice", "bob"]);
    expect(booked.every((e) => e.detail.includes("reported-by-conductor"))).toBe(true);

    // and the rendered record carries the 配信 segments on its timeline line
    for (const [voter, at] of [
      ["alice", "2026-07-19T00:01:00Z"],
      ["bob", "2026-07-19T00:02:00Z"],
    ]) {
      const path = writeJson(`${voter}.json`, {
        electionId: "E-LOOP1",
        voter,
        voterKind: "member",
        choiceInternalNo: 1,
        goa: 1,
        submittedAt: at,
      });
      expect(run(["vote", "--election", "E-LOOP1", "--file", path])).toBe(0);
    }
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const doc = readFileSync(electionPath("record.md"), "utf8");
    const timelineLine = doc.split("\n").find((l) => l.startsWith("票タイムライン:")) ?? "";
    expect(timelineLine).toContain("配信 ");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
  });

  // A second distributed report cannot happen through the state machine (the
  // transition demands state=open), but a re-notify after an agmsg send must
  // not double-book: report only mints for voters with no distributed event.
  test("#1458: report does not re-mint a distributed event an agmsg send already booked", () => {
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
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    const booked = (
      JSON.parse(readFileSync(electionPath("timeline.json"), "utf8")) as Array<{
        kind: string;
        detail: string;
      }>
    ).filter((e) => e.kind === "distributed");
    expect(booked.length).toBe(2);
    expect(booked.every((e) => e.detail.includes("agmsg"))).toBe(true);
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

  test("U1 amend flow: an amend supersedes the voter's original — vote closure, per-voter tally, verify green (BR-3/BR-4, FR-4b)", () => {
    const twoChoice = {
      electionId: "E-LOOP1",
      kind: "choice",
      question: "どちらの案か",
      choices: [
        { internalNo: 1, label: "案1" },
        { internalNo: 2, label: "案2" },
      ],
      voters: ["alice", "bob"],
    };
    expect(run(["open", "--file", writeJson("def.json", twoChoice)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    // alice's original picks choice 1
    const origAt = "2026-07-19T00:01:00Z";
    const aliceOrig = writeJson("a1.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: origAt,
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", aliceOrig])).toBe(0);
    // alice amends to choice 2; ref points at her accepted original (BR-3)
    const aliceAmend = writeJson("a2.json", {
      electionId: "E-LOOP1",
      voter: "alice",
      voterKind: "member",
      kind: "amend",
      ref: { electionId: "E-LOOP1", voter: "alice", submittedAt: origAt },
      choiceInternalNo: 2,
      goa: 1,
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", aliceAmend])).toBe(0);
    // closure: the amend is recorded as kind=amend, coexisting with the original
    // (ADR-5) — both rows present, original untouched. #1773 moved the STORAGE
    // of a still-collecting ballot to the gitignored pending lane, so the
    // accepted set is read through the store; the shared ledger.json stays empty
    // until tally (asserted below).
    const ledgerPath = electionPath("ledger.json");
    expect(JSON.parse(readFileSync(ledgerPath, "utf8")).ballots).toEqual([]);
    const accepted = Store.ledger(electionsRoot(projectDir), "E-LOOP1");
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.value.ballots.length).toBe(2);
      expect(accepted.value.ballots[0]?.kind).toBe("original");
      expect(accepted.value.ballots[1]?.kind).toBe("amend");
    }
    // bob votes choice 2
    const bob = writeJson("b.json", {
      electionId: "E-LOOP1",
      voter: "bob",
      voterKind: "member",
      choiceInternalNo: 2,
      goa: 1,
      submittedAt: "2026-07-19T00:03:00Z",
    });
    expect(run(["vote", "--election", "E-LOOP1", "--file", bob])).toBe(0);
    // tally counts each voter once (per-voter resolved): alice's superseded
    // original (choice 1) is NOT counted — choice 1 has 0 votes, choice 2 has 2
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    // #1773: tally is where the pending lane is folded into the shared ledger —
    // all three accepted rows land, in arrival order.
    const tallied = JSON.parse(readFileSync(ledgerPath, "utf8"));
    expect(tallied.ballots.map((b: { voter: string; kind: string }) => `${b.voter}:${b.kind}`)).toEqual([
      "alice:original",
      "alice:amend",
      "bob:original",
    ]);
    const result = lastJson().result as {
      kind: string;
      winner?: { internalNo: number };
      choiceCounts?: Array<{ internalNo: number; count: number }>;
      goa?: { favor: number };
    };
    expect(result.kind).toBe("established");
    expect(result.winner?.internalNo).toBe(2);
    expect(result.choiceCounts?.find((c) => c.internalNo === 1)?.count).toBe(0);
    expect(result.choiceCounts?.find((c) => c.internalNo === 2)?.count).toBe(2);
    // resolved GoA: alice once + bob = favor 2 (not 3, which raw double-counting
    // of alice's original + amend would give)
    expect(result.goa?.favor).toBe(2);
    // FR-4b: render/verify round-trip on the resolved set (symmetric — green)
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    const doc = readFileSync(electionPath("record.md"), "utf8");
    // GoA line reflects the resolved set (two GoA-1), not three raw ballots
    expect(doc).toContain("GoA[E-LOOP1]: 1x2 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);
  });

  test("solo-election U1: subagent 2-voter loop — 2-0 established and 1-1 split hold (FR-01/03/05)", () => {
    const soloDef = {
      electionId: "E-SOLO1",
      kind: "zero-confirm",
      question: "ソロ選挙スケルトン",
      choices: [{ internalNo: 1, label: "採用" }],
      voters: ["subagent-1", "subagent-2"],
    };
    expect(run(["open", "--file", writeJson("solo-def.json", soloDef)])).toBe(0);
    expect(run(["report", "--election", "E-SOLO1", "--result", "distributed"])).toBe(0);
    const b1 = writeJson("solo-b1.json", {
      electionId: "E-SOLO1",
      voter: "subagent-1",
      voterKind: "subagent",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    const b2 = writeJson("solo-b2.json", {
      electionId: "E-SOLO1",
      voter: "subagent-2",
      voterKind: "subagent",
      choiceInternalNo: 1,
      goa: 2,
      reservation: "軽微な留保",
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", "E-SOLO1", "--file", b1])).toBe(0);
    expect(run(["vote", "--election", "E-SOLO1", "--file", b2])).toBe(0);
    expect(run(["tally", "--election", "E-SOLO1"])).toBe(0);
    const established = lastJson().result as { kind: string; winner?: { internalNo: number } };
    expect(established.kind).toBe("established");
    expect(established.winner?.internalNo).toBe(1);
    expect(run(["report", "--election", "E-SOLO1", "--result", "tallied"])).toBe(0);

    // 1-1 split escalation path on a fresh election
    const splitDef = { ...soloDef, electionId: "E-SOLO2" };
    expect(run(["open", "--file", writeJson("solo-split-def.json", splitDef)])).toBe(0);
    expect(run(["report", "--election", "E-SOLO2", "--result", "distributed"])).toBe(0);
    const s1 = writeJson("split-b1.json", {
      electionId: "E-SOLO2",
      voter: "subagent-1",
      voterKind: "subagent",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:01:00Z",
    });
    const s2 = writeJson("split-b2.json", {
      electionId: "E-SOLO2",
      voter: "subagent-2",
      voterKind: "subagent",
      choiceInternalNo: 1,
      goa: 7,
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", "E-SOLO2", "--file", s1])).toBe(0);
    expect(run(["vote", "--election", "E-SOLO2", "--file", s2])).toBe(0);
    expect(run(["tally", "--election", "E-SOLO2"])).toBe(0);
    const split = lastJson().result as { kind: string; reason?: string };
    expect(split.kind).toBe("hold");
    expect(split.reason).toBe("split");
    expect(run(["report", "--election", "E-SOLO2", "--result", "tallied"])).toBe(0);
    expect(lastJson().state).toBe("hold");
    expect(run(["report", "--election", "E-SOLO2", "--result", "hold-resolved", "--resolution", "adopted"])).toBe(1);
    expect(run(["report", "--election", "E-SOLO2", "--result", "hold-resolved", "--resolution", "choice:1"])).toBe(0);
    expect((lastJson() as { resumedTo?: string }).resumedTo).toBe("tallied");
  });

  // --- Issue #2125: verb-side fail-closed state guards ----------------------

  // Force the on-disk state without going through the machine, so a single
  // election can be replayed against every state the guard must reject.
  function forceState(state: string): void {
    const path = electionPath("election.json");
    const file = JSON.parse(readFileSync(path, "utf8"));
    writeFileSync(path, JSON.stringify({ ...file, state }));
  }

  // FR-1a: tally is only legal out of `collecting`. Every other state must exit
  // 1 with no write at all — tally.json must not appear and timeline.json must
  // stay byte-identical (NFR-1 fail-closed).
  test("#2125 FR-1a: tally outside collecting exits 1 and writes nothing", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const tallyPath = electionPath("tally.json");
    const timelinePath = electionPath("timeline.json");
    for (const state of ["draft", "open", "tallied", "rendered", "recorded", "hold"]) {
      forceState(state);
      const before = readFileSync(timelinePath, "utf8");
      expect(run(["tally", "--election", "E-LOOP1"])).toBe(1);
      expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain("invalid-transition");
      expect(existsSync(tallyPath)).toBe(false);
      expect(readFileSync(timelinePath, "utf8")).toBe(before);
    }
    // collecting is accepted (the guard rejects state, not the verb)
    forceState("collecting");
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(existsSync(tallyPath)).toBe(true);
  });

  // FR-1b: notify accepts `open` (first distribution) and `collecting` (the
  // dispatch-ack resend lane, 3 min / max 2), and rejects the other five states
  // with no timeline write.
  test("#2125 FR-1b: notify is accepted in open/collecting and rejected elsewhere", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    const timelinePath = electionPath("timeline.json");
    const fake = join(projectDir, "fake-send.sh");
    writeFileSync(fake, "#!/bin/sh\nexit 0\n");
    chmodSync(fake, 0o755);
    const agmsg = [
      "--transport", "agmsg", "--team", "amadeus", "--from", "leader", "--send-script", fake,
    ];
    for (const state of ["draft", "tallied", "rendered", "recorded", "hold"]) {
      forceState(state);
      const before = readFileSync(timelinePath, "utf8");
      expect(run(["notify", "--election", "E-LOOP1", ...agmsg])).toBe(1);
      expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain("invalid-transition");
      expect(readFileSync(timelinePath, "utf8")).toBe(before);
    }
    for (const state of ["open", "collecting"]) {
      forceState(state);
      expect(run(["notify", "--election", "E-LOOP1", ...agmsg])).toBe(0);
    }
  });

  // FR-2: the `tallied` timeline row belongs to the transition commit, not to
  // the tally write. Its `at` stays the tally.json talliedAt, so the late-lane
  // classification axis and the timeline agree.
  test("#2125 FR-2: the tallied row is booked by report, carrying tally.json's talliedAt", () => {
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
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);

    // tally alone fixes the ballot set but books nothing on the timeline
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    const tallied = (): Array<{ kind: string; at: string }> =>
      (JSON.parse(readFileSync(electionPath("timeline.json"), "utf8")) as Array<{
        kind: string;
        at: string;
      }>).filter((e) => e.kind === "tallied");
    expect(tallied().length).toBe(0);

    // the transition commit books exactly one, stamped with talliedAt
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    const talliedAt = JSON.parse(readFileSync(electionPath("tally.json"), "utf8")).talliedAt;
    expect(tallied().length).toBe(1);
    expect(tallied()[0]?.at).toBe(talliedAt);

    // a second tallied report is refused by the existing from-check, so the
    // row can never be duplicated through the machine
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(1);
    expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain("invalid-transition");
    expect(tallied().length).toBe(1);
  });

  // The tallied pre-commit resolution refuses when tally.json never landed —
  // the state must not advance on a report with nothing to commit.
  test("#2125: tallied report without tally.json is refused before the commit", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "distributed"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(1);
    expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain("tally.json missing");
    expect(JSON.parse(readFileSync(electionPath("election.json"), "utf8")).state).toBe("collecting");
  });

  // The tallied commit and its audit row form a recoverable unit: a malformed
  // tally.json is rejected BEFORE the state commit, and an append failure
  // AFTER the commit is completed by re-running the report (repair path),
  // never duplicated.
  test("#2125: tallied commit + audit row are a recoverable unit", () => {
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
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);

    const state = (): string =>
      JSON.parse(readFileSync(electionPath("election.json"), "utf8")).state;
    const talliedRows = (): Array<{ kind: string; at: string }> =>
      (JSON.parse(readFileSync(electionPath("timeline.json"), "utf8")) as Array<{
        kind: string;
        at: string;
      }>).filter((e) => e.kind === "tallied");

    // Injection 1: tally.json without talliedAt is refused BEFORE the state
    // commit — the state must still read collecting afterwards.
    const tallyPath = electionPath("tally.json");
    const goodTally = readFileSync(tallyPath, "utf8");
    const { talliedAt: _dropped, ...rest } = JSON.parse(goodTally);
    writeFileSync(tallyPath, JSON.stringify(rest));
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(1);
    expect(JSON.parse(errs.at(-1) ?? "{}").error).toContain("talliedAt");
    expect(state()).toBe("collecting");
    expect(talliedRows().length).toBe(0);
    writeFileSync(tallyPath, goodTally);

    // Injection 2: the audit append fails after the commit (appendTimeline
    // parses timeline.json before writing, so unparsable bytes make exactly
    // that step fail) — state advances, row missing, exit 1.
    const timelinePath = electionPath("timeline.json");
    const goodTimeline = readFileSync(timelinePath, "utf8");
    writeFileSync(timelinePath, "not-json");
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(1);
    // The commit landed. This DEF's single-ballot tally is a hold outcome, so
    // the state reads hold — only the audit row is missing.
    expect(state()).toBe("hold");
    writeFileSync(timelinePath, goodTimeline);
    expect(talliedRows().length).toBe(0);

    // Recovery: re-running the report completes the unit — exactly one row,
    // stamped with talliedAt, no duplication on a further run.
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(talliedRows().length).toBe(1);
    expect(talliedRows()[0]?.at).toBe(JSON.parse(goodTally).talliedAt);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(1);
    expect(talliedRows().length).toBe(1);
  });

  // FR-3 wiring: verify runs the kind-order class through the CLI. The guards
  // above close the live windows, so the unlawful history is injected the way
  // a legacy corruption looks on disk — a duplicate tallied row appended
  // straight to timeline.json.
  test("#2125 FR-3: verify exits 1 on a kind-order violation", () => {
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
    expect(run(["vote", "--election", "E-LOOP1", "--file", b1])).toBe(0);
    expect(run(["tally", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["report", "--election", "E-LOOP1", "--result", "tallied"])).toBe(0);
    expect(run(["render", "--election", "E-LOOP1"])).toBe(0);
    expect(run(["verify", "--election", "E-LOOP1"])).toBe(0);

    const timelinePath = electionPath("timeline.json");
    const events = JSON.parse(readFileSync(timelinePath, "utf8")) as Array<{
      kind: string;
      at: string;
    }>;
    const dup = events.find((e) => e.kind === "tallied");
    expect(dup).toBeDefined();
    writeFileSync(timelinePath, JSON.stringify([...events, dup]));

    expect(run(["verify", "--election", "E-LOOP1"])).toBe(1);
    expect(errs.at(-1) ?? "").toContain("kind-order");
  });
});
