// t346 — the Project sync wired into every lifecycle boundary, over a real
// record on disk: the per-boundary behaviour table, the completion gate that
// withholds `close` until every board reached its done column, the two parked
// paths that issue no field mutation at all, and the prompt's Project face.
// covers: packages/framework/core/tools/amadeus-mirror-{coordinator,lifecycle}.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import {
  mirrorEventIdentity,
  mirrorEventKey,
} from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import { renderMirrorMarker } from "../../packages/framework/core/tools/amadeus-mirror-provenance.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  createMirrorStateStorePorts,
  type MirrorStateStorePorts,
} from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorBoundary,
  MirrorCreateIdentity,
  MirrorGitHubGateway,
  MirrorProjectItem,
  MirrorProjectItemsView,
  MirrorProjectRef,
  MirrorProjectStatusNames,
  MirrorResolvedProjectFields,
  MirrorStateSnapshot,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const NOW = "2026-07-27T00:00:00Z";
const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };
const INTENT_DIR = "260727-demo-a1b2c3d4";
const INTENT_UUID = "intent-t346";
const ISSUE = 77;
const BOARD_A: MirrorProjectRef = { owner: "acme", number: 5 };
const BOARD_B: MirrorProjectRef = { owner: "acme", number: 6 };

const OPTIONS = [
  { id: "opt-ideation", name: "Ideation" },
  { id: "opt-inception", name: "Inception" },
  { id: "opt-construction", name: "Construction" },
  { id: "opt-operation", name: "Operation" },
  { id: "opt-done", name: "Done" },
];

// The classes a gateway call can actually report, as the outcome union declares.
type GatewayFailureClass = Extract<
  GatewayOutcome<never>,
  { kind: "failure" }
>["classification"];

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

function canonical(project: MirrorProjectRef): string {
  return `${project.owner}/${project.number}`;
}

function identity(): MirrorCreateIdentity {
  return {
    schema: 1,
    intentUuid: INTENT_UUID,
    intentDir: INTENT_DIR,
    repository: REPO,
    operationId: "op-seed",
    preparedAt: NOW,
  };
}

// One gateway for every boundary under test. `history` is the assertion surface:
// a parked boundary must leave no `add:`/`update:` entry in it at all.
class ProjectGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue;
  items: MirrorProjectItem[] = [];
  updateFailures = new Map<number, GatewayFailureClass>();

  constructor(body: string) {
    this.issue = { repository: REPO, number: ISSUE, title: "Mirror", body, state: "OPEN" };
  }

  async readiness(): Promise<GatewayOutcome<void>> {
    return ok(undefined);
  }
  async createIssue(
    _permit: Parameters<MirrorGitHubGateway["createIssue"]>[0],
    content: { title: string; body: string },
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    this.issue = { ...this.issue, title: content.title, body: content.body };
    return ok(this.issue);
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    return ok([]);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
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
    this.history.push("list");
    return ok({ issueNodeId: "I_issue", items: [...this.items] });
  }
  async resolveProjectFields(
    project: MirrorProjectRef,
  ): Promise<GatewayOutcome<MirrorResolvedProjectFields>> {
    return ok({
      projectId: `PVT_${project.number}`,
      lifecycle: {
        fieldId: `PVTSSF_${project.number}`,
        fieldName: "Intent Phase",
        options: OPTIONS,
      },
      auxiliaryStatus: null,
    });
  }
  async addProjectItem(
    permit: Parameters<MirrorGitHubGateway["addProjectItem"]>[0],
  ): Promise<GatewayOutcome<{ itemId: string }>> {
    const project = permit.project;
    this.history.push(`add:${canonical(project)}`);
    this.items.push({
      projectId: `PVT_${project.number}`,
      projectNumber: project.number,
      projectOwner: project.owner,
      itemId: `PVTI_${project.number}`,
      singleSelectValuesByFieldId: {},
    });
    return ok({ itemId: `PVTI_${project.number}` });
  }
  async updateProjectItemSingleSelectField(
    permit: Parameters<
      MirrorGitHubGateway["updateProjectItemSingleSelectField"]
    >[0],
    _projectId: string,
    _itemId: string,
    fieldId: string,
    optionId: string,
  ): Promise<GatewayOutcome<void>> {
    const number = permit.project.number;
    this.history.push(`update:${canonical(permit.project)}`);
    const injected = this.updateFailures.get(number);
    if (injected) {
      return {
        kind: "failure",
        classification: injected,
        summary: `injected ${injected}`,
        retryable: injected !== "permission",
        effect: "not-started",
      };
    }
    const name = OPTIONS.find((option) => option.id === optionId)?.name ?? null;
    this.items = this.items.map((each) =>
      each.projectNumber === number
        ? {
            ...each,
            singleSelectValuesByFieldId:
              name === null
                ? {}
                : { ...each.singleSelectValuesByFieldId, [fieldId]: name },
          }
        : each,
    );
    return ok(undefined);
  }
}

