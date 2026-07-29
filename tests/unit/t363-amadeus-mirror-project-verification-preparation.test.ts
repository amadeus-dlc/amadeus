// t363 — Project verification preparation and stale prompt retirement.
// covers: packages/framework/core/tools/amadeus-mirror-project-verification.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  consumeStaleCloseApproval,
  prepareCompletionProjectVerification,
} from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import { mirrorEventIdentity } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { renderMirrorStateBlock } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateSnapshot } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  completion,
  INTENT,
  LATER,
  NOW,
  receipt,
  statePorts,
  TARGET,
  verificationScope,
  withReceipts,
} from "../helpers/amadeus-mirror-project-verification-fixture.ts";

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
    expect(
      result.state.receipts[completed.key].projectSyncVerified,
    ).toBeUndefined();
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
