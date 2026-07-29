// t344 — Project reconciliation ledger semantics as pure functions: the
// failure classifier and ledger transitions across every state x result cell.
// covers: packages/framework/core/tools/amadeus-mirror-policy.ts
// covers: packages/framework/core/tools/amadeus-mirror-project-ledger-reducer.ts
// size: small

import { describe, expect, test } from "bun:test";
import { classifyProjectFailure } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  reduceProjectLedgerPlan,
  type MirrorProjectLedgerPlan,
  type MirrorProjectLedgerRowTransition,
  type ProjectLedgerReduction,
} from "../../packages/framework/core/tools/amadeus-mirror-project-ledger-reducer.ts";
import type {
  MirrorFailureClass,
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";
const LATER = "2026-07-27T01:00:00Z";
const PROJECT = "amadeus-dlc/5";

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