function fieldMutations(gateway: ProjectGateway): string[] {
  return gateway.history.filter((entry) => entry.startsWith("update:"));
}

// A board the Issue already belongs to. Configuration carries one target (U1),
// so a second board reaches the loop through the membership union.
function memberItem(
  project: MirrorProjectRef,
  currentStatus: string | null,
): MirrorProjectItem {
  const lifecycleFieldId = `PVTSSF_${project.number}`;
  return {
    projectId: `PVT_${project.number}`,
    projectNumber: project.number,
    projectOwner: project.owner,
    itemId: `PVTI_${project.number}`,
    singleSelectValuesByFieldId:
      currentStatus === null ? {} : { [lifecycleFieldId]: currentStatus },
  };
}

type FixtureOptions = Readonly<{
  lifecyclePhase?: string;
  registryStatus?: "in-flight" | "parked" | "complete";
  mode?: "auto" | "prompt" | "off";
  boards?: readonly MirrorProjectRef[];
  phaseField?: string;
  statusNames?: MirrorProjectStatusNames;
  state?: MirrorStateSnapshot;
}>;

function fixture(options: FixtureOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), "t346-"));
  roots.push(root);
  const space = "default";
  const registryStatus = options.registryStatus ?? "in-flight";
  const intentsPath = join(root, "amadeus", "spaces", space, "intents");
  const recordPath = join(intentsPath, INTENT_DIR);
  mkdirSync(recordPath, { recursive: true });
  const statePath = join(recordPath, "amadeus-state.md");
  writeFileSync(
    statePath,
    [
      "# Amadeus State",
      "",
      "- **Project**: Project status sync",
      `- **Lifecycle Phase**: ${options.lifecyclePhase ?? "IDEATION"}`,
      "- **Current Stage**: intent-capture",
      `- **Status**: ${registryStatus === "complete" ? "Completed" : "Running"}`,
      `- **Last Updated**: ${NOW}`,
      "",
      renderMirrorStateBlock(options.state ?? EMPTY_MIRROR_STATE),
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(intentsPath, "intents.json"),
    JSON.stringify([
      {
        uuid: INTENT_UUID,
        slug: "demo",
        dirName: INTENT_DIR,
        scope: "feature",
        repos: [REPO.canonical],
        status: registryStatus,
      },
    ]),
  );
  writeFileSync(
    join(root, "amadeus", "config.json"),
    JSON.stringify({
      "auto-mirror": options.mode ?? "auto",
      "mirror-projects": (options.boards ?? [BOARD_A]).map((board) => ({
        project: canonical(board),
        ...(options.phaseField
          ? { "phase-field": options.phaseField }
          : {}),
        ...(options.statusNames
          ? { "status-names": options.statusNames }
          : {}),
      })),
    }),
  );
  const real = createMirrorStateStorePorts({
    projectDir: root,
    statePath,
    intent: INTENT_DIR,
    space,
  });
  const ports: MirrorStateStorePorts = {
    ...real,
    appendArtifactUpdated: () => ({ kind: "appended" }),
  };
  return {
    root,
    space,
    statePath,
    ports,
    state(): MirrorStateSnapshot {
      const parsed = parseMirrorStateDocument(readFileSync(statePath, "utf-8"));
      if (parsed.kind === "invalid") throw new Error(parsed.issues.join("; "));
      return parsed.snapshot;
    },
  };
}

