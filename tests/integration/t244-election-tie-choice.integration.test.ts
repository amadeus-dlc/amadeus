import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { main } from "../../scripts/amadeus-election";
import { electionsRoot, resolveElectionDir } from "../../scripts/amadeus-election-store";

const DEFINITION = {
  electionId: "E-TIE1",
  kind: "clarification",
  question: "Which choice wins?",
  choices: [
    { internalNo: 0, label: "Alpha" },
    { internalNo: 2, label: "Beta" },
  ],
  voters: ["alice", "bob"],
};

let projectDir = "";
let logs: string[] = [];
let errors: string[] = [];
const originalLog = console.log;
const originalError = console.error;

function run(argv: string[]): number {
  logs = [];
  errors = [];
  return main(argv, projectDir);
}

function writeJson(name: string, value: unknown): string {
  const path = join(projectDir, name);
  writeFileSync(path, JSON.stringify(value));
  return path;
}

function electionPath(name: string): string {
  return join(resolveElectionDir(electionsRoot(projectDir), "E-TIE1").dir, name);
}

function openTieElection(): void {
  expect(run(["open", "--file", writeJson("definition.json", DEFINITION)])).toBe(0);
  expect(run(["report", "--election", "E-TIE1", "--result", "distributed"])).toBe(0);
  for (const [index, voter] of DEFINITION.voters.entries()) {
    const ballot = writeJson(`ballot-${voter}.json`, {
      electionId: "E-TIE1",
      voter,
      voterKind: "member",
      choiceInternalNo: DEFINITION.choices[index].internalNo,
      goa: 1,
      submittedAt: `2026-07-20T06:0${index}:00Z`,
    });
    expect(run(["vote", "--election", "E-TIE1", "--file", ballot])).toBe(0);
  }
  expect(run(["tally", "--election", "E-TIE1"])).toBe(0);
  expect(run(["report", "--election", "E-TIE1", "--result", "tallied"])).toBe(0);
  expect(JSON.parse(logs.at(-1) ?? "{}").state).toBe("hold");
}

beforeEach(() => {
  projectDir = mkdtempSync(join(tmpdir(), "election-tie-choice-"));
  mkdirSync(join(projectDir, "amadeus", "spaces", "default", "elections"), { recursive: true });
  console.log = (line: string) => logs.push(String(line));
  console.error = (line: string) => errors.push(String(line));
});

afterEach(() => {
  console.log = originalLog;
  console.error = originalError;
  rmSync(projectDir, { recursive: true, force: true });
});

describe("tie choice resolution integration", () => {
  test("persists an existing choice and renders its winner label", () => {
    openTieElection();

    expect(
      run(["report", "--election", "E-TIE1", "--result", "hold-resolved", "--resolution", "choice:2"]),
    ).toBe(0);
    const tally = JSON.parse(readFileSync(electionPath("tally.json"), "utf8"));
    expect(tally.resolutions.at(-1)).toMatchObject({ reason: "tie", resolution: "choice:2", resumedTo: "tallied" });

    expect(run(["render", "--election", "E-TIE1"])).toBe(0);
    const record = readFileSync(electionPath("record.md"), "utf8");
    expect(record).toContain("裁定: Beta(choice 2 — tie 裁定)");
    expect(record).toContain("hold 裁定履歴: tie → choice:2");
  });

  test("accepts internal choice zero and renders its winner label", () => {
    openTieElection();

    expect(
      run(["report", "--election", "E-TIE1", "--result", "hold-resolved", "--resolution", "choice:0"]),
    ).toBe(0);
    const tally = JSON.parse(readFileSync(electionPath("tally.json"), "utf8"));
    expect(tally.resolutions.at(-1)).toMatchObject({ reason: "tie", resolution: "choice:0", resumedTo: "tallied" });

    expect(run(["render", "--election", "E-TIE1"])).toBe(0);
    const record = readFileSync(electionPath("record.md"), "utf8");
    expect(record).toContain("裁定: Alpha(choice 0 — tie 裁定)");
    expect(record).toContain("hold 裁定履歴: tie → choice:0");
  });

  test("rejects binary, malformed, and absent choices before persistence", () => {
    openTieElection();

    for (const resolution of ["adopted", "rejected", "choice:x", "choice:01", "choice:3"]) {
      expect(
        run(["report", "--election", "E-TIE1", "--result", "hold-resolved", "--resolution", resolution]),
      ).toBe(1);
      const error = JSON.parse(errors.at(-1) ?? "{}").error as string;
      expect(error).toContain(`resolution "${resolution}" is not valid for hold reason "tie"`);
      expect(error).toContain("valid: choice:0/choice:2");
      const tally = JSON.parse(readFileSync(electionPath("tally.json"), "utf8"));
      expect(tally.resolutions ?? []).toEqual([]);
    }
  });
});
