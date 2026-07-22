// covers: domain:formal-verif-arm-s-oracle
// size: small
//
// Arm S oracle: opaque timestamp brands (compile-negative cross-wire), the two
// independent clock axes, and the independent tally oracle (block/discussion/
// quorum/tie/winner). Pure — no fs/spawn (unit tier).

import { describe, expect, test } from "bun:test";
import {
  type ArmBallot,
  type SequenceAction,
  type SubmittedAt,
  classifyLate,
  expectedCoreValidation,
  expectedTally,
  mintReceivedAt,
  parseSubmittedAt,
  resolvePerVoter,
  tallyEqual,
  validateSequence,
} from "../../scripts/formal-verif/arm-s-oracle.ts";

function sub(instant: string): SubmittedAt {
  const r = parseSubmittedAt(instant);
  if (!r.ok) throw new Error(`bad submitted ${instant}`);
  return r.value;
}

function ballot(voter: string, choice: number, goa: number, instant: string): ArmBallot {
  return { voter, choiceInternalNo: choice, goa, kind: "original", ref: null, submittedAt: sub(instant) };
}

describe("arm-s timestamp brands (BR-08/BR-11)", () => {
  test("parseSubmittedAt accepts mint form, rejects shape and calendar", () => {
    expect(parseSubmittedAt("2026-07-20T00:00:00Z").ok).toBe(true);
    expect(parseSubmittedAt("__INVALID_FORMAT__").ok).toBe(false);
    expect(parseSubmittedAt("2026-02-30T00:00:00Z").ok).toBe(false);
  });

  test("brand cross-wire is a compile error", () => {
    const s = sub("2026-07-20T00:00:00Z");
    const r = mintReceivedAt("T0");
    expect(classifyLate(r, r)).toBe(false);
    // @ts-expect-error — SubmittedAt cannot flow into a ReceivedAt slot (lateness axis)
    classifyLate(s, r);
    // @ts-expect-error — ReceivedAt cannot flow into a ballot's SubmittedAt slot (resolution axis)
    const bad: ArmBallot = { voter: "V1", choiceInternalNo: 1, goa: 1, kind: "original", ref: null, submittedAt: r };
    expect(bad.voter).toBe("V1");
  });
});

describe("arm-s two-clock separation (BR-09/BR-10)", () => {
  test("resolution reads submittedAt only: greatest wins, tie → later arrival", () => {
    const early = ballot("V1", 1, 1, "2026-07-20T00:00:00Z");
    const late = ballot("V1", 2, 1, "2026-07-20T00:00:02Z");
    expect(resolvePerVoter([early, late])).toEqual([late]);
    const tieA = ballot("V2", 1, 1, "2026-07-20T00:00:01Z");
    const tieB = ballot("V2", 2, 1, "2026-07-20T00:00:01Z");
    expect(resolvePerVoter([tieA, tieB])).toEqual([tieB]);
  });

  test("lateness reads receivedAt only", () => {
    const tallyAt = mintReceivedAt("T1");
    expect(classifyLate(tallyAt, mintReceivedAt("T2"))).toBe(true);
    expect(classifyLate(tallyAt, mintReceivedAt("T0"))).toBe(false);
    expect(classifyLate(tallyAt, mintReceivedAt("T1"))).toBe(false);
  });
});

