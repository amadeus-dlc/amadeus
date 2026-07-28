// t342 — C6 Project sync step over a real state document on disk: idempotence,
// the no-configuration short circuit, containment of Project failures, the
// safety-blocked observations, and the per-Project call budget.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  executeMirrorOperation,
  syncProjects,
} from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type {
  MirrorExecutionContext,
  MirrorProjectDiagnostic,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  ISSUE_NODE_ID,
  NOW,
  PROJECT_NODE_ID,
  ProjectGateway,
  ProjectSyncTestHarness,
  failure,
  projectCalls,
} from "../helpers/amadeus-mirror-project-sync-fixture.ts";

// A token that must never reach a diagnostic: the fixtures below carry it in the
// places a careless implementation would transcribe (a gateway summary source
// and an unrelated remote field).
const SECRET = "ghp_projectSyncSecretToken";

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
  test("the legacy executor facade still accepts state-store ports", async () => {
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

    await expect(
      syncProjects(store.ports, harness.context("sync", gateway), 7),
    ).resolves.toEqual({ kind: "converged" });
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      project: "acme/5",
      state: "synced",
    });
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

    await run();
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
    expect(store.state().projectSync?.projects).toHaveLength(1);
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
    });
    const outcome = await executeMirrorOperation({
      context: {
        ...baseContext,
        authorization: {
          ...baseContext.authorization,
          finalSyncReceiptKey,
        },
      },
      ports: store.ports,
      localState: store.state(),
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

describe("t342 failure containment", () => {
  test("a membership query failure keeps the Issue link and marks every target pending", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.listResult = failure("network");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    // The Issue side stands: the link survives and the operation is only parked.
    expect(outcome.kind).toBe("pending");
    expect(gateway.issue.body).toContain("snapshot");
    expect(store.state().issueNumber).toBe(7);
    expect(store.state().projectSync?.projects).toEqual([
      {
        project: "acme/5",
        projectId: null,
        itemId: null,
        phaseField: null,
        lastAppliedStatus: null,
        state: "pending",
        updatedAt: NOW,
      },
    ]);
    expect(projectCalls(gateway)).toEqual(["list-project-items"]);
    expect(diagnostics.map((d) => d.reason)).toEqual(["membership-query-failed"]);
  });

  test("a membership query failure leaves a visible unsynchronized warning", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.listResult = failure("network");

    await executeMirrorOperation({
      context: harness.context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    const warnings = store.state().warnings;
    expect(warnings.some((w) => w.summary.includes("unsynchronized"))).toBe(true);
    expect(warnings.some((w) => w.classification === "network")).toBe(true);
  });

  test("an add failure classifies that Project by its failure class", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.addResult = failure("permission");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    // `permission` is not retryable, so the row is safety-blocked — and that
    // status never reaches the operation receipt.
    expect(outcome.kind).toBe("pending");
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      project: "acme/5",
      state: "safety-blocked",
    });
    expect(gateway.history).not.toContain("update-project-item-field");
    expect(diagnostics.map((d) => d.reason)).toEqual(["add-failed"]);
  });

  test("an update failure leaves a pending row, so a retry re-applies", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.updateResult = failure("api", "outcome-unknown");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "pending",
      lastAppliedStatus: null,
    });
    expect(diagnostics.map((d) => d.reason)).toEqual(["update-failed"]);
  });
});

describe("t342 safety-blocked observations", () => {
  test("an unresolved Project is marked without any mutation", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.fieldResult = failure("api");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-project-fields",
    ]);
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "pending",
      projectId: null,
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      project: "acme/5",
      reason: "project-unresolved",
      expectedStatus: null,
      availableOptions: [],
    });
  });

  test("a missing Intent Phase option yields the expected name and the real option list", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [
          { id: "opt-a", name: "Backlog" },
          { id: "opt-b", name: "Shipped" },
        ],
      },
      auxiliaryStatus: null,
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(diagnostics).toEqual([
      {
        project: "acme/5",
        reason: "option-missing",
        expectedStatus: "Ideation",
        availableOptions: ["Backlog", "Shipped"],
        summary:
          'the Project "Intent Phase" field has no option named exactly "Ideation"',
      },
    ]);
    expect(gateway.history).not.toContain("update-project-item-field");
    // A column the board does not declare cannot be reached by retrying.
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "safety-blocked",
    });
  });

  test("a case-only difference does not match, proving exact-match matching", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [{ id: "opt-a", name: "ideation" }],
      },
      auxiliaryStatus: null,
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(diagnostics[0].reason).toBe("option-missing");
    expect(diagnostics[0].availableOptions).toEqual(["ideation"]);
  });

  test("a configured name that no board option carries is the falling case", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, {
        diagnostics,
        targets: [
          {
            project: { owner: "acme", number: 5 },
            phaseField: "Intent Phase",
            statusNames: { ideation: "No Such Column" },
          },
        ],
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(diagnostics[0]).toMatchObject({
      reason: "option-missing",
      expectedStatus: "No Such Column",
      availableOptions: ["Ideation", "Done"],
    });
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "safety-blocked",
    });
  });

  test("no diagnostic ever carries a secret from the remote or the summary", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [{ id: SECRET, name: "Backlog" }],
      },
      auxiliaryStatus: null,
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: harness.context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    const rendered = JSON.stringify(diagnostics);
    expect(diagnostics).toHaveLength(1);
    expect(rendered).toContain("option-missing");
    expect(rendered).not.toContain(SECRET);
    expect(readFileSync(harness.statePath, "utf-8")).not.toContain(
      SECRET,
    );
  });
});

describe("t342 keep branch", () => {
  test("a parked boundary adds the item but applies no Intent Phase", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [{ id: "opt-ideation", name: "Ideation" }],
      },
      auxiliaryStatus: {
        fieldId: "PVTSSF_status",
        fieldName: "Status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    await executeMirrorOperation({
      context: harness.context("sync", gateway, {
        boundary: { kind: "parked", stage: "feasibility", instance: "park-1" },
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(gateway.history).toContain("add-project-item");
    expect(gateway.history).not.toContain("update-project-item-field");
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "synced",
      lastAppliedStatus: null,
    });
  });
});

describe("t342 call budget", () => {
  test("one membership query and at most three mutations per Project", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [{ id: "opt-ideation", name: "Ideation" }],
      },
      auxiliaryStatus: {
        fieldId: "PVTSSF_status",
        fieldName: "Status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    await executeMirrorOperation({
      context: harness.context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    const calls = projectCalls(gateway);
    expect(calls.filter((c) => c === "list-project-items")).toHaveLength(1);
    expect(calls.filter((c) => c === "resolve-project-fields")).toHaveLength(1);
    expect(
      calls.filter((c) => c === "add-project-item" || c === "update-project-item-field"),
    ).toHaveLength(3);
  });

  test("a landed workflow drives the done column", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_intent_phase",
        fieldName: "Intent Phase",
        options: [{ id: "opt-done", name: "Done" }],
      },
      auxiliaryStatus: {
        fieldId: "PVTSSF_status",
        fieldName: "Status",
        options: [{ id: "opt-workflow-done", name: "Done" }],
      },
    };
    await executeMirrorOperation({
      context: harness.context("sync", gateway, {
        snapshot: harness.workflowSnapshot({
          registryStatus: "complete",
          status: "Completed",
          lifecyclePhase: "Operation",
        }),
        boundary: { kind: "workflow-completed", instance: "done-1" },
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(store.state().projectSync?.projects[0].lastAppliedStatus).toBe("Done");
    expect(gateway.history).toContain("option:opt-done");
    expect(gateway.history).toContain("option:opt-workflow-done");
  });
});
