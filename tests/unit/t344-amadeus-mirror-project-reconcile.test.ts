// t344 — Project reconciliation semantics as pure functions: the failure
// classifier, the two ledger failure transitions across every state x result
// cell, and the receipt hold that parks a completed operation.
// covers: packages/framework/core/tools/amadeus-mirror-policy.ts
// covers: packages/framework/core/tools/amadeus-mirror-state-reducer.ts
// covers: packages/framework/core/tools/amadeus-mirror-state-codec.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  classifyProjectFailure,
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  reduceMirrorState,
  type MirrorTransition,
} from "../../packages/framework/core/tools/amadeus-mirror-state-reducer.ts";
import type {
  MirrorEventIdentity,
  MirrorFailureClass,
  MirrorOperationReceipt,
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorReceiptStatus,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";
const LATER = "2026-07-27T01:00:00Z";
const PROJECT = "amadeus-dlc/5";

const EVENT: MirrorEventIdentity = mirrorEventIdentity(
  "intent-1",
  { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
  "sync",
);
const KEY = mirrorEventKey(EVENT);

function entry(
  overrides: Partial<MirrorProjectSyncEntry> = {},
): MirrorProjectSyncEntry {
  return {
    project: PROJECT,
    projectId: "PVT_board",
    itemId: "PVTI_item1",
    phaseField: "Intent Phase",
    lastAppliedStatus: "Ideation",
    state: "synced",
    updatedAt: NOW,
    ...overrides,
  };
}

function withLedger(entries: MirrorProjectSyncEntry[]): MirrorStateSnapshot {
  return { ...EMPTY_MIRROR_STATE, projectSync: { projects: entries } };
}

function reduce(snapshot: MirrorStateSnapshot, transition: MirrorTransition) {
  return reduceMirrorState(snapshot, transition, NOW);
}

function ledgerOf(result: ReturnType<typeof reduce>): MirrorProjectSyncEntry[] {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed result, got '${result.kind}'`);
  }
  return [...(result.snapshot.projectSync?.projects ?? [])];
}

// The three transitions that can produce each ledger state, expressed as the
// "result" axis of the state x result matrix.
const RESULTS: ReadonlyArray<
  Readonly<{ state: MirrorProjectSyncState; transition: MirrorTransition }>
> = [
  {
    state: "synced",
    transition: {
      kind: "upsert-project-entry",
      entry: entry({ state: "synced", updatedAt: LATER }),
    },
  },
  {
    state: "pending",
    transition: {
      kind: "mark-project-pending",
      project: PROJECT,
      projectId: null,
      itemId: null,
      updatedAt: LATER,
    },
  },
  {
    state: "safety-blocked",
    transition: {
      kind: "mark-project-safety-blocked",
      project: PROJECT,
      projectId: null,
      itemId: null,
      updatedAt: LATER,
    },
  },
];

const STATES: readonly MirrorProjectSyncState[] = [
  "synced",
  "pending",
  "safety-blocked",
];

describe("t344 project failure classification", () => {
  test("transient and infrastructural classes stay retryable", () => {
    const retryable: MirrorFailureClass[] = [
      "rate-limit",
      "network",
      "api",
      "command",
      "state-write",
    ];
    for (const classification of retryable) {
      expect(classifyProjectFailure(classification)).toBe("pending");
    }
  });

  test("classes a retry cannot fix need a human instead", () => {
    const blocked: MirrorFailureClass[] = [
      "permission",
      "unauthenticated",
      "not-installed",
      "configuration",
      "invalid-response",
      "state-parse",
      "provenance",
      "landing",
      "ambiguous-create",
    ];
    for (const classification of blocked) {
      expect(classifyProjectFailure(classification)).toBe("safety-blocked");
    }
  });
});

describe("t344 ledger state x result matrix", () => {
  // All nine cells: the next state is a function of this round's result alone,
  // so no current state can pin a row or block a re-classification.
  for (const current of STATES) {
    for (const result of RESULTS) {
      test(`${current} + ${result.state} result -> ${result.state}`, () => {
        const before = withLedger([entry({ state: current })]);
        const rows = ledgerOf(reduce(before, result.transition));
        expect(rows).toHaveLength(1);
        expect(rows[0].state).toBe(result.state);
        expect(rows[0].updatedAt).toBe(LATER);
      });
    }
  }

  test("a synced row can be broken back to safety-blocked", () => {
    const before = withLedger([entry({ state: "synced" })]);
    const rows = ledgerOf(reduce(before, RESULTS[2].transition));
    expect(rows[0].state).toBe("safety-blocked");
  });

  test("a safety-blocked row can be lifted back to pending", () => {
    const before = withLedger([entry({ state: "safety-blocked" })]);
    const rows = ledgerOf(reduce(before, RESULTS[1].transition));
    expect(rows[0].state).toBe("pending");
  });
});

describe("t344 failure marks preserve unobserved identity", () => {
  test("pending keeps the column last actually applied", () => {
    const before = withLedger([
      entry({ state: "synced", lastAppliedStatus: "Inception" }),
    ]);
    const rows = ledgerOf(reduce(before, RESULTS[1].transition));
    expect(rows[0]).toEqual({
      project: PROJECT,
      projectId: "PVT_board",
      itemId: "PVTI_item1",
      phaseField: "Intent Phase",
      lastAppliedStatus: "Inception",
      state: "pending",
      updatedAt: LATER,
    });
  });

  test("safety-blocked keeps it too — a block is not an erasure", () => {
    const before = withLedger([
      entry({ state: "pending", lastAppliedStatus: "Construction" }),
    ]);
    const rows = ledgerOf(reduce(before, RESULTS[2].transition));
    expect(rows[0].lastAppliedStatus).toBe("Construction");
    expect(rows[0].projectId).toBe("PVT_board");
    expect(rows[0].phaseField).toBe("Intent Phase");
  });

  test("a mark supplies identity the failure did observe", () => {
    const rows = ledgerOf(
      reduce(EMPTY_MIRROR_STATE, {
        kind: "mark-project-pending",
        project: PROJECT,
        projectId: "PVT_seen",
        itemId: "PVTI_seen",
        updatedAt: LATER,
      }),
    );
    expect(rows[0]).toEqual({
      project: PROJECT,
      projectId: "PVT_seen",
      itemId: "PVTI_seen",
      phaseField: null,
      lastAppliedStatus: null,
      state: "pending",
      updatedAt: LATER,
    });
  });

  test("marking a Project with no prior row records nulls, not invented ids", () => {
    const rows = ledgerOf(reduce(EMPTY_MIRROR_STATE, RESULTS[2].transition));
    expect(rows[0].projectId).toBeNull();
    expect(rows[0].itemId).toBeNull();
    expect(rows[0].phaseField).toBeNull();
  });

  test("re-applying an identical mark is unchanged, so the revision holds", () => {
    const before = withLedger([
      entry({
        state: "pending",
        projectId: null,
        itemId: null,
        lastAppliedStatus: null,
        updatedAt: LATER,
      }),
    ]);
    expect(reduce(before, RESULTS[1].transition).kind).toBe("unchanged");
  });

  test("an empty project key is rejected rather than keyed as ''", () => {
    const result = reduce(EMPTY_MIRROR_STATE, {
      kind: "mark-project-pending",
      project: "",
      projectId: null,
      itemId: null,
      updatedAt: LATER,
    });
    expect(result.kind).toBe("invalid");
  });

  test("marking one Project leaves its siblings untouched", () => {
    const before = withLedger([
      entry({ project: "amadeus-dlc/4", state: "synced" }),
      entry({ project: PROJECT, state: "synced" }),
    ]);
    const rows = ledgerOf(reduce(before, RESULTS[1].transition));
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.project === "amadeus-dlc/4")?.state).toBe("synced");
    expect(rows.find((r) => r.project === PROJECT)?.state).toBe("pending");
  });
});

// --- the receipt hold -------------------------------------------------------

function receipt(
  status: MirrorReceiptStatus,
  overrides: Partial<MirrorOperationReceipt> = {},
): MirrorOperationReceipt {
  return {
    key: KEY,
    event: EVENT,
    operationId: "op-1",
    status,
    preparedAt: NOW,
    attemptedAt: NOW,
    ...(status === "succeeded" ? { completedAt: NOW } : {}),
    ...overrides,
  };
}

function withReceipt(r: MirrorOperationReceipt): MirrorStateSnapshot {
  return {
    ...EMPTY_MIRROR_STATE,
    issueNumber: 7,
    // The codec pairs issueNumber with provenance, so a linked fixture needs both.
    provenance: {
      schema: 1,
      createIdentity: {
        schema: 1,
        intentUuid: "intent-1",
        intentDir: "amadeus/spaces/default/intents/demo",
        repository: { owner: "acme", name: "app", canonical: "acme/app" },
        operationId: "op-create",
        preparedAt: NOW,
      },
      issueNumber: 7,
      createdAt: NOW,
    },
    receipts: { [KEY]: r },
  };
}

const HOLD: MirrorTransition = {
  kind: "hold-for-project-sync",
  event: EVENT,
  operationId: "op-1",
  heldAt: LATER,
};

function heldReceipt(result: ReturnType<typeof reduce>): MirrorOperationReceipt {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed result, got '${result.kind}'`);
  }
  return result.snapshot.receipts[KEY];
}

