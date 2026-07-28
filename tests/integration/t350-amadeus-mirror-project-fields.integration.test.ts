// t350 — Project field synchronization over a real state document on disk:
// configured lifecycle fields, auxiliary Status, and keep semantics.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createMirrorMutationPermit } from "../../packages/framework/core/tools/amadeus-mirror-capability.ts";
import { executeMirrorOperation } from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import { EMPTY_MIRROR_STATE } from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorResolvedProjectFields } from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import {
  ISSUE_NODE_ID,
  PROJECT_NODE_ID,
  ProjectGateway,
  ProjectSyncTestHarness,
  TARGET,
  failure,
  projectCalls,
} from "../helpers/amadeus-mirror-project-sync-fixture.ts";

let harness: ProjectSyncTestHarness;

beforeEach(() => {
  harness = new ProjectSyncTestHarness("t350-");
});

afterEach(() => {
  harness.dispose();
});

describe("t350 configured lifecycle field", () => {
  test("the configured field drives resolution and current-value comparison", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_lifecycle",
        fieldName: "Lifecycle",
        options: [{ id: "opt-ideation", name: "Ideation" }],
      },
      auxiliaryStatus: {
        fieldId: "PVTSSF_status",
        fieldName: "Status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_existing",
          singleSelectValuesByFieldId: {
            PVTSSF_lifecycle: "Ideation",
            PVTSSF_status: "In progress",
          },
        },
      ],
    };

    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway, {
        targets: [{ ...TARGET, phaseField: "Lifecycle" }],
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(gateway.resolvedPhaseFields).toEqual(["Lifecycle"]);
    expect(gateway.history).not.toContain("update-project-item-field");
  });

  test("the authoritative field wins when it resolves to Status itself", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      lifecycle: {
        fieldId: "PVTSSF_shared",
        fieldName: "Status",
        options: [{ id: "opt-ideation", name: "Ideation" }],
      },
      auxiliaryStatus: {
        fieldId: "PVTSSF_shared",
        fieldName: "Status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };

    await executeMirrorOperation({
      context: harness.context("create", gateway, {
        targets: [{ ...TARGET, phaseField: "Status" }],
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(gateway.fieldUpdates).toEqual([
      { fieldId: "PVTSSF_shared", optionId: "opt-ideation" },
    ]);
  });
});

describe("t350 auxiliary Status", () => {
  test("an active Intent updates both Intent Phase and Status", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = activeFields();

    const outcome = await executeMirrorOperation({
      context: harness.context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(gateway.fieldUpdates).toEqual([
      { fieldId: "PVTSSF_intent_phase", optionId: "opt-ideation" },
      { fieldId: "PVTSSF_status", optionId: "opt-in-progress" },
    ]);
  });

  test("an unmapped lifecycle phase still updates Status", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = activeFields();

    const outcome = await executeMirrorOperation({
      context: harness.context("create", gateway, {
        snapshot: harness.workflowSnapshot({
          lifecyclePhase: "Initialization",
        }),
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(gateway.fieldUpdates).toEqual([
      { fieldId: "PVTSSF_status", optionId: "opt-in-progress" },
    ]);
  });

  test("a Status failure does not block Intent Phase synchronization", async () => {
    const store = harness.fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = activeFields();
    gateway.fixture.auxiliaryStatusUpdateResult = failure("network");

    const outcome = await executeMirrorOperation({
      context: harness.context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(gateway.fieldUpdates).toEqual([
      { fieldId: "PVTSSF_intent_phase", optionId: "opt-ideation" },
      { fieldId: "PVTSSF_status", optionId: "opt-in-progress" },
    ]);
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      lastAppliedStatus: "Ideation",
      state: "synced",
    });
  });

  test("an archived Intent keeps both existing field values", async () => {
    const store = harness.fileStore(harness.linkedState());
    const gateway = new ProjectGateway(harness.markerBody());
    gateway.fixture.field = activeFields();
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_existing",
          singleSelectValuesByFieldId: {
            PVTSSF_intent_phase: "Construction",
            PVTSSF_status: "In progress",
          },
        },
      ],
    };

    const outcome = await executeMirrorOperation({
      context: harness.context("sync", gateway, {
        snapshot: harness.workflowSnapshot({
          lifecyclePhase: "Construction",
          registryStatus: "archived",
          status: "Archived",
        }),
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-project-fields",
    ]);
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      lastAppliedStatus: "Construction",
      state: "synced",
    });
  });
});

describe("t350 shared Project gateway", () => {
  test("models issue edit and close transitions", async () => {
    const gateway = new ProjectGateway(harness.markerBody());
    const editEvent = harness.context("sync", gateway).event;

    const edited = await gateway.editIssue(
      createMirrorMutationPermit({
        event: editEvent,
        repository: gateway.issue.repository,
        operation: "sync",
        issueNumber: gateway.issue.number,
      }),
      "updated",
    );
    const closed = await gateway.closeIssue();

    expect(edited).toMatchObject({ kind: "ok", value: { body: "updated" } });
    expect(closed).toMatchObject({ kind: "ok", value: { state: "CLOSED" } });
    expect(gateway.history).toEqual(["edit", "close"]);
  });
});

function activeFields(): MirrorResolvedProjectFields {
  return {
    projectId: PROJECT_NODE_ID,
    lifecycle: {
      fieldId: "PVTSSF_intent_phase",
      fieldName: "Intent Phase",
      options: [
        { id: "opt-ideation", name: "Ideation" },
        { id: "opt-done", name: "Done" },
      ],
    },
    auxiliaryStatus: {
      fieldId: "PVTSSF_status",
      fieldName: "Status",
      options: [
        { id: "opt-in-progress", name: "In progress" },
        { id: "opt-workflow-done", name: "Done" },
      ],
    },
  };
}
