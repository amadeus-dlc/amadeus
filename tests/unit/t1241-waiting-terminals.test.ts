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

  // R-16 — the ledger names the transaction but its entered event carries no
  // cause. The identifiers alone would render SOMETHING, and a partial
  // re-presentation is a different ruling from the one the run stopped on.
  test("a waiting record whose entered event carries no cause refuses", () => {
    const waiting = enteredWaiting();
    const stripped = waiting.transactions.map((transaction) => ({
      ...transaction,
      events: transaction.events.filter((event) => event.type !== "WORKFLOW_WAITING_ENTERED"),
    }));
    const dispatch = resumeInterruption({
      parked: false,
      parkedAtStage: null,
      envelope: waiting.envelope,
      transactions: stripped,
    });
    expect(dispatch.ok).toBe(false);
    if (dispatch.ok) return;
    expect(dispatch.error.reason).toBe("not-suspendable");
    expect(dispatch.error.detail).toContain("carries no cause");
  });

  // R-16 — a human-re-entry stop reason that travelled as an envelope (not the
  // bare park marker) still dispatches to park, reading the recorded stage and
  // degrading to "" when the record names none.
  test("a human-reentry envelope dispatches to park with the recorded stage", () => {
    const envelope = envelopeFor("USER_PARKED", {
      kind: "human-unpark",
      identity: autonomyStableId("terminal-fixture-unpark", ["USER_PARKED"]),
      status: "pending",
      evidenceFingerprint: null,
    });
    const named = resumeInterruption({
      parked: false,
      parkedAtStage: "code-generation",
      envelope,
      transactions: [],
    });
    if (!named.ok || named.value.kind !== "park") throw new Error("expected a park dispatch");
    expect(named.value.stage).toBe("code-generation");
    const unnamed = resumeInterruption({ parked: false, parkedAtStage: null, envelope, transactions: [] });
    if (!unnamed.ok || unnamed.value.kind !== "park") throw new Error("expected a park dispatch");
    expect(unnamed.value.stage).toBe("");
  });

  // R-18 — a bare park marker that names no stage is an unreadable record,
  // refused rather than resumed as a stage-less park.
  test("a park marker that names no stage refuses", () => {
    for (const stage of [null, "", "   "]) {
      const dispatch = resumeInterruption({ parked: true, parkedAtStage: stage, envelope: null, transactions: [] });
      expect(dispatch.ok).toBe(false);
      if (dispatch.ok) return;
      expect(dispatch.error.reason).toBe("not-suspendable");
      expect(dispatch.error.detail).toContain("names no stage");
    }
  });
});

