// t359 — final Project verification migration selection.
// covers: packages/framework/core/tools/amadeus-mirror-project-verification.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  currentFinalSyncEvidenceKey,
  finalSyncEvidenceReady,
  finalSyncReceiptKey,
  prepareCompletionProjectVerification,
  selectCompletionSyncReconciliation,
} from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import { mirrorEventIdentity } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateSnapshot } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  authorized,
  CODE_UNIT_FIRST_KEY_INSTANCE,
  CODE_UNIT_SECOND_KEY_INSTANCE,
  completion,
  createdAtRevision,
  INTENT,
  landed,
  LATER,
  NOW,
  receipt,
  statePorts,
  TARGET,
  verificationScope,
  withReceipts,
} from "../helpers/amadeus-mirror-project-verification-fixture.ts";

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
