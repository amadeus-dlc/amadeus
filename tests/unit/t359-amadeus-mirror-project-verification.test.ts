// t359 — final Project verification migration selection.
// covers: packages/framework/core/tools/amadeus-mirror-project-verification.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  consumeStaleCloseApproval,
  finalSyncReceiptKey,
  heldCompletionSyncReconciliation,
  prepareCompletionProjectVerification,
  type ProjectVerificationScope,
} from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  MirrorBoundary,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";
const LATER = "2026-07-28T00:00:00Z";
const INTENT = "intent-t359";
const TARGET: MirrorProjectTarget = {
  project: { owner: "acme", number: 5 },
  phaseField: "Intent Phase",
  statusNames: {},
};

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

function landed(): MirrorSnapshot {
  return {
    intentUuid: INTENT,
    intentDir: "260727-demo-t359",
    projectSummary: "Project verification",
    lifecyclePhase: "OPERATION",
    currentStage: "none",
    status: "Completed",
    registryStatus: "complete",
    updatedAt: NOW,
  };
}

function statePorts(
  source: MirrorStateSnapshot | string,
  lockAvailable = true,
): Readonly<{ ports: MirrorStateStorePorts; writes: () => number }> {
  let document =
    typeof source === "string" ? source : renderMirrorStateBlock(source);
  let writeCount = 0;
  return {
    ports: {
      acquireLock: () => lockAvailable,
      releaseLock: () => {},
      readDocument: () => document,
      writeDocumentAtomic(text: string) {
        document = text;
        writeCount += 1;
        return { kind: "ok" };
      },
      appendArtifactUpdated: () => ({ kind: "appended" }),
    },
    writes: () => writeCount,
  };
}

function verificationScope(
  ports: MirrorStateStorePorts,
  projects: readonly MirrorProjectTarget[] = [TARGET],
): ProjectVerificationScope {
  return {
    intentUuid: INTENT,
    boundary: completion("current"),
    snapshot: landed(),
    projects,
    ports,
    now: () => NOW,
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

  test("a manual event can use a succeeded workflow completion for its intent", () => {
    const completed = receipt(
      completion("current"),
      "sync",
      "succeeded",
      NOW,
    );
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(finalSyncReceiptKey(withReceipts(completed), manual)).toBe(
      completed.key,
    );
    expect(
      heldCompletionSyncReconciliation(
        withReceipts(completed),
        INTENT,
        completion("current"),
      ),
    ).toBeNull();
  });
});

