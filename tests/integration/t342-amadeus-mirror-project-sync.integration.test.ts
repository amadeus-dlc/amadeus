// t342 — C6 Project sync step over a real state document on disk: idempotence,
// the no-configuration short circuit, containment of Project failures, the
// safety-blocked observations, and the per-Project call budget.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeMirrorOperation } from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import { mirrorEventIdentity } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { renderMirrorMarker } from "../../packages/framework/core/tools/amadeus-mirror-provenance.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorCreateIdentity,
  MirrorExecutionContext,
  MirrorGitHubGateway,
  MirrorOperation,
  MirrorProjectDiagnostic,
  MirrorProjectItemsView,
  MirrorProjectStatusField,
  MirrorProjectTarget,
  MirrorSnapshot,
  MirrorStateSnapshot,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "app",
  canonical: "acme/app",
};
const NOW = "2026-07-27T00:00:00Z";
const INTENT_DIR = "amadeus/spaces/default/intents/demo";
const PROJECT_NODE_ID = "PVT_project";
const ISSUE_NODE_ID = "I_issue";
const TARGET: MirrorProjectTarget = {
  project: { owner: "acme", number: 5 },
  statusNames: {},
};

// A token that must never reach a diagnostic: the fixtures below carry it in the
// places a careless implementation would transcribe (a gateway summary source
// and an unrelated remote field).
const SECRET = "ghp_projectSyncSecretToken";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "t342-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

function failure(
  classification: "network" | "permission" | "api",
  effect: "not-started" | "outcome-unknown" = "not-started",
): Extract<GatewayOutcome<never>, { kind: "failure" }> {
  return {
    kind: "failure",
    classification,
    summary: `GitHub unavailable (${classification}; ${effect}; exit=0; http=none)`,
    retryable: classification !== "permission",
    effect,
  };
}

function identity(operationId = "op-1"): MirrorCreateIdentity {
  return {
    schema: 1,
    intentUuid: "intent-1",
    intentDir: INTENT_DIR,
    repository: REPO,
    operationId,
    preparedAt: NOW,
  };
}

// A real state document on disk behind the production store ports.
function fileStore(initial: MirrorStateSnapshot): {
  ports: MirrorStateStorePorts;
  state: () => MirrorStateSnapshot;
} {
  const statePath = join(dir, "amadeus-state.md");
  mkdirSync(dir, { recursive: true });
  writeFileSync(statePath, `# State\n\n${renderMirrorStateBlock(initial)}\n`, "utf-8");
  let locked = false;
  return {
    ports: {
      acquireLock() {
        if (locked) return false;
        locked = true;
        return true;
      },
      releaseLock() {
        locked = false;
      },
      readDocument() {
        return readFileSync(statePath, "utf-8");
      },
      writeDocumentAtomic(text) {
        writeFileSync(statePath, text, "utf-8");
        return { kind: "ok" };
      },
      appendArtifactUpdated() {
        return { kind: "appended" };
      },
    },
    state() {
      const parsed = parseMirrorStateDocument(readFileSync(statePath, "utf-8"));
      if (parsed.kind === "invalid") throw new Error(parsed.issues.join("; "));
      return parsed.snapshot;
    },
  };
}

type ProjectFixture = {
  items?: MirrorProjectItemsView;
  listResult?: GatewayOutcome<MirrorProjectItemsView>;
  field?: MirrorProjectStatusField;
  fieldResult?: GatewayOutcome<MirrorProjectStatusField>;
  addResult?: GatewayOutcome<{ itemId: string }>;
  updateResult?: GatewayOutcome<void>;
  workflowUpdateResult?: GatewayOutcome<void>;
};

class ProjectGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue;
  fixture: ProjectFixture = {};

  constructor(body: string) {
    this.issue = {
      repository: REPO,
      number: 7,
      title: "Mirror",
      body,
      state: "OPEN",
    };
  }

  async readiness(): Promise<GatewayOutcome<void>> {
    this.history.push("readiness");
    return ok(undefined);
  }
  async createIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    return ok(this.issue);
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    this.history.push("find");
    return ok([]);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("view");
    return ok(this.issue);
  }
  async editIssue(
    _permit: Parameters<MirrorGitHubGateway["editIssue"]>[0],
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("edit");
    this.issue = { ...this.issue, body };
    return ok(this.issue);
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("close");
    this.issue = { ...this.issue, state: "CLOSED" };
    return ok(this.issue);
  }

  async listProjectItems(): Promise<GatewayOutcome<MirrorProjectItemsView>> {
    this.history.push("list-project-items");
    if (this.fixture.listResult) return this.fixture.listResult;
    return ok(this.fixture.items ?? { issueNodeId: ISSUE_NODE_ID, items: [] });
  }
  async resolveProjectStatusField(): Promise<
    GatewayOutcome<MirrorProjectStatusField>
  > {
    this.history.push("resolve-status-field");
    if (this.fixture.fieldResult) return this.fixture.fieldResult;
    return ok(
      this.fixture.field ?? {
        projectId: PROJECT_NODE_ID,
        fieldId: "PVTSSF_status",
        options: [
          { id: "opt-ideation", name: "Ideation" },
          { id: "opt-done", name: "Done" },
        ],
      },
    );
  }
  async addProjectItem(): Promise<GatewayOutcome<{ itemId: string }>> {
    this.history.push("add-project-item");
    return this.fixture.addResult ?? ok({ itemId: "PVTI_added" });
  }
  async updateProjectItemStatus(
    _permit: Parameters<MirrorGitHubGateway["updateProjectItemStatus"]>[0],
    _projectId: string,
    _itemId: string,
    _fieldId: string,
    optionId: string,
  ): Promise<GatewayOutcome<void>> {
    this.history.push("update-project-item-status");
    this.history.push(`option:${optionId}`);
    if (optionId === "opt-in-progress" || optionId === "opt-workflow-done") {
      return this.fixture.workflowUpdateResult ?? ok(undefined);
    }
    return this.fixture.updateResult ?? ok(undefined);
  }
}

function workflowSnapshot(
  overrides: Partial<MirrorSnapshot> = {},
): MirrorSnapshot {
  return {
    intentUuid: "intent-1",
    intentDir: INTENT_DIR,
    projectSummary: "demo",
    lifecyclePhase: "Ideation",
    currentStage: "intent-capture",
    status: "In Progress",
    registryStatus: "in-flight",
    updatedAt: NOW,
    ...overrides,
  };
}

function context(
  operation: MirrorOperation,
  gateway: MirrorGitHubGateway,
  options: {
    targets?: readonly MirrorProjectTarget[];
    snapshot?: MirrorSnapshot;
    diagnostics?: MirrorProjectDiagnostic[];
    boundary?: MirrorExecutionContext["event"]["boundary"];
  } = {},
): MirrorExecutionContext {
  const boundary =
    options.boundary ??
    ({ kind: "phase-verified", phase: "ideation", instance: "phase-1" } as const);
  const event = mirrorEventIdentity("intent-1", boundary, operation);
  const diagnostics = options.diagnostics;
  const snapshot = options.snapshot ?? workflowSnapshot();
  // The completion guard requires durable landing evidence before any
  // workflow-completed operation runs at all.
  const landed =
    snapshot.registryStatus === "complete" && snapshot.status === "Completed";
  return {
    statePath: join(dir, "amadeus-state.md"),
    intentUuid: "intent-1",
    intentDir: INTENT_DIR,
    repository: REPO,
    triggerEvent: event,
    event,
    operation,
    issueContent: {
      title: "Mirror",
      body: `snapshot\n${renderMirrorMarker(identity())}`,
      labels: ["amadeus-intent-mirror"],
    },
    expectedMirrorRevision: 0,
    now: () => NOW,
    newOperationId: () => "op-1",
    gateway,
    authorization: {
      kind: "auto",
      event,
      operation,
      boundaryInstance: boundary.instance,
      receiptRevision: 1,
      resolvedMode: "auto",
      ...(landed
        ? {
            landing: {
              registryStatus: "complete" as const,
              workflowStatus: "Completed" as const,
            },
          }
        : {}),
    },
    projectSync: {
      targets: options.targets ?? [TARGET],
      snapshot,
      ...(diagnostics ? { diagnostic: (d) => diagnostics.push(d) } : {}),
    },
  };
}

function linkedState(): MirrorStateSnapshot {
  return {
    ...EMPTY_MIRROR_STATE,
    issueNumber: 7,
    provenance: {
      schema: 1,
      createIdentity: identity(),
      issueNumber: 7,
      createdAt: NOW,
    },
  };
}

function markerBody(): string {
  return `snapshot\n${renderMirrorMarker(identity())}`;
}

const PROJECT_CALLS: ReadonlySet<string> = new Set([
  "list-project-items",
  "resolve-status-field",
  "add-project-item",
  "update-project-item-status",
]);

