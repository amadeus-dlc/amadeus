// t238 — U3 election-record pure-function tests (Bolt 3 io-record-transport).
// Layer: unit (no fs, no clock — fs-tests-integration-first). The real
// parseGoaLine is imported in-process for byte-compat round-trip (BR-R1); the
// import touches no fs, so it stays in the unit layer (tech-stack-decisions.md).
import { describe, expect, test } from "bun:test";
import { parseGoaLine } from "../../packages/framework/core/tools/amadeus-norm-metrics";
import {
  type Ballot,
  Election,
  Goa,
  type TallyResult,
} from "../../scripts/amadeus-election-model";
import {
  GoaFreq,
  GoaLineCode,
  type TimelineEvent,
  renderGoaLine,
  renderPersistDraft,
  renderTimeline,
  verifyReservations,
  verifySelf,
} from "../../scripts/amadeus-election-record";

const DEF = {
  electionId: "E-TEST-1",
  kind: "zero-confirm",
  question: "学習候補 0 件でよいか",
  choices: [{ internalNo: 1, label: "0件で可" }],
  voters: ["alice", "bob", "carol"],
};

function election(): Election {
  const e = Election.parse(DEF);
  if (!e.ok) throw new Error("definition must parse");
  return e.value;
}

function ballot(voter: string, goa: number, reservation: string | null = null): Ballot {
  const g = Goa.parse(goa);
  if (!g.ok) throw new Error(`goa must parse: ${goa}`);
  return {
    kind: "original",
    electionId: "E-TEST-1",
    voter,
    voterKind: "member",
    choiceInternalNo: 1,
    goa: g.value,
    reservation,
    rationale: null,
    submittedAt: "2026-07-19T00:00:00Z",
  };
}

function code(raw: string): GoaLineCode {
  const c = GoaLineCode.parse(raw);
  if (!c.ok) throw new Error(`code must parse: ${raw}`);
  return c.value;
}

const ESTABLISHED: TallyResult = {
  kind: "established",
  winner: { internalNo: 1, label: "0件で可" },
  choiceCounts: [{ internalNo: 1, label: "0件で可", count: 2 }],
  goa: { favor: 2, against: 0, abstain: 0, discuss: 0 },
};

