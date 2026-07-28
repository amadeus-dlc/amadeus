// t359 — final Project verification migration selection.
// covers: packages/framework/core/tools/amadeus-mirror-project-verification.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  consumeStaleCloseApproval,
  currentFinalSyncEvidenceKey,
  finalSyncEvidenceReady,
  finalSyncReceiptKey,
  prepareCompletionProjectVerification,
  selectCompletionSyncReconciliation,
  type ProjectVerificationScope,
} from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
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
// These instances encode to keys whose code-unit order differs from
// localeCompare; the first key also sorts first, exposing preparedAt precedence.
const CODE_UNIT_FIRST_KEY_INSTANCE = "Mdu7Q03K";
const CODE_UNIT_SECOND_KEY_INSTANCE = "sZx2NueV";
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

function authorized(
  candidate: MirrorOperationReceipt,
  receiptRevision: number,
): MirrorOperationReceipt {
  return {
    ...candidate,
    authorization: {
      kind: "auto",
      event: candidate.event,
      operation: candidate.event.operation,
      boundaryInstance: candidate.event.boundary.instance,
      receiptRevision,
      resolvedMode: "auto",
    },
  };
}

function createdAtRevision(
  candidate: MirrorOperationReceipt,
  createdRevision: number,
): MirrorOperationReceipt {
  return { ...candidate, createdRevision };
}

