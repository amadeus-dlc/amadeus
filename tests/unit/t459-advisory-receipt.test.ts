// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: small
//
// t459 — the acceptance predicates of C17 (#2253).
//
// The human route earns a receipt with three checks: the turn is grounded in
// the audit trail, the turn is not spent twice, and the advisory was actually
// presented. The unattended route must be no weaker, so it gets three of equal
// depth, and this file pins the two that are pure:
//
//   grounding      — the decision id must name an AUTO_DECIDED record that the
//                    journal actually holds. A receipt's own word for it is
//                    worth nothing (NFR-6).
//   presentation   — that record's occurrence id must be the one THIS advisory
//                    instance produces. A real decision about something else
//                    cannot be re-pointed at an advisory, because the occurrence
//                    id is a digest over the interaction id (which carries the
//                    instance) and over the phase and graph revision the
//                    provenance claims.
//   single-spend   — one decision id backs one receipt.
//
// The prohibited-classification list is pinned here too: `quality-waiver` has to
// remain prohibited so that waiving a quality signal in general is still refused
// at effect authorization. Advisory deferral itself moved to its own
// `advisory-deferral` classification under RFC-0001 ADR-2 and is authorizable;
// what keeps an unattended deferral human is translateAdvisoryDecision, which
// resolves `run-now` only.

import { describe, expect, test } from "bun:test";

