// t234 — U1 election-model pure-function tests (Bolt 1 walking-skeleton).
// Layer: unit (no fs, no clock — fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import {
  Ballot,
  canEarlyTally,
  classifyLate,
  Election,
  Goa,
  shuffleView,
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
    voterKind: "member",
    choiceInternalNo: 1,
    goa,
    // GoA 2/3/6 require a reservation (norm (ii)) — supplied so fixtures stay
    // valid across all GoA values; reservation-missing has its own case.
    reservation: goa === 2 || goa === 3 || goa === 6 ? "留保あり" : undefined,
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
    const badKind = Ballot.parse({ ...ballot("alice", 1), voterKind: "bot" }, e.value);
    expect(badKind.ok).toBe(false);
    if (!badKind.ok) expect(badKind.error).toBe("parse-failure");
    const stringChoice = Ballot.parse(
      { ...ballot("alice", 1), choiceInternalNo: "1" },
      e.value,
    );
    expect(stringChoice.ok).toBe(false);
    if (!stringChoice.ok) expect(stringChoice.error).toBe("parse-failure");
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

  // --- Bolt 2 (model-complete) ---------------------------------------------

  test("Ballot.parse full 5-class: unknown-voter and reservation-missing are fail-closed", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const stranger = Ballot.parse({ ...ballot("mallory", 1) }, e.value);
    expect(stranger.ok).toBe(false);
    if (!stranger.ok) expect(stranger.error).toBe("unknown-voter");
    const noReservation = Ballot.parse({ ...ballot("alice", 2), reservation: undefined }, e.value);
    expect(noReservation.ok).toBe(false);
    if (!noReservation.ok) expect(noReservation.error).toBe("reservation-missing");
    const blankReservation = Ballot.parse({ ...ballot("alice", 6), reservation: "  " }, e.value);
    expect(blankReservation.ok).toBe(false);
    if (!blankReservation.ok) expect(blankReservation.error).toBe("reservation-missing");
    const withReservation = Ballot.parse(ballot("alice", 3), e.value);
    expect(withReservation.ok).toBe(true);
  });

  test("tally full table: tie, rejected-majority, and discussion-needed branches", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const tie = tally(e.value, [mustParse(ballot("alice", 1)), mustParse(ballot("bob", 7))]);
    expect(tie.kind).toBe("hold");
    if (tie.kind === "hold") expect(tie.reason).toBe("tie");
    const rejected = tally(e.value, [mustParse(ballot("alice", 7)), mustParse(ballot("bob", 4))]);
    expect(rejected.kind).toBe("established");
    if (rejected.kind === "established") expect(rejected.outcome).toBe("rejected");
    const oneDiscuss = tally(e.value, [mustParse(ballot("alice", 5)), mustParse(ballot("bob", 1))]);
    expect(oneDiscuss.kind).toBe("established"); // a single 5 does not hold
    const twoDiscuss = tally(e.value, [mustParse(ballot("alice", 5)), mustParse(ballot("bob", 5))]);
    expect(twoDiscuss.kind).toBe("hold");
    if (twoDiscuss.kind === "hold") expect(twoDiscuss.reason).toBe("discussion-needed");
  });

  test("shuffleView: deterministic per (election, voter), blind key set, identity tally mapping", () => {
    const wide = Election.parse({
      ...DEF,
      choices: [1, 2, 3, 4, 5, 6].map((n) => ({ internalNo: n, label: `c${n}` })),
    });
    if (!wide.ok) throw new Error("definition must parse");
    const v1 = shuffleView(wide.value, "alice");
    const v1again = shuffleView(wide.value, "alice");
    expect(v1).toEqual(v1again); // deterministic
    const v2 = shuffleView(wide.value, "bob");
    const order1 = v1.ordered.map((o) => o.internalNo);
    const order2 = v2.ordered.map((o) => o.internalNo);
    expect(order1.sort()).toEqual(order2.slice().sort()); // same members
    // BR-2 structural blind: exactly the declared keys, nothing else
    expect(Object.keys(v1).sort()).toEqual(["electionId", "ordered", "voter"]);
    for (const entry of v1.ordered) {
      expect(Object.keys(entry).sort()).toEqual(["displayNo", "internalNo", "label"]);
    }
    // identity mapping: displayNo -> internalNo is a bijection over choices —
    // membership fixed, not just cardinality (PR #1231 review minor 2)
    const mapped = [...new Set(v1.ordered.map((o) => o.internalNo))].sort();
    expect(mapped).toEqual([1, 2, 3, 4, 5, 6]);
  });

  test("shuffleView: two voters can see different orders under a fixed seed pair", () => {
    const wide = Election.parse({
      ...DEF,
      choices: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ internalNo: n, label: `c${n}` })),
    });
    if (!wide.ok) throw new Error("definition must parse");
    const orders = ["alice", "bob", "carol", "dave"].map((v) =>
      shuffleView(wide.value, v).ordered.map((o) => o.internalNo).join(","),
    );
    // at least one pair differs (BR-1: order MAY differ across voters — with 8
    // choices and 4 voters an all-identical outcome would mean a broken seed)
    expect(new Set(orders).size).toBeGreaterThan(1);
  });

  test("canEarlyTally: boundary where one missing ballot can or cannot flip the outcome", () => {
    const four = Election.parse({ ...DEF, voters: ["a", "b", "c", "d"] });
    if (!four.ok) throw new Error("definition must parse");
    const b = (voter: string, goa: number) =>
      mustParseIn(four.value, { ...ballot(voter, goa), voter });
    // favor 2, against 0, missing 2 -> 2 > 0+2 is false (flippable)
    expect(canEarlyTally(four.value, [b("a", 1), b("b", 1)])).toBe(false);
    // favor 3, against 0, missing 1 -> 3 > 0+1 (unflippable)
    expect(canEarlyTally(four.value, [b("a", 1), b("b", 1), b("c", 1)])).toBe(true);
    // a received GoA 8 always blocks early tally
    expect(canEarlyTally(four.value, [b("a", 1), b("b", 1), b("c", 8)])).toBe(false);
  });

  test("classifyLate: post-tally ballots are late, GoA 8 flags reexamRequired", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const tallyTime = "2026-07-19T01:00:00Z";
    const onTime = mustParse(ballot("alice", 1));
    expect(classifyLate(tallyTime, onTime)).toBeNull(); // submittedAt 00:00 <= tally
    // equal boundary (PR #1231 review minor 1): exactly-at-tally is NOT late
    const atBoundary = mustParse({ ...ballot("alice", 1), submittedAt: tallyTime });
    expect(classifyLate(tallyTime, atBoundary)).toBeNull();
    const late = mustParse({ ...ballot("alice", 1), submittedAt: "2026-07-19T02:00:00Z" });
    const classified = classifyLate(tallyTime, late);
    expect(classified?.late).toBe(true);
    expect(classified?.reexamRequired).toBe(false);
    const lateBlock = mustParse({ ...ballot("bob", 8), submittedAt: "2026-07-19T02:00:00Z" });
    expect(classifyLate(tallyTime, lateBlock)?.reexamRequired).toBe(true);
  });
});

function mustParseIn(election: ReturnType<typeof mustParseElection>, raw: unknown) {
  const b = Ballot.parse(raw, election);
  if (!b.ok) throw new Error(`ballot must parse: ${b.error}`);
  return b.value;
}

function mustParseElection() {
  const e = Election.parse(DEF);
  if (!e.ok) throw new Error("definition must parse");
  return e.value;
}
