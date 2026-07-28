import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  MirrorResolvedProjectFields,
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
export const NOW = "2026-07-27T00:00:00Z";
const INTENT_DIR = "amadeus/spaces/default/intents/demo";
export const PROJECT_NODE_ID = "PVT_project";
export const ISSUE_NODE_ID = "I_issue";
export const TARGET: MirrorProjectTarget = {
  project: { owner: "acme", number: 5 },
  phaseField: "Intent Phase",
  statusNames: {},
};

const DEFAULT_FIELDS: MirrorResolvedProjectFields = {
  projectId: PROJECT_NODE_ID,
  lifecycle: {
    fieldId: "PVTSSF_intent_phase",
    fieldName: "Intent Phase",
    options: [
      { id: "opt-ideation", name: "Ideation" },
      { id: "opt-done", name: "Done" },
    ],
  },
  auxiliaryStatus: null,
};

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

export function failure(
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

type ProjectFixture = {
  items?: MirrorProjectItemsView;
  listResult?: GatewayOutcome<MirrorProjectItemsView>;
  field?: MirrorResolvedProjectFields;
  fieldResult?: GatewayOutcome<MirrorResolvedProjectFields>;
  addResult?: GatewayOutcome<{ itemId: string }>;
  updateResult?: GatewayOutcome<void>;
  auxiliaryStatusUpdateResult?: GatewayOutcome<void>;
};

export class ProjectGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  readonly resolvedPhaseFields: string[] = [];
  readonly fieldUpdates: Array<Readonly<{ fieldId: string; optionId: string }>> =
    [];
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

  async findIssuesByMarker(): Promise<
    GatewayOutcome<readonly RemoteMirrorIssue[]>
  > {
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

  async resolveProjectFields(
    _project: Parameters<MirrorGitHubGateway["resolveProjectFields"]>[0],
    phaseField: Parameters<MirrorGitHubGateway["resolveProjectFields"]>[1],
  ): Promise<GatewayOutcome<MirrorResolvedProjectFields>> {
    this.history.push("resolve-project-fields");
    this.resolvedPhaseFields.push(phaseField);
    if (this.fixture.fieldResult) return this.fixture.fieldResult;
    return ok(this.fixture.field ?? DEFAULT_FIELDS);
  }

  async addProjectItem(): Promise<GatewayOutcome<{ itemId: string }>> {
    this.history.push("add-project-item");
    return this.fixture.addResult ?? ok({ itemId: "PVTI_added" });
  }

  async updateProjectItemSingleSelectField(
    _permit: Parameters<
      MirrorGitHubGateway["updateProjectItemSingleSelectField"]
    >[0],
    _projectId: string,
    _itemId: string,
    fieldId: string,
    optionId: string,
  ): Promise<GatewayOutcome<void>> {
    const fields = this.fixture.field ?? DEFAULT_FIELDS;
    this.history.push("update-project-item-field");
    this.history.push(`option:${optionId}`);
    this.fieldUpdates.push({ fieldId, optionId });
    if (fieldId === fields.lifecycle.fieldId) {
      return this.fixture.updateResult ?? ok(undefined);
    }
    if (fieldId === fields.auxiliaryStatus?.fieldId) {
      return this.fixture.auxiliaryStatusUpdateResult ?? ok(undefined);
    }
    throw new Error(`ProjectGateway received unknown field id "${fieldId}"`);
  }
}

type ProjectStateStore = {
  ports: MirrorStateStorePorts;
  state: () => MirrorStateSnapshot;
};

type ContextOptions = {
  targets?: readonly MirrorProjectTarget[];
  snapshot?: MirrorSnapshot;
  diagnostics?: MirrorProjectDiagnostic[];
  boundary?: MirrorExecutionContext["event"]["boundary"];
};

const PROJECT_CALLS: ReadonlySet<string> = new Set([
  "list-project-items",
  "resolve-project-fields",
  "add-project-item",
  "update-project-item-field",
]);

export function projectCalls(gateway: ProjectGateway): string[] {
  return gateway.history.filter((entry) => PROJECT_CALLS.has(entry));
}

export class ProjectSyncTestHarness {
  readonly dir: string;
  readonly statePath: string;

  constructor(prefix: string) {
    this.dir = mkdtempSync(join(tmpdir(), prefix));
    this.statePath = join(this.dir, "amadeus-state.md");
  }

  dispose(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }

  fileStore(initial: MirrorStateSnapshot): ProjectStateStore {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(
      this.statePath,
      `# State\n\n${renderMirrorStateBlock(initial)}\n`,
      "utf-8",
    );
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
        readDocument: () => readFileSync(this.statePath, "utf-8"),
        writeDocumentAtomic: (text) => {
          writeFileSync(this.statePath, text, "utf-8");
          return { kind: "ok" };
        },
        appendArtifactUpdated() {
          return { kind: "appended" };
        },
      },
      state: () => {
        const parsed = parseMirrorStateDocument(
          readFileSync(this.statePath, "utf-8"),
        );
        if (parsed.kind === "invalid") {
          throw new Error(parsed.issues.join("; "));
        }
        return parsed.snapshot;
      },
    };
  }

  context(
    operation: MirrorOperation,
    gateway: MirrorGitHubGateway,
    options: ContextOptions = {},
  ): MirrorExecutionContext {
    const boundary =
      options.boundary ??
      ({ kind: "phase-verified", phase: "ideation", instance: "phase-1" } as const);
    const event = mirrorEventIdentity("intent-1", boundary, operation);
    const diagnostics = options.diagnostics;
    const snapshot = options.snapshot ?? this.workflowSnapshot();
    // The completion guard requires durable landing evidence before any
    // workflow-completed operation runs at all.
    const landed =
      snapshot.registryStatus === "complete" && snapshot.status === "Completed";
    return {
      statePath: this.statePath,
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

  workflowSnapshot(
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

  linkedState(): MirrorStateSnapshot {
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

  markerBody(): string {
    return `snapshot\n${renderMirrorMarker(identity())}`;
  }
}