function markerBody(): string {
  return `snapshot\n${renderMirrorMarker(identity())}`;
}

function linkedState(
  overrides: Partial<MirrorStateSnapshot> = {},
): MirrorStateSnapshot {
  return {
    ...EMPTY_MIRROR_STATE,
    issueNumber: ISSUE,
    provenance: { schema: 1, createIdentity: identity(), issueNumber: ISSUE, createdAt: NOW },
    ...overrides,
  };
}

function drive(
  fx: ReturnType<typeof fixture>,
  gateway: ProjectGateway,
  boundary: MirrorBoundary,
  manual?: { operation: "create" | "sync" | "close"; invocationId: string },
) {
  return runMirrorLifecycleBoundary(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: INTENT_DIR,
      repository: REPO,
      boundary,
      ...(manual
        ? { manualOperation: manual.operation, invocationId: manual.invocationId }
        : {}),
    },
    {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "op-1",
    },
  );
}

function rowFor(state: MirrorStateSnapshot, project: MirrorProjectRef) {
  return state.projectSync?.projects.find((each) => each.project === canonical(project));
}

describe("t346 boundary behaviour table", () => {
  test("intent-capture-approved creates the Issue and joins the board at the current phase", async () => {
    const fx = fixture();
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, { kind: "intent-capture-approved", instance: "capture-1" });

    expect(gateway.history).toContain("create");
    expect(gateway.history).toContain(`add:${canonical(BOARD_A)}`);
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
  });

  test("phase-verified reads the record's Lifecycle Phase, not the boundary's argument", async () => {
    const fx = fixture({
      lifecyclePhase: "CONSTRUCTION",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    // The boundary carries the phase that just *ended*; the column must follow
    // the phase the record is in now.
    await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "inception",
      instance: "phase-1",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Construction");
  });

  test("a phase sync never writes the done column", async () => {
    const fx = fixture({ lifecyclePhase: "OPERATION", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "construction",
      instance: "phase-2",
    });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Operation");
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).not.toBe("Done");
  });

  test("workflow-completed drives the board to done and then closes the Issue", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, { kind: "workflow-completed", instance: "completion-1" });

    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Done");
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
  });
});

