// t364 — Project reconciliation concurrency: a newer receipt owns the board
// before an older held receipt can replay stale lifecycle state.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { executeMirrorOperation } from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import { mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { prepareCompletionProjectVerification } from "../../packages/framework/core/tools/amadeus-mirror-project-verification.ts";
import { createMirrorProjectReconciliationLock } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import {
  ISSUE_NODE_ID,
  PROJECT_NODE_ID,
  ProjectGateway,
  ProjectSyncTestHarness,
  TARGET,
  projectCalls,
} from "../helpers/amadeus-mirror-project-sync-fixture.ts";

let harness: ProjectSyncTestHarness;

beforeEach(() => {
  harness = new ProjectSyncTestHarness("t364-");
});

afterEach(() => {
  harness.dispose();
});

function memberAt(phase: string) {
  return {
    issueNodeId: ISSUE_NODE_ID,
    items: [
      {
        projectId: PROJECT_NODE_ID,
        projectNumber: 5,
        projectOwner: "acme",
        itemId: "PVTI_item1",
        singleSelectValuesByFieldId: {
          PVTSSF_intent_phase: phase,
        },
      },
    ],
  };
}

describe("t364 Project reconciliation freshness", () => {
  test("a live Project reconciler keeps its lock beyond the audit stale age", async () => {
    const first = createMirrorProjectReconciliationLock(harness.statePath);
    const second = createMirrorProjectReconciliationLock(harness.statePath);
    expect(first.acquire()).toBe(true);
    process.env.AMADEUS_LOCK_STALE_MS = "1";
    try {
      await Bun.sleep(10);
      expect(second.acquire()).toBe(false);
    } finally {
      delete process.env.AMADEUS_LOCK_STALE_MS;
      first.release();
    }
  });

  test("a newer verified receipt retires an older hold without replaying its phase", async () => {
    const store = harness.fileStore(harness.linkedState());
    const phaseGateway = new ProjectGateway(harness.markerBody());
    const phaseContext = harness.context("sync", phaseGateway, {
      boundary: {
        kind: "phase-verified",
        phase: "ideation",
        instance: "old-phase",
      },
    });
    let unexpectedRelease = false;

    const parked = await executeMirrorOperation({
      context: phaseContext,
      ports: store.ports,
      localState: store.state(),
      projectReconciliationLock: {
        acquire: () => false,
        release: () => {
          unexpectedRelease = true;
        },
      },
    });

    expect(parked).toMatchObject({
      kind: "pending",
      warning: { summary: "Project reconciliation lock is unavailable" },
    });
    expect(unexpectedRelease).toBe(false);
    expect(projectCalls(phaseGateway)).toEqual([]);

    let remotePhase = "Ideation";
    const completionGateway = new ProjectGateway(harness.markerBody());
    completionGateway.fixture.items = memberAt(remotePhase);
    const updateCompletion =
      completionGateway.updateProjectItemSingleSelectField.bind(
        completionGateway,
      );
    completionGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updateCompletion(...args);
      if (result.kind === "ok" && args[4] === "opt-done") {
        remotePhase = "Done";
      }
      return result;
    };
    const completionState = store.state();
    const completionContext = harness.context("sync", completionGateway, {
      boundary: { kind: "workflow-completed", instance: "new-completion" },
      snapshot: harness.workflowSnapshot({
        lifecyclePhase: "Operation",
        registryStatus: "complete",
        status: "Completed",
      }),
    });
    const completed = await executeMirrorOperation({
      context: {
        ...completionContext,
        authorization: {
          ...completionContext.authorization,
          receiptRevision: completionState.revision + 1,
        },
      },
      ports: store.ports,
      localState: completionState,
    });

    expect(completed.kind).toBe("completed");
    expect(remotePhase).toBe("Done");

    const staleGateway = new ProjectGateway(harness.markerBody());
    staleGateway.fixture.items = memberAt(remotePhase);
    const writeDocumentAtomic = store.ports.writeDocumentAtomic;
    let rejectRetirement = true;
    const retirementFailure = await executeMirrorOperation({
      context: { ...phaseContext, gateway: staleGateway },
      ports: {
        ...store.ports,
        writeDocumentAtomic(text) {
          if (rejectRetirement) {
            rejectRetirement = false;
            return {
              kind: "io-failure" as const,
              summary: "injected stale hold retirement failure",
            };
          }
          return writeDocumentAtomic(text);
        },
      },
      localState: store.state(),
    });

    expect(retirementFailure).toMatchObject({
      kind: "pending",
      warning: {
        classification: "state-write",
        summary: expect.stringContaining(
          "Superseded Project reconciliation could not be retired atomically",
        ),
      },
    });
    expect(rejectRetirement).toBe(false);
    expect(projectCalls(staleGateway)).toEqual([]);
    expect(
      store.state().receipts[mirrorEventKey(phaseContext.event)],
    ).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });

    const stale = await executeMirrorOperation({
      context: { ...phaseContext, gateway: staleGateway },
      ports: store.ports,
      localState: store.state(),
    });

    expect(stale.kind).toBe("completed");
    expect(projectCalls(staleGateway)).toEqual([]);
    expect(remotePhase).toBe("Done");
    const state = store.state();
    expect(state.projectSync?.projects[0]).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    expect(state.receipts[mirrorEventKey(phaseContext.event)]).toMatchObject({
      status: "succeeded",
    });
    expect(
      state.receipts[mirrorEventKey(phaseContext.event)].projectSyncHold,
    ).toBeUndefined();
    expect(
      state.receipts[mirrorEventKey(completionContext.event)],
    ).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("a requeued final completion becomes the newest Project reconciliation", async () => {
    const store = harness.fileStore(harness.linkedState());
    let remotePhase = "Ideation";
    const completionGateway = new ProjectGateway(harness.markerBody());
    completionGateway.fixture.items = memberAt(remotePhase);
    const updateCompletion =
      completionGateway.updateProjectItemSingleSelectField.bind(
        completionGateway,
      );
    completionGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updateCompletion(...args);
      if (result.kind === "ok" && args[4] === "opt-done") {
        remotePhase = "Done";
      }
      return result;
    };
    const completionState = store.state();
    const completionSnapshot = harness.workflowSnapshot({
      lifecyclePhase: "Operation",
      registryStatus: "complete",
      status: "Completed",
    });
    const completionContext = harness.context(
      "sync",
      completionGateway,
      {
        boundary: {
          kind: "workflow-completed",
          instance: "final-completion",
        },
        snapshot: completionSnapshot,
      },
    );
    const authorizedCompletionContext = {
      ...completionContext,
      authorization: {
        ...completionContext.authorization,
        receiptRevision: completionState.revision + 1,
      },
    };

    expect(
      (
        await executeMirrorOperation({
          context: authorizedCompletionContext,
          ports: store.ports,
          localState: completionState,
        })
      ).kind,
    ).toBe("completed");
    expect(remotePhase).toBe("Done");

    const phaseGateway = new ProjectGateway(harness.markerBody());
    phaseGateway.fixture.items = memberAt(remotePhase);
    const updatePhase =
      phaseGateway.updateProjectItemSingleSelectField.bind(phaseGateway);
    phaseGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updatePhase(...args);
      if (result.kind === "ok" && args[4] === "opt-ideation") {
        remotePhase = "Ideation";
      }
      return result;
    };
    const phaseState = store.state();
    const phaseContext = harness.context("sync", phaseGateway, {
      boundary: {
        kind: "phase-verified",
        phase: "ideation",
        instance: "later-phase",
      },
    });
    const authorizedPhaseContext = {
      ...phaseContext,
      authorization: {
        ...phaseContext.authorization,
        receiptRevision: phaseState.revision + 1,
      },
    };

    expect(
      (
        await executeMirrorOperation({
          context: authorizedPhaseContext,
          ports: store.ports,
          localState: phaseState,
        })
      ).kind,
    ).toBe("completed");
    expect(remotePhase).toBe("Ideation");

    const prepared = prepareCompletionProjectVerification(
      {
        intentUuid: completionContext.intentUuid,
        boundary: completionContext.event.boundary,
        snapshot: completionSnapshot,
        projects: [TARGET],
        ports: store.ports,
        now: completionContext.now,
      },
      store.state(),
    );
    expect(prepared.kind).toBe("ready");
    if (prepared.kind !== "ready") return;
    expect(prepared.verificationRequired).toBe(true);

    const reverifyGateway = new ProjectGateway(harness.markerBody());
    reverifyGateway.fixture.items = memberAt(remotePhase);
    const updateReverify =
      reverifyGateway.updateProjectItemSingleSelectField.bind(reverifyGateway);
    reverifyGateway.updateProjectItemSingleSelectField = async (...args) => {
      const result = await updateReverify(...args);
      if (result.kind === "ok" && args[4] === "opt-done") {
        remotePhase = "Done";
      }
      return result;
    };
    const reverified = await executeMirrorOperation({
      context: {
        ...authorizedCompletionContext,
        gateway: reverifyGateway,
      },
      ports: store.ports,
      localState: prepared.state,
    });

    expect(reverified.kind).toBe("completed");
    expect(projectCalls(reverifyGateway)).not.toEqual([]);
    expect(remotePhase).toBe("Done");
    const state = store.state();
    expect(
      state.receipts[mirrorEventKey(completionContext.event)],
    ).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
    expect(
      prepareCompletionProjectVerification(
        {
          intentUuid: completionContext.intentUuid,
          boundary: completionContext.event.boundary,
          snapshot: completionSnapshot,
          projects: [TARGET],
          ports: store.ports,
          now: completionContext.now,
        },
        state,
      ),
    ).toMatchObject({
      kind: "ready",
      verificationRequired: false,
    });
  });
});