function projectCalls(gateway: ProjectGateway): string[] {
  return gateway.history.filter((entry) => PROJECT_CALLS.has(entry));
}

describe("t342 create then project sync", () => {
  test("an active Intent updates Intent Phase and auxiliary Status", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [
        { id: "opt-ideation", name: "Ideation" },
        { id: "opt-done", name: "Done" },
      ],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [
          { id: "opt-in-progress", name: "In progress" },
          { id: "opt-workflow-done", name: "Done" },
        ],
      },
    };

    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(gateway.history).toContain("option:opt-ideation");
    expect(gateway.history).toContain("option:opt-in-progress");
  });

  test("an auxiliary Status failure does not block Intent Phase sync", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [{ id: "opt-ideation", name: "Ideation" }],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    gateway.fixture.workflowUpdateResult = failure("network");

    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      lastAppliedStatus: "Ideation",
      state: "synced",
    });
  });

  test("a fresh create adds the item, sets Intent Phase, and records one synced row", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome).toEqual({ kind: "completed", operation: "create", issueNumber: 7 });
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-status-field",
      "add-project-item",
      "update-project-item-status",
    ]);
    expect(store.state().projectSync).toEqual({
      projects: [
        {
          project: "acme/5",
          projectId: PROJECT_NODE_ID,
          itemId: "PVTI_added",
          lastAppliedStatus: "Ideation",
          state: "synced",
          updatedAt: NOW,
        },
      ],
    });
  });

  test("the ledger survives on disk as a parseable state document", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    await executeMirrorOperation({
      context: context("create", new ProjectGateway(markerBody())),
      ports: store.ports,
      localState: store.state(),
    });
    const document = readFileSync(join(dir, "amadeus-state.md"), "utf-8");
    expect(document).toContain('"projectSync":{"projects":[');
    expect(parseMirrorStateDocument(document).kind).toBe("ok");
  });
});

describe("t342 idempotence", () => {
  test("a second sync over a converged board issues no Project mutation", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          currentStatus: "Ideation",
        },
      ],
    };
    const outcome = await executeMirrorOperation({
      context: context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-status-field",
    ]);
    expect(store.state().projectSync?.projects[0].lastAppliedStatus).toBe(
      "Ideation",
    );
  });

  test("running the same boundary twice leaves the Project mutation total unchanged", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    const run = () =>
      executeMirrorOperation({
        context: context("sync", gateway),
        ports: store.ports,
        localState: store.state(),
      });

    await run();
    const afterFirst = gateway.history.filter((entry) =>
      entry.startsWith("add-") || entry.startsWith("update-"),
    ).length;
    // The board now reports the item the first pass created, at the Status it set.
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_added",
          currentStatus: "Ideation",
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
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.items = {
      issueNodeId: ISSUE_NODE_ID,
      items: [
        {
          projectId: PROJECT_NODE_ID,
          projectNumber: 5,
          projectOwner: "acme",
          itemId: "PVTI_item1",
          currentStatus: "Inception",
        },
      ],
    };
    await executeMirrorOperation({
      context: context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });
    expect(gateway.history).not.toContain("add-project-item");
    expect(gateway.history).toContain("update-project-item-status");
  });
});

