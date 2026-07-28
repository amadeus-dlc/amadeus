// t347 — the completion Project gate as a pure decision over the ledger:
// readiness, the blocking rows it names, its refusal to invent a done column of
// its own, and the prompt line that carries the Project face of an ask.
// covers: packages/framework/core/tools/amadeus-mirror-{policy,presentation}.ts
// size: small

import { describe, expect, test } from "bun:test";
import { completionProjectGate } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { renderMirrorPrompt } from "../../packages/framework/core/tools/amadeus-mirror-presentation.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type {
  MirrorProjectSyncEntry,
  MirrorProjectSyncState,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-27T00:00:00Z";

const TARGET: MirrorProjectTarget = {
  project: { owner: "acme", number: 5 },
  phaseField: "Intent Phase",
  statusNames: {},
};

// A board whose vocabulary renames the done column, so the gate can be shown to
// read the configured name rather than a literal of its own.
const RENAMED: MirrorProjectTarget = {
  project: { owner: "acme", number: 6 },
  phaseField: "Intent Phase",
  statusNames: { done: "Shipped" },
};

function landed(overrides: Partial<MirrorSnapshot> = {}): MirrorSnapshot {
  return {
    intentUuid: "intent-1",
    intentDir: "260727-demo-a1b2c3d4",
    projectSummary: "demo",
    lifecyclePhase: "OPERATION",
    currentStage: "none",
    status: "Completed",
    registryStatus: "complete",
    updatedAt: NOW,
    ...overrides,
  };
}

function row(
  project: string,
  state: MirrorProjectSyncState,
  lastAppliedStatus: string | null,
  phaseField: string | null = "Intent Phase",
): MirrorProjectSyncEntry {
  return {
    project,
    projectId: "PVT_1",
    itemId: "PVTI_1",
    phaseField,
    lastAppliedStatus,
    state,
    updatedAt: NOW,
  };
}

function stateWith(rows: readonly MirrorProjectSyncEntry[]): MirrorStateSnapshot {
  return { ...EMPTY_MIRROR_STATE, projectSync: { projects: rows } };
}

describe("t347 completion gate readiness", () => {
  test("an Intent with no board at all is ready with an empty blocking list", () => {
    const gate = completionProjectGate({
      state: EMPTY_MIRROR_STATE,
      snapshot: landed(),
      targets: [],
    });

    expect(gate).toEqual({ ready: true, blocking: [] });
  });

  test("removing every configured board ignores historical ledger rows", () => {
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "pending", "Operation", "Lifecycle Phase"),
      ]),
      snapshot: landed(),
      targets: [],
    });

    expect(gate).toEqual({ ready: true, blocking: [] });
  });

  test("a configured board with no ledger row blocks completion", () => {
    const gate = completionProjectGate({
      state: EMPTY_MIRROR_STATE,
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: missing"] });
  });

  test("every board synced onto the done column is ready", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "synced", "Done")]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: true, blocking: [] });
  });

  test("a pending board blocks and is named with its ledger state", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "pending", "Operation")]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: pending"] });
  });

  test("a safety-blocked board blocks too, and never rounds to ready", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "safety-blocked", null)]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: safety-blocked"] });
  });

  test("a synced board still sitting in an earlier column blocks on that column", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "synced", "Operation")]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: Operation"] });
  });

  test("a synced board that never had a column applied blocks as unapplied", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "synced", null)]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: unapplied"] });
  });

  test("every blocking row is reported, not just the first", () => {
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "pending", null),
        row("acme/6", "safety-blocked", null),
      ]),
      snapshot: landed(),
      targets: [TARGET, RENAMED],
    });

    expect(gate.blocking).toEqual(["acme/5: pending", "acme/6: safety-blocked"]);
  });

  test("a done row for the previous configured phase field blocks until re-synced", () => {
    const changedTarget = { ...TARGET, phaseField: "Lifecycle Phase" };
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "synced", "Done", TARGET.phaseField),
      ]),
      snapshot: landed(),
      targets: [changedTarget],
    });

    expect(gate).toEqual({
      ready: false,
      blocking: ["acme/5: phase-field-mismatch"],
    });
  });

  test("re-syncing on the current configured phase field restores readiness", () => {
    const changedTarget = { ...TARGET, phaseField: "Lifecycle Phase" };
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "synced", "Done", changedTarget.phaseField),
      ]),
      snapshot: landed(),
      targets: [changedTarget],
    });

    expect(gate).toEqual({ ready: true, blocking: [] });
  });

  test("a legacy row without phase-field identity blocks until re-synced", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "synced", "Done", null)]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({
      ready: false,
      blocking: ["acme/5: phase-field-mismatch"],
    });
  });

  test("a failure state takes precedence over stale phase-field identity", () => {
    const changedTarget = { ...TARGET, phaseField: "Lifecycle Phase" };
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "pending", "Done", TARGET.phaseField),
      ]),
      snapshot: landed(),
      targets: [changedTarget],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: pending"] });
  });

  test("a membership-only board uses the default phase field identity", () => {
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "synced", "Done"),
        row("acme/7", "synced", "Done", "Intent Phase"),
      ]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: true, blocking: [] });
  });

  test("a membership-only board with another phase field blocks", () => {
    const gate = completionProjectGate({
      state: stateWith([
        row("acme/5", "synced", "Done"),
        row("acme/7", "synced", "Done", "Lifecycle Phase"),
      ]),
      snapshot: landed(),
      targets: [TARGET],
    });

    expect(gate).toEqual({
      ready: false,
      blocking: ["acme/7: phase-field-mismatch"],
    });
  });
});

