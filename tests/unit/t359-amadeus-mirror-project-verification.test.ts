// t359 — final Project verification migration selection.
// covers: packages/framework/core/tools/amadeus-mirror-project-verification.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  finalSyncReceiptKey,
  heldCompletionSyncReconciliation,
} from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type {
  MirrorBoundary,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";
const LATER = "2026-07-28T00:00:00Z";
const INTENT = "intent-t359";

function completion(instance: string): MirrorBoundary {
  return { kind: "workflow-completed", instance };
}

function receipt(
  boundary: MirrorBoundary,
  operation: MirrorOperation,
  status: MirrorOperationReceipt["status"],
  preparedAt: string,
): MirrorOperationReceipt {
  const event = mirrorEventIdentity(INTENT, boundary, operation);
  return {
    key: mirrorEventKey(event),
    event,
    operationId: `op-${operation}`,
    status,
    preparedAt,
    attemptedAt: preparedAt,
    ...(status === "succeeded" ? { completedAt: preparedAt } : {}),
    ...(status === "pending"
      ? {
          projectSyncHold: {
            reason: "project-sync-unsettled" as const,
            heldAt: preparedAt,
          },
        }
      : {}),
  };
}

function withReceipts(
  ...receipts: MirrorOperationReceipt[]
): MirrorStateSnapshot {
  return {
    ...EMPTY_MIRROR_STATE,
    revision: 4,
    receipts: Object.fromEntries(
      receipts.map((candidate) => [candidate.key, candidate]),
    ),
  };
}

describe("t359 exact completion verification selection", () => {
  test("a different completion instance is never final sync evidence", () => {
    const old = receipt(completion("old"), "sync", "succeeded", NOW);
    const currentClose = mirrorEventIdentity(
      INTENT,
      completion("current"),
      "close",
    );

    expect(finalSyncReceiptKey(withReceipts(old), currentClose)).toBeUndefined();
  });

  test("the current held sync wins over an older pending close", () => {
    const boundary = completion("current");
    const oldClose = receipt(boundary, "close", "pending", NOW);
    const heldSync = receipt(boundary, "sync", "pending", LATER);
    const selected = heldCompletionSyncReconciliation(
      withReceipts(oldClose, heldSync),
      INTENT,
      boundary,
    );

    expect(selected?.receiptKey).toBe(heldSync.key);
    expect(selected?.originalEvent.operation).toBe("sync");
    expect(selected?.operationId).toBe("op-sync");
  });
});