describe("t342 no configuration", () => {
  test("no configured Project makes zero Project API calls and writes no ledger", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    const outcome = await executeMirrorOperation({
      context: context("create", gateway, { targets: [] }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([]);
    expect(store.state().projectSync).toBeNull();
  });

  test("an execution context without projectSync at all behaves the same", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    const base = context("create", gateway);
    const { projectSync: _omitted, ...withoutProjectSync } = base;
    const outcome = await executeMirrorOperation({
      context: withoutProjectSync as MirrorExecutionContext,
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("completed");
    expect(projectCalls(gateway)).toEqual([]);
  });

  test("close never runs the Project step", async () => {
    const store = fileStore({
      ...linkedState(),
      receipts: {},
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.issue = { ...gateway.issue, state: "CLOSED" };
    await executeMirrorOperation({
      context: context("close", gateway, {
        boundary: { kind: "workflow-completed", instance: "done-1" },
      }),
      ports: store.ports,
      localState: store.state(),
    });
    expect(projectCalls(gateway)).toEqual([]);
  });
});

describe("t342 failure containment", () => {
  test("a membership query failure keeps the Issue link and marks every target pending", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.listResult = failure("network");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    const outcome = await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
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
        lastAppliedStatus: null,
        state: "pending",
        updatedAt: NOW,
      },
    ]);
    expect(projectCalls(gateway)).toEqual(["list-project-items"]);
    expect(diagnostics.map((d) => d.reason)).toEqual(["membership-query-failed"]);
  });

  test("a membership query failure leaves a visible unsynchronized warning", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.listResult = failure("network");

    await executeMirrorOperation({
      context: context("sync", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    const warnings = store.state().warnings;
    expect(warnings.some((w) => w.summary.includes("unsynchronized"))).toBe(true);
    expect(warnings.some((w) => w.classification === "network")).toBe(true);
  });

  test("an add failure classifies that Project by its failure class", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.addResult = failure("permission");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    const outcome = await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
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
    expect(gateway.history).not.toContain("update-project-item-status");
    expect(diagnostics.map((d) => d.reason)).toEqual(["add-failed"]);
  });

  test("an update failure leaves a pending row, so a retry re-applies", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.updateResult = failure("api", "outcome-unknown");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
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
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.fieldResult = failure("api");
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(projectCalls(gateway)).toEqual([
      "list-project-items",
      "resolve-status-field",
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
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_status",
      options: [
        { id: "opt-a", name: "Backlog" },
        { id: "opt-b", name: "Shipped" },
      ],
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(diagnostics).toEqual([
      {
        project: "acme/5",
        reason: "option-missing",
        expectedStatus: "Ideation",
        availableOptions: ["Backlog", "Shipped"],
        summary: 'the Project has no Intent Phase option named exactly "Ideation"',
      },
    ]);
    expect(gateway.history).not.toContain("update-project-item-status");
    // A column the board does not declare cannot be reached by retrying.
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "safety-blocked",
    });
  });

  test("a case-only difference does not match, proving exact-match matching", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_status",
      options: [{ id: "opt-a", name: "ideation" }],
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(diagnostics[0].reason).toBe("option-missing");
    expect(diagnostics[0].availableOptions).toEqual(["ideation"]);
  });

  test("a configured name that no board option carries is the falling case", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, {
        diagnostics,
        targets: [
          {
            project: { owner: "acme", number: 5 },
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
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_status",
      options: [{ id: SECRET, name: "Backlog" }],
    };
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await executeMirrorOperation({
      context: context("sync", gateway, { diagnostics }),
      ports: store.ports,
      localState: store.state(),
    });

    const rendered = JSON.stringify(diagnostics);
    expect(diagnostics).toHaveLength(1);
    expect(rendered).toContain("option-missing");
    expect(rendered).not.toContain(SECRET);
    expect(readFileSync(join(dir, "amadeus-state.md"), "utf-8")).not.toContain(
      SECRET,
    );
  });
});

describe("t342 keep branch", () => {
  test("a parked boundary adds the item but applies no Intent Phase", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [{ id: "opt-ideation", name: "Ideation" }],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    await executeMirrorOperation({
      context: context("sync", gateway, {
        boundary: { kind: "parked", stage: "feasibility", instance: "park-1" },
      }),
      ports: store.ports,
      localState: store.state(),
    });

    expect(gateway.history).toContain("add-project-item");
    expect(gateway.history).not.toContain("update-project-item-status");
    expect(store.state().projectSync?.projects[0]).toMatchObject({
      state: "synced",
      lastAppliedStatus: null,
    });
  });
});

describe("t342 call budget", () => {
  test("one membership query and at most three mutations per Project", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [{ id: "opt-ideation", name: "Ideation" }],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [{ id: "opt-in-progress", name: "In progress" }],
      },
    };
    await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    const calls = projectCalls(gateway);
    expect(calls.filter((c) => c === "list-project-items")).toHaveLength(1);
    expect(calls.filter((c) => c === "resolve-status-field")).toHaveLength(1);
    expect(
      calls.filter((c) => c === "add-project-item" || c === "update-project-item-status"),
    ).toHaveLength(3);
  });

  test("a landed workflow drives the done column", async () => {
    const store = fileStore(linkedState());
    const gateway = new ProjectGateway(markerBody());
    gateway.fixture.field = {
      projectId: PROJECT_NODE_ID,
      fieldId: "PVTSSF_intent_phase",
      options: [{ id: "opt-done", name: "Done" }],
      workflowStatusField: {
        fieldId: "PVTSSF_status",
        options: [{ id: "opt-workflow-done", name: "Done" }],
      },
    };
    await executeMirrorOperation({
      context: context("sync", gateway, {
        snapshot: workflowSnapshot({
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
