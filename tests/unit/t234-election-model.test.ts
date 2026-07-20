// t234 — U1 election-model pure-function tests (Bolt 1 walking-skeleton).
// Layer: unit (no fs, no clock — fs-tests-integration-first).
import { describe, expect, test } from "bun:test";
import {
  Ballot,
  canEarlyTally,
  classifyLate,
  Election,
  Goa,
  resolveBallots,
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

function ballot(voter: string, goa: number, choiceInternalNo = 1) {
  return {
    electionId: "E-TEST-1",
    voter,
    voterKind: "member",
    choiceInternalNo,
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

  test("tally: single-choice favor input establishes the sole choice as winner", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const result = tally(e.value, [mustParse(ballot("alice", 1)), mustParse(ballot("bob", 2))]);
    expect(result.kind).toBe("established");
    if (result.kind === "established") {
      expect(result.winner.internalNo).toBe(1);
      expect(result.choiceCounts).toEqual([{ internalNo: 1, label: "0件で可", count: 2 }]);
      expect(result.goa.favor).toBe(2);
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

  test("tally GoA holds: discussion-needed at 2+ GoA-5, a lone GoA-5 still establishes", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    // GoA-axis favor===against no longer holds — with a single choice the sole
    // choice wins once the GoA-consensus holds pass (choice winner, Issue #1261).
    const single = tally(e.value, [mustParse(ballot("alice", 1)), mustParse(ballot("bob", 7))]);
    expect(single.kind).toBe("established");
    if (single.kind === "established") expect(single.winner.internalNo).toBe(1);
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

  // --- U1 ballot-acceptance-failclosed (invalid-timestamp / amend / resolve) --

  test("Ballot.parse invalid-timestamp: mint-form regex + real-date, valid mint form passes", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    // valid mint form (positive control): second-precision UTC with trailing Z
    const good = Ballot.parse({ ...ballot("alice", 1), submittedAt: "2026-07-19T00:00:00Z" }, e.value);
    expect(good.ok).toBe(true);
    // the malformed forms every reject with invalid-timestamp (BR-2/BR-6):
    const malformed = [
      "__NOW__", // sentinel, not a timestamp — regex miss
      "2026-07-19", // date only — regex miss (Date alone would accept this)
      "2026-07-19T00:00:00.000Z", // millisecond form — not mint form
      "2026-07-19T00:00:00+09:00", // TZ offset form — not mint form
      "2026-13-45T99:99:99Z", // regex passes but not a real instant — Date NaN
    ];
    for (const submittedAt of malformed) {
      const r = Ballot.parse({ ...ballot("alice", 1), submittedAt }, e.value);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("invalid-timestamp");
    }
  });

  test("Ballot.parse order is deterministic: identity errors precede invalid-timestamp precedes goa", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    // unknown-voter (identity) wins over a bad timestamp (content)
    const strangerBadTs = Ballot.parse(
      { ...ballot("mallory", 1), submittedAt: "nope" },
      e.value,
    );
    expect(strangerBadTs.ok).toBe(false);
    if (!strangerBadTs.ok) expect(strangerBadTs.error).toBe("unknown-voter");
    // invalid-timestamp (earlier content check) wins over goa-out-of-range
    const badTsBadGoa = Ballot.parse(
      { ...ballot("alice", 9), submittedAt: "nope" },
      e.value,
    );
    expect(badTsBadGoa.ok).toBe(false);
    if (!badTsBadGoa.ok) expect(badTsBadGoa.error).toBe("invalid-timestamp");
  });

  test("Ballot.parse kind/ref: missing kind is original, amend requires a well-formed ref", () => {
    const e = Election.parse(DEF);
    if (!e.ok) throw new Error("definition must parse");
    const validRef = { electionId: "E-TEST-1", voter: "alice", submittedAt: "2026-07-19T00:00:00Z" };
    // missing kind -> original (backward compat FR-3a)
    const noKind = Ballot.parse(ballot("alice", 1), e.value);
    expect(noKind.ok).toBe(true);
    if (noKind.ok) expect(noKind.value.kind).toBe("original");
    // explicit original
    const orig = Ballot.parse({ ...ballot("alice", 1), kind: "original" }, e.value);
    expect(orig.ok).toBe(true);
    if (orig.ok) expect(orig.value.kind).toBe("original");
    // amend with valid ref -> amend, ref preserved verbatim
    const amend = Ballot.parse({ ...ballot("alice", 1), kind: "amend", ref: validRef }, e.value);
    expect(amend.ok).toBe(true);
    if (amend.ok && amend.value.kind === "amend") expect(amend.value.ref).toEqual(validRef);
    // amend missing ref -> parse-failure (structural)
    const noRef = Ballot.parse({ ...ballot("alice", 1), kind: "amend" }, e.value);
    expect(noRef.ok).toBe(false);
    if (!noRef.ok) expect(noRef.error).toBe("parse-failure");
    // amend ref of wrong type -> parse-failure
    const badRef = Ballot.parse({ ...ballot("alice", 1), kind: "amend", ref: "x" }, e.value);
    expect(badRef.ok).toBe(false);
    if (!badRef.ok) expect(badRef.error).toBe("parse-failure");
    // amend ref.submittedAt invalid -> parse-failure (same two-stage check)
    const badRefTs = Ballot.parse(
      { ...ballot("alice", 1), kind: "amend", ref: { ...validRef, submittedAt: "2026-07-19" } },
      e.value,
    );
    expect(badRefTs.ok).toBe(false);
    if (!badRefTs.ok) expect(badRefTs.error).toBe("parse-failure");
    // any other kind value -> parse-failure (fail-closed)
    const bogusKind = Ballot.parse({ ...ballot("alice", 1), kind: "revoke" }, e.value);
    expect(bogusKind.ok).toBe(false);
    if (!bogusKind.ok) expect(bogusKind.error).toBe("parse-failure");
  });

  test("resolveBallots: latest per voter, same-timestamp tie favors later arrival, idempotent", () => {
    const early = mustParse({ ...ballot("alice", 1), submittedAt: "2026-07-19T00:00:00Z" });
    const late = mustParse({ ...ballot("alice", 7), submittedAt: "2026-07-19T02:00:00Z" });
    // (1) latest submittedAt wins for a voter
    const r1 = resolveBallots([early, late]);
    expect(r1.length).toBe(1);
    expect(r1[0]?.goa as number).toBe(7);
    // (2) same-timestamp tie: an amend appended after its target (later index)
    // wins via >= (the store guarantees this ordering)
    const original = mustParse({ ...ballot("alice", 1), submittedAt: "2026-07-19T00:00:00Z" });
    const amend = mustParse({
      ...ballot("alice", 7),
      kind: "amend",
      ref: { electionId: "E-TEST-1", voter: "alice", submittedAt: "2026-07-19T00:00:00Z" },
      submittedAt: "2026-07-19T00:00:00Z",
    });
    const r2 = resolveBallots([original, amend]);
    expect(r2.length).toBe(1);
    expect(r2[0]?.kind).toBe("amend");
    // (3) multiple voters -> one ballot each
    const bob = mustParse({ ...ballot("bob", 2), submittedAt: "2026-07-19T00:10:00Z" });
    const r3 = resolveBallots([early, late, bob]);
    expect(r3.length).toBe(2);
    expect([...new Set(r3.map((b) => b.voter))].sort()).toEqual(["alice", "bob"]);
    // (4) idempotent: resolving a resolved list yields the same set
    expect(resolveBallots(r3)).toEqual(r3);
  });

  test("classifyLate is per-ballot (non-resolving): a late amend stays its own late row", () => {
    const tallyTime = "2026-07-19T01:00:00Z";
    // classifyLate takes a single ballot, never a set — it structurally cannot
    // resolve. A late amend is classified on its own submittedAt (BR-4b: late
    // lane amends are NOT resolved into the fixed set).
    const lateAmend = mustParse({
      ...ballot("alice", 1),
      kind: "amend",
      ref: { electionId: "E-TEST-1", voter: "alice", submittedAt: "2026-07-19T00:00:00Z" },
      submittedAt: "2026-07-19T02:00:00Z",
    });
    const classified = classifyLate(tallyTime, lateAmend);
    expect(classified?.late).toBe(true);
    expect(classified?.ballot.kind).toBe("amend");
    expect(classified?.reexamRequired).toBe(false);
  });

  // --- Issue #1261: choiceInternalNo decides the winner ---------------------

  const twoChoice = (voters: string[]) =>
    Election.parse({
      ...DEF,
      choices: [
        { internalNo: 1, label: "c1" },
        { internalNo: 2, label: "c2" },
      ],
      voters,
    });

  test("tally: winner is the choice with the most votes (E-GMEBT #1261 repro)", () => {
    // The E-GMEBT ballots from Issue #1261: e2/e4 vote choice 2, e3 votes
    // choice 1, all GoA 2. The GoA distribution is uniform, so a choice-blind
    // tally cannot decide — the winner must come from choiceInternalNo.
    const el = twoChoice(["e2", "e4", "e3"]);
    if (!el.ok) throw new Error("definition must parse");
    const ballots = [
      mustParseIn(el.value, ballot("e2", 2, 2)),
      mustParseIn(el.value, ballot("e4", 2, 2)),
      mustParseIn(el.value, ballot("e3", 2, 1)),
    ];
    const result = tally(el.value, ballots);
    expect(result.kind).toBe("established");
    if (result.kind === "established") {
      expect(result.winner.internalNo).toBe(2);
      expect(result.choiceCounts).toEqual([
        { internalNo: 1, label: "c1", count: 1 },
        { internalNo: 2, label: "c2", count: 2 },
      ]);
    }
  });

  test("tally: GoA-4 abstentions are excluded from winner selection and choiceCounts", () => {
    const el = twoChoice(["a", "b", "c"]);
    if (!el.ok) throw new Error("definition must parse");
    // c abstains (GoA 4) for choice 2 — that vote must not count for choice 2.
    const ballots = [
      mustParseIn(el.value, ballot("a", 1, 1)),
      mustParseIn(el.value, ballot("b", 1, 1)),
      mustParseIn(el.value, ballot("c", 4, 2)),
    ];
    const result = tally(el.value, ballots);
    expect(result.kind).toBe("established");
    if (result.kind === "established") {
      expect(result.winner.internalNo).toBe(1);
      expect(result.choiceCounts.find((c) => c.internalNo === 2)?.count).toBe(0);
      expect(result.goa.abstain).toBe(1); // whole-set GoA count still records it
    }
  });

  test("tally: a choice tie holds with reason tie", () => {
    const el = twoChoice(["a", "b"]);
    if (!el.ok) throw new Error("definition must parse");
    const result = tally(el.value, [
      mustParseIn(el.value, ballot("a", 1, 1)),
      mustParseIn(el.value, ballot("b", 1, 2)),
    ]);
    expect(result.kind).toBe("hold");
    if (result.kind === "hold") expect(result.reason).toBe("tie");
  });

  test("Ballot.parse rejects a choiceInternalNo not in the election (fail-closed)", () => {
    const e = Election.parse(DEF); // single choice {internalNo: 1}
    if (!e.ok) throw new Error("definition must parse");
    for (const bad of [2, 0, -1]) {
      const r = Ballot.parse(ballot("alice", 1, bad), e.value);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toBe("unknown-choice");
    }
    // a valid choice still parses
    expect(Ballot.parse(ballot("alice", 1, 1), e.value).ok).toBe(true);
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
