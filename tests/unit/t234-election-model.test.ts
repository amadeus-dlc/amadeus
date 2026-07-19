// t234 — U1 election-model pure-function tests (Bolt 1 walking-skeleton).
// Layer: unit (no fs, no clock — fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import {
  Ballot,
  Election,
  Goa,
  tally,
} from "../../scripts/amadeus-election-model";

const DEF = {
  electionId: "E-TEST-1",
  kind: "zero-confirm",
  question: "学習候補 0 件でよいか",
  choices: [{ internalNo: 1, label: "0件で可" }],
  voters: ["alice", "bob"],
};

function ballot(voter: string, goa: number) {
  return {
    electionId: "E-TEST-1",
    voter,
    choiceInternalNo: 1,
    goa,
    submittedAt: "2026-07-19T00:00:00Z",
  };
}

function mustParse(raw: unknown) {
  const e = Election.parse(DEF);
  if (!e.ok) throw new Error("definition must parse");
  const b = Ballot.parse(raw, e.value);
  if (!b.ok) throw new Error(`ballot must parse: ${b.error}`);
  return b.value;
}

describe("t234 election-model", () => {
  test("Election.parse accepts a zero-confirm definition and rejects malformed input", () => {
    const okCase = Election.parse(DEF);
    expect(okCase.ok).toBe(true);
    const missingVoters = Election.parse({ ...DEF, voters: [] });
    expect(missingVoters.ok).toBe(false);
    const notObject = Election.parse("nope");
    expect(notObject.ok).toBe(false);
  });

  test("Goa.parse is fail-closed on non-integers and out-of-range values", () => {
    expect(Goa.parse(1).ok).toBe(true);
    expect(Goa.parse(8).ok).toBe(true);
    expect(Goa.parse(0).ok).toBe(false);
    expect(Goa.parse(9).ok).toBe(false);
    expect(Goa.parse("five").ok).toBe(false);
    expect(Goa.parse(2.5).ok).toBe(false);
  });

  test("Ballot.parse returns typed errors for structural and GoA failures", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const good = Ballot.parse(ballot("alice", 1), e.value);
    expect(good.ok).toBe(true);
    const badGoa = Ballot.parse(ballot("alice", 9), e.value);
    expect(badGoa.ok).toBe(false);
    if (!badGoa.ok) expect(badGoa.error).toBe("goa-out-of-range");
    const wrongElection = Ballot.parse({ ...ballot("alice", 1), electionId: "E-OTHER" }, e.value);
    expect(wrongElection.ok).toBe(false);
    if (!wrongElection.ok) expect(wrongElection.error).toBe("unknown-election");
    const broken = Ballot.parse({ voter: "alice" }, e.value);
    expect(broken.ok).toBe(false);
    if (!broken.ok) expect(broken.error).toBe("parse-failure");
  });

  test("tally: zero-confirm favor-majority path establishes adopted", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const result = tally(e.value, [mustParse(ballot("alice", 1)), mustParse(ballot("bob", 2))]);
    expect(result.kind).toBe("established");
    if (result.kind === "established") {
      expect(result.outcome).toBe("adopted");
      expect(result.counts.favor).toBe(2);
    }
  });

  test("tally: a single GoA 8 holds with reason block ahead of the majority check", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const result = tally(e.value, [mustParse(ballot("alice", 1)), mustParse(ballot("bob", 8))]);
    expect(result.kind).toBe("hold");
    if (result.kind === "hold") expect(result.reason).toBe("block");
  });

  test("tally: all-abstain input holds with reason quorum-short (no valid votes)", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const result = tally(e.value, [mustParse(ballot("alice", 4)), mustParse(ballot("bob", 4))]);
    expect(result.kind).toBe("hold");
    if (result.kind === "hold") expect(result.reason).toBe("quorum-short");
  });

  test("tally is deterministic: same input twice yields deep-equal results", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const input = [mustParse(ballot("alice", 3)), mustParse(ballot("bob", 7))];
    expect(tally(e.value, input)).toEqual(tally(e.value, input));
  });
});
