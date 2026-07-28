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
  reduceProjectLedgerPlan,
  type MirrorProjectLedgerPlan,
  type MirrorProjectLedgerRowTransition,
  type ProjectLedgerReduction,
} from "../../packages/framework/core/tools/amadeus-mirror-project-ledger-reducer.ts";
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
  MirrorWarning,
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

function reduceLedger(
  snapshot: MirrorStateSnapshot,
  row: MirrorProjectLedgerRowTransition,
): ProjectLedgerReduction {
  const project =
    row.kind === "upsert-project-entry"
      ? row.entry.project
      : row.project;
  return reduceProjectLedgerPlan(snapshot.projectSync, {
    activeProjects: [project],
    rows: [row],
  });
}

function reducePlan(
  snapshot: MirrorStateSnapshot,
  plan: MirrorProjectLedgerPlan,
): ProjectLedgerReduction {
  return reduceProjectLedgerPlan(snapshot.projectSync, plan);
}

function ledgerOf(result: ProjectLedgerReduction): MirrorProjectSyncEntry[] {
  if (result.kind !== "changed") {
    throw new Error(`expected a changed result, got '${result.kind}'`);
  }
  return [...(result.ledger?.projects ?? [])];
}

// The three transitions that can produce each ledger state, expressed as the
// "result" axis of the state x result matrix.
const RESULTS: ReadonlyArray<
  Readonly<{
    state: MirrorProjectSyncState;
    transition: MirrorProjectLedgerRowTransition;
  }>
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
        const rows = ledgerOf(reduceLedger(before, result.transition));
        expect(rows).toHaveLength(1);
        expect(rows[0].state).toBe(result.state);
        expect(rows[0].updatedAt).toBe(LATER);
      });
    }
  }

  test("a synced row can be broken back to safety-blocked", () => {
    const before = withLedger([entry({ state: "synced" })]);
    const rows = ledgerOf(reduceLedger(before, RESULTS[2].transition));
    expect(rows[0].state).toBe("safety-blocked");
  });

  test("a safety-blocked row can be lifted back to pending", () => {
    const before = withLedger([entry({ state: "safety-blocked" })]);
    const rows = ledgerOf(reduceLedger(before, RESULTS[1].transition));
    expect(rows[0].state).toBe("pending");
  });
});

