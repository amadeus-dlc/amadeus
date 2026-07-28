// t342 — C6 Project sync step over a real state document on disk: creation,
// idempotence, and the no-configuration short circuit.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { executeMirrorOperation } from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import { syncProjects as planProjectSync } from "../../packages/framework/core/tools/amadeus-mirror-project-executor.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorExecutionContext } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  ISSUE_NODE_ID,
  NOW,
  PROJECT_NODE_ID,
  ProjectGateway,
  ProjectSyncTestHarness,
  projectCalls,
} from "../helpers/amadeus-mirror-project-sync-fixture.ts";

let harness: ProjectSyncTestHarness;

beforeEach(() => {
  harness = new ProjectSyncTestHarness("t342-");
});

afterEach(() => {
  harness.dispose();
});

describe("t342 create then project sync", () => {
  test("a fresh create adds the item, sets Intent Phase, and records one synced row", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    const outcome = await executeMirrorOperation({
      context: harness.context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome).toEqual({ kind: "completed", operation: "create", issueNumber: 7 });
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-project-fields",
      "add-project-item",
      "update-project-item-field",
    ]);
    expect(store.state().projectSync).toEqual({
      projects: [
        {
          project: "acme/5",
          projectId: PROJECT_NODE_ID,
          itemId: "PVTI_added",
          phaseField: "Intent Phase",
          lastAppliedStatus: "Ideation",
          state: "synced",
          updatedAt: NOW,
        },
      ],
    });
    expect(Object.values(store.state().receipts)[0]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("the ledger survives on disk as a parseable state document", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    await executeMirrorOperation({
      context: harness.context("create", new ProjectGateway(harness.markerBody())),
      ports: store.ports,
      localState: store.state(),
    });
    const document = readFileSync(harness.statePath, "utf-8");
    expect(document).toContain('"projectSync":{"projects":[');
    expect(parseMirrorStateDocument(document).kind).toBe("ok");
  });
});

describe("t342 idempotence", () => {
  test("the Project planner returns immutable evidence without writing state", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          singleSelectValuesByFieldId: { PVTSSF_intent_phase: "Ideation" },
        },
      ],
    };

    const result = await planProjectSync(
      harness.context("sync", gateway),
      7,
    );

    expect(result.kind).toBe("converged");
    if (result.kind !== "converged") throw new Error("expected converged");
    expect(result.ledgerPlan).toEqual({
      activeProjects: ["acme/5"],
      rows: [
        {
          kind: "upsert-project-entry",
          entry: expect.objectContaining({
            project: "acme/5",
            state: "synced",
          }),
        },
      ],
    });
    expect(store.state().projectSync).toBeNull();
  });

  test("a second sync over a converged board issues no Project mutation", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          singleSelectValuesByFieldId: { PVTSSF_intent_phase: "Ideation" },
        },
      ],
    };
    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-project-fields",
    ]);
    expect(store.state().projectSync?.projects[0].lastAppliedStatus).toBe(
      "Ideation",
    );
  });

  test("running the same boundary twice leaves the Project mutation total unchanged", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const run = () =>
      executeMirrorOperation({
        context: harness.context("sync", gateway),
        ports: store.ports,
        localState: store.state(),
      });

    const second = await run();
    const afterFirst = gateway.history.filter((entry) =>
      entry.startsWith("add-") || entry.startsWith("update-"),
    ).length;
    // The board now reports the item the first pass created, at the lifecycle
    // value it set.
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_added",
          singleSelectValuesByFieldId: { PVTSSF_intent_phase: "Ideation" },
        },
      ],
    };
    await run();
    const afterSecond = gateway.history.filter((entry) =>
      entry.startsWith("add-") || entry.startsWith("update-"),
    ).length;

    expect(afterFirst).toBe(2);
    expect(afterSecond).toBe(2);
    expect(second).toEqual({
      kind: "completed",
      operation: "sync",
      issueNumber: 7,
    });
    expect(store.state().projectSync?.projects).toHaveLength(1);
  });

  test("a legacy succeeded receipt without Project verification is held and reconciled", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const context = harness.context("sync", gateway);
    await executeMirrorOperation({
      context,
      ports: store.ports,
      localState: store.state(),
    });
    const succeeded = store.state();
    const key = mirrorEventKey(context.event);
    const { projectSyncVerified: _verified, ...legacyReceipt } =
      succeeded.receipts[key];
    const legacyStore = harness.fileStore({
      ...succeeded,
      receipts: { ...succeeded.receipts, [key]: legacyReceipt },
    });
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_added",
          singleSelectValuesByFieldId: {
            PVTSSF_intent_phase: "Ideation",
          },
        },
      ],
    };

    const outcome = await executeMirrorOperation({
      context,
      ports: legacyStore.ports,
      localState: legacyStore.state(),
    });

    expect(outcome).toEqual({
      kind: "completed",
      operation: "sync",
      issueNumber: 7,
    });
    expect(legacyStore.state().receipts[key]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("an already-present item is never added again", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          singleSelectValuesByFieldId: { PVTSSF_intent_phase: "Inception" },
        },
      ],
    };
    await executeMirrorOperation({
      context: harness.context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });
    expect(gateway.history).not.toContain("add-project-item");
    expect(gateway.history).toContain("update-project-item-field");
  });
});

