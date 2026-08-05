// t451 — Issue #1946: the ballot receipt stamp is the authoritative axis.
// Layer: integration (real FS via a tmp project dir; in-process main() so the
// CLI wiring lines stay lcov-visible — seam-export-handler-amend).
//
// The defect this pins: submittedAt is voter-self-reported and compared against
// no clock, so a future-dated original outranked every genuine later amend in
// resolveBallots — a voter could make their own correction unreachable, and a
// block vote raised by amendment vanished from the tally. Ruling Q2=A
// (2026-08-05) moved the axis to the instant the CLI accepts the ballot.
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../packages/framework/core/tools/amadeus-election";
import {
  electionsRoot,
  resolveElectionDir,
} from "../../packages/framework/core/tools/amadeus-election-store";

const ELECTION_ID = "E-RCPT1";
const HIJACK_AT = "2099-01-01T00:00:00Z";

const DEF = {
  electionId: ELECTION_ID,
  kind: "choice",
  question: "どちらの案か",
  choices: [
    { internalNo: 1, label: "案1" },
    { internalNo: 2, label: "案2" },
  ],
  voters: ["alice", "bob"],
};

let projectDir = "";
let logs: string[] = [];
const origLog = console.log;
const origErr = console.error;

function run(argv: string[]): number {
  logs = [];
  return main(argv, projectDir);
}

function lastJson(): Record<string, unknown> {
  return JSON.parse(logs[logs.length - 1] ?? "null");
}

function writeJson(name: string, value: unknown): string {
  const path = join(projectDir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function electionPath(...segments: string[]): string {
  return join(resolveElectionDir(electionsRoot(projectDir), ELECTION_ID).dir, ...segments);
}

function readJsonFile(...segments: string[]): Record<string, unknown> {
  return JSON.parse(readFileSync(electionPath(...segments), "utf8"));
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "election-receipt-"));
  mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  console.log = (line: string) => {
    logs.push(String(line));
  };
  console.error = () => {};
});

afterEach(() => {
  console.log = origLog;
  console.error = origErr;
  rmSync(projectDir, { recursive: true, force: true });
});

describe("t451 election receipt stamp", () => {
  test("#1946: a future-dated original cannot discard a later amend — the block holds the tally", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", ELECTION_ID, "--result", "distributed"])).toBe(0);

    // alice's original claims an instant 73 years in the future and picks choice 1.
    const original = writeJson("a1.json", {
      electionId: ELECTION_ID,
      voter: "alice",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: HIJACK_AT,
    });
    expect(run(["vote", "--election", ELECTION_ID, "--file", original])).toBe(0);

    // She then amends to a GoA 8 block. Its self-reported instant is far below
    // the original's, so the old submittedAt axis discarded it.
    const amend = writeJson("a2.json", {
      electionId: ELECTION_ID,
      voter: "alice",
      voterKind: "member",
      kind: "amend",
      ref: { electionId: ELECTION_ID, voter: "alice", submittedAt: HIJACK_AT },
      choiceInternalNo: 1,
      goa: 8,
      submittedAt: "2026-07-19T00:02:00Z",
    });
    expect(run(["vote", "--election", ELECTION_ID, "--file", amend])).toBe(0);

    const bob = writeJson("b.json", {
      electionId: ELECTION_ID,
      voter: "bob",
      voterKind: "member",
      choiceInternalNo: 1,
      goa: 1,
      submittedAt: "2026-07-19T00:03:00Z",
    });
    expect(run(["vote", "--election", ELECTION_ID, "--file", bob])).toBe(0);

    expect(run(["tally", "--election", ELECTION_ID])).toBe(0);
    const result = lastJson().result as { kind: string; reason?: string };
    expect(result.kind).toBe("hold");
    expect(result.reason).toBe("block");

    // Every accepted ballot carries the receipt stamp, and the amend's stamp is
    // at or after the original's even though its claimed instant is far below.
    const fixed = readJsonFile("tally.json").ballots as Array<{
      kind: string;
      submittedAt: string;
      receivedAt?: string;
    }>;
    expect(fixed.map((b) => b.receivedAt).every((at) => typeof at === "string")).toBe(true);
    const aliceOriginal = fixed.find((b) => b.kind === "original" && b.submittedAt === HIJACK_AT);
    const aliceAmend = fixed.find((b) => b.kind === "amend");
    expect((aliceAmend?.receivedAt ?? "") >= (aliceOriginal?.receivedAt ?? "")).toBe(true);

    // The record and its self-check agree with the held result.
    expect(run(["report", "--election", ELECTION_ID, "--result", "tallied"])).toBe(0);
    expect(lastJson().state).toBe("hold");
    expect(run(["render", "--election", ELECTION_ID])).toBe(0);
    expect(run(["verify", "--election", ELECTION_ID])).toBe(0);
  });

  test("#1946: the ballot and late timeline rows are stamped on the receipt axis", () => {
    expect(run(["open", "--file", writeJson("def.json", DEF)])).toBe(0);
    expect(run(["report", "--election", ELECTION_ID, "--result", "distributed"])).toBe(0);
    for (const [voter, at] of [
      ["alice", HIJACK_AT],
      ["bob", "2026-07-19T00:03:00Z"],
    ] as const) {
      const file = writeJson(`${voter}.json`, {
        electionId: ELECTION_ID,
        voter,
        voterKind: "member",
        choiceInternalNo: 1,
        goa: 1,
        submittedAt: at,
      });
      expect(run(["vote", "--election", ELECTION_ID, "--file", file])).toBe(0);
    }
    expect(run(["tally", "--election", ELECTION_ID])).toBe(0);
    expect(run(["report", "--election", ELECTION_ID, "--result", "tallied"])).toBe(0);

    // A ballot arriving after the tally lands in the late lane; its row is
    // stamped with the receipt instant, not with the claimed one.
    const lateFile = writeJson("late.json", {
      electionId: ELECTION_ID,
      voter: "alice",
      voterKind: "member",
      kind: "amend",
      ref: { electionId: ELECTION_ID, voter: "alice", submittedAt: HIJACK_AT },
      choiceInternalNo: 2,
      goa: 8,
      submittedAt: HIJACK_AT,
    });
    expect(run(["vote", "--election", ELECTION_ID, "--file", lateFile])).toBe(0);

    const timeline = JSON.parse(readFileSync(electionPath("timeline.json"), "utf8")) as Array<{
      kind: string;
      at: string;
      receivedAt?: string;
    }>;
    const stamped = timeline.filter((e) => e.kind === "ballot" || e.kind === "late");
    expect(stamped.length).toBe(3);
    for (const row of stamped) {
      expect(row.receivedAt).toBeDefined();
      expect(row.at).toBe(row.receivedAt as string);
      expect(row.at).not.toBe(HIJACK_AT);
    }
    // The late row is reexam-flagged (GoA 8) and the fixed set is untouched.
    const ledger = JSON.parse(readFileSync(electionPath("ledger.json"), "utf8")) as {
      ballots: unknown[];
      late: Array<{ reexamRequired: boolean }>;
    };
    expect(ledger.ballots.length).toBe(2);
    expect(ledger.late.map((l) => l.reexamRequired)).toEqual([true]);
  });
});
