// covers: file:tools/amadeus-goal-reconciliation.ts, function:parseGoalLineage, function:parseGoalReconciliationReceipt, function:authorizeGoalCompletion

import { describe, expect, test } from "bun:test";
import {
  authorizeGoalCompletion,
  createInitialGoalLineage,
  goalCompletionContextDigest,
  parseGoalLineage,
  parseGoalReconciliationReceipt,
} from "../../packages/framework/core/tools/amadeus-goal-reconciliation.ts";

const INTENT_ID = "0198a988-7bc3-7000-8000-000000000001";

function achievedReceipt() {
  const lineage = createInitialGoalLineage({
    intentId: INTENT_ID,
    statement: "Ship a verified goal guard",
    scope: "self-fix",
    createdAt: "2026-08-04T00:00:00.000Z",
  });
  const completionContextDigest = goalCompletionContextDigest({
    scope: "self-fix",
    finalStage: "build-and-test",
    executionProjection: "3.6",
  });
  return {
    lineage,
    receipt: {
      schemaVersion: 1 as const,
      receiptId: "receipt-terminal-build-and-test",
      intentId: INTENT_ID,
      goalId: lineage.goalId,
      goalRevision: 0,
      goalDigest: lineage.revisions[0].digest,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
      items: [
        {
          id: "metric-1",
          verdict: "ACHIEVED" as const,
          evidence: [
            {
              kind: "deterministic-check" as const,
              reference: "tests/integration/t427.test.ts",
              digest: "a".repeat(64),
            },
          ],
        },
      ],
      overallVerdict: "ACHIEVED" as const,
      evidenceDigest: "b".repeat(64),
      humanRulingReference: null,
      createdAt: "2026-08-04T01:00:00.000Z",
    },
    completionContextDigest,
  };
}

describe("goal reconciliation codec", () => {
  test("initial goal revision is immutable and digest-bound", () => {
    const lineage = createInitialGoalLineage({
      intentId: INTENT_ID,
      statement: "Ship a verified goal guard",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });

    expect(lineage.currentRevision).toBe(0);
    expect(lineage.revisions).toHaveLength(1);
    expect(lineage.revisions[0].parentRevision).toBeNull();
    expect(lineage.revisions[0].digest).toMatch(/^[0-9a-f]{64}$/);
    expect(parseGoalLineage(`${JSON.stringify(lineage)}\n`)).toEqual(lineage);
  });

  test("rejects a lineage whose approved content was changed", () => {
    const lineage = createInitialGoalLineage({
      intentId: INTENT_ID,
      statement: "Ship a verified goal guard",
      scope: "self-fix",
      createdAt: "2026-08-04T00:00:00.000Z",
    });
    const tampered = {
      ...lineage,
      revisions: [
        { ...lineage.revisions[0], statement: "Silently weakened goal" },
      ],
    };

    expect(() => parseGoalLineage(JSON.stringify(tampered))).toThrow(/digest/i);
  });

  test("rejects unknown verdicts instead of coercing them", () => {
    const { receipt } = achievedReceipt();
    const invalid = { ...receipt, overallVerdict: "COMPLETE" };

    expect(() => parseGoalReconciliationReceipt(JSON.stringify(invalid))).toThrow(
      /verdict/i,
    );
  });
});

describe("completion authorization", () => {
  test("authorizes only a current ACHIEVED receipt", () => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();

    expect(
      authorizeGoalCompletion({
        intentId: INTENT_ID,
        lineage,
        receipt,
        scope: "self-fix",
        finalStage: "build-and-test",
        completionInstance: "terminal:build-and-test",
        completionContextDigest,
      }),
    ).toEqual({ kind: "authorized", receipt });
  });

  test.each([
    ["DEVIATED", "receipt verdict is DEVIATED"],
    ["UNVERIFIED", "receipt verdict is UNVERIFIED"],
  ] as const)("rejects %s", (verdict, expected) => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();
    const rejected = authorizeGoalCompletion({
      intentId: INTENT_ID,
      lineage,
      receipt: { ...receipt, overallVerdict: verdict },
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
    });

    expect(rejected).toEqual({ kind: "rejected", reason: expected });
  });

  test("rejects stale revision, another Intent, and changed completion context", () => {
    const { lineage, receipt, completionContextDigest } = achievedReceipt();
    const base = {
      intentId: INTENT_ID,
      lineage,
      receipt,
      scope: "self-fix",
      finalStage: "build-and-test",
      completionInstance: "terminal:build-and-test",
      completionContextDigest,
    };

    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, goalRevision: 1 },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/revision/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        receipt: { ...receipt, intentId: "0198a988-7bc3-7000-8000-000000000002" },
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/Intent/i) });
    expect(
      authorizeGoalCompletion({
        ...base,
        completionContextDigest: "c".repeat(64),
      }),
    ).toMatchObject({ kind: "rejected", reason: expect.stringMatching(/context/i) });
  });
});
