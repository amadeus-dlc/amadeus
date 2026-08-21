// covers: file:packages/framework/core/tools/amadeus-advisory-choice.ts
// size: small
//
// t457 — the pure core of C16 (`resolveAdvisoryChoiceAutonomously`), #2253.
//
// Three mechanisms live here, and each is independently falsifiable:
//
//   1. the occurrence mapping (FR-ADV-1): an advisory becomes a `question`
//      occurrence whose interactionId and selector both carry the advisory
//      INSTANCE, so two raises of the same advisory never share an occurrence;
//   2. the host-owned option space, which carries no plugin execution route;
//   3. the translation (FR-ADV-2): `decided` AND `run-now` is the ONLY path to
//      `resolved`. Every other ladder outcome — including a `decided` that chose
//      `defer-with-risk` — becomes `human-required`, which is what makes the
//      guard's two-branch structure fail-closed.

import { describe, expect, test } from "bun:test";

import {
  ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS,
  advisoryChoiceOptionIds,
  advisoryInteractionId,
  advisorySelector,
  translateAdvisoryDecision,
  type AdvisoryIdentity,
} from "../../packages/framework/core/tools/amadeus-advisory-choice.ts";
import type {
  AutoDecisionRecord,
  DecisionOptionEffect,
  WorkflowResult,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy.ts";
import type {
  AutonomyDecisionResult,
  IntentAutonomyCommitReceipt,
} from "../../packages/framework/core/tools/amadeus-intent-autonomy-runtime.ts";

const INTENT = "019fc5ac-f0bb-7a5f-8a64-c944b6f76ead";

const identity: AdvisoryIdentity = {
  plugin: "conformance-fixture",
  code: "changed",
  checkpoint: "functional-design",
  target: "conformance-fixture:fixture-change",
  specIdentity: "sha256:abc",
  intentRun: "019fc698-ba1f-7467-b6b6-57c4b5b50140",
  advisoryInstance: "019fc698-ba1f-7000-8000-000000000001",
};

// SAFE_ID from amadeus-intent-autonomy.ts:43 — createInteractionOccurrence
// rejects anything outside it, so the mapping has to stay inside it.
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,191}$/;

const receipt: IntentAutonomyCommitReceipt = {
  transactionId: "transaction-1",
  transactionDigest: `sha256:${"e".repeat(64)}`,
  intentUuid: INTENT,
  projectionRevision: 3,
};

const parkedResult: WorkflowResult = {
  outcome: "parked",
  reasonCode: "NORM_CONFLICT",
  retryable: true,
  intentUuid: INTENT,
  autonomyMode: "full",
  grant: null,
  evidenceFingerprint: null,
  resumeCondition: { kind: "norm-change", identity: "resume-1", status: "pending", evidenceFingerprint: `sha256:${"f".repeat(64)}` },
  failureRef: null,
};

function decision(selectedOptionId: string, optionIds: readonly string[]): AutoDecisionRecord {
  return {
    decisionId: "decision-1",
    occurrenceId: "occurrence-1",
    question: "advisory",
    optionIds,
    selectedOptionId,
    decider: "deterministic-engine",
    basisKind: "norm",
    basisFingerprint: `sha256:${"a".repeat(64)}`,
    principalId: "amadeus-engine",
    actorId: "amadeus-conductor",
    grantId: null,
    degradedCapability: null,
    reviewState: "not-applicable",
  };
}

function effect(optionId: string, classification: DecisionOptionEffect["classification"]): DecisionOptionEffect {
  return {
    effectId: `advisory-${optionId}`,
    optionId,
    payload: { optionId },
    payloadFingerprint: `sha256:${"b".repeat(64)}`,
    classification,
    requiredScopeFingerprint: `sha256:${"c".repeat(64)}`,
    applicableNormFingerprint: `sha256:${"d".repeat(64)}`,
  };
}

describe("advisory auto-resolution: occurrence mapping", () => {
  test("interactionIdとselectorはadvisory instanceを含んで一意化される", () => {
    expect(advisoryInteractionId(identity)).toBe("advisory-019fc698-ba1f-7000-8000-000000000001");
    expect(advisorySelector(identity)).toBe(
      "advisory:conformance-fixture:changed:019fc698-ba1f-7000-8000-000000000001",
    );
  });

  test("写像した識別子はSAFE_IDに適合する", () => {
    expect(SAFE_ID.test(advisoryInteractionId(identity))).toBe(true);
    expect(SAFE_ID.test(advisorySelector(identity))).toBe(true);
  });

  test("別instanceは別selectorになる", () => {
    const second = { ...identity, advisoryInstance: "019fc698-ba1f-7000-8000-000000000002" };
    expect(advisorySelector(second)).not.toBe(advisorySelector(identity));
    expect(advisoryInteractionId(second)).not.toBe(advisoryInteractionId(identity));
  });
});

describe("advisory auto-resolution: option space", () => {
  test("hostはplugin固有の実行経路を選択肢へ埋め込まない", () => {
    expect(advisoryChoiceOptionIds()).toEqual(["run-now", "defer-with-risk"]);
  });
});

describe("advisory auto-resolution: effect classification (RFC-0001 ADR-2)", () => {
  // 延期は quality-waiver ではなく専用の advisory-deferral を名乗る。禁止 5 種の
  // 意味論を崩さずに天井を 1 分類だけ広げるための構築点(唯一)。
  test("defer-with-riskはadvisory-deferralに分類される", () => {
    expect(ADVISORY_CHOICE_EFFECT_CLASSIFICATIONS).toEqual({
      "run-now": "workflow-reversible",
      "defer-with-risk": "advisory-deferral",
    });
  });
});

describe("advisory auto-resolution: translation (FR-ADV-2 fail-closed)", () => {
  test("decided かつ run-now だけがresolvedになる", () => {
    const result: AutonomyDecisionResult = {
      kind: "decided",
      decision: decision("run-now", ["run-now"]),
      effect: effect("run-now", "workflow-reversible"),
      receipt,
    };
    expect(translateAdvisoryDecision(result)).toEqual({
      kind: "resolved",
      choice: "run-now",
      decision: result.kind === "decided" ? result.decision : decision("run-now", ["run-now"]),
      projectionRevision: 3,
    });
  });

  test("decidedでもdefer-with-riskはhuman-requiredへ落ちる", () => {
    const result: AutonomyDecisionResult = {
      kind: "decided",
      decision: decision("defer-with-risk", ["run-now", "defer-with-risk"]),
      effect: effect("defer-with-risk", "advisory-deferral"),
      receipt,
    };
    expect(translateAdvisoryDecision(result).kind).toBe("human-required");
  });

  test("human-required・parked・conflict・aborted・reservedはすべてhuman-requiredへ落ちる", () => {
    const outcomes: AutonomyDecisionResult[] = [
      { kind: "human-required", reason: "MODE_REQUIRES_HUMAN", result: null },
      { kind: "parked", result: parkedResult },
      { kind: "conflict", reason: "expected-revision-mismatch" },
      { kind: "aborted", reason: "effect-not-authorized", receipt },
      { kind: "reserved", reservationId: "reservation-1", receipt },
    ];
    for (const outcome of outcomes) {
      const translated = translateAdvisoryDecision(outcome);
      expect(translated.kind).toBe("human-required");
      if (translated.kind === "human-required") expect(translated.reason.length).toBeGreaterThan(0);
    }
  });
});