describe("arm-s independent tally oracle (BR-13)", () => {
  const choices = [1, 2, 3];
  test("block hold when any GoA 8", () => {
    expect(expectedTally(choices, [ballot("V1", 1, 8, "2026-07-20T00:00:00Z"), ballot("V2", 1, 1, "2026-07-20T00:00:00Z")])).toEqual({ kind: "hold", reason: "block" });
  });
  test("discussion-needed when two GoA 5", () => {
    expect(expectedTally(choices, [ballot("V1", 1, 5, "2026-07-20T00:00:00Z"), ballot("V2", 2, 5, "2026-07-20T00:00:00Z")])).toEqual({ kind: "hold", reason: "discussion-needed" });
  });
  test("quorum-short when no favor/against", () => {
    expect(expectedTally(choices, [ballot("V1", 1, 4, "2026-07-20T00:00:00Z")])).toEqual({ kind: "hold", reason: "quorum-short" });
  });
  test("choice tie holds", () => {
    expect(expectedTally(choices, [ballot("V1", 1, 1, "2026-07-20T00:00:00Z"), ballot("V2", 2, 1, "2026-07-20T00:00:00Z")])).toEqual({ kind: "hold", reason: "tie" });
  });
  test("unique argmax establishes a winner", () => {
    const result = expectedTally(choices, [ballot("V1", 2, 1, "2026-07-20T00:00:00Z"), ballot("V2", 2, 1, "2026-07-20T00:00:00Z"), ballot("V3", 1, 1, "2026-07-20T00:00:00Z")]);
    expect(result).toEqual({ kind: "established", winner: 2 });
  });
  test("tallyEqual discriminates kind, reason, and winner", () => {
    expect(tallyEqual({ kind: "hold", reason: "tie" }, { kind: "hold", reason: "block" })).toBe(false);
    expect(tallyEqual({ kind: "established", winner: 1 }, { kind: "established", winner: 2 })).toBe(false);
    expect(tallyEqual({ kind: "established", winner: 1 }, { kind: "established", winner: 1 })).toBe(true);
  });
});

describe("arm-s action-sequence structure (BR-15/BR-16 negatives)", () => {
  const orig = (voter: string): SequenceAction => ({ kind: "SUBMIT_ORIGINAL", voter, choice: 1, goa: 1, sub: "T0", rec: "T0" });
  const amend = (voter: string): SequenceAction => ({ kind: "SUBMIT_AMEND", voter, choice: 1, goa: 1, sub: "T1", rec: "T1", refSub: "T0" });
  const tally: SequenceAction = { kind: "TALLY" };
  const hold: SequenceAction = { kind: "RECORD_HOLD" };

  test("a well-formed sequence passes", () => {
    expect(validateSequence([orig("V1"), tally, orig("V2"), hold]).ok).toBe(true);
  });

  test("TALLY missing is rejected (tally-count)", () => {
    const r = validateSequence([orig("V1"), orig("V2")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("tally-count");
  });

  test("a duplicate TALLY is rejected (tally-count)", () => {
    const r = validateSequence([orig("V1"), tally, tally]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("tally-count");
  });

  test("TALLY at index 0 (no accepted ballot before) is rejected (tally-position)", () => {
    const r = validateSequence([tally, orig("V1")]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("tally-position");
  });

  test("RECORD_HOLD before the TALLY is rejected (hold-placement)", () => {
    const r = validateSequence([orig("V1"), hold, tally]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("hold-placement");
  });

  test("two RECORD_HOLD markers are rejected (hold-count)", () => {
    const r = validateSequence([orig("V1"), tally, hold, hold]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("hold-count");
  });

  test("exceeding the original budget is rejected (original-budget)", () => {
    const r = validateSequence([orig("V1"), orig("V2"), orig("V3"), orig("V1"), tally]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("original-budget");
  });

  test("exceeding maxActions is rejected (over-budget)", () => {
    const r = validateSequence([orig("V1"), amend("V1"), amend("V2"), amend("V3"), orig("V2"), orig("V3"), tally, hold, hold]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("over-budget");
  });
});

describe("arm-s core validation precedence", () => {
  test("unknown-choice precedes invalid-timestamp", () => {
    expect(expectedCoreValidation([1, 2, 3], { voter: "V1", choiceInternalNo: 99, goa: 1, kind: "original", ref: null, submittedAt: "__INVALID_FORMAT__", reservation: "r" })).toBe("unknown-choice");
    expect(expectedCoreValidation([1, 2, 3], { voter: "V1", choiceInternalNo: 1, goa: 1, kind: "original", ref: null, submittedAt: "__INVALID_FORMAT__", reservation: "r" })).toBe("invalid-timestamp");
    expect(expectedCoreValidation([1, 2, 3], { voter: "V1", choiceInternalNo: 1, goa: 1, kind: "original", ref: null, submittedAt: "2026-07-20T00:00:00Z", reservation: "r" })).toBe("valid");
  });
});
