// covers: file:packages/framework/core/tools/amadeus-waiting.ts
// size: small
//
// R-19 — a waiting record re-presents the SAME ruling on resume.
//
// The contract RFC-0001 states in prose ("record the ruling in the park reason
// so it can be ruled on in place when the run comes back") is a round trip, and
// the round trip runs through the Intent autonomy transaction ledger: the cause
// is encoded into a transaction, that transaction is rendered as an audit row,
// and resume replays the row back. Every stage of that path is checked here,
// on arbitrary causes rather than a handful of hand-picked ones, because the
// failure mode is a shape that survives the codec but loses a field.
//
// The oracle is the presentation built AT ENTRY, not a second implementation of
// how a presentation is derived. Re-deriving it here would let both sides be
// wrong in the same way and still agree (project.md pbt-oracle-cancellation).
//
// PBT conventions follow t3116-recommendation-outcome.pbt.test.ts: fixed seed,
// default numRuns, deep tier via AMADEUS_PBT_DEEP.

import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import { RecommendationOutcome, type Candidate } from "../../packages/framework/core/tools/amadeus-recommendation.ts";
import {
  createAutonomyProjection,
  type AutonomyProjection,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import {
  createIntentAutonomyCoordinator,
  createMemoryIntentAutonomyRepository,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";
import {
  readIntentAutonomyTransactions,
  renderIntentAutonomyAuditBlock,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-replay.ts";
import {
  basisFingerprintOf,
  resumeInterruption,
  WaitingCause,
  type InteractivityBasis,
  type WaitingCause as WaitingCauseType,
} from "../../packages/framework/core/tools/amadeus-waiting.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const PBT_SEED = 0x12_41_01;
const DEEP = process.env.AMADEUS_PBT_DEEP === "1" || process.env.AMADEUS_PBT_DEEP === "true";
const OPTS = DEEP ? { seed: PBT_SEED, numRuns: 20_000 } : { seed: PBT_SEED, numRuns: 100 };

const nonBlankArb = fc.string({ minLength: 1, maxLength: 24 }).filter((value) => value.trim().length > 0);
const safeIdArb = fc.string({ unit: fc.constantFrom(..."abcdefghijklmnopqrstuvwxyz0123456789-"), minLength: 1, maxLength: 32 })
  .map((value) => `occ-${value}`);

const contestedArb = fc.record({
  options: fc.uniqueArray(nonBlankArb, { minLength: 2, maxLength: 5 }),
  rationales: fc.array(nonBlankArb, { minLength: 5, maxLength: 5 }),
  reason: nonBlankArb,
}).map(({ options, rationales, reason }) => {
  const candidates: readonly Candidate[] = options.map((optionId, index) => ({
    optionId,
    rationale: rationales[index]!,
    rank: index + 1,
  }));
  return RecommendationOutcome.contested(candidates, reason);
});

const noneArb = nonBlankArb.map((reason) => RecommendationOutcome.none(reason));

const causeArb: fc.Arbitrary<WaitingCauseType> = fc.record({
  occurrenceId: safeIdArb,
  outcome: fc.oneof(contestedArb, noneArb),
  derivationTranscript: nonBlankArb,
  material: fc.string({ maxLength: 32 }),
  source: fc.constantFrom<InteractivityBasis["source"]>("human-turn-pipeline", "headless-signal", "undetermined"),
}).map(({ occurrenceId, outcome, derivationTranscript, material, source }) => ({
  occurrenceId,
  outcome,
  derivationTranscript,
  basisFingerprint: basisFingerprintOf({ material }),
  interactivityBasis: { interactive: false as const, source, measuredAt: "2026-08-15T10:00:00.000Z" },
}));

/** A coordinator over an empty in-memory ledger, plus the audit rows it wrote. */
function freshCoordinator(): {
  readonly enter: (cause: WaitingCauseType) => { readonly waitingId: string };
  readonly projection: () => AutonomyProjection;
  readonly auditRows: () => string;
} {
  const rows: string[] = [];
  const repository = createMemoryIntentAutonomyRepository({
    onCommit: (transaction) => {
      rows.push(renderIntentAutonomyAuditBlock(transaction));
    },
  });
  const coordinator = createIntentAutonomyCoordinator({
    initialProjection: createAutonomyProjection({ intentUuid: INTENT }),
    repository,
  });
  return {
    enter(cause) {
      const entered = coordinator.enterWaiting({ cause });
      if ("error" in entered) throw new Error(entered.error);
      return { waitingId: entered.waitingId };
    },
    projection: () => coordinator.readProjection(),
    auditRows: () => rows.join("\n"),
  };
}

describe("t1241 R-19: the cause survives the ledger round trip", () => {
  test("a resumed waiting record presents the ruling it was entered with", () => {
    fc.assert(
      fc.property(causeArb, (cause) => {
        // The oracle: the presentation the run actually built when it stopped.
        const presentedAtEntry = WaitingCause.presentationOf(cause);

        const coordinator = freshCoordinator();
        coordinator.enter(cause);

        // Replay the way a new process would: off the audit rows alone. No
        // in-process state crosses this line, which is what makes the record
        // readable in a session that never saw the run that wrote it.
        const transactions = readIntentAutonomyTransactions(coordinator.auditRows());
        const dispatch = resumeInterruption({
          parked: false,
          parkedAtStage: null,
          envelope: coordinator.projection().parkEnvelope,
          transactions,
        });

        expect(dispatch.ok).toBe(true);
        if (!dispatch.ok) return;
        expect(dispatch.value.kind).toBe("waiting");
        if (dispatch.value.kind !== "waiting") return;
        expect(dispatch.value.presentation).toEqual(presentedAtEntry);
        expect(dispatch.value.cause).toEqual(cause);
      }),
      OPTS,
    );
  });

  test("the envelope's identifiers agree with the cause they point at", () => {
    fc.assert(
      fc.property(causeArb, (cause) => {
        const coordinator = freshCoordinator();
        const { waitingId } = coordinator.enter(cause);
        const envelope = coordinator.projection().parkEnvelope;
        expect(envelope).not.toBeNull();
        if (envelope === null) return;
        // R-7b: the envelope keeps its six fields and carries the waiting
        // identity in them — occurrence, basis, and the ledger join key.
        expect(Object.keys(envelope).sort()).toEqual([
          "beforeProjectionDigest",
          "monitorLatchIdentity",
          "parkTransactionId",
          "reason",
          "resumeCondition",
          "triggerOccurrenceId",
        ]);
        expect(envelope.triggerOccurrenceId).toBe(cause.occurrenceId);
        expect(envelope.resumeCondition.evidenceFingerprint).toBe(cause.basisFingerprint);
        expect(envelope.parkTransactionId).toBe(waitingId);
      }),
      OPTS,
    );
  });

  // R-19a — the envelope alone is not enough to re-present a ruling. Without
  // the transaction it names, resume refuses rather than assembling a partial
  // presentation out of the identifiers it happens to have.
  test("a cause the ledger cannot supply refuses instead of half-presenting", () => {
    fc.assert(
      fc.property(causeArb, (cause) => {
        const coordinator = freshCoordinator();
        coordinator.enter(cause);
        const dispatch = resumeInterruption({
          parked: false,
          parkedAtStage: null,
          envelope: coordinator.projection().parkEnvelope,
          transactions: [], // the shard is gone, truncated, or from another record
        });
        expect(dispatch.ok).toBe(false);
        if (dispatch.ok) return;
        expect(dispatch.error.reason).toBe("not-suspendable");
      }),
      OPTS,
    );
  });
});