import {
  advisoryOccurrenceMatchesDecision,
  advisoryProvenanceAlreadySpent,
  autoDecisionsFromTransactions,
  type AdvisoryChoiceProvenance,
  type AdvisoryChoiceReceipt,
  type AdvisoryIdentity,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import {
  autonomyDigest,
  createInteractionOccurrence,
  type AutoDecisionRecord,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import { PROHIBITED_EFFECTS } from "../../packages/framework/core/tools/amadeus-intent-autonomy-production.ts";
import type { IntentAutonomyTransaction } from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";
const GRAPH = autonomyDigest("graph-v1");
const PHASE = "construction";

const identity: AdvisoryIdentity = {
  plugin: "conformance-fixture",
  code: "changed",
  checkpoint: "functional-design",
  target: "conformance-fixture:fixture-change",
  specIdentity: "sha256:abc",
  intentRun: INTENT,
  advisoryInstance: "019fc698-ba1f-7000-8000-000000000001",
};

function decisionFor(
  target: AdvisoryIdentity,
  overrides: Partial<AutoDecisionRecord> = {},
  phase = PHASE,
  graphRevision = GRAPH,
): AutoDecisionRecord {
  const optionIds = ["run-now"];
  const occurrence = createInteractionOccurrence({
    intentUuid: INTENT,
    kind: "question",
    stage: target.checkpoint,
    phase,
    bolt: null,
    interactionId: `advisory-${target.advisoryInstance}`,
    selector: `advisory:${target.plugin}:${target.code}:${target.advisoryInstance}`,
    question: "advisory",
    optionIds,
    graphRevision,
  });
  return {
    decisionId: "decision-1",
    occurrenceId: occurrence.occurrenceId,
    question: "advisory",
    optionIds,
    selectedOptionId: "run-now",
    decider: "deterministic-engine",
    basisKind: "norm",
    basisFingerprint: autonomyDigest("evidence"),
    principalId: "amadeus-engine",
    actorId: "amadeus-conductor",
    grantId: null,
    degradedCapability: null,
    reviewState: "not-applicable",
    ...overrides,
  };
}

function transaction(...decisions: AutoDecisionRecord[]): IntentAutonomyTransaction {
  return {
    events: decisions.map((decision) => ({ type: "AUTO_DECIDED", decision })),
  } as unknown as IntentAutonomyTransaction;
}

function autoProvenance(overrides: Partial<Extract<AdvisoryChoiceProvenance, { kind: "auto-decision" }>> = {}) {
  return {
    kind: "auto-decision" as const,
    decisionId: "decision-1",
    basisKind: "norm" as const,
    basisFingerprint: autonomyDigest("evidence"),
    projectionRevision: 3,
    phase: PHASE,
    graphRevision: GRAPH,
    ...overrides,
  };
}

function receipt(provenance: AdvisoryChoiceProvenance): AdvisoryChoiceReceipt {
  return {
    schema: 2,
    identity,
    choice: "run-now",
    provenance,
    recordedAt: "2026-08-05T12:00:00.000Z",
  };
}

describe("advisory receipt: grounding (auto-decision)", () => {
  test("journalのAUTO_DECIDEDだけが裁定として読み出される", () => {
    const decision = decisionFor(identity);
    expect(autoDecisionsFromTransactions([transaction(decision)])).toEqual([decision]);
  });

  test("AUTO_DECIDEDを持たないtransactionからは何も読み出さない", () => {
    const empty = { events: [{ type: "AUTONOMY_MODE_CHANGED" }] } as unknown as IntentAutonomyTransaction;
    expect(autoDecisionsFromTransactions([empty])).toEqual([]);
  });

  test("捏造したdecisionIdはjournalに実在しないので解決できない", () => {
    const decisions = autoDecisionsFromTransactions([transaction(decisionFor(identity))]);
    expect(decisions.some((decision) => decision.decisionId === "fabricated-decision")).toBe(false);
  });
});

describe("advisory receipt: presentation binding (auto-decision)", () => {
  test("当該instanceのoccurrenceを持つ裁定だけが一致する", () => {
    expect(advisoryOccurrenceMatchesDecision({
      intentUuid: INTENT,
      identity,
      decision: decisionFor(identity),
      phase: PHASE,
      graphRevision: GRAPH,
    })).toBe(true);
  });

  test("別instanceの裁定は一致しない(誤帰属の封鎖)", () => {
    const other = { ...identity, advisoryInstance: "019fc698-ba1f-7000-8000-000000000002" };
    expect(advisoryOccurrenceMatchesDecision({
      intentUuid: INTENT,
      identity,
      decision: decisionFor(other),
      phase: PHASE,
      graphRevision: GRAPH,
    })).toBe(false);
  });

  test("phase・graphRevisionの詐称はoccurrence idが合わず一致しない", () => {
    const decision = decisionFor(identity);
    expect(advisoryOccurrenceMatchesDecision({
      intentUuid: INTENT,
      identity,
      decision,
      phase: "inception",
      graphRevision: GRAPH,
    })).toBe(false);
    expect(advisoryOccurrenceMatchesDecision({
      intentUuid: INTENT,
      identity,
      decision,
      phase: PHASE,
      graphRevision: autonomyDigest("graph-v2"),
    })).toBe(false);
  });

  test("occurrence idを構成できない入力はfail-closedで不一致", () => {
    expect(advisoryOccurrenceMatchesDecision({
      intentUuid: INTENT,
      identity,
      decision: decisionFor(identity, { optionIds: [] }),
      phase: PHASE,
      graphRevision: GRAPH,
    })).toBe(false);
  });
});

describe("advisory receipt: single spend across provenance kinds", () => {
  test("同一decisionIdの2件目は拒否される", () => {
    const provenance = autoProvenance();
    expect(advisoryProvenanceAlreadySpent([], provenance)).toBe(false);
    expect(advisoryProvenanceAlreadySpent([receipt(provenance)], provenance)).toBe(true);
  });

  test("別decisionIdは別のspendとして扱われる", () => {
    const spent = receipt(autoProvenance());
    expect(advisoryProvenanceAlreadySpent([spent], autoProvenance({ decisionId: "decision-2" }))).toBe(false);
  });

  test("human-turn receiptはauto-decisionのspend判定に混線しない", () => {
    const human = receipt({
      kind: "human-turn",
      timestamp: "2026-08-05T12:00:00.000Z",
      shard: "host-clone.jsonl",
      eventIdentity: "decision-1",
    });
    expect(advisoryProvenanceAlreadySpent([human], autoProvenance())).toBe(false);
    expect(advisoryProvenanceAlreadySpent([receipt(autoProvenance())], {
      kind: "human-turn",
      timestamp: "2026-08-05T12:00:00.000Z",
      shard: "host-clone.jsonl",
      eventIdentity: "decision-1",
    })).toBe(false);
  });

  test("human-turnの二重消費も従来どおり拒否される", () => {
    const turn: AdvisoryChoiceProvenance = {
      kind: "human-turn",
      timestamp: "2026-08-05T12:00:00.000Z",
      shard: "host-clone.jsonl",
      eventIdentity: "event-1",
    };
    expect(advisoryProvenanceAlreadySpent([receipt(turn)], turn)).toBe(true);
    expect(advisoryProvenanceAlreadySpent([receipt(turn)], { ...turn, shard: "other.jsonl" })).toBe(false);
  });
});

describe("advisory receipt: prohibited effect barrier (FR-ADV-4 secondary)", () => {
  test("quality-waiverは禁止効果として収載され続ける", () => {
    expect(PROHIBITED_EFFECTS).toContain("quality-waiver");
  });
});