describe("t346 parked boundaries issue no field mutation", () => {
  test("the parked boundary syncs the Issue body and leaves the column alone", async () => {
    const fx = fixture({ lifecyclePhase: "INCEPTION", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Ideation")];

    await drive(fx, gateway, { kind: "parked", stage: "scope-definition", instance: "park-1" });

    expect(fieldMutations(gateway)).toEqual([]);
    expect(gateway.history).toContain("edit");
    // The row is still recorded as synced, carrying the column the human left.
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
  });

  test("a manual sync while the Intent is parked also leaves the column alone", async () => {
    const fx = fixture({
      lifecyclePhase: "INCEPTION",
      registryStatus: "parked",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Ideation")];

    await drive(fx, gateway, { kind: "manual", instance: "manual-1" }, {
      operation: "sync",
      invocationId: "manual-1",
    });

    expect(fieldMutations(gateway)).toEqual([]);
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Ideation");
  });
});

// A completion whose sync receipt already succeeded but whose ledger still owes
// a board: only the gate can withhold the close here, so this pair isolates it
// from the receipt hold that parks an unsettled sync.
function completedSyncState(
  row: Readonly<{ state: "synced" | "pending"; lastAppliedStatus: string | null }>,
  options: Readonly<{ verified?: boolean; legacy?: boolean }> = {},
): MirrorStateSnapshot {
  const event = mirrorEventIdentity(
    INTENT_UUID,
    { kind: "workflow-completed", instance: "completion-gate" },
    "sync",
  );
  const key = mirrorEventKey(event);
  return linkedState({
    revision: 1,
    receipts: {
      [key]: {
        key,
        event,
        operationId: "op-sync",
        ...(options.legacy ? {} : { createdRevision: 1 }),
        status: "succeeded",
        preparedAt: NOW,
        attemptedAt: NOW,
        completedAt: NOW,
        ...(options.verified ? { projectSyncVerified: true as const } : {}),
        authorization: {
          kind: "auto",
          event,
          operation: "sync",
          boundaryInstance: event.boundary.instance,
          receiptRevision: 1,
          landing: {
            registryStatus: "complete",
            workflowStatus: "Completed",
          },
          resolvedMode: "auto",
        },
      },
    },
    projectSync: {
      projects: [
        {
          project: canonical(BOARD_A),
          projectId: `PVT_${BOARD_A.number}`,
          itemId: `PVTI_${BOARD_A.number}`,
          phaseField: "Intent Phase",
          lastAppliedStatus: row.lastAppliedStatus,
          state: row.state,
          updatedAt: NOW,
        },
      ],
    },
  });
}

describe("t346 completion gate", () => {
  test("a pre-marker final sync is re-queried before close", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState({ state: "synced", lastAppliedStatus: "Done" }),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const queriedAt = gateway.history.indexOf("list");
    const updatedAt = gateway.history.indexOf(`update:${canonical(BOARD_A)}`);
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(updatedAt).toBeGreaterThan(queriedAt);
    expect(closedAt).toBeGreaterThan(updatedAt);
    expect(gateway.issue.state).toBe("CLOSED");
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("a failed legacy requeue write blocks close and retries next time", async () => {
    const seeded = completedSyncState({
      state: "synced",
      lastAppliedStatus: "Done",
    }, { legacy: true });
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: seeded,
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];
    const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
    let failRequeue = true;
    fx.ports = {
      ...fx.ports,
      writeDocumentAtomic(text: string) {
        if (failRequeue && text.includes('"projectSyncHold"')) {
          failRequeue = false;
          return {
            kind: "io-failure" as const,
            summary: "injected legacy requeue failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;

    const first = await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(gateway.history).not.toContain("close");
    expect(gateway.history).not.toContain("list");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
    });
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    if (first.kind !== "ok" || first.outcome.kind !== "continued") {
      throw new Error("expected a continued boundary outcome");
    }
    expect(first.outcome.outcomes.at(-1)).toMatchObject({
      kind: "pending",
      operation: "sync",
      warning: {
        operation: "sync",
        operationId: "op-sync",
        classification: "state-write",
      },
    });

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).toContain("list");
    expect(gateway.history).toContain("close");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
  });

  test("once every board reached done the same boundary closes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, { kind: "workflow-completed", instance: "completion-gate" });

    expect(gateway.history).toContain("close");
    expect(gateway.history).not.toContain("list");
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("removing every configured board retires stale ledger rows from the close gate", async () => {
    const seeded = completedSyncState({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    const stale = {
      ...seeded,
      projectSync: {
        projects: (seeded.projectSync?.projects ?? []).map((entry) => ({
          ...entry,
          phaseField: "Lifecycle Phase",
        })),
      },
    };
    const fx = fixture({
      boards: [],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: stale,
    });
    const gateway = new ProjectGateway(markerBody());

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).toContain("close");
    expect(gateway.history).not.toContain("list-project-items");
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("a verified sync is re-run when the configured phase field changes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      phaseField: "Lifecycle",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    const queriedAt = gateway.history.indexOf("list");
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(closedAt).toBeGreaterThan(queriedAt);
    expect(gateway.history).toContain("list");
    expect(gateway.issue.state).toBe("CLOSED");
    if (result.kind !== "ok" || result.outcome.kind !== "continued")
      throw new Error("expected a continued boundary outcome");
    const outcome = result.outcome.outcomes.at(-1);
    expect(outcome).toMatchObject({ kind: "completed", operation: "close" });
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(
        INTENT_UUID,
        { kind: "workflow-completed", instance: "completion-gate" },
        "sync",
      ),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      projectSyncVerified: true,
    });
    expect(rowFor(fx.state(), BOARD_A)?.phaseField).toBe("Lifecycle");
  });

  test("a manual close re-syncs target, field, and status config drift before closing", async () => {
    const fx = fixture({
      boards: [BOARD_B],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      phaseField: "Lifecycle",
      statusNames: { done: "Shipped" },
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [];
    gateway.resolveProjectFields = async (project) =>
      ok({
        projectId: `PVT_${project.number}`,
        lifecycle: {
          fieldId: `PVTSSF_${project.number}`,
          fieldName: "Lifecycle",
          options: [...OPTIONS, { id: "opt-shipped", name: "Shipped" }],
        },
        auxiliaryStatus: null,
      });

    await drive(
      fx,
      gateway,
      { kind: "manual", instance: "manual-close-drift" },
      { operation: "close", invocationId: "manual-close-drift" },
    );

    const queriedAt = gateway.history.indexOf("list");
    const addedAt = gateway.history.indexOf(`add:${canonical(BOARD_B)}`);
    const updatedAt = gateway.history.indexOf(`update:${canonical(BOARD_B)}`);
    const closedAt = gateway.history.indexOf("close");
    expect(queriedAt).toBeGreaterThanOrEqual(0);
    expect(addedAt).toBeGreaterThan(queriedAt);
    expect(updatedAt).toBeGreaterThan(addedAt);
    expect(closedAt).toBeGreaterThan(updatedAt);
    expect(rowFor(fx.state(), BOARD_B)).toMatchObject({
      phaseField: "Lifecycle",
      lastAppliedStatus: "Shipped",
      state: "synced",
    });
    expect(gateway.issue.state).toBe("CLOSED");
  });

  test("disabling Projects retires an existing sync hold and then closes", async () => {
    const seeded = completedSyncState({
      state: "pending",
      lastAppliedStatus: "Operation",
    });
    const syncKey = Object.keys(seeded.receipts)[0];
    const heldReceipt = {
      ...seeded.receipts[syncKey],
      status: "pending" as const,
      projectSyncHold: {
        reason: "project-sync-unsettled" as const,
        heldAt: NOW,
      },
    };
    const held = {
      ...seeded,
      revision: 1,
      receipts: { [syncKey]: heldReceipt },
    };
    const fx = fixture({
      boards: [],
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: held,
    });
    const gateway = new ProjectGateway(markerBody());
    const priorProvenance = fx.state().provenance;

    await drive(fx, gateway, {
      kind: "workflow-completed",
      instance: "completion-gate",
    });

    expect(gateway.history).not.toContain("list");
    expect(fieldMutations(gateway)).toEqual([]);
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "succeeded",
      completedAt: NOW,
    });
    expect(fx.state().receipts[syncKey].projectSyncHold).toBeUndefined();
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    expect(fx.state().issueNumber).toBe(ISSUE);
    expect(fx.state().provenance).toEqual(priorProvenance);
  });

  test("an unsettled final sync parks the sync itself, so the close is never reached", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, null), memberItem(BOARD_B, null)];
    gateway.updateFailures.set(BOARD_B.number, "rate-limit");

    await drive(fx, gateway, { kind: "workflow-completed", instance: "completion-2" });

    expect(gateway.history).not.toContain("close");
    expect(rowFor(fx.state(), BOARD_A)?.lastAppliedStatus).toBe("Done");
    expect(rowFor(fx.state(), BOARD_B)?.state).toBe("pending");
  });

  test("the recovered board converges on a later boundary and the Issue closes", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState(),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, null), memberItem(BOARD_B, null)];
    gateway.updateFailures.set(BOARD_B.number, "rate-limit");

    await drive(fx, gateway, { kind: "workflow-completed", instance: "completion-3" });
    gateway.updateFailures.delete(BOARD_B.number);
    await drive(fx, gateway, { kind: "workflow-completed", instance: "completion-4" });

    expect(rowFor(fx.state(), BOARD_B)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    expect(gateway.history).toContain("close");
  });

  test("a failed Project ledger write cannot close and the same sync retries after recovery", async () => {
    const fx = fixture({
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: linkedState({
        projectSync: {
          projects: [
            {
              project: canonical(BOARD_A),
              projectId: `PVT_${BOARD_A.number}`,
              itemId: `PVTI_${BOARD_A.number}`,
              phaseField: "Intent Phase",
              lastAppliedStatus: "Done",
              state: "synced",
              updatedAt: NOW,
            },
          ],
        },
      }),
    });
    const gateway = new ProjectGateway(markerBody());
    gateway.items = [memberItem(BOARD_A, "Operation")];
    gateway.updateFailures.set(BOARD_A.number, "network");
    const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
    let remainingProjectWriteFailures = 2;
    fx.ports = {
      ...fx.ports,
      writeDocumentAtomic(text: string) {
        if (
          remainingProjectWriteFailures > 0 &&
          gateway.history.includes(`update:${canonical(BOARD_A)}`) &&
          (text.includes('"state":"pending"') ||
            text.includes('"projectSyncHold"'))
        ) {
          remainingProjectWriteFailures -= 1;
          return {
            kind: "io-failure" as const,
            summary: "injected Project bookkeeping failure",
          };
        }
        return writeDocumentAtomic(text);
      },
    } satisfies MirrorStateStorePorts;
    const boundary = {
      kind: "workflow-completed",
      instance: "completion-retry",
    } as const;

    await drive(fx, gateway, boundary);

    const syncKey = mirrorEventKey(
      mirrorEventIdentity(INTENT_UUID, boundary, "sync"),
    );
    expect(gateway.history).not.toContain("close");
    expect(gateway.issue.state).toBe("OPEN");
    // The old flow attempted a second, post-failure hold write. The barrier is
    // already durable now, so only the failed ledger write is reached.
    expect(remainingProjectWriteFailures).toBe(1);
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });

    remainingProjectWriteFailures = 0;
    gateway.updateFailures.delete(BOARD_A.number);
    await drive(fx, gateway, boundary);

    expect(
      gateway.history.filter(
        (entry) => entry === `update:${canonical(BOARD_A)}`,
      ),
    ).toHaveLength(2);
    expect(fx.state().receipts[syncKey].status).toBe("succeeded");
    expect(rowFor(fx.state(), BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Done",
    });
    expect(gateway.history).toContain("close");
    expect(gateway.issue.state).toBe("CLOSED");
  });
});