describe("t344 receipt hold", () => {
  test("a succeeded receipt parks at pending with its own reason", () => {
    const held = heldReceipt(reduce(withReceipt(receipt("succeeded")), HOLD));
    expect(held.status).toBe("pending");
    expect(held.projectSyncHold).toEqual({
      reason: "project-sync-unsettled",
      heldAt: LATER,
    });
  });

  test("the hold makes no claim about the Issue mutation", () => {
    const held = heldReceipt(reduce(withReceipt(receipt("succeeded")), HOLD));
    // Those two fields describe a failed Issue mutation, which did not happen.
    expect(held.failureClass).toBeUndefined();
    expect(held.lastEffect).toBeUndefined();
    // And the Issue side really did complete, so its timestamp stands.
    expect(held.completedAt).toBe(NOW);
  });

  test("a held receipt is IN_PROGRESS, never terminal", () => {
    const held = heldReceipt(reduce(withReceipt(receipt("succeeded")), HOLD));
    expect(held.status).not.toBe("safety-blocked");
    expect(held.status).toBe("pending");
  });

  test("re-applying the same hold is unchanged", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    expect(reduce(once.snapshot, HOLD).kind).toBe("unchanged");
  });

  test("completing clears the hold and restores succeeded", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    const done = reduce(once.snapshot, {
      kind: "complete",
      event: EVENT,
      issueNumber: 7,
      completedAt: LATER,
    });
    const settled = heldReceipt(done);
    expect(settled.status).toBe("succeeded");
    expect(settled.projectSyncHold).toBeUndefined();
  });

  // A held receipt converges through `complete`, never through an Issue-mutation
  // retry: those retries exist to resolve an unknown mutation outcome, and this
  // one is known to have succeeded. Both guards key off `lastEffect`, which the
  // hold deliberately leaves unset.
  for (const kind of ["claim-observed-retry", "retry-after-no-effect"] as const) {
    test(`a held receipt refuses '${kind}'`, () => {
      const once = reduce(withReceipt(receipt("succeeded")), HOLD);
      if (once.kind !== "changed") throw new Error("expected changed");
      const result = reduce(once.snapshot, {
        kind,
        event: EVENT,
        attemptedAt: LATER,
      });
      expect(result.kind).toBe("invalid");
    });
  }

  for (const status of [
    "prepared",
    "attempted",
    "safety-blocked",
    "abandoned",
  ] as const) {
    test(`a '${status}' receipt cannot be held — only a completion can`, () => {
      const extras =
        status === "safety-blocked" ? { failureClass: "network" as const } : {};
      const result = reduce(withReceipt(receipt(status, extras)), HOLD);
      expect(result.kind).toBe("invalid");
    });
  }

  test("a mismatched operationId is rejected", () => {
    const result = reduce(withReceipt(receipt("succeeded")), {
      ...HOLD,
      operationId: "op-other",
    });
    expect(result.kind).toBe("invalid");
  });

  test("holding an event with no receipt is rejected", () => {
    expect(reduce(EMPTY_MIRROR_STATE, HOLD).kind).toBe("invalid");
  });
});

