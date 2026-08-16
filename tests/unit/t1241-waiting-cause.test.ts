// covers: file:packages/framework/core/tools/amadeus-waiting.ts
// size: small
//
// RFC-0001 FR-3 / ADR-4 — the waiting cause and its rate constraint.
//
// A waiting entry is admissible only when it can say WHY the run stopped, so
// the cause is not a label attached to a suspension but the thing admission is
// bound to: occurrence, non-unique outcome, derivation transcript, basis
// fingerprint, and the interactivity judgment that made the run non-interactive
// in the first place. Every field is load-bearing on resume, which is why a
// cause missing any one of them is refused rather than stored half-formed.
//
// The rate key is (occurrenceId, basisFingerprint): the same ruling point
// reached on the same grounds is a repeat, and repeats escalate rather than
// wait again. A resume clears the key, because a resumed waiting entry means a
// human ruled — the case the rate constraint exists to detect is the run that
// keeps stopping WITHOUT anyone ruling.

import { describe, expect, test } from "bun:test";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import {
  admitWaiting,
  basisFingerprintOf,
  WaitingCause,
  waitingEntriesOfEvents,
  type InteractivityBasis,
  type WaitingCause as WaitingCauseType,
} from "../../packages/framework/core/tools/amadeus-waiting.ts";

const BASIS: InteractivityBasis = {
  interactive: false,
  source: "human-turn-pipeline",
  measuredAt: "2026-08-15T10:00:00.000Z",
};

const OUTCOME = RecommendationOutcome.contested(
  [
    { optionId: "adopt-a", rationale: "matches the norm's letter", rank: 1 },
    { optionId: "adopt-b", rationale: "matches its intent", rank: 2 },
  ],
  "two readings of the same norm",
);

function cause(overrides: Partial<WaitingCauseType> = {}): WaitingCauseType {
  return {
    occurrenceId: "occurrence-1",
    outcome: OUTCOME,
    derivationTranscript: "norm -> past-rulings -> election: no single option",
    basisFingerprint: basisFingerprintOf({ selector: "gate", evidence: ["a", "b"] }),
    interactivityBasis: BASIS,
    ...overrides,
  };
}