describe("t346 prompt Project face", () => {
  test.each([
    ["successful retirement", "none", null],
    ["verification requeue write failure", "prepare", "sync"],
    ["stale prompt consumption write failure", "consume", "close"],
  ] as const)("%s keeps close safe", async (_name, failure, blockedOperation) => {
    const boundary = {
      kind: "workflow-completed",
      instance: "completion-gate",
    } as const;
    const fx = fixture({
      mode: "prompt",
      lifecyclePhase: "OPERATION",
      registryStatus: "complete",
      state: completedSyncState(
        { state: "synced", lastAppliedStatus: "Done" },
        { verified: true },
      ),
    });
    const gateway = new ProjectGateway(markerBody());
    const asked = await drive(fx, gateway, boundary);
    if (
      asked.kind !== "ok" ||
      asked.outcome.kind !== "ask" ||
      asked.outcome.operation !== "close"
    ) {
      throw new Error("expected a close prompt");
    }
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({
        "auto-mirror": "prompt",
        "mirror-projects": [
          { project: canonical(BOARD_A), "phase-field": "Lifecycle" },
        ],
      }),
    );
    if (failure !== "none") {
      const writeDocumentAtomic = fx.ports.writeDocumentAtomic;
      fx.ports = {
        ...fx.ports,
        writeDocumentAtomic(text: string) {
          const consumingPrompt = text.includes('"expectedPrompt":null');
          const selected =
            failure === (consumingPrompt ? "consume" : "prepare");
          if (selected && text.includes('"projectSyncHold"')) {
            return {
              kind: "io-failure" as const,
              summary: `injected ${failure} state failure`,
            };
          }
          return writeDocumentAtomic(text);
        },
      } satisfies MirrorStateStorePorts;
    }

    const answered = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: INTENT_DIR,
        repository: REPO,
        boundary,
        answer: {
          choice: "approve",
          bindingId: asked.outcome.bindingId,
          answerId: "answer-stale-close",
          event: asked.outcome.event,
          operation: asked.outcome.operation,
        },
      },
      {
        gateway,
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "op-1",
      },
    );

    expect(gateway.history).not.toContain("close");
    if (blockedOperation !== null) {
      if (answered.kind !== "ok" || answered.outcome.kind !== "continued") {
        throw new Error("expected a pending state-write outcome");
      }
      expect(answered.outcome.outcomes.at(-1)).toMatchObject({
        kind: "pending",
        operation: blockedOperation,
        warning: {
          operation: blockedOperation,
          classification: "state-write",
          retryable: true,
        },
      });
      return;
    }
    if (answered.kind !== "ok" || answered.outcome.kind !== "ask") {
      throw new Error("expected a replacement sync prompt");
    }
    expect(answered.outcome.operation).toBe("sync");
    const syncKey = mirrorEventKey(
      mirrorEventIdentity(INTENT_UUID, boundary, "sync"),
    );
    expect(fx.state().receipts[syncKey]).toMatchObject({
      status: "pending",
      projectSyncHold: { reason: "project-sync-unsettled" },
    });
    expect(fx.state().receipts[syncKey].projectSyncVerified).toBeUndefined();
    expect(fx.state().expectedPrompt?.operation).toBe("sync");
  });

  test("the ask names the boards and the column the approval would write", async () => {
    const fx = fixture({ mode: "prompt", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "ideation",
      instance: "prompt-1",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain('Projects: 1 board(s); Status: "Ideation"');
    // The Project face rides inside the existing per-operation binding.
    expect(result.outcome.operation).toBe("sync");
  });

  test("a create ask says the boards would be joined", async () => {
    const fx = fixture({ mode: "prompt" });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "intent-capture-approved",
      instance: "prompt-2",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain(
      'Projects: 1 board(s) to join; Status: "Ideation"',
    );
  });

  test("a parked ask says the column is left unchanged", async () => {
    const fx = fixture({ mode: "prompt", state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "parked",
      stage: "scope-definition",
      instance: "prompt-3",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).toContain("Projects: 1 board(s); Status: left unchanged");
  });

  test("with no board configured the ask says nothing about Projects", async () => {
    const fx = fixture({ mode: "prompt", boards: [], state: linkedState() });
    const gateway = new ProjectGateway(markerBody());

    const result = await drive(fx, gateway, {
      kind: "phase-verified",
      phase: "ideation",
      instance: "prompt-4",
    });

    if (result.kind !== "ok" || result.outcome.kind !== "ask")
      throw new Error("expected an ask outcome");
    expect(result.outcome.question).not.toContain("Projects:");
  });
});