function withReceipts(
  ...receipts: MirrorOperationReceipt[]
): MirrorStateSnapshot {
  const revision = Math.max(
    4,
    ...receipts.map(
      (candidate) =>
        candidate.createdRevision ??
        candidate.authorization?.receiptRevision ??
        0,
    ),
  );
  return {
    ...EMPTY_MIRROR_STATE,
    revision,
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
  boundary: MirrorBoundary = completion("current"),
  operation: MirrorOperation = "close",
): ProjectVerificationScope {
  return {
    intentUuid: INTENT,
    boundary,
    operation,
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
    const state = withReceipts(oldClose, heldSync);
    const selected = selectCompletionSyncReconciliation({
      state,
      intentUuid: INTENT,
      boundary,
      fallback: {
        receiptKey: oldClose.key,
        originalEvent: oldClose.event,
        operationId: oldClose.operationId,
        expectedRevision: state.revision,
      },
    });

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
      selectCompletionSyncReconciliation({
        state: withReceipts(completed),
        intentUuid: INTENT,
        boundary: completion("current"),
        fallback: null,
      }),
    ).toBeNull();
  });

  test("a manual close selects the newest succeeded sync deterministically", () => {
    const oldUnverified = receipt(
      completion("old"),
      "sync",
      "succeeded",
      NOW,
    );
    const currentVerified = {
      ...receipt(completion("current"), "sync", "succeeded", LATER),
      projectSyncVerified: true as const,
    };
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );
    const state: MirrorStateSnapshot = {
      ...withReceipts(oldUnverified, currentVerified),
      projectSync: {
        projects: [
          {
            project: "acme/5",
            projectId: "PVT_5",
            itemId: "PVTI_5",
            phaseField: "Intent Phase",
            lastAppliedStatus: "Done",
            state: "synced",
            updatedAt: LATER,
          },
        ],
      },
    };

    expect(
      finalSyncReceiptKey(state, manual),
    ).toBe(currentVerified.key);
    expect(
      finalSyncReceiptKey(
        withReceipts(currentVerified, oldUnverified),
        manual,
      ),
    ).toBe(currentVerified.key);
    expect(
      currentFinalSyncEvidenceKey({
        state,
        event: manual,
        snapshot: landed(),
        projects: [TARGET],
      }),
    ).toBe(currentVerified.key);
    expect(
      finalSyncEvidenceReady({
        state,
        event: manual,
        snapshot: landed(),
        projects: [TARGET],
        receiptKey: oldUnverified.key,
      }),
    ).toBe(false);
    expect(
      finalSyncEvidenceReady({
        state,
        event: manual,
        projects: [],
        receiptKey: oldUnverified.key,
      }),
    ).toBe(false);
  });

  test("durable receipt revision outranks a rolled-back wall clock", () => {
    const causallyOlder = authorized(
      receipt(completion("causally-older"), "sync", "succeeded", LATER),
      10,
    );
    const causallyNewer = authorized(
      receipt(completion("causally-newer"), "sync", "succeeded", NOW),
      20,
    );
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(
      finalSyncReceiptKey(
        withReceipts(causallyOlder, causallyNewer),
        manual,
      ),
    ).toBe(causallyNewer.key);
    expect(
      finalSyncReceiptKey(
        withReceipts(causallyNewer, causallyOlder),
        manual,
      ),
    ).toBe(causallyNewer.key);
  });

  test("legacy evidence makes wall clock the common migration order", () => {
    const legacy = receipt(
      completion("legacy"),
      "sync",
      "succeeded",
      LATER,
    );
    const current = authorized(
      receipt(completion("authorized"), "sync", "succeeded", NOW),
      10,
    );
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(finalSyncReceiptKey(withReceipts(legacy, current), manual)).toBe(
      legacy.key,
    );
  });

  test("a later legacy skip prevents stale succeeded evidence from closing", () => {
    const oldSucceeded = authorized(
      receipt(completion("old-succeeded"), "sync", "succeeded", NOW),
      10,
    );
    const laterSkip = receipt(
      completion("later-skip"),
      "sync",
      "skipped-for-event",
      LATER,
    );
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(
      finalSyncReceiptKey(withReceipts(oldSucceeded, laterSkip), manual),
    ).toBeUndefined();
    expect(
      finalSyncReceiptKey(withReceipts(laterSkip, oldSucceeded), manual),
    ).toBeUndefined();
  });

  test("created revision orders a later skip despite wall-clock rollback", () => {
    const legacySucceeded = receipt(
      completion("legacy-succeeded"),
      "sync",
      "succeeded",
      LATER,
    );
    const oldSucceeded = createdAtRevision(
      authorized(
        receipt(completion("old-succeeded"), "sync", "succeeded", LATER),
        10,
      ),
      10,
    );
    const laterSkip = createdAtRevision(
      receipt(
        completion("later-skip"),
        "sync",
        "skipped-for-event",
        NOW,
      ),
      20,
    );
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(
      finalSyncReceiptKey(
        withReceipts(legacySucceeded, oldSucceeded, laterSkip),
        manual,
      ),
    ).toBeUndefined();
    expect(
      finalSyncReceiptKey(
        withReceipts(laterSkip, oldSucceeded, legacySucceeded),
        manual,
      ),
    ).toBeUndefined();
  });

  test.each([
    "2026-99-99T00:00:00Z",
    "2026-02-30T00:00:00Z",
  ])("an impossible legacy timestamp '%s' fails closed", (invalidAt) => {
    const valid = receipt(
      completion("valid"),
      "sync",
      "succeeded",
      NOW,
    );
    const invalid = {
      ...receipt(
        completion("invalid"),
        "sync",
        "succeeded",
        invalidAt,
      ),
      projectSyncVerified: true as const,
    };
    const state = withReceipts(valid, invalid);
    const boundary = { kind: "manual", instance: "manual-close" } as const;
    const manual = mirrorEventIdentity(INTENT, boundary, "close");

    expect(
      parseMirrorStateDocument(renderMirrorStateBlock(state)).kind,
    ).toBe("invalid");
    expect(finalSyncReceiptKey(state, manual)).toBeUndefined();
    expect(
      selectCompletionSyncReconciliation({
        state,
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: {
          receiptKey: valid.key,
          originalEvent: valid.event,
          operationId: valid.operationId,
          expectedRevision: state.revision,
        },
      }),
    ).toBeNull();
  });

  test("a newest pending hold prevents an older succeeded receipt from becoming evidence", () => {
    const oldVerified = {
      ...receipt(completion("old"), "sync", "succeeded", NOW),
      operationId: "op-old",
      projectSyncVerified: true as const,
    };
    const newestHeld = {
      ...receipt(completion("newest"), "sync", "pending", LATER),
      operationId: "op-newest",
      completedAt: LATER,
    };
    const boundary = { kind: "manual", instance: "manual-close" } as const;
    const manual = mirrorEventIdentity(INTENT, boundary, "close");
    const state: MirrorStateSnapshot = {
      ...withReceipts(oldVerified, newestHeld),
      projectSync: {
        projects: [
          {
            project: "acme/4",
            projectId: "PVT_4",
            itemId: "PVTI_4",
            phaseField: "Intent Phase",
            lastAppliedStatus: "Done",
            state: "synced",
            updatedAt: NOW,
          },
        ],
      },
    };
    const memory = statePorts(state);

    expect(finalSyncReceiptKey(state, manual)).toBeUndefined();
    expect(
      finalSyncEvidenceReady({
        state,
        event: manual,
        projects: [],
        receiptKey: oldVerified.key,
      }),
    ).toBe(false);
    expect(
      selectCompletionSyncReconciliation({
        state,
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: null,
      })?.receiptKey,
    ).toBe(newestHeld.key);
    const prepared = prepareCompletionProjectVerification(
      verificationScope(memory.ports, [TARGET], boundary),
      state,
    );
    expect(prepared).toEqual({
      kind: "ready",
      state,
      verificationRequired: true,
    });
    expect(memory.writes()).toBe(0);
    expect(state.receipts[oldVerified.key].status).toBe("succeeded");
  });

  test("same-time completion receipts use verification and then key as stable tie-breakers", () => {
    const unverified = {
      ...receipt(completion("tie-unverified"), "sync", "succeeded", NOW),
      operationId: "op-unverified",
    };
    const verified = {
      ...receipt(
        completion(CODE_UNIT_FIRST_KEY_INSTANCE),
        "sync",
        "succeeded",
        NOW,
      ),
      operationId: "op-verified",
      projectSyncVerified: true as const,
    };
    const verifiedPeer = {
      ...receipt(
        completion(CODE_UNIT_SECOND_KEY_INSTANCE),
        "sync",
        "succeeded",
        NOW,
      ),
      operationId: "op-peer",
      projectSyncVerified: true as const,
    };
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(
      finalSyncReceiptKey(withReceipts(unverified, verified), manual),
    ).toBe(verified.key);
    const expectedKey = [verified.key, verifiedPeer.key].sort()[0];
    expect(
      finalSyncReceiptKey(withReceipts(verified, verifiedPeer), manual),
    ).toBe(expectedKey);
    expect(
      finalSyncReceiptKey(withReceipts(verifiedPeer, verified), manual),
    ).toBe(expectedKey);
  });

  test("preparedAt breaks a completedAt tie before the receipt key", () => {
    const olderPrepared = {
      ...receipt(
        completion(CODE_UNIT_FIRST_KEY_INSTANCE),
        "sync",
        "succeeded",
        NOW,
      ),
      operationId: "op-older-prepared",
      completedAt: "2026-07-29T00:00:00Z",
      projectSyncVerified: true as const,
    };
    const newerPrepared = {
      ...receipt(
        completion(CODE_UNIT_SECOND_KEY_INSTANCE),
        "sync",
        "succeeded",
        LATER,
      ),
      operationId: "op-newer-prepared",
      completedAt: "2026-07-29T00:00:00Z",
      projectSyncVerified: true as const,
    };
    const state = withReceipts(newerPrepared, olderPrepared);
    const manual = mirrorEventIdentity(
      INTENT,
      { kind: "manual", instance: "manual-close" },
      "close",
    );

    expect(olderPrepared.key < newerPrepared.key).toBe(true);
    expect(
      parseMirrorStateDocument(renderMirrorStateBlock(state)).kind,
    ).toBe("ok");
    expect(finalSyncReceiptKey(state, manual)).toBe(newerPrepared.key);
  });

  test.each([
    [
      "fractional seconds",
      "2026-01-01T00:00:00Z",
      "2026-01-01T00:00:00.100Z",
    ],
    [
      "UTC offsets",
      "2026-01-01T00:00:00+09:00",
      "2025-12-31T16:00:00Z",
    ],
  ] as const)(
    "valid %s timestamps select the chronologically newest receipt",
    (_format, olderAt, newerAt) => {
      const olderSucceeded = receipt(
        completion("older-time"),
        "sync",
        "succeeded",
        olderAt,
      );
      const newerPending = {
        ...receipt(completion("newer-time"), "sync", "pending", newerAt),
        operationId: "op-newer",
      };
      const state = withReceipts(olderSucceeded, newerPending);
      const boundary = {
        kind: "manual",
        instance: "manual-close",
      } as const;

      expect(
        parseMirrorStateDocument(renderMirrorStateBlock(state)).kind,
      ).toBe("ok");
      expect(
        finalSyncReceiptKey(
          state,
          mirrorEventIdentity(INTENT, boundary, "close"),
        ),
      ).toBeUndefined();
      expect(
        selectCompletionSyncReconciliation({
          state,
          intentUuid: INTENT,
          boundary,
          operation: "close",
          fallback: null,
        })?.receiptKey,
      ).toBe(newerPending.key);
    },
  );

  test("older pending holds do not mask a newest succeeded receipt", () => {
    const oldestHeld = {
      ...receipt(completion("oldest"), "sync", "pending", NOW),
      operationId: "op-oldest",
      completedAt: NOW,
    };
    const olderHeld = {
      ...receipt(completion("older"), "sync", "pending", NOW),
      operationId: "op-older",
      completedAt: NOW,
    };
    const newestVerified = {
      ...receipt(completion("newest"), "sync", "succeeded", LATER),
      operationId: "op-newest",
      projectSyncVerified: true as const,
    };
    const boundary = { kind: "manual", instance: "manual-close" } as const;
    const expectedHeldKey = [oldestHeld.key, olderHeld.key].sort()[0];
    expect(
      selectCompletionSyncReconciliation({
        state: withReceipts(oldestHeld, olderHeld),
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: null,
      })?.receiptKey,
    ).toBe(expectedHeldKey);
    expect(
      selectCompletionSyncReconciliation({
        state: withReceipts(olderHeld, oldestHeld),
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: null,
      })?.receiptKey,
    ).toBe(expectedHeldKey);
    const state = withReceipts(oldestHeld, newestVerified, olderHeld);
    const fallback = {
      receiptKey: olderHeld.key,
      originalEvent: olderHeld.event,
      operationId: olderHeld.operationId,
      expectedRevision: state.revision,
    };

    expect(
      selectCompletionSyncReconciliation({
        state,
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: null,
      }),
    ).toBeNull();
    expect(
      finalSyncReceiptKey(
        state,
        mirrorEventIdentity(INTENT, boundary, "close"),
      ),
    ).toBe(newestVerified.key);
    expect(
      selectCompletionSyncReconciliation({
        state,
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback,
      }),
    ).toBeNull();
  });

  test.each(["prepared", "attempted", "pending"] as const)(
    "the newest normal '%s' receipt wins over an older generic fallback",
    (status) => {
      const oldHeld = {
        ...receipt(completion("old"), "sync", "pending", NOW),
        operationId: "op-old",
        completedAt: NOW,
      };
      const rawNewest = {
        ...receipt(completion("newest"), "sync", status, LATER),
        operationId: "op-newest",
      };
      const { projectSyncHold: _hold, ...newest } = rawNewest;
      const validNewest =
        status === "pending"
          ? {
              ...newest,
              failureClass: "network" as const,
              lastEffect: "outcome-unknown" as const,
            }
          : newest;
      const state = withReceipts(oldHeld, validNewest);
      const boundary = {
        kind: "manual",
        instance: "manual-close",
      } as const;
      expect(
        parseMirrorStateDocument(renderMirrorStateBlock(state)).kind,
      ).toBe("ok");
      const selected = selectCompletionSyncReconciliation({
        state,
        intentUuid: INTENT,
        boundary,
        operation: "close",
        fallback: {
          receiptKey: oldHeld.key,
          originalEvent: oldHeld.event,
          operationId: oldHeld.operationId,
          expectedRevision: state.revision,
        },
      });

      expect(selected?.receiptKey).toBe(validNewest.key);
    },
  );
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

  test("a manual close requeues its latest final sync when current Project config drifted", () => {
    const completed = {
      ...receipt(completion("previous"), "sync", "succeeded", LATER),
      projectSyncVerified: true as const,
    };
    const state: MirrorStateSnapshot = {
      ...withReceipts(completed),
      projectSync: {
        projects: [
          {
            project: "acme/4",
            projectId: "PVT_4",
            itemId: "PVTI_4",
            phaseField: "Intent Phase",
            lastAppliedStatus: "Done",
            state: "synced",
            updatedAt: NOW,
          },
        ],
      },
    };
    const memory = statePorts(state);
    const manual = { kind: "manual", instance: "manual-close" } as const;
    const result = prepareCompletionProjectVerification(
      verificationScope(memory.ports, [TARGET], manual),
      state,
    );

    expect(result.kind).toBe("ready");
    if (result.kind !== "ready") throw new Error("expected ready");
    expect(result.verificationRequired).toBe(true);
    expect(result.state.receipts[completed.key]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(result.state.receipts[completed.key].projectSyncVerified).toBeUndefined();
    expect(memory.writes()).toBeGreaterThan(0);
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