describe("t359 completion verification preparation", () => {
  test("an empty configured target set is ready without touching state", () => {
    const state = withReceipts();
    const memory = statePorts(state);
    const result = prepareCompletionProjectVerification(
      verificationScope(memory.ports, []),
      state,
    );

    expect(result).toEqual({
      kind: "ready",
      state,
      verificationRequired: false,
    });
    expect(memory.writes()).toBe(0);
  });

  test("a verified receipt and current done ledger need no requeue", () => {
    const completed = {
      ...receipt(completion("current"), "sync", "succeeded", NOW),
      projectSyncVerified: true as const,
    };
    const state: MirrorStateSnapshot = {
      ...withReceipts(completed),
      projectSync: {
        projects: [
          {
            project: "acme/5",
            projectId: "PVT_5",
            itemId: "PVTI_5",
            phaseField: "Intent Phase",
            lastAppliedStatus: "Done",
            state: "synced",
            updatedAt: NOW,
          },
        ],
      },
    };
    const memory = statePorts(state);
    const result = prepareCompletionProjectVerification(
      verificationScope(memory.ports),
      state,
    );

    expect(result).toEqual({
      kind: "ready",
      state,
      verificationRequired: false,
    });
    expect(memory.writes()).toBe(0);
  });

  test("a non-succeeded current receipt requests verification without requeueing", () => {
    const pending = receipt(completion("current"), "sync", "pending", NOW);
    const state = withReceipts(pending);
    const memory = statePorts(state);
    const result = prepareCompletionProjectVerification(
      verificationScope(memory.ports),
      state,
    );

    expect(result).toEqual({
      kind: "ready",
      state,
      verificationRequired: true,
    });
    expect(memory.writes()).toBe(0);
  });

  test("an already-held persisted receipt makes a stale requeue unchanged", () => {
    const succeeded = receipt(
      completion("current"),
      "sync",
      "succeeded",
      NOW,
    );
    const held = receipt(completion("current"), "sync", "pending", NOW);
    const callerState = withReceipts(succeeded);
    const persistedState = withReceipts(held);
    const memory = statePorts(persistedState);
    const result = prepareCompletionProjectVerification(
      verificationScope(memory.ports),
      callerState,
    );

    expect(result).toEqual({
      kind: "ready",
      state: persistedState,
      verificationRequired: true,
    });
    expect(memory.writes()).toBe(0);
  });

  test.each([
    [
      "compare-and-set conflict",
      (state: MirrorStateSnapshot) =>
        statePorts({ ...state, revision: state.revision + 1 }),
      "state revision changed to 5",
    ],
    [
      "invalid state",
      (state: MirrorStateSnapshot) =>
        statePorts(
          renderMirrorStateBlock(state).replace(
            `"revision":${state.revision}`,
            '"revision":"invalid"',
          ),
        ),
      "state became invalid:",
    ],
    [
      "state I/O failure",
      (state: MirrorStateSnapshot) => statePorts(state, false),
      "state lock unavailable",
    ],
  ] as const)(
    "%s blocks close with a retryable state-write warning",
    (_name, makePorts, summary) => {
      const succeeded = receipt(
        completion("current"),
        "sync",
        "succeeded",
        NOW,
      );
      const state = withReceipts(succeeded);
      const result = prepareCompletionProjectVerification(
        verificationScope(makePorts(state).ports),
        state,
      );

      expect(result).toMatchObject({
        kind: "blocked",
        outcome: {
          kind: "pending",
          operation: "sync",
          warning: {
            operationId: "op-sync",
            classification: "state-write",
            retryable: true,
            effect: "not-started",
            summary: expect.stringContaining(summary),
          },
        },
      });
    },
  );
});

describe("t359 stale close prompt retirement", () => {
  test("a matching persisted close prompt is consumed durably", () => {
    const event = mirrorEventIdentity(
      INTENT,
      completion("current"),
      "close",
    );
    const state: MirrorStateSnapshot = {
      ...withReceipts(),
      expectedPrompt: {
        bindingId: "binding-close",
        event,
        operation: "close",
        issuedAt: NOW,
      },
    };
    const memory = statePorts(state);
    const result = consumeStaleCloseApproval(
      verificationScope(memory.ports),
      state,
      { event, operation: "close" },
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new Error("expected a ready outcome");
    expect(result.verificationRequired).toBe(true);
    expect(result.state.expectedPrompt).toBeUndefined();
    expect(memory.writes()).toBeGreaterThan(0);
  });

  test("a stale caller conflict keeps the close approval pending", () => {
    const event = mirrorEventIdentity(
      INTENT,
      completion("current"),
      "close",
    );
    const state: MirrorStateSnapshot = {
      ...withReceipts(),
      expectedPrompt: {
        bindingId: "binding-close",
        event,
        operation: "close",
        issuedAt: NOW,
      },
    };
    const memory = statePorts({ ...state, revision: state.revision + 1 });
    const result = consumeStaleCloseApproval(
      verificationScope(memory.ports),
      state,
      { event, operation: "close" },
    );

    expect(result).toMatchObject({
      kind: "blocked",
      outcome: {
        kind: "pending",
        operation: "close",
        warning: {
          operationId: null,
          operation: "close",
          classification: "state-write",
          retryable: true,
          summary: expect.stringContaining("state revision changed to 5"),
        },
      },
    });
  });
});
