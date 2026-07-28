// t360 — Project sync failure containment over a real state document on disk:
// atomic recovery, safety-blocked observations, keep behavior, and call budget.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { executeMirrorOperation } from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
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
import type { MirrorProjectDiagnostic } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
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

function deferredSignal(): Readonly<{
  promise: Promise<void>;
  resolve: () => void;
}> {
  let signal = (): void => {};
  const promise = new Promise<void>((resolve) => {
    signal = resolve;
  });
  return { promise, resolve: () => signal() };
}

beforeEach(() => {
  harness = new ProjectSyncTestHarness("t342-");
});

afterEach(() => {
  harness.dispose();
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

  test("a recovered membership query clears its operation warning atomically", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.listResult = failure("network");
    const context = harness.context("sync", gateway);

    const first = await executeMirrorOperation({
      context,
      ports: store.ports,
      localState: store.state(),
    });

    expect(first.kind).toBe("pending");
    const key = mirrorEventKey(context.event);
    const operationId = store.state().receipts[key].operationId;
    expect(store.state().warnings).toContainEqual(
      expect.objectContaining({
        operationId,
        operation: "sync",
        summary: expect.stringContaining("unsynchronized"),
      }),
    );

    gateway.fixture.listResult = undefined;
    const recovered = await executeMirrorOperation({
      context,
      ports: store.ports,
      localState: store.state(),
    });

    expect(recovered.kind).toBe("completed");
    expect(store.state().warnings).toEqual([]);
    expect(store.state().receipts[key]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
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

  test("remote mutations survive an atomic state failure and are observed on retry", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const context = harness.context("sync", gateway);
    const writeDocumentAtomic = store.ports.writeDocumentAtomic;
    let rejectedProjectLedger = false;
    const ports = {
      ...store.ports,
      writeDocumentAtomic(text: string) {
        if (
          !rejectedProjectLedger &&
          text.includes('"projectSync":{"projects":[')
        ) {
          rejectedProjectLedger = true;
          return {
            kind: "io-failure" as const,
            summary: "injected Project ledger failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;

    const outcome = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(rejectedProjectLedger).toBe(true);
    expect(outcome).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        classification: "state-write",
        retryable: true,
      },
    });
    const state = store.state();
    expect(state.projectSync).toBeNull();
    expect(state.receipts[mirrorEventKey(context.event)]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-project-fields",
      "add-project-item",
      "update-project-item-field",
    ]);

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
    const mutationCount = projectCalls(gateway).filter(
      (call) =>
        call === "add-project-item" ||
        call === "update-project-item-field",
    ).length;

    const retry = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(retry.kind).toBe("completed");
    expect(
      projectCalls(gateway).filter(
        (call) =>
          call === "add-project-item" ||
          call === "update-project-item-field",
      ),
    ).toHaveLength(mutationCount);
    expect(store.state().projectSync?.projects[0].state).toBe("synced");
    expect(
      store.state().receipts[mirrorEventKey(context.event)],
    ).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("an atomic reconciliation write failure preserves both the old ledger and hold", async () => {
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
          singleSelectValuesByFieldId: {
            PVTSSF_intent_phase: "Ideation",
          },
        },
      ],
    };
    const context = harness.context("sync", gateway);
    const writeDocumentAtomic = store.ports.writeDocumentAtomic;
    let rejectedRelease = false;
    const ports = {
      ...store.ports,
      writeDocumentAtomic(text: string) {
        if (
          !rejectedRelease &&
          text.includes('"projectSync":{"projects":[') &&
          text.includes('"status":"succeeded"')
        ) {
          rejectedRelease = true;
          return {
            kind: "io-failure" as const,
            summary: "injected receipt release failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;

    const first = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(rejectedRelease).toBe(true);
    expect(first).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        classification: "state-write",
        retryable: true,
      },
    });
    const key = mirrorEventKey(context.event);
    expect(store.state().receipts[key]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(store.state().receipts[key].projectSyncVerified).toBeUndefined();
    expect(store.state().projectSync).toBeNull();

    const retry = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(retry).toEqual({
      kind: "completed",
      operation: "sync",
      issueNumber: 7,
    });
    expect(store.state().receipts[key]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
    expect(store.state().receipts[key].projectSyncHold).toBeUndefined();
    expect(store.state().projectSync?.projects[0].state).toBe("synced");
  });

  test("a lost event identity after reconciliation commit stays pending", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const context = harness.context("sync", gateway);
    const committedEvent = context.event;
    const changedEvent = mirrorEventIdentity(
      context.intentUuid,
      {
        kind: "phase-verified",
        phase: "ideation",
        instance: "phase-after-commit",
      },
      "sync",
    );
    const writeDocumentAtomic = store.ports.writeDocumentAtomic;
    const ports = {
      ...store.ports,
      writeDocumentAtomic(text: string) {
        const result = writeDocumentAtomic(text);
        if (
          result.kind === "ok" &&
          text.includes('"projectSyncVerified":true')
        ) {
          Object.defineProperty(context, "event", { value: changedEvent });
        }
        return result;
      },
    } satisfies MirrorStateStorePorts;

    const outcome = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(outcome).toMatchObject({
      kind: "pending",
      warning: {
        classification: "state-write",
        summary:
          "Project reconciliation committed without durable receipt verification",
      },
    });
    expect(store.state().receipts[mirrorEventKey(committedEvent)]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("an atomic reconciliation read failure leaves the receipt retryable", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.listResult = failure("network");
    const context = harness.context("sync", gateway);
    const readDocument = store.ports.readDocument;
    let rejectedProjectReads = 1;
    const ports = {
      ...store.ports,
      readDocument() {
        if (
          rejectedProjectReads > 0 &&
          gateway.history.includes("list-project-items")
        ) {
          rejectedProjectReads -= 1;
          throw new Error("injected Project state read failure");
        }
        return readDocument();
      },
    } satisfies MirrorStateStorePorts;

    const outcome = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(rejectedProjectReads).toBe(0);
    expect(outcome).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        classification: "state-write",
        retryable: true,
      },
    });
    const state = store.state();
    expect(state.projectSync).toBeNull();
    expect(state.warnings).toEqual([]);
    expect(state.receipts[mirrorEventKey(context.event)]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
  });

  test("a stale completion plan loses its CAS race without overwriting the newer phase", async () => {
    const store = harness.fileStore(harness.linkedState());
    const remoteBoard = { phase: "Ideation" };
    const completionUpdated = deferredSignal();
    const releaseCompletion = deferredSignal();
    const completionGateway = new ProjectGateway(harness.markerBody());
    completionGateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          singleSelectValuesByFieldId: {
            PVTSSF_intent_phase: remoteBoard.phase,
          },
        },
      ],
    };
    const updateForCompletion =
      completionGateway.updateProjectItemSingleSelectField.bind(
        completionGateway,
      );
    completionGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updateForCompletion(...args);
      if (result.kind === "ok" && args[4] === "opt-done") {
        remoteBoard.phase = "Done";
        completionUpdated.resolve();
        await releaseCompletion.promise;
      }
      return result;
    };
    const completionContext = harness.context("sync", completionGateway, {
      boundary: { kind: "workflow-completed", instance: "done-race" },
      snapshot: harness.workflowSnapshot({
        lifecyclePhase: "Operation",
        registryStatus: "complete",
        status: "Completed",
      }),
    });

    const completion = executeMirrorOperation({
      context: completionContext,
      ports: store.ports,
      localState: store.state(),
    });
    await completionUpdated.promise;
    expect(remoteBoard.phase).toBe("Done");

    const phaseGateway = new ProjectGateway(harness.markerBody());
    phaseGateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          singleSelectValuesByFieldId: {
            PVTSSF_intent_phase: remoteBoard.phase,
          },
        },
      ],
    };
    const updateForPhase =
      phaseGateway.updateProjectItemSingleSelectField.bind(phaseGateway);
    phaseGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updateForPhase(...args);
      if (result.kind === "ok" && args[4] === "opt-ideation") {
        remoteBoard.phase = "Ideation";
      }
      return result;
    };
    const phaseContext = harness.context("sync", phaseGateway, {
      boundary: {
        kind: "phase-verified",
        phase: "ideation",
        instance: "phase-race",
      },
    });
    const phaseLocalState = store.state();
    const phaseOutcome = await (async () => {
      try {
        return await executeMirrorOperation({
          context: {
            ...phaseContext,
            authorization: {
              ...phaseContext.authorization,
              receiptRevision: phaseLocalState.revision + 1,
            },
          },
          ports: store.ports,
          localState: phaseLocalState,
        });
      } finally {
        releaseCompletion.resolve();
      }
    })();
    const completionOutcome = await completion;

    expect(phaseOutcome).toEqual({
      kind: "completed",
      operation: "sync",
      issueNumber: 7,
    });
    expect(completionOutcome).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        classification: "state-write",
        summary:
          "Project reconciliation could not be committed atomically: state compare-and-set conflict",
      },
    });
    expect(remoteBoard.phase).toBe("Ideation");
    expect(completionGateway.history).toContain("option:opt-done");
    expect(phaseGateway.history).toContain("option:opt-ideation");
    const state = store.state();
    expect(state.projectSync?.projects[0]).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
    expect(state.receipts[mirrorEventKey(phaseContext.event)]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
    const completionReceipt =
      state.receipts[mirrorEventKey(completionContext.event)];
    expect(completionReceipt).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(completionReceipt.projectSyncVerified).toBeUndefined();
  });

  test("a durable barrier read failure stops before any Project API call", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    const context = harness.context("sync", gateway);
    const readDocument = store.ports.readDocument;
    let rejectedBarrierRead = false;
    const ports = {
      ...store.ports,
      readDocument() {
        const document = readDocument();
        if (
          !rejectedBarrierRead &&
          document.includes('"projectSyncHold"')
        ) {
          rejectedBarrierRead = true;
          throw new Error("injected durable barrier read failure");
        }
        return document;
      },
    } satisfies MirrorStateStorePorts;

    const outcome = await executeMirrorOperation({
      context,
      ports,
      localState: store.state(),
    });

    expect(rejectedBarrierRead).toBe(true);
    expect(outcome).toMatchObject({
      kind: "pending",
      warning: { classification: "state-write" },
    });
    expect(projectCalls(gateway)).toEqual([]);
    expect(store.state().receipts[mirrorEventKey(context.event)]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
  });

  test.each([
    [
      "loses its verification marker",
      "Project sync converged but its durable verification marker is absent",
      "succeeded-without-marker",
    ],
    [
      "loses its receipt",
      "Project sync converged but its durable receipt hold is absent",
      "receipt-absent",
    ],
  ] as const)(
    "a barrier that concurrently %s remains pending",
    async (_case, expectedSummary, replacement) => {
      const store = harness.fileStore(harness.linkedState());
      const gateway = new ProjectGateway(harness.markerBody());
      const context = harness.context("sync", gateway);
      const key = mirrorEventKey(context.event);
      const readDocument = store.ports.readDocument;
      let replacedBarrier = false;
      const ports = {
        ...store.ports,
        readDocument() {
          const document = readDocument();
          if (
            replacedBarrier ||
            !document.includes('"projectSyncHold"')
          ) {
            return document;
          }
          const parsed = parseMirrorStateDocument(document);
          if (parsed.kind !== "ok") {
            throw new Error(parsed.issues.join("; "));
          }
          const receipts = { ...parsed.snapshot.receipts };
          if (replacement === "receipt-absent") {
            delete receipts[key];
          } else {
            const succeeded = { ...receipts[key], status: "succeeded" as const };
            delete succeeded.projectSyncHold;
            delete succeeded.projectSyncVerified;
            receipts[key] = succeeded;
          }
          replacedBarrier = true;
          return `# State\n\n${renderMirrorStateBlock({
            ...parsed.snapshot,
            receipts,
          })}\n`;
        },
      } satisfies MirrorStateStorePorts;

      const outcome = await executeMirrorOperation({
        context,
        ports,
        localState: store.state(),
      });

      expect(replacedBarrier).toBe(true);
      expect(outcome).toMatchObject({
        kind: "pending",
        warning: {
          classification: "state-write",
          summary: expectedSummary,
        },
      });
      expect(projectCalls(gateway)).toEqual([]);
    },
  );
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