describe("t238 election-record", () => {
  // BR-R1: real parseGoaLine round-trip — 3 distributions + internal-0 bin.
  test("BR-R1: renderGoaLine round-trips through the real parseGoaLine (3 distributions)", () => {
    const cases: GoaFreq[] = [
      [3, 1, 0, 0, 0, 0, 0, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 0, 0, 0, 0, 0, 0, 5],
    ];
    for (const freq of cases) {
      const line = renderGoaLine(code("E-TEST1"), freq);
      const parsed = parseGoaLine(line);
      expect(parsed.ok).toBe(true);
      if (parsed.ok) {
        expect(parsed.ecode).toBe("E-TEST1");
        expect(parsed.votes).toEqual([...freq]);
      }
    }
  });

  // BR-R1: internal 0-bin must still be emitted (all 8 bins, never elided).
  test("BR-R1: internal 0-bins are emitted so parseGoaLine sees 8 tokens", () => {
    const line = renderGoaLine(code("E-INNER0"), [2, 0, 1, 0, 0, 3, 0, 0]);
    expect(line).toBe("GoA[E-INNER0]: 1x2 2x0 3x1 4x0 5x0 6x3 7x0 8x0");
    const parsed = parseGoaLine(line);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.votes).toEqual([2, 0, 1, 0, 0, 3, 0, 0]);
  });

  // BR-R1: fail-closed on multi-segment hyphen codes (parseGoaLine's own domain).
  test("BR-R1: GoaLineCode is fail-closed on multi-segment hyphen codes", () => {
    expect(GoaLineCode.parse("E-SDE-CG4").ok).toBe(false);
    expect(GoaLineCode.parse("E-TPR-RE").ok).toBe(false);
    expect(GoaLineCode.parse("PM9").ok).toBe(false);
    expect(GoaLineCode.parse("e-lower").ok).toBe(false);
    expect(GoaLineCode.parse(42).ok).toBe(false);
    // The compressed alnum form parseGoaLine accepts is admitted.
    expect(GoaLineCode.parse("E-SDECG4").ok).toBe(true);
    // Issue #1226: the real parseGoaLine now accepts the hyphenated
    // multi-segment form and returns the ecode verbatim (GoaLineCode itself
    // stays single-segment — that is a separate domain type).
    const hyphen = parseGoaLine("GoA[E-SDE-CG4]: 1x1 2x0 3x0 4x0 5x0 6x0 7x0 8x0");
    expect(hyphen.ok).toBe(true);
    if (hyphen.ok) expect(hyphen.ecode).toBe("E-SDE-CG4");
  });

  test("GoaFreq.fromVotes counts each bin from the accepted vote set", () => {
    const votes = [ballot("a", 1), ballot("b", 1), ballot("c", 6)].map((b) => b.goa);
    expect(GoaFreq.fromVotes(votes)).toEqual([2, 0, 0, 0, 0, 1, 0, 0]);
    expect(GoaFreq.fromVotes([])).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  // BR-R2: late ballots do not enter the main frequency count.
  test("BR-R2: the main GoA frequency is invariant to late ballots", () => {
    const accepted = [ballot("alice", 1), ballot("bob", 2, "軽微な留保")];
    const withLate = [...accepted, ballot("late", 8)];
    const main = renderGoaLine(code("E-TALLY1"), GoaFreq.fromVotes(accepted.map((b) => b.goa)));
    const mainRecomputed = renderGoaLine(code("E-TALLY1"), GoaFreq.fromVotes(accepted.map((b) => b.goa)));
    expect(main).toBe(mainRecomputed);
    // The late ballot only changes the count when folded into the accepted set.
    const folded = renderGoaLine(code("E-TALLY1"), GoaFreq.fromVotes(withLate.map((b) => b.goa)));
    expect(folded).not.toBe(main);
  });

  // BR-R3: reservation transcription count check — missing -> fail, exact -> pass.
  test("BR-R3: verifyReservations detects a transcription shortfall", () => {
    const ballots = [
      ballot("alice", 2, "留保A"),
      ballot("bob", 3, "留保B"),
      ballot("carol", 1),
    ];
    const good = "裁定: 採用\n- 留保(alice, GoA2): 留保A\n- 留保(bob, GoA3): 留保B\n";
    expect(verifyReservations(ballots, good).ok).toBe(true);

    const missing = "裁定: 採用\n- 留保(alice, GoA2): 留保A\n";
    const bad = verifyReservations(ballots, missing);
    expect(bad.ok).toBe(false);
    if (!bad.ok) {
      expect(bad.error.kind).toBe("reservation-count");
      expect(bad.error.expected).toBe(2);
      expect(bad.error.actual).toBe(1);
    }
  });

  // BR-R4: verifySelf enumerates all three defect classes.
  test("BR-R4: verifySelf reports ballot-count / freq / timeline findings", () => {
    const ballots = [ballot("alice", 1), ballot("bob", 6)];
    const goodFreq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
    const goodTimeline: TimelineEvent[] = [
      { kind: "distributed", at: "2026-07-19T00:00:00Z", detail: "" },
      { kind: "ballot", at: "2026-07-19T00:01:00Z", detail: "", voter: "alice" },
      { kind: "tallied", at: "2026-07-19T00:02:00Z", detail: "" },
    ];
    // Happy path: consistent record verifies clean.
    expect(verifySelf(2, ballots, goodFreq, goodTimeline).ok).toBe(true);

    // Ballot-count injection: ledger says 3, materialized has 2.
    const badCount = verifySelf(3, ballots, goodFreq, goodTimeline);
    expect(badCount.ok).toBe(false);
    if (!badCount.ok) expect(badCount.error.some((f) => f.kind === "ballot-count")).toBe(true);

    // Frequency injection: stored freq disagrees with recomputed.
    const badFreq = verifySelf(2, ballots, [9, 0, 0, 0, 0, 0, 0, 0], goodTimeline);
    expect(badFreq.ok).toBe(false);
    if (!badFreq.ok) expect(badFreq.error.some((f) => f.kind === "freq-mismatch")).toBe(true);

    // Timeline regression: tally precedes the ballot.
    const badTimeline: TimelineEvent[] = [
      { kind: "distributed", at: "2026-07-19T00:00:00Z", detail: "" },
      { kind: "tallied", at: "2026-07-19T00:02:00Z", detail: "" },
      { kind: "ballot", at: "2026-07-19T00:01:00Z", detail: "", voter: "alice" },
    ];
    const badOrder = verifySelf(2, ballots, goodFreq, badTimeline);
    expect(badOrder.ok).toBe(false);
    if (!badOrder.ok) expect(badOrder.error.some((f) => f.kind === "timeline-order")).toBe(true);

    // All findings enumerated at once (does not stop at the first).
    const allBad = verifySelf(3, ballots, [9, 0, 0, 0, 0, 0, 0, 0], badTimeline);
    expect(allBad.ok).toBe(false);
    if (!allBad.ok) expect(allBad.error.length).toBe(3);
  });

  // BR-R5: render output is deterministic (same input -> deep-equal output).
  test("BR-R5: renderPersistDraft is deterministic across runs", () => {
    const e = election();
    const ballots = [ballot("alice", 2, "軽微な留保"), ballot("bob", 1)];
    const timeline: TimelineEvent[] = [
      { kind: "distributed", at: "2026-07-19T00:00:00Z", detail: "" },
      { kind: "ballot", at: "2026-07-19T00:01:00Z", detail: "", voter: "alice" },
      { kind: "tallied", at: "2026-07-19T00:02:00Z", detail: "" },
    ];
    const first = renderPersistDraft(code("E-DET1"), e, ESTABLISHED, ballots, timeline);
    const second = renderPersistDraft(code("E-DET1"), e, ESTABLISHED, ballots, timeline);
    expect(first).toEqual(second);
    // hold ruling path renders its typed reason (covers the hold branch)
    const HOLD = {
      kind: "hold" as const,
      reason: "tie" as const,
      counts: { favor: 1, against: 1, abstain: 0, discuss: 0 },
    };
    const held = renderPersistDraft(code("E-DET1"), e, HOLD, ballots, timeline);
    expect(held).toContain("保留(tie)");
  });

  // BR-R6: persist draft transcribes every reservation (GoA 2/3/6), and the
  // draft it produces passes verifyReservations (render<->verify symmetry).
  test("BR-R6: renderPersistDraft transcribes all reservations (3-of-3)", () => {
    const e = election();
    const ballots = [
      ballot("alice", 2, "留保A"),
      ballot("bob", 3, "留保B"),
      ballot("carol", 6, "留保C"),
      ballot("dave", 1),
    ];
    const timeline: TimelineEvent[] = [
      { kind: "distributed", at: "2026-07-19T00:00:00Z", detail: "" },
      { kind: "tallied", at: "2026-07-19T00:02:00Z", detail: "" },
    ];
    const draft = renderPersistDraft(code("E-RESV1"), e, ESTABLISHED, ballots, timeline);
    const reservationLines = draft.split("\n").filter((l) => l.startsWith("- 留保("));
    expect(reservationLines.length).toBe(3);
    // The generated draft is self-consistent under the reservation check.
    expect(verifyReservations(ballots, draft).ok).toBe(true);
    // The GoA line inside the draft round-trips through the real parseGoaLine.
    const goaLine = draft.split("\n").find((l) => l.startsWith("GoA["));
    expect(goaLine).toBeDefined();
    if (goaLine) expect(parseGoaLine(goaLine).ok).toBe(true);
  });

  test("renderTimeline formats the four event kinds in order", () => {
    const line = renderTimeline([
      { kind: "distributed", at: "t0", detail: "" },
      { kind: "ballot", at: "t1", detail: "", voter: "alice" },
      { kind: "tallied", at: "t2", detail: "" },
      { kind: "late", at: "t3", detail: "", voter: "zoe" },
    ]);
    expect(line).toBe("配信 t0 → alice t1 → 開票 t2 → 後着 zoe t3");
  });

  // --- Issue #1262: receipt-axis timeline monotonicity (E-BFARA1) -----------

  // Verbatim relay-delay fixture (E-BFARA1): three ballots accepted in receipt
  // order e1 → e4 → e3, where e3 was relayed over agmsg and landed last despite
  // an earlier submittedAt. By the claimed `at` the sequence is non-monotonic
  // (e3's 22:10:29 precedes e4's 22:10:42), which is exactly the legitimate
  // election a submittedAt-axis verify used to reject.
  function relayTimeline(withReceipt: boolean): TimelineEvent[] {
    const rows: Array<{ voter: string; at: string; receivedAt: string }> = [
      { voter: "e1", at: "2026-07-19T22:10:03Z", receivedAt: "2026-07-19T22:10:05Z" },
      { voter: "e4", at: "2026-07-19T22:10:42Z", receivedAt: "2026-07-19T22:10:44Z" },
      { voter: "e3", at: "2026-07-19T22:10:29Z", receivedAt: "2026-07-19T22:10:50Z" },
    ];
    return rows.map((r) => ({
      kind: "ballot",
      at: r.at,
      detail: `ballot accepted: ${r.voter}`,
      voter: r.voter,
      ...(withReceipt ? { receivedAt: r.receivedAt } : {}),
    }));
  }

  test("E-BFARA1: a relay-delayed ballot set verifies green on the receipt axis", () => {
    // ballots + freq are internally consistent so the only class that can fire
    // is timeline-order — isolating the axis under test.
    const ballots = [ballot("e1", 1), ballot("e4", 1), ballot("e3", 2)];
    const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
    const timeline = relayTimeline(true);
    // Pre-fix (submittedAt axis) this yields a timeline-order finding; post-fix
    // (receipt axis, monotonic receivedAt) it is green.
    const result = verifySelf(ballots.length, ballots, freq, timeline);
    expect(result.ok).toBe(true);
  });

  // transient-state-fixtures: a record opened BEFORE the fix has no receivedAt on
  // its timeline (in-flight at migration). verifySelf must fall back to the
  // legacy `at` axis for it — the other side of the single read fork.
  test("E-BFARA1 migration window: a pre-fix (receivedAt-less) timeline uses the legacy at axis", () => {
    const ballots = [ballot("e1", 1), ballot("e4", 1), ballot("e3", 2)];
    const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
    const legacy = relayTimeline(false);
    const result = verifySelf(ballots.length, ballots, freq, legacy);
    // Non-monotonic on `at` -> a timeline-order finding is expected (no crash,
    // no silent pass — the fallback preserves the old behavior for old records).
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.some((f) => f.kind === "timeline-order")).toBe(true);
    }
  });

  test("timelineSegment co-displays the receipt time on a ballot row only when it diverges", () => {
    // delayed receipt -> annotated
    const delayed = renderTimeline([
      { kind: "ballot", at: "22:10:29", detail: "", voter: "e3", receivedAt: "22:10:50" },
    ]);
    expect(delayed).toBe("e3 22:10:29(受理 22:10:50)");
    // same instant -> no annotation (no added signal)
    const same = renderTimeline([
      { kind: "ballot", at: "22:10:03", detail: "", voter: "e1", receivedAt: "22:10:03" },
    ]);
    expect(same).toBe("e1 22:10:03");
    // absent receivedAt (pre-fix row) -> no annotation
    const legacy = renderTimeline([{ kind: "ballot", at: "t1", detail: "", voter: "alice" }]);
    expect(legacy).toBe("alice t1");
  });
});