describe("t344 failure marks preserve unobserved identity", () => {
  test("upsert rejects empty Project identity fields", () => {
    const cases = [
      {
        entry: entry({ project: "" }),
        issue: "project-ledger-plan: active Project must be non-empty",
      },
      {
        entry: entry({ projectId: "" }),
        issue: "upsert-project-entry: projectId must be non-empty or null",
      },
      {
        entry: entry({ phaseField: "" }),
        issue: "upsert-project-entry: phaseField must be non-empty or null",
      },
    ];

    for (const invalid of cases) {
      expect(
        reduceLedger(EMPTY_MIRROR_STATE, {
          kind: "upsert-project-entry",
          entry: invalid.entry,
        }),
      ).toEqual({ kind: "invalid", issues: [invalid.issue] });
    }
  });

  test("pending keeps the column last actually applied", () => {
    const before = withLedger([
      entry({ state: "synced", lastAppliedStatus: "Inception" }),
    ]);
    const rows = ledgerOf(reduceLedger(before, RESULTS[1].transition));
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
    const rows = ledgerOf(reduceLedger(before, RESULTS[2].transition));
    expect(rows[0].lastAppliedStatus).toBe("Construction");
    expect(rows[0].projectId).toBe("PVT_board");
    expect(rows[0].phaseField).toBe("Intent Phase");
  });

  test("a mark supplies identity the failure did observe", () => {
    const rows = ledgerOf(
      reduceLedger(EMPTY_MIRROR_STATE, {
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
    const rows = ledgerOf(
      reduceLedger(EMPTY_MIRROR_STATE, RESULTS[2].transition),
    );
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
    expect(reduceLedger(before, RESULTS[1].transition).kind).toBe("unchanged");
  });

  test("an empty project key is rejected rather than keyed as ''", () => {
    const result = reduceLedger(EMPTY_MIRROR_STATE, {
      kind: "mark-project-pending",
      project: "",
      projectId: null,
      itemId: null,
      updatedAt: LATER,
    });
    expect(result.kind).toBe("invalid");
  });

  test("a full plan updates one Project and retains its sibling verdict", () => {
    const sibling = entry({
      project: "amadeus-dlc/4",
      state: "synced",
    });
    const before = withLedger([
      sibling,
      entry({ project: PROJECT, state: "synced" }),
    ]);
    const rows = ledgerOf(
      reducePlan(before, {
        activeProjects: [sibling.project, PROJECT],
        rows: [
          { kind: "upsert-project-entry", entry: sibling },
          RESULTS[1].transition,
        ],
      }),
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.project === "amadeus-dlc/4")?.state).toBe("synced");
    expect(rows.find((r) => r.project === PROJECT)?.state).toBe("pending");
  });

  test("the authoritative membership scope prunes historical rows", () => {
    const active = "amadeus-dlc/4";
    const before = withLedger([
      entry({ project: active, state: "synced" }),
      entry({ project: PROJECT, state: "pending" }),
    ]);
    const activeEntry = entry({ project: active, state: "synced" });
    const rows = ledgerOf(
      reducePlan(before, {
        activeProjects: [active],
        rows: [{ kind: "upsert-project-entry", entry: activeEntry }],
      }),
    );
    expect(rows.map((row) => row.project)).toEqual([active]);
  });

  test("pruning an already-current scope is unchanged", () => {
    const before = withLedger([entry()]);
    expect(
      reducePlan(before, {
        activeProjects: [PROJECT],
        rows: [{ kind: "upsert-project-entry", entry: entry() }],
      }).kind,
    ).toBe("unchanged");
  });

  test("pruning rejects an empty active Project identity", () => {
    expect(
      reducePlan(withLedger([entry()]), {
        activeProjects: [""],
        rows: [
          {
            kind: "mark-project-pending",
            project: "",
            projectId: null,
            itemId: null,
            updatedAt: LATER,
          },
        ],
      }),
    ).toEqual({
      kind: "invalid",
      issues: ["project-ledger-plan: active Project must be non-empty"],
    });
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

function globalWarning(
  overrides: Partial<MirrorWarning> = {},
): MirrorWarning {
  return {
    operationId: "op-1",
    operation: "sync",
    classification: "network",
    summary: "Project status is unsynchronized",
    occurredAt: NOW,
    retryable: false,
    effect: "not-started",
    source: "current-invocation",
    ...overrides,
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
  test("Issue completion and its Project barrier land in one transition", () => {
    const completed = heldReceipt(
      reduce(withReceipt(receipt("attempted")), {
        kind: "complete-with-project-sync-hold",
        event: EVENT,
        issueNumber: 7,
        completedAt: NOW,
        heldAt: LATER,
      }),
    );
    expect(completed).toMatchObject({
      status: "pending",
      completedAt: NOW,
      projectSyncHold: {
        reason: "project-sync-unsettled",
        heldAt: LATER,
      },
    });
  });

  test("an identical verified completion replay is unchanged", () => {
    const snapshot = withReceipt(
      receipt("succeeded", { projectSyncVerified: true }),
    );
    const completion: MirrorTransition = {
      kind: "complete",
      event: EVENT,
      issueNumber: 7,
      completedAt: NOW,
      projectSyncVerified: true,
    };

    expect(reduce(snapshot, completion).kind).toBe("unchanged");
    expect(
      reduce(snapshot, {
        kind: "complete",
        event: EVENT,
        issueNumber: 7,
        completedAt: NOW,
      }).kind,
    ).toBe("invalid");
  });

  test("an identical atomic Project hold replay is unchanged", () => {
    const completion: MirrorTransition = {
      kind: "complete-with-project-sync-hold",
      event: EVENT,
      issueNumber: 7,
      completedAt: NOW,
      heldAt: LATER,
    };
    const first = reduce(withReceipt(receipt("attempted")), completion);
    if (first.kind !== "changed") throw new Error("expected changed");

    expect(reduce(first.snapshot, completion).kind).toBe("unchanged");
    expect(
      reduce(first.snapshot, {
        ...completion,
        heldAt: NOW,
      }).kind,
    ).toBe("invalid");
  });

  test("a succeeded receipt parks at pending with its own reason", () => {
    const held = heldReceipt(
      reduce(
        withReceipt(
          receipt("succeeded", { projectSyncVerified: true }),
        ),
        HOLD,
      ),
    );
    expect(held.status).toBe("pending");
    expect(held.projectSyncHold).toEqual({
      reason: "project-sync-unsettled",
      heldAt: LATER,
    });
    expect(held.projectSyncVerified).toBeUndefined();
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
      projectSyncVerified: true,
    });
    const settled = heldReceipt(done);
    expect(settled.status).toBe("succeeded");
    expect(settled.projectSyncHold).toBeUndefined();
    expect(settled.projectSyncVerified).toBe(true);
  });

  test("an unheld receipt cannot mint Project verification", () => {
    const result = reduce(withReceipt(receipt("attempted")), {
      kind: "complete",
      event: EVENT,
      issueNumber: 7,
      completedAt: LATER,
      projectSyncVerified: true,
    });
    expect(result.kind).toBe("invalid");
  });

  test("a Project hold cannot be released without verification", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    expect(
      reduce(once.snapshot, {
        kind: "complete",
        event: EVENT,
        issueNumber: 7,
        completedAt: LATER,
      }).kind,
    ).toBe("invalid");
  });

  test("disabling every Project explicitly retires a hold without minting verification", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    const retired = reduce({
      ...once.snapshot,
      warnings: [
        globalWarning({
          operationId: "op-1",
          operation: "sync",
        }),
      ],
    }, {
      kind: "retire-project-sync-hold",
      event: EVENT,
      operationId: "op-1",
    });
    const settled = heldReceipt(retired);

    expect(settled).toMatchObject({
      status: "succeeded",
      completedAt: NOW,
      operationId: "op-1",
    });
    expect(settled.projectSyncHold).toBeUndefined();
    expect(settled.projectSyncVerified).toBeUndefined();
    expect(retired.kind === "changed" && retired.snapshot.warnings).toEqual([]);
    expect(retired.kind === "changed" && retired.snapshot.issueNumber).toBe(7);
    expect(retired.kind === "changed" && retired.snapshot.provenance).toEqual(
      once.snapshot.provenance,
    );
  });

  test("Project hold retirement is idempotent and bound to its operation", () => {
    const once = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (once.kind !== "changed") throw new Error("expected changed");
    const transition: MirrorTransition = {
      kind: "retire-project-sync-hold",
      event: EVENT,
      operationId: "op-1",
    };
    const retired = reduce(once.snapshot, transition);
    if (retired.kind !== "changed") throw new Error("expected changed");

    expect(reduce(retired.snapshot, transition).kind).toBe("unchanged");
    expect(
      reduce(once.snapshot, {
        ...transition,
        operationId: "op-other",
      }).kind,
    ).toBe("invalid");
  });

  test("a close receipt cannot masquerade as a disabled Project hold", () => {
    const closeEvent = mirrorEventIdentity(
      EVENT.intentUuid,
      EVENT.boundary,
      "close",
    );
    const closeKey = mirrorEventKey(closeEvent);
    const closeReceipt = {
      ...receipt("succeeded"),
      key: closeKey,
      event: closeEvent,
    };
    expect(
      reduce(
        {
          ...withReceipt(closeReceipt),
          receipts: { [closeKey]: closeReceipt },
        },
        {
          kind: "retire-project-sync-hold",
          event: closeEvent,
          operationId: "op-1",
        },
      ).kind,
    ).toBe("invalid");
  });

  test("a close receipt cannot enter the Project sync hold", () => {
    const closeEvent = mirrorEventIdentity(
      EVENT.intentUuid,
      EVENT.boundary,
      "close",
    );
    const closeKey = mirrorEventKey(closeEvent);
    const closeReceipt = {
      ...receipt("attempted"),
      key: closeKey,
      event: closeEvent,
    };
    const snapshot = {
      ...withReceipt(closeReceipt),
      receipts: { [closeKey]: closeReceipt },
    };
    expect(
      reduce(snapshot, {
        kind: "complete-with-project-sync-hold",
        event: closeEvent,
        issueNumber: 7,
        completedAt: NOW,
        heldAt: LATER,
      }).kind,
    ).toBe("invalid");
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

  test("retiring requires both an existing receipt and an active hold", () => {
    const transition: MirrorTransition = {
      kind: "retire-project-sync-hold",
      event: EVENT,
      operationId: "op-1",
    };
    expect(reduce(EMPTY_MIRROR_STATE, transition).kind).toBe("invalid");
    expect(
      reduce(
        withReceipt(
          receipt("succeeded", { projectSyncVerified: true }),
        ),
        transition,
      ).kind,
    ).toBe("invalid");
  });

  test("a safety block persists its warning through the shared warning reducer", () => {
    const result = reduce(withReceipt(receipt("attempted")), {
      kind: "mark-safety-blocked",
      event: EVENT,
      warning: {
        ...globalWarning({
          operationId: "op-1",
          operation: "sync",
          classification: "permission",
        }),
      },
    });
    expect(result.kind).toBe("changed");
    if (result.kind !== "changed") throw new Error("expected changed");
    expect(result.snapshot.warnings).toHaveLength(1);
  });
});

describe("t344 atomic Project reconciliation", () => {
  function heldSnapshot(): MirrorStateSnapshot {
    const held = reduce(withReceipt(receipt("succeeded")), HOLD);
    if (held.kind !== "changed") throw new Error("expected changed");
    return held.snapshot;
  }

  function commit(
    overrides: Partial<
      Extract<MirrorTransition, { kind: "commit-project-reconciliation" }>
    > = {},
  ): Extract<MirrorTransition, { kind: "commit-project-reconciliation" }> {
    const other = entry({
      project: "amadeus-dlc/6",
      projectId: "PVT_6",
      itemId: "PVTI_6",
    });
    return {
      kind: "commit-project-reconciliation",
      event: EVENT,
      operationId: "op-1",
      heldAt: LATER,
      ledgerPlan: {
        activeProjects: [PROJECT, other.project],
        rows: [
          { kind: "upsert-project-entry", entry: entry() },
          { kind: "upsert-project-entry", entry: other },
        ],
      },
      ...overrides,
    };
  }

  test("commits prune, every row, and receipt verification in one change", () => {
    const snapshot = {
      ...heldSnapshot(),
      projectSync: {
        projects: [entry({ project: "amadeus-dlc/stale" })],
      },
      warnings: [
        globalWarning({
          operationId: "op-1",
          operation: "sync",
        }),
      ],
    };

    const result = reduce(snapshot, commit());

    expect(result.kind).toBe("changed");
    if (result.kind !== "changed") throw new Error("expected changed");
    expect(result.snapshot.projectSync?.projects.map((row) => row.project)).toEqual([
      PROJECT,
      "amadeus-dlc/6",
    ]);
    expect(result.snapshot.receipts[KEY]).toMatchObject({
      status: "succeeded",
      completedAt: NOW,
      projectSyncVerified: true,
    });
    expect(result.snapshot.receipts[KEY].projectSyncHold).toBeUndefined();
    expect(result.snapshot.warnings).toEqual([]);
  });

  test("commits mixed verdicts and a global warning while retaining the hold", () => {
    const transition = commit({
      ledgerPlan: {
        activeProjects: [PROJECT, "amadeus-dlc/6"],
        rows: [
          { kind: "upsert-project-entry", entry: entry() },
          {
            kind: "mark-project-pending",
            project: "amadeus-dlc/6",
            projectId: "PVT_6",
            itemId: "PVTI_6",
            updatedAt: NOW,
          },
        ],
      },
      globalWarning: {
        operationId: "op-1",
        operation: "sync",
        classification: "network",
        summary: "Project status is unsynchronized",
        occurredAt: NOW,
        retryable: false,
        effect: "not-started",
        source: "current-invocation",
      },
    });

    const result = reduce(heldSnapshot(), transition);

    expect(result.kind).toBe("changed");
    if (result.kind !== "changed") throw new Error("expected changed");
    expect(result.snapshot.projectSync?.projects.map((row) => row.state)).toEqual([
      "synced",
      "pending",
    ]);
    expect(result.snapshot.warnings).toContainEqual(
      transition.globalWarning as NonNullable<typeof transition.globalWarning>,
    );
    expect(result.snapshot.receipts[KEY]).toMatchObject({
      status: "pending",
      projectSyncHold: { heldAt: LATER },
    });
    expect(result.snapshot.receipts[KEY].projectSyncVerified).toBeUndefined();
  });

  test("an exact replay after verification is unchanged", () => {
    const transition = commit();
    const first = reduce(heldSnapshot(), transition);
    if (first.kind !== "changed") throw new Error("expected changed");

    expect(reduce(first.snapshot, transition)).toEqual({ kind: "unchanged" });
  });

  test("an exact unsettled replay is unchanged", () => {
    const transition = commit({
      ledgerPlan: {
        activeProjects: [PROJECT],
        rows: [
          {
            kind: "mark-project-pending",
            project: PROJECT,
            projectId: null,
            itemId: null,
            updatedAt: NOW,
          },
        ],
      },
      globalWarning: globalWarning(),
    });
    const first = reduce(heldSnapshot(), transition);
    if (first.kind !== "changed") throw new Error("expected changed");

    expect(reduce(first.snapshot, transition)).toEqual({
      kind: "unchanged",
    });
  });

  test("a changed plan cannot overwrite an already verified reconciliation", () => {
    const transition = commit();
    const first = reduce(heldSnapshot(), transition);
    if (first.kind !== "changed") throw new Error("expected changed");
    const changedPlan = commit({
      ledgerPlan: {
        ...transition.ledgerPlan,
        rows: transition.ledgerPlan.rows.map((row, index) =>
          index === 0 && row.kind === "upsert-project-entry"
            ? {
                ...row,
                entry: {
                  ...row.entry,
                  lastAppliedStatus: "Construction",
                },
              }
            : row,
        ),
      },
    });

    expect(reduce(first.snapshot, changedPlan).kind).toBe("invalid");
  });

  test.each([
    ["operation", { operationId: "op-other" }],
    ["hold generation", { heldAt: NOW }],
  ] as const)("rejects a mismatched %s binding", (_name, overrides) => {
    expect(reduce(heldSnapshot(), commit(overrides)).kind).toBe("invalid");
  });

  test("rejects an empty plan instead of treating it as verified", () => {
    expect(
      reduce(
        heldSnapshot(),
        commit({
          ledgerPlan: { activeProjects: [], rows: [] },
        }),
      ).kind,
    ).toBe("invalid");
  });

  test("rejects invalid warning evidence before committing any row", () => {
    const unsettledPlan = {
      activeProjects: [PROJECT],
      rows: [
        {
          kind: "mark-project-pending" as const,
          project: PROJECT,
          projectId: null,
          itemId: null,
          updatedAt: NOW,
        },
      ],
    };
    const cases: MirrorWarning[] = [
      globalWarning({ operationId: null, operation: null }),
      globalWarning({ operationId: "op-other" }),
      globalWarning({ operation: "close" }),
      globalWarning({ effect: "outcome-unknown" }),
    ];
    for (const warning of cases) {
      expect(
        reduce(
          heldSnapshot(),
          commit({ ledgerPlan: unsettledPlan, globalWarning: warning }),
        ).kind,
      ).toBe("invalid");
    }
    expect(
      reduce(
        heldSnapshot(),
        commit({ globalWarning: globalWarning() }),
      ).kind,
    ).toBe("invalid");
  });

  test("requires an existing matching receipt with the active hold", () => {
    expect(reduce(EMPTY_MIRROR_STATE, commit()).kind).toBe("invalid");

    const otherEvent = mirrorEventIdentity(
      EVENT.intentUuid,
      { ...EVENT.boundary, instance: "phase-other" },
      "sync",
    );
    expect(
      reduce(
        {
          ...heldSnapshot(),
          receipts: {
            [KEY]: {
              ...receipt("pending", {
                projectSyncHold: {
                  reason: "project-sync-unsettled",
                  heldAt: LATER,
                },
              }),
              event: otherEvent,
            },
          },
        },
        commit(),
      ).kind,
    ).toBe("invalid");

    expect(
      reduce(
        withReceipt(receipt("pending", { failureClass: "network" })),
        commit(),
      ).kind,
    ).toBe("invalid");
  });

  test("a close event cannot commit Project verification", () => {
    const closeEvent = mirrorEventIdentity(
      EVENT.intentUuid,
      EVENT.boundary,
      "close",
    );
    const closeKey = mirrorEventKey(closeEvent);
    const closeReceipt: MirrorOperationReceipt = {
      ...receipt("pending", {
        projectSyncHold: {
          reason: "project-sync-unsettled",
          heldAt: LATER,
        },
      }),
      key: closeKey,
      event: closeEvent,
    };
    const snapshot = {
      ...withReceipt(closeReceipt),
      receipts: { [closeKey]: closeReceipt },
    };

    expect(
      reduce(snapshot, {
        ...commit(),
        event: closeEvent,
      }).kind,
    ).toBe("invalid");
  });
});

describe("t344 hold survives the state document", () => {
  test("a verified succeeded receipt round-trips its durable marker", () => {
    const snapshot = withReceipt(
      receipt("succeeded", { projectSyncVerified: true }),
    );
    const parsed = parseMirrorStateDocument(
      `# State\n\n${renderMirrorStateBlock(snapshot)}\n`,
    );
    if (parsed.kind !== "ok") {
      throw new Error(`unexpected invalid parse: ${parsed.issues.join("; ")}`);
    }
    expect(parsed.snapshot.receipts[KEY].projectSyncVerified).toBe(true);
  });

  test("a non-true Project verification marker is rejected", () => {
    const snapshot = withReceipt(
      receipt("succeeded", { projectSyncVerified: true }),
    );
    const document = `# State\n\n${renderMirrorStateBlock(snapshot).replace(
      '"projectSyncVerified":true',
      '"projectSyncVerified":false',
    )}\n`;
    expect(parseMirrorStateDocument(document).kind).toBe("invalid");
  });

  test("a Project verification marker on pending is rejected", () => {
    const snapshot = withReceipt(
      receipt("pending", {
        projectSyncHold: {
          reason: "project-sync-unsettled",
          heldAt: LATER,
        },
        projectSyncVerified: true,
      }),
    );
    expect(
      parseMirrorStateDocument(
        `# State\n\n${renderMirrorStateBlock(snapshot)}\n`,
      ).kind,
    ).toBe("invalid");
  });

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