describe("t1241 basisFingerprintOf (ADR-11 hand-off)", () => {
  test("is a sha256 digest", () => {
    expect(basisFingerprintOf({ a: 1 })).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  // The whole point of a canonical form: a run cannot dodge the rate constraint
  // by re-emitting the same derivation with the whitespace or the key order
  // shuffled. Both perturbations below are "the same basis, retyped".
  test("is unchanged by whitespace perturbation", () => {
    expect(basisFingerprintOf({ reason: "no  single\toption\n" }))
      .toBe(basisFingerprintOf({ reason: "no single option" }));
  });

  test("is unchanged by key and element ordering", () => {
    expect(basisFingerprintOf({ b: 2, a: [1, 2] })).toBe(basisFingerprintOf({ a: [2, 1], b: 2 }));
  });

  // Order-insensitivity is only safe because meaningful order travels in
  // explicit fields (a candidate carries its own `rank`), so this must NOT
  // collapse two genuinely different bases.
  test("distinguishes different material", () => {
    expect(basisFingerprintOf({ a: 1 })).not.toBe(basisFingerprintOf({ a: 2 }));
    expect(basisFingerprintOf({ a: "1" })).not.toBe(basisFingerprintOf({ a: 1 }));
  });

  test("refuses material it cannot canonicalize", () => {
    expect(() => basisFingerprintOf({ f: () => 1 })).toThrow("basis-material-not-canonicalizable");
  });
});

describe("t1241 WaitingCause admission binding (R-7)", () => {
  test("a complete cause parses", () => {
    const parsed = WaitingCause.parse(WaitingCause.serialize(cause()));
    expect(parsed.ok).toBe(true);
  });

  // R-7 with the interactivityBasis correction from the FD review: five fields
  // are required, and dropping any ONE of them refuses.
  const REQUIRED = [
    "occurrenceId",
    "outcome",
    "derivationTranscript",
    "basisFingerprint",
    "interactivityBasis",
  ] as const;

  for (const field of REQUIRED) {
    test(`a cause missing ${field} is refused`, () => {
      const serialized = { ...WaitingCause.serialize(cause()) };
      delete serialized[field];
      const parsed = WaitingCause.parse(serialized);
      expect(parsed.ok).toBe(false);
      if (parsed.ok) throw new Error("unreachable");
      expect(parsed.error.reason).toBe("malformed-cause");
      expect(parsed.error.detail).toContain(field);
    });
  }

  // R-8 — a unique outcome is a decision, not a reason to stop. The type makes
  // it unconstructible; the parser has to refuse it on the read side too,
  // because a hand-edited ledger row is not type-checked.
  test("a unique outcome is refused", () => {
    const serialized = {
      ...WaitingCause.serialize(cause()),
      outcome: RecommendationOutcome.serialize(
        RecommendationOutcome.unique("adopt-a", { source: "norm", fingerprint: basisFingerprintOf("x") }),
      ),
    };
    const parsed = WaitingCause.parse(serialized);
    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("unreachable");
    expect(parsed.error.detail).toContain("unique");
  });

  test("an empty derivation transcript is refused", () => {
    const parsed = WaitingCause.parse({ ...WaitingCause.serialize(cause()), derivationTranscript: "  " });
    expect(parsed.ok).toBe(false);
  });

  test("a basis fingerprint that is not a sha256 digest is refused", () => {
    const parsed = WaitingCause.parse({ ...WaitingCause.serialize(cause()), basisFingerprint: "deadbeef" });
    expect(parsed.ok).toBe(false);
  });

  // R-20 — the interactivity judgment is what lets a human contest a
  // misclassification, so `undetermined` (the fail-closed verdict) is a legal
  // source that must survive the round trip rather than being normalized away.
  test("an undetermined interactivity source is preserved", () => {
    const undetermined: InteractivityBasis = { ...BASIS, source: "undetermined" };
    const parsed = WaitingCause.parse(
      WaitingCause.serialize(cause({ interactivityBasis: undetermined })),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.value.interactivityBasis.source).toBe("undetermined");
  });

  test("an interactive basis is refused (waiting is the non-interactive arm)", () => {
    const serialized = WaitingCause.serialize(cause());
    const parsed = WaitingCause.parse({
      ...serialized,
      interactivityBasis: { ...BASIS, interactive: true },
    });
    expect(parsed.ok).toBe(false);
  });
});

describe("t1241 rate constraint (R-9, R-10, R-11)", () => {
  const key = (c: WaitingCauseType) => WaitingCause.rateKey(c);

  test("a first arrival is admitted", () => {
    expect(admitWaiting({ cause: cause(), prior: [] }).ok).toBe(true);
  });

  // R-9 — same point, same grounds, still unresolved: this is the repeated
  // interruption the self-park threat model is about.
  test("an unresolved repeat on the same key is refused", () => {
    const c = cause();
    const admitted = admitWaiting({
      cause: c,
      prior: [{ waitingId: "waiting-1", key: key(c), resumed: false }],
    });
    expect(admitted.ok).toBe(false);
    if (admitted.ok) throw new Error("unreachable");
    expect(admitted.error.key).toBe(key(c));
    expect(admitted.error.priorWaitingId).toBe("waiting-1");
  });

  // R-11 — every exit from an over-rate arrival is a stop. There is no
  // "escalated, therefore continue" value to return.
  test("an over-rate refusal only escalates", () => {
    const c = cause();
    const admitted = admitWaiting({
      cause: c,
      prior: [{ waitingId: "waiting-1", key: key(c), resumed: false }],
    });
    if (admitted.ok) throw new Error("unreachable");
    expect(["human", "repair"]).toContain(admitted.error.escalation);
  });

  // R-10 — the grounds changed, so this is not the same arrival.
  test("the same occurrence on a different basis is admitted", () => {
    const first = cause();
    const second = cause({ basisFingerprint: basisFingerprintOf({ different: true }) });
    expect(admitWaiting({
      cause: second,
      prior: [{ waitingId: "waiting-1", key: key(first), resumed: false }],
    }).ok).toBe(true);
  });

  test("a different occurrence on the same basis is admitted", () => {
    const first = cause();
    const second = cause({ occurrenceId: "occurrence-2" });
    expect(admitWaiting({
      cause: second,
      prior: [{ waitingId: "waiting-1", key: key(first), resumed: false }],
    }).ok).toBe(true);
  });

  // The FD review left this cell undefined (iteration 2, R-9/R-9a FOLLOW-UP):
  // the ledger is append-only, so a resumed entry would match forever and a
  // legitimate second wait at the same point would be structurally impossible.
  // A resume means a human ruled, which is exactly what the rate constraint is
  // there to require — so the resume clears the key.
  test("a repeat is admitted once the prior waiting was resumed", () => {
    const c = cause();
    expect(admitWaiting({
      cause: c,
      prior: [{ waitingId: "waiting-1", key: key(c), resumed: true }],
    }).ok).toBe(true);
  });

  test("a resumed entry does not clear a LATER unresolved entry on the same key", () => {
    const c = cause();
    const admitted = admitWaiting({
      cause: c,
      prior: [
        { waitingId: "waiting-1", key: key(c), resumed: true },
        { waitingId: "waiting-2", key: key(c), resumed: false },
      ],
    });
    expect(admitted.ok).toBe(false);
    if (admitted.ok) throw new Error("unreachable");
    expect(admitted.error.priorWaitingId).toBe("waiting-2");
  });
});

describe("t1241 waitingEntriesOfEvents (R-9a: the ledger is the only read side)", () => {
  const c = cause();

  test("pairs entered events with the resumed events that clear them", () => {
    const entries = waitingEntriesOfEvents([
      { type: "WORKFLOW_WAITING_ENTERED", waitingId: "waiting-1", cause: c },
      { type: "WORKFLOW_PARKED" },
      { type: "WORKFLOW_WAITING_RESUMED", waitingId: "waiting-1" },
      { type: "WORKFLOW_WAITING_ENTERED", waitingId: "waiting-2", cause: c },
    ]);
    expect(entries).toEqual([
      { waitingId: "waiting-1", key: WaitingCause.rateKey(c), resumed: true },
      { waitingId: "waiting-2", key: WaitingCause.rateKey(c), resumed: false },
    ]);
  });

  test("ignores unrelated events", () => {
    expect(waitingEntriesOfEvents([{ type: "WORKFLOW_PARKED" }, { type: "AUTO_DECIDED" }])).toEqual([]);
  });

  // A resume with no matching entry is a corrupt ledger, not a licence: it must
  // not silently clear some other entry, and it must not invent one.
  test("a resume without a matching entry clears nothing", () => {
    const entries = waitingEntriesOfEvents([
      { type: "WORKFLOW_WAITING_ENTERED", waitingId: "waiting-1", cause: c },
      { type: "WORKFLOW_WAITING_RESUMED", waitingId: "waiting-unknown" },
    ]);
    expect(entries).toEqual([{ waitingId: "waiting-1", key: WaitingCause.rateKey(c), resumed: false }]);
  });
});