describe("t342 no configuration", () => {
  test("the Project executor converges immediately when the configured target list is empty", async () => {
    const gateway = new ProjectGateway(harness.markerBody());

    await expect(
      planProjectSync(
        harness.context("sync", gateway, { targets: [] }),
        7,
      ),
    ).resolves.toEqual({ kind: "not-required" });
    expect(projectCalls(gateway)).toEqual([]);
  });

  test("no configured Project makes zero Project API calls and writes no ledger", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    const outcome = await executeMirrorOperation({
      context: harness.context("create", gateway, { targets: [] }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([]);
    expect(store.state().projectSync).toBeNull();
  });

  test("a disappearing target after the durable hold stays pending", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const context = harness.context("sync", gateway);
    const configuredTargets = context.projectSync?.targets ?? [];
    let targetReads = 0;
    Object.defineProperty(context.projectSync, "targets", {
      get() {
        targetReads += 1;
        return targetReads <= 2 ? configuredTargets : [];
      },
    });

    const outcome = await executeMirrorOperation({
      context,
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome).toMatchObject({
      kind: "pending",
      warning: {
        classification: "state-write",
        summary:
          "Project sync is durably held but no reconciliation target is available",
      },
    });
    expect(projectCalls(gateway)).toEqual([]);
  });

  test("an execution context without projectSync at all behaves the same", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    const base = harness.context("create", gateway);
    const { projectSync: _omitted, ...withoutProjectSync } = base;
    const outcome = await executeMirrorOperation({
      context: withoutProjectSync as MirrorExecutionContext,
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([]);
  });

  test("sync edits the shared fake through the real executor flow", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.issue = {
      ...gateway.issue,
      body: gateway.issue.body.replace("snapshot", "stale snapshot"),
    };
    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway, { targets: [] }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome).toEqual({
      kind: "completed",
      operation: "sync",
      issueNumber: 7,
    });
    expect(gateway.history).toEqual(["view", "readiness", "edit"]);
    expect(gateway.issue.body).toBe(harness.markerBody());
  });

  test("close reaches the shared fake but never runs the Project step", async () => {
    const boundary = {
      kind: "workflow-completed",
      instance: "done-1",
    } as const;
    const finalSyncEvent = mirrorEventIdentity("intent-1", boundary, "sync");
    const finalSyncReceiptKey = mirrorEventKey(finalSyncEvent);
    const gateway = new ProjectGateway(harness.markerBody());
    const landedSnapshot = harness.workflowSnapshot({
      lifecyclePhase: "Operation",
      registryStatus: "complete",
      status: "Completed",
    });
    const finalSyncContext = harness.context("sync", gateway, {
      boundary,
      snapshot: landedSnapshot,
    });
    const store = harness.fileStore({
      ...harness.linkedState(),
      revision: 1,
      receipts: {
        [finalSyncReceiptKey]: {
          key: finalSyncReceiptKey,
          event: finalSyncEvent,
          operationId: "op-final-sync",
          status: "succeeded",
          preparedAt: NOW,
          attemptedAt: NOW,
          completedAt: NOW,
          authorization: finalSyncContext.authorization,
        },
      },
    });
    const baseContext = harness.context("close", gateway, {
      boundary,
      snapshot: landedSnapshot,
      targets: [],
    });
    const localState = store.state();
    const outcome = await executeMirrorOperation({
      context: {
        ...baseContext,
        authorization: {
          ...baseContext.authorization,
          finalSyncReceiptKey,
          receiptRevision: localState.revision + 1,
        },
      },
      ports: store.ports,
      localState,
    });

    expect(outcome).toEqual({
      kind: "completed",
      operation: "close",
      issueNumber: 7,
    });
    expect(gateway.history).toEqual(["view", "readiness", "close"]);
    expect(gateway.issue.state).toBe("CLOSED");
    expect(projectCalls(gateway)).toEqual([]);
  });
});