describe("t344 hold survives the state document", () => {
  test("a held receipt round-trips without failureClass or lastEffect", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    const parsed = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock(once.snapshot)}\n`,
    );
    if (parsed.kind !== "ok") {
      throw new Error(`unexpected invalid parse: ${parsed.issues.join("; ")}`);
    }
    expect(parsed.snapshot.receipts[KEY].projectSyncHold).toEqual({
      reason: "project-sync-unsettled",
      heldAt: LATER,
    });
    expect(parsed.snapshot.receipts[KEY].failureClass).toBeUndefined();
  });

  test("a pending receipt with neither a hold nor a failure class is invalid", () => {
    const parsed = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock(withReceipt(receipt("pending")))}\n`,
    );
    expect(parsed.kind).toBe("invalid");
  });

  test("a hold on any status other than pending is invalid", () => {
    const bad = withReceipt(
      receipt("succeeded", {
        projectSyncHold: { reason: "project-sync-unsettled", heldAt: LATER },
      }),
    );
    const parsed = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock(bad)}\n`,
    );
    expect(parsed.kind).toBe("invalid");
  });

  test("an unknown hold reason is rejected rather than coerced", () => {
    const document = `# State\n\n${renderMirrorStateBlock(
      withReceipt(receipt("succeeded")),
    ).replace('"status":"succeeded"', '"status":"pending","projectSyncHold":{"reason":"whatever","heldAt":"2026-07-27T01:00:00Z"}')}\n`;
    expect(parseMirrorStateDocument(document).kind).toBe("invalid");
  });

  test("a ledger row whose Project never resolved round-trips a null projectId", () => {
    const snapshot = withLedger([entry({ projectId: null, state: "pending" })]);
    const parsed = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock(snapshot)}\n`,
    );
    if (parsed.kind !== "ok") {
      throw new Error(`unexpected invalid parse: ${parsed.issues.join("; ")}`);
    }
    expect(parsed.snapshot.projectSync?.projects[0].projectId).toBeNull();
  });
});
