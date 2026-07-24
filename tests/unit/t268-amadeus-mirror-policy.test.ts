// t268 — pure mirror policy: event identity, decision, prompt approval, chain.
// covers: packages/framework/core/tools/amadeus-mirror-policy.ts
// size: small

import { describe, expect, test } from "bun:test";
import type {
  MirrorBoundary,
  MirrorEventIdentity,
  MirrorExpectedPrompt,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorReceiptStatus,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  approveMirrorPrompt,
  decideMirrorAction,
  mirrorEventIdentity,
  mirrorEventKey,
  nextCompletionOperation,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";

const UUID = "u-1";

function wc(instance: string): Extract<MirrorBoundary, { kind: "workflow-completed" }> {
  return { kind: "workflow-completed", instance };
}

function ev(boundary: MirrorBoundary, operation: MirrorOperation): MirrorEventIdentity {
  return mirrorEventIdentity(UUID, boundary, operation);
}

function snapshot(
  partial: Partial<MirrorStateSnapshot> = {},
): MirrorStateSnapshot {
  return {
    revision: 1,
    issueNumber: null,
    provenance: null,
    receipts: {},
    warnings: [],
    repairChallenges: {},
    ...partial,
  };
}

function receipt(
  event: MirrorEventIdentity,
  status: MirrorReceiptStatus,
  operationId = "op-1",
): MirrorOperationReceipt {
  return {
    key: mirrorEventKey(event),
    event,
    operationId,
    status,
    preparedAt: "2026-01-01T00:00:00Z",
  };
}

function receiptsOf(
  ...list: MirrorOperationReceipt[]
): Record<string, MirrorOperationReceipt> {
  const map: Record<string, MirrorOperationReceipt> = {};
  for (const item of list) map[item.key] = item;
  return map;
}

describe("t268 event key golden vectors", () => {
  test("encodes the versioned positional tuple as base64url", () => {
    expect(mirrorEventKey(ev(wc("wc-1"), "create"))).toBe(
      "mirror-event:v1:WyJtaXJyb3ItZXZlbnQiLDEsInUtMSIsIndvcmtmbG93LWNvbXBsZXRlZCIsIndjLTEiLCJjcmVhdGUiXQ",
    );
    expect(mirrorEventKey(ev(wc("wc-1"), "sync"))).toBe(
      "mirror-event:v1:WyJtaXJyb3ItZXZlbnQiLDEsInUtMSIsIndvcmtmbG93LWNvbXBsZXRlZCIsIndjLTEiLCJzeW5jIl0",
    );
    expect(
      mirrorEventKey(ev({ kind: "manual", instance: "m-1" }, "create")),
    ).toBe(
      "mirror-event:v1:WyJtaXJyb3ItZXZlbnQiLDEsInUtMSIsIm1hbnVhbCIsIm0tMSIsImNyZWF0ZSJd",
    );
  });

  test("same boundary instance and operation yield the same key", () => {
    expect(mirrorEventKey(ev(wc("wc-1"), "create"))).toBe(
      mirrorEventKey(ev(wc("wc-1"), "create")),
    );
  });

  test("a different instance or operation yields a different key", () => {
    const base = mirrorEventKey(ev(wc("wc-1"), "create"));
    expect(base).not.toBe(mirrorEventKey(ev(wc("wc-2"), "create")));
    expect(base).not.toBe(mirrorEventKey(ev(wc("wc-1"), "sync")));
  });
});

describe("t268 decideMirrorAction lifecycle", () => {
  test("off suppresses before any pending or issue is considered", () => {
    const event = ev({ kind: "phase-verified", phase: "inception", instance: "p-1" }, "sync");
    const state = snapshot({
      issueNumber: 7,
      receipts: receiptsOf(receipt(event, "pending")),
    });
    expect(decideMirrorAction({ kind: "lifecycle", mode: "off", event, state })).toEqual({
      kind: "suppress",
      reason: "off",
    });
  });

  test("prompt asks for the current event", () => {
    const event = ev({ kind: "intent-capture-approved", instance: "ic-1" }, "create");
    expect(
      decideMirrorAction({ kind: "lifecycle", mode: "prompt", event, state: snapshot() }),
    ).toEqual({ kind: "prompt", operation: "create", event });
  });

  test("auto executes the current event", () => {
    const event = ev(wc("wc-1"), "create");
    expect(
      decideMirrorAction({ kind: "lifecycle", mode: "auto", event, state: snapshot() }),
    ).toEqual({ kind: "execute", operation: "create", event });
  });

  test("an operation not applicable to the boundary is suppressed", () => {
    const event = ev({ kind: "intent-capture-approved", instance: "ic-1" }, "close");
    expect(
      decideMirrorAction({ kind: "lifecycle", mode: "auto", event, state: snapshot() }),
    ).toEqual({ kind: "suppress", reason: "not-applicable" });
  });

  test("a skipped-for-event receipt suppresses only that event", () => {
    const skipped = ev({ kind: "phase-verified", phase: "inception", instance: "p-1" }, "sync");
    const other = ev({ kind: "phase-verified", phase: "construction", instance: "p-2" }, "sync");
    const state = snapshot({ receipts: receiptsOf(receipt(skipped, "skipped-for-event")) });
    expect(
      decideMirrorAction({ kind: "lifecycle", mode: "prompt", event: skipped, state }),
    ).toEqual({ kind: "suppress", reason: "skipped-for-event" });
    // A distinct boundary instance is re-evaluated under the current mode.
    expect(
      decideMirrorAction({ kind: "lifecycle", mode: "prompt", event: other, state }),
    ).toEqual({ kind: "prompt", operation: "sync", event: other });
  });

  test.each(["prepared", "attempted", "pending"] as const)(
    "a %s receipt attaches retryOf to the decision",
    (status) => {
      const event = ev({ kind: "parked", stage: "code-generation", instance: "pk-1" }, "sync");
      const state = snapshot({ receipts: receiptsOf(receipt(event, status, "op-9")) });
      expect(
        decideMirrorAction({ kind: "lifecycle", mode: "auto", event, state }),
      ).toEqual({
        kind: "execute",
        operation: "sync",
        event,
        retryOf: { event, operationId: "op-9" },
      });
    },
  );
});

describe("t268 decideMirrorAction manual", () => {
  test("manual executes the explicit operation without reading mode", () => {
    const event: MirrorEventIdentity & {
      boundary: Extract<MirrorBoundary, { kind: "manual" }>;
    } = { intentUuid: UUID, boundary: { kind: "manual", instance: "m-1" }, operation: "close" };
    expect(decideMirrorAction({ kind: "manual", event, state: snapshot() })).toEqual({
      kind: "execute",
      operation: "close",
      event,
    });
  });
});

describe("t268 approveMirrorPrompt", () => {
  const event = ev(wc("wc-1"), "create");
  const expected: MirrorExpectedPrompt = {
    event,
    operation: "create",
    issuedAt: "2026-01-01T00:00:00Z",
  };
  const bound = snapshot({ expectedPrompt: expected });

  test("approves an exact matching answer", () => {
    expect(
      approveMirrorPrompt({ expected, answer: { event, operation: "create" }, state: bound }),
    ).toEqual({ kind: "execute", operation: "create", event });
  });

  test("rejects a different operation", () => {
    expect(
      approveMirrorPrompt({ expected, answer: { event, operation: "sync" }, state: bound }),
    ).toEqual({ kind: "suppress", reason: "not-applicable" });
  });

  test("rejects a different event instance", () => {
    const other = ev(wc("wc-2"), "create");
    expect(
      approveMirrorPrompt({ expected, answer: { event: other, operation: "create" }, state: bound }),
    ).toEqual({ kind: "suppress", reason: "not-applicable" });
  });

  test("rejects when the state no longer holds that expected prompt", () => {
    expect(
      approveMirrorPrompt({ expected, answer: { event, operation: "create" }, state: snapshot() }),
    ).toEqual({ kind: "suppress", reason: "not-applicable" });
  });
});

describe("t268 nextCompletionOperation chain", () => {
  const boundary = wc("wc-1");
  const input = (state: MirrorStateSnapshot): Parameters<typeof nextCompletionOperation>[0] => ({
    intentUuid: UUID,
    boundary,
    state,
  });
  const createEv = ev(boundary, "create");
  const syncEv = ev(boundary, "sync");
  const closeEv = ev(boundary, "close");

  test("no receipts and no issue selects create", () => {
    expect(nextCompletionOperation(input(snapshot()))).toBe("create");
  });

  test.each(["prepared", "attempted", "pending"] as const)(
    "a %s create receipt keeps returning create",
    (status) => {
      const state = snapshot({ receipts: receiptsOf(receipt(createEv, status)) });
      expect(nextCompletionOperation(input(state))).toBe("create");
    },
  );

  test.each(["skipped-for-event", "safety-blocked", "abandoned"] as const)(
    "a terminally blocked create (%s) suppresses the whole chain",
    (status) => {
      const state = snapshot({ receipts: receiptsOf(receipt(createEv, status)) });
      expect(nextCompletionOperation(input(state))).toBeNull();
    },
  );

  test("a succeeded create advances to sync", () => {
    const state = snapshot({ receipts: receiptsOf(receipt(createEv, "succeeded")) });
    expect(nextCompletionOperation(input(state))).toBe("sync");
  });

  test("an existing issue with no create receipt advances to sync", () => {
    expect(nextCompletionOperation(input(snapshot({ issueNumber: 42 })))).toBe("sync");
  });

  test("a succeeded sync advances to close", () => {
    const state = snapshot({
      receipts: receiptsOf(receipt(createEv, "succeeded"), receipt(syncEv, "succeeded")),
    });
    expect(nextCompletionOperation(input(state))).toBe("close");
  });

  test("a terminally blocked sync stops before close", () => {
    const state = snapshot({
      receipts: receiptsOf(receipt(createEv, "succeeded"), receipt(syncEv, "skipped-for-event")),
    });
    expect(nextCompletionOperation(input(state))).toBeNull();
  });

  test("a succeeded close ends the chain", () => {
    const state = snapshot({
      receipts: receiptsOf(
        receipt(createEv, "succeeded"),
        receipt(syncEv, "succeeded"),
        receipt(closeEv, "succeeded"),
      ),
    });
    expect(nextCompletionOperation(input(state))).toBeNull();
  });

  test("an in-progress close keeps returning close", () => {
    const state = snapshot({
      receipts: receiptsOf(
        receipt(createEv, "succeeded"),
        receipt(syncEv, "succeeded"),
        receipt(closeEv, "attempted"),
      ),
    });
    expect(nextCompletionOperation(input(state))).toBe("close");
  });

  test("a corrupted receipt status fails fast", () => {
    const corrupted = {
      ...receipt(createEv, "succeeded"),
      status: "weird" as MirrorReceiptStatus,
    };
    const state = snapshot({ receipts: receiptsOf(corrupted) });
    expect(() => nextCompletionOperation(input(state))).toThrow(
      "unknown mirror receipt status",
    );
  });
});