describe("t1241 waiting is engine-issued (R-6)", () => {
  // A CLI verb would make "stop and wait for a ruling" something the agent can
  // invoke at will, which is the self-park threat the rate constraint is built
  // to detect. The engine issues it or nobody does.
  //
  // The two tools dispatch differently — amadeus-state.ts switches on `case
  // "<verb>":` and amadeus-bolt.ts looks the verb up in a handler map — so each
  // vocabulary is extracted the way that tool actually declares it. Both
  // extractions are asserted non-empty and asserted to contain a verb that
  // really exists, or an absence claim here would pass on a regex that stopped
  // matching anything at all.
  async function toolSource(name: string): Promise<string> {
    return Bun.file(`${import.meta.dir}/../../packages/framework/core/tools/${name}`).text();
  }

  test("amadeus-state.ts has no waiting verb in its switch", async () => {
    const source = await toolSource("amadeus-state.ts");
    const verbs = [...source.matchAll(/case\s+"([a-z][a-z0-9-]*)":/g)].map((match) => match[1]);
    expect(verbs.length).toBeGreaterThan(10);
    expect(verbs).toContain("park");
    expect(verbs).toContain("unpark");
    expect(verbs.filter((verb) => verb?.includes("waiting"))).toEqual([]);
  });

  // amadeus-bolt.ts dispatches in two places — a switch for the Bolt verbs and
  // a lookup map for the autonomy-support ones — so both are read.
  test("amadeus-bolt.ts has no waiting verb in either dispatch", async () => {
    const source = await toolSource("amadeus-bolt.ts");
    const map = source.match(/const handlers[\s\S]*?= \{([\s\S]*?)\n {2}\};/)?.[1] ?? "";
    const verbs = [
      ...[...map.matchAll(/"([a-z][a-z0-9-]*)":/g)].map((match) => match[1]),
      ...[...source.matchAll(/case\s+"([a-z][a-z0-9-]*)":/g)].map((match) => match[1]),
    ];
    expect(verbs.length).toBeGreaterThan(10);
    expect(verbs).toContain("resume-quality"); // from the map
    expect(verbs).toContain("approve-batch"); // from the switch
    expect(verbs.filter((verb) => verb?.includes("waiting"))).toEqual([]);
    // The usage line is the same vocabulary restated for humans; a verb hidden
    // from both dispatches but advertised there would still be an invitation.
    const usage = source.match(/Valid: [^`"]*/)?.[0] ?? "";
    expect(usage).toContain("resume-quality");
    expect(usage).not.toContain("waiting");
  });
});

// Patch-coverage closure for the arms the shipped CLI cannot register in-process:
// the rate refusal, the resume-condition mismatch, and the malformed
// interactivity-basis refusals are all pure/coordinator seams, so they get
// direct tests here.
describe("t1241 refusal arms are typed results, never throws", () => {
  test("a second waiting inside the rate window is refused with the prior id", () => {
    const repository = createMemoryIntentAutonomyRepository({ onCommit: () => {} });
    const coordinator = createIntentAutonomyCoordinator({
      initialProjection: createAutonomyProjection({ intentUuid: INTENT }),
      repository,
    });
    // Seed the ledger with an unresumed waiting entry directly (a crash or a
    // hand-repaired record can leave the projection running while the durable
    // entry stays open) - the rate arm, not the suspension guard, must refuse
    // the repeat and name the prior entry.
    const before = coordinator.readProjection();
    const priorWaitingId = autonomyStableId("prior-waiting", [CAUSE.occurrenceId]);
    repository.commit({
      schemaVersion: 1,
      transactionId: priorWaitingId,
      intentUuid: INTENT,
      expectedRevision: before.projectionRevision,
      beforeProjection: before,
      beforeProjectionDigest: basisFingerprintOf(before),
      afterProjectionDigest: basisFingerprintOf({ ...before, projectionRevision: before.projectionRevision + 1 }),
      events: [{ type: "WORKFLOW_WAITING_ENTERED", waitingId: priorWaitingId, cause: CAUSE }],
      projection: { ...before, projectionRevision: before.projectionRevision + 1 },
    });
    const first = { waitingId: priorWaitingId };
    const second = coordinator.enterWaiting({ cause: CAUSE });
    expect("error" in second).toBe(true);
    if ("error" in second) {
      expect(second.error).toStartWith("waiting-rate-refused:");
      expect(second.error).toContain(first.waitingId);
    }
  });

  test("a resume with the right id but the wrong condition identity is refused", () => {
    const repository = createMemoryIntentAutonomyRepository({ onCommit: () => {} });
    const coordinator = createIntentAutonomyCoordinator({
      initialProjection: createAutonomyProjection({ intentUuid: INTENT }),
      repository,
    });
    const entered = coordinator.enterWaiting({ cause: CAUSE });
    expect("error" in entered).toBe(false);
    if ("error" in entered) return;
    const refused = coordinator.resumeWaiting({
      waitingId: entered.waitingId,
      satisfiedConditionIdentity: "not-the-declared-condition",
    });
    expect(refused).toEqual({ error: "resume-condition-not-satisfied" });
  });

  test("a malformed interactivity basis refuses with the offending field named", () => {
    const base = {
      occurrenceId: CAUSE.occurrenceId,
      outcome: CAUSE.outcome,
      derivationTranscript: CAUSE.derivationTranscript,
      basisFingerprint: CAUSE.basisFingerprint,
    };
    const badSource = WaitingCause.parse({
      ...base,
      interactivityBasis: { interactive: false, source: "carrier-pigeon", measuredAt: "2026-08-16T00:00:00Z" },
    });
    expect(badSource.ok).toBe(false);
    if (!badSource.ok) expect(badSource.error.detail).toContain("unknown source");
    const badTimestamp = WaitingCause.parse({
      ...base,
      interactivityBasis: { interactive: false, source: "human-turn-pipeline", measuredAt: "  " },
    });
    expect(badTimestamp.ok).toBe(false);
    if (!badTimestamp.ok) expect(badTimestamp.error.detail).toContain("non-empty timestamp");
  });
});
