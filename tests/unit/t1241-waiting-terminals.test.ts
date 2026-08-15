// covers: file:packages/framework/core/tools/amadeus-waiting.ts
// size: small
//
// R-13 / ADR-4 Q14=A — park, waiting and REPAIR_STALLED are three terminals,
// and they stay three.
//
// Before RFC-0001 two of them already presented identically (both reached the
// conductor as a `parked` directive whose only distinguishing mark was free
// text in `reason`), so "a human chose to stop" and "the run broke" were
// already indistinguishable to anything downstream. Adding waiting as a third
// rider would have finished the collapse. The transition table below is the
// pin: each terminal differs from the other two in state, in audit vocabulary
// and in resume path, and every cell is asserted against the other two rather
// than against a hard-coded expectation of itself.
//
// Resume has ONE entrance (R-16). What varies is the dispatch it returns, and
// an unrecognised record does not fall back to the mildest terminal — it
// refuses, because guessing "probably a park" is how a broken run gets resumed
// as a healthy one (ADR-4 Alternatives Rejected, Q14-B).

import { describe, expect, test } from "bun:test";
import { getEventDefByAuditEvent } from "../../packages/framework/core/otel/event-registry.ts";
import { RecommendationOutcome } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import {
  autonomyStableId,
  createAutonomyProjection,
  validateResumeCondition,
  type ParkEnvelope,
  type ResumeCondition,
  type StopReason,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
  type IntentAutonomyTransaction,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import {
  basisFingerprintOf,
  resumeInterruption,
  WaitingCause,
  type WaitingCause as WaitingCauseType,
} from "../../packages/framework/core/tools/amadeus-waiting.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const BASIS = basisFingerprintOf({ selector: "gate", evidence: ["a"] });

const CAUSE: WaitingCauseType = {
  occurrenceId: "occurrence-1",
  outcome: RecommendationOutcome.contested(
    [
      { optionId: "adopt-a", rationale: "the norm's letter", rank: 1 },
      { optionId: "adopt-b", rationale: "its intent", rank: 2 },
    ],
    "two readings of the same norm",
  ),
  derivationTranscript: "norm -> past-rulings -> election: no single option",
  basisFingerprint: BASIS,
  interactivityBasis: { interactive: false, source: "human-turn-pipeline", measuredAt: "2026-08-15T10:00:00.000Z" },
};

function enteredWaiting(): { readonly envelope: ParkEnvelope; readonly transactions: readonly IntentAutonomyTransaction[] } {
  const committed: IntentAutonomyTransaction[] = [];
  const repository = createMemoryIntentAutonomyRepository({
    onCommit: (transaction) => committed.push(transaction),
  });
  const coordinator = createIntentAutonomyCoordinator({
    initialProjection: createAutonomyProjection({ intentUuid: INTENT }),
    repository,
  });
  const entered = coordinator.enterWaiting({ cause: CAUSE });
  if ("error" in entered) throw new Error(entered.error);
  const envelope = coordinator.readProjection().parkEnvelope;
  if (envelope === null) throw new Error("waiting left no envelope");
  return { envelope, transactions: committed };
}

function envelopeFor(reason: StopReason, condition: ResumeCondition): ParkEnvelope {
  return {
    parkTransactionId: autonomyStableId("terminal-fixture", [reason]),
    triggerOccurrenceId: "occurrence-1",
    reason,
    resumeCondition: condition,
    monitorLatchIdentity: reason === "REPAIR_STALLED" ? autonomyStableId("latch", [reason]) : null,
    beforeProjectionDigest: basisFingerprintOf({ before: reason }),
  };
}

const REPAIR_ENVELOPE = envelopeFor("REPAIR_STALLED", {
  kind: "quality-evidence-or-human",
  identity: autonomyStableId("repair-resume", ["occurrence-1"]),
  status: "pending",
  evidenceFingerprint: BASIS,
});

describe("t1241 the three terminals are distinct in state (R-13)", () => {
  const waiting = enteredWaiting();

  test("each terminal has its own StopReason", () => {
    const reasons: StopReason[] = ["USER_PARKED", waiting.envelope.reason, "REPAIR_STALLED"];
    expect(new Set(reasons).size).toBe(3);
  });

  test("each terminal has its own ResumeCondition kind", () => {
    const kinds = [
      "human-unpark",
      waiting.envelope.resumeCondition.kind,
      REPAIR_ENVELOPE.resumeCondition.kind,
    ];
    expect(new Set(kinds).size).toBe(3);
  });

  // The pairing is total over StopReason, so a new terminal cannot be added
  // without declaring how it resumes — and a waiting envelope carrying park's
  // resume condition is rejected rather than quietly accepted.
  test("the reason and the resume condition are bound to each other", () => {
    expect(() => validateResumeCondition(waiting.envelope.reason, waiting.envelope.resumeCondition)).not.toThrow();
    expect(() => validateResumeCondition(waiting.envelope.reason, {
      kind: "human-unpark",
      identity: autonomyStableId("resume-condition", ["occurrence-1"]),
      status: "pending",
      evidenceFingerprint: null,
    })).toThrow("ILLEGAL_STATE:resume-condition");
    expect(() => validateResumeCondition("USER_PARKED", waiting.envelope.resumeCondition))
      .toThrow("ILLEGAL_STATE:resume-condition");
  });

  // R-7c — the identity is derived, never free text, so the SAFE_ID check that
  // guards every other envelope guards this one too.
  test("the waiting resume identity is a derived id", () => {
    expect(waiting.envelope.resumeCondition.identity).toMatch(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/);
    expect(waiting.envelope.resumeCondition.identity).not.toContain(" ");
  });
});

describe("t1241 the three terminals are distinct in audit vocabulary (R-13)", () => {
  test("waiting announces itself with its own events", () => {
    const names = [
      "WORKFLOW_PARKED",
      "WORKFLOW_UNPARKED",
      "WORKFLOW_WAITING_ENTERED",
      "WORKFLOW_WAITING_RESUMED",
    ];
    expect(new Set(names).size).toBe(4);
    for (const name of names) expect(getEventDefByAuditEvent(name).auditEvent).toBe(name);
  });

  test("entering waiting writes a waiting event, not a park event", () => {
    const waiting = enteredWaiting();
    const types = waiting.transactions.flatMap((transaction) => transaction.events.map((event) => event.type));
    expect(types).toContain("WORKFLOW_WAITING_ENTERED");
    expect(types).not.toContain("WORKFLOW_PARKED");
  });
});

describe("t1241 the three terminals are distinct on resume (R-13, R-16)", () => {
  test("one entrance dispatches all three by record kind", () => {
    const waiting = enteredWaiting();
    const dispatched = [
      resumeInterruption({ parked: true, parkedAtStage: "feasibility", envelope: null, transactions: [] }),
      resumeInterruption({ parked: false, parkedAtStage: null, envelope: waiting.envelope, transactions: waiting.transactions }),
      resumeInterruption({
        parked: false,
        parkedAtStage: null,
        envelope: REPAIR_ENVELOPE,
        transactions: [],
        remediationEvidence: basisFingerprintOf({ fixed: true }),
      }),
    ];
    const kinds = dispatched.map((dispatch) => (dispatch.ok ? dispatch.value.kind : `refused:${dispatch.error.reason}`));
    expect(kinds).toEqual(["park", "waiting", "repair-stalled"]);
    expect(new Set(kinds).size).toBe(3);
  });

  test("a run that stopped at nothing dispatches to nothing", () => {
    const dispatch = resumeInterruption({ parked: false, parkedAtStage: null, envelope: null, transactions: [] });
    expect(dispatch.ok).toBe(true);
    if (!dispatch.ok) return;
    expect(dispatch.value.kind).toBe("none");
  });

  test("a park dispatch names the stage it stopped at", () => {
    const dispatch = resumeInterruption({ parked: true, parkedAtStage: "feasibility", envelope: null, transactions: [] });
    if (!dispatch.ok || dispatch.value.kind !== "park") throw new Error("expected a park dispatch");
    expect(dispatch.value.stage).toBe("feasibility");
  });

  test("a waiting dispatch carries the ruling to re-present", () => {
    const waiting = enteredWaiting();
    const dispatch = resumeInterruption({
      parked: false,
      parkedAtStage: null,
      envelope: waiting.envelope,
      transactions: waiting.transactions,
    });
    if (!dispatch.ok || dispatch.value.kind !== "waiting") throw new Error("expected a waiting dispatch");
    expect(dispatch.value.presentation).toEqual(WaitingCause.presentationOf(CAUSE));
    expect(dispatch.value.cause.derivationTranscript).toBe(CAUSE.derivationTranscript);
    // R-20 — the interactivity judgment travels with it, so a run that was
    // misclassified as non-interactive can be contested on the evidence.
    expect(dispatch.value.cause.interactivityBasis.source).toBe("human-turn-pipeline");
  });

  // R-17 — fail closed. The stall says a defect stopped the run; resuming it
  // without evidence that the defect was addressed is resuming into the same
  // wall, so the absence of evidence is a refusal, not a default.
  test("a repair-stalled resume without remediation evidence refuses", () => {
    for (const evidence of [undefined, "", "   "]) {
      const dispatch = resumeInterruption({
        parked: false,
        parkedAtStage: null,
        envelope: REPAIR_ENVELOPE,
        transactions: [],
        remediationEvidence: evidence,
      });
      expect(dispatch.ok).toBe(false);
      if (dispatch.ok) return;
      expect(dispatch.error.reason).toBe("not-suspendable");
      expect(dispatch.error.detail).toContain("remediation");
    }
  });

  // R-18 — an unreadable record is not a park. Falling back to the mildest
  // terminal is precisely the confusion the three-way split exists to prevent.
  test("a record whose kind cannot be read refuses instead of falling back", () => {
    const corrupt = { ...REPAIR_ENVELOPE, reason: "SOMETHING_ELSE" as unknown as StopReason };
    const dispatch = resumeInterruption({
      parked: true, // even with a park marker present, the envelope wins
      parkedAtStage: "feasibility",
      envelope: corrupt,
      transactions: [],
    });
    expect(dispatch.ok).toBe(false);
    if (dispatch.ok) return;
    expect(dispatch.error.reason).toBe("not-suspendable");
    expect(dispatch.error.detail).toContain("SOMETHING_ELSE");
  });
});

describe("t1241 waiting is engine-issued (R-6)", () => {
  // A CLI verb would make "stop and wait for a ruling" something the agent can
  // invoke at will, which is the self-park threat the rate constraint is built
  // to detect. The engine issues it or nobody does.
  test("no state or bolt subcommand spells waiting", async () => {
    const sources = await Promise.all(
      ["amadeus-state.ts", "amadeus-bolt.ts"].map(async (name) =>
        Bun.file(`${import.meta.dir}/../../packages/framework/core/tools/${name}`).text()
      ),
    );
    for (const source of sources) {
      expect(source).not.toMatch(/case\s+"(enter-)?waiting"/);
      expect(source).not.toMatch(/case\s+"resume-waiting"/);
    }
  });
});