describe("t347 the gate derives the done column, never names one", () => {
  test("a board that renames the done column is judged against its own name", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/6", "synced", "Shipped")]),
      snapshot: landed(),
      targets: [RENAMED],
    });

    expect(gate.ready).toBe(true);
  });

  test("the default column name does not satisfy a board that renamed it", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/6", "synced", "Done")]),
      snapshot: landed(),
      targets: [RENAMED],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/6: Done"] });
  });

  test("an Intent that has not landed has no done column, so the gate withholds", () => {
    const gate = completionProjectGate({
      state: stateWith([row("acme/5", "synced", "Operation")]),
      snapshot: landed({ registryStatus: "parked", status: "Running" }),
      targets: [TARGET],
    });

    expect(gate).toEqual({ ready: false, blocking: ["acme/5: not-landed"] });
  });
});

describe("t347 the prompt's Project face", () => {
  const promptBase = {
    event: {
      intentUuid: "intent-1",
      boundary: { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
      operation: "sync",
    },
    intentDir: "260727-demo-a1b2c3d4",
    repository: "acme/app",
    issueNumber: 77,
  } as const;

  test("a sync ask names the board count and the column it would write", () => {
    const question = renderMirrorPrompt({
      ...promptBase,
      operation: "sync",
      projects: { count: 2, statusNames: ["Ideation"] },
    });

    expect(question).toContain('Projects: 2 board(s); Status: "Ideation"');
  });

  test("a create ask says the boards would be joined", () => {
    const question = renderMirrorPrompt({
      ...promptBase,
      operation: "create",
      projects: { count: 1, statusNames: ["Ideation"] },
    });

    expect(question).toContain('Projects: 1 board(s) to join; Status: "Ideation"');
  });

  test("an ask that writes no column says the column is left unchanged", () => {
    const question = renderMirrorPrompt({
      ...promptBase,
      operation: "sync",
      projects: { count: 3, statusNames: [] },
    });

    expect(question).toContain("Projects: 3 board(s); Status: left unchanged");
  });

  test("boards with different vocabularies list every column", () => {
    const question = renderMirrorPrompt({
      ...promptBase,
      operation: "sync",
      projects: { count: 2, statusNames: ["Ideation", "アイデア"] },
    });

    expect(question).toContain('Status: "Ideation" / "アイデア"');
  });

  test("no board at all leaves the prompt exactly as it was", () => {
    const withoutProjects = renderMirrorPrompt({ ...promptBase, operation: "sync" });
    const withEmpty = renderMirrorPrompt({
      ...promptBase,
      operation: "sync",
      projects: { count: 0, statusNames: [] },
    });

    expect(withoutProjects).not.toContain("Projects:");
    expect(withEmpty).toBe(withoutProjects);
  });
});
