// t345 — Project reconciliation over a real state document on disk: per-Project
// independence under partial failure, convergence on the next boundary,
// idempotence across repeated runs, the per-Project call budget, the layer
// separation that parks the operation receipt without ever writing
// safety-blocked onto it, and secret containment.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: medium

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  executeMirrorOperation,
  resolveMembership,
} from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
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
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorCreateIdentity,
  MirrorExecutionContext,
  MirrorGitHubGateway,
  MirrorOperation,
  MirrorProjectDiagnostic,
  MirrorProjectItem,
  MirrorProjectItemsView,
  MirrorProjectRef,
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
const NOW = "2026-07-27T00:00:00Z";
const INTENT_DIR = "amadeus/spaces/default/intents/demo";
const ISSUE_NODE_ID = "I_issue";

// Two configured boards, so a failure on one can be shown not to touch the other.
const BOARD_A: MirrorProjectRef = { owner: "acme", number: 5 };
const BOARD_B: MirrorProjectRef = { owner: "acme", number: 6 };
const TARGET_A: MirrorProjectTarget = {
  project: BOARD_A,
  phaseField: "Intent Phase",
  statusNames: {},
};
const TARGET_B: MirrorProjectTarget = {
  project: BOARD_B,
  phaseField: "Intent Phase",
  statusNames: {},
};

// A token the implementation must never transcribe out of a gateway summary.
const SECRET = "SECRET_TOKEN_XYZ";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "t345-"));
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

type FailureClass = "network" | "permission" | "api" | "rate-limit";

function failure(
  classification: FailureClass,
  summary = `GitHub unavailable (${classification})`,
): Extract<GatewayOutcome<never>, { kind: "failure" }> {
  return {
    kind: "failure",
    classification,
    summary,
    retryable: classification !== "permission",
    effect: "not-started",
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

function fileStore(initial: MirrorStateSnapshot): {
  ports: MirrorStateStorePorts;
  state: () => MirrorStateSnapshot;
  document: () => string;
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
    document() {
      return readFileSync(statePath, "utf-8");
    },
  };
}

function canonical(project: MirrorProjectRef): string {
  return `${project.owner}/${project.number}`;
}

function nodeIdOf(project: MirrorProjectRef): string {
  return `PVT_board_${project.number}`;
}

function item(
  project: MirrorProjectRef,
  currentStatus: string | null,
): MirrorProjectItem {
  const lifecycleFieldId = `PVTSSF_${project.number}`;
  return {
    projectId: nodeIdOf(project),
    projectNumber: project.number,
    projectOwner: project.owner,
    itemId: `PVTI_item_${project.number}`,
    singleSelectValuesByFieldId:
      currentStatus === null ? {} : { [lifecycleFieldId]: currentStatus },
  };
}

const DEFAULT_OPTIONS = [
  { id: "opt-ideation", name: "Ideation" },
  { id: "opt-inception", name: "Inception" },
  { id: "opt-done", name: "Done" },
];

// A gateway whose Project behaviour is scripted per board, so one board can fail
// while another succeeds in the same run.
class BoardGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue;
  items: MirrorProjectItem[] = [];
  listResult: GatewayOutcome<MirrorProjectItemsView> | null = null;
  fieldResults = new Map<number, GatewayOutcome<MirrorResolvedProjectFields>>();
  addResults = new Map<number, GatewayOutcome<{ itemId: string }>>();
  updateResults = new Map<number, GatewayOutcome<void>>();
  options = new Map<number, ReadonlyArray<Readonly<{ id: string; name: string }>>>();

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
    return ok(undefined);
  }
  async createIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
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
    this.issue = { ...this.issue, state: "CLOSED" };
    return ok(this.issue);
  }

  async listProjectItems(): Promise<GatewayOutcome<MirrorProjectItemsView>> {
    this.history.push("list");
    if (this.listResult) return this.listResult;
    return ok({ issueNodeId: ISSUE_NODE_ID, items: [...this.items] });
  }

  async resolveProjectFields(
    project: MirrorProjectRef,
  ): Promise<GatewayOutcome<MirrorResolvedProjectFields>> {
    this.history.push(`field:${canonical(project)}`);
    const scripted = this.fieldResults.get(project.number);
    if (scripted) return scripted;
    return ok({
      projectId: nodeIdOf(project),
      lifecycle: {
        fieldId: `PVTSSF_${project.number}`,
        fieldName: "Intent Phase",
        options: this.options.get(project.number) ?? DEFAULT_OPTIONS,
      },
      auxiliaryStatus: null,
    });
  }

  async addProjectItem(
    permit: Parameters<MirrorGitHubGateway["addProjectItem"]>[0],
    _projectId: string,
    _issueNodeId: string,
  ): Promise<GatewayOutcome<{ itemId: string }>> {
    const number = permit.project.number;
    this.history.push(`add:${canonical(permit.project)}`);
    const scripted = this.addResults.get(number);
    if (scripted) return scripted;
    const added = { itemId: `PVTI_item_${number}` };
    // The board now really holds the item, so a later run observes it.
    this.items.push(item(permit.project, null));
    return ok(added);
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
    const scripted = this.updateResults.get(number);
    if (scripted) return scripted;
    const name =
      (this.options.get(number) ?? DEFAULT_OPTIONS).find((o) => o.id === optionId)
        ?.name ?? null;
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
    diagnostics?: MirrorProjectDiagnostic[];
    instance?: string;
  } = {},
): MirrorExecutionContext {
  const boundary = {
    kind: "phase-verified",
    phase: "ideation",
    instance: options.instance ?? "phase-1",
  } as const;
  const event = mirrorEventIdentity("intent-1", boundary, operation);
  const diagnostics = options.diagnostics;
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
    },
    projectSync: {
      targets: options.targets ?? [TARGET_A, TARGET_B],
      snapshot: workflowSnapshot(),
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

function run(
  store: ReturnType<typeof fileStore>,
  gateway: MirrorGitHubGateway,
  options: Parameters<typeof context>[2] = {},
) {
  return executeMirrorOperation({
    context: context("sync", gateway, options),
    ports: store.ports,
    localState: store.state(),
  });
}

function rowFor(
  state: MirrorStateSnapshot,
  project: MirrorProjectRef,
) {
  return state.projectSync?.projects.find(
    (each) => each.project === canonical(project),
  );
}

function mutations(gateway: BoardGateway): string[] {
  return gateway.history.filter(
    (entry) => entry.startsWith("add:") || entry.startsWith("update:"),
  );
}

describe("t345 per-Project independence", () => {
  test("one board's retryable failure leaves the other synced", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("rate-limit"));

    await run(store, gateway);

    const state = store.state();
    expect(rowFor(state, BOARD_A)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
    expect(rowFor(state, BOARD_B)).toMatchObject({ state: "pending" });
  });

  test("a failure on the first board does not stop the second", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.fieldResults.set(BOARD_A.number, failure("api"));

    await run(store, gateway);

    // The loop reached board B and mutated it despite board A failing first.
    expect(gateway.history).toContain(`field:${canonical(BOARD_B)}`);
    expect(mutations(gateway)).toEqual([`update:${canonical(BOARD_B)}`]);
    expect(rowFor(store.state(), BOARD_B)?.state).toBe("synced");
  });

  test("a permission failure is blocked while a network failure is pending", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_A.number, failure("permission"));
    gateway.updateResults.set(BOARD_B.number, failure("network"));

    await run(store, gateway);

    const state = store.state();
    expect(rowFor(state, BOARD_A)?.state).toBe("safety-blocked");
    expect(rowFor(state, BOARD_B)?.state).toBe("pending");
  });
});

describe("t345 convergence on the next boundary", () => {
  test("a pending board converges on the next run and the receipt succeeds", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("rate-limit"));

    const first = await run(store, gateway);
    expect(first.kind).toBe("pending");
    expect(rowFor(store.state(), BOARD_B)?.state).toBe("pending");

    // The board recovers; the next boundary reconciles what the ledger still owes.
    gateway.updateResults.delete(BOARD_B.number);
    const second = await run(store, gateway, { instance: "phase-2" });

    expect(second.kind).toBe("completed");
    const state = store.state();
    expect(rowFor(state, BOARD_A)?.state).toBe("synced");
    expect(rowFor(state, BOARD_B)?.state).toBe("synced");
  });

  test("a safety-blocked board is re-evaluated, not written off", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("permission"));

    await run(store, gateway);
    expect(rowFor(store.state(), BOARD_B)?.state).toBe("safety-blocked");

    gateway.updateResults.delete(BOARD_B.number);
    await run(store, gateway, { instance: "phase-2" });

    expect(rowFor(store.state(), BOARD_B)?.state).toBe("synced");
  });

  test("the retry re-attempts the board rather than trusting the ledger", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("api"));

    await run(store, gateway);
    const afterFirst = mutations(gateway).length;
    gateway.updateResults.delete(BOARD_B.number);
    await run(store, gateway, { instance: "phase-2" });

    // Board B is tried again; board A is already at the expected column and is not.
    expect(mutations(gateway).slice(afterFirst)).toEqual([
      `update:${canonical(BOARD_B)}`,
    ]);
  });
});

describe("t345 idempotence", () => {
  test("running the same converged boundary twice issues no new mutation", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];

    await run(store, gateway);
    const afterFirst = mutations(gateway).length;
    await run(store, gateway, { instance: "phase-2" });

    expect(afterFirst).toBe(2);
    expect(mutations(gateway)).toHaveLength(2);
    expect(store.state().projectSync?.projects).toHaveLength(2);
  });

  test("a board already at the expected column is never mutated at all", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, "Ideation"), item(BOARD_B, "Ideation")];

    await run(store, gateway);

    expect(mutations(gateway)).toEqual([]);
    expect(rowFor(store.state(), BOARD_A)?.state).toBe("synced");
  });

  test("the ledger keeps exactly one row per board across runs", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];

    await run(store, gateway);
    await run(store, gateway, { instance: "phase-2" });
    await run(store, gateway, { instance: "phase-3" });

    const rows = store.state().projectSync?.projects ?? [];
    expect(rows).toHaveLength(2);
    expect(new Set(rows.map((r) => r.project)).size).toBe(2);
  });
});

describe("t345 call budget", () => {
  test("without auxiliary Status, at most two mutations run per Project", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());

    await run(store, gateway);

    expect(gateway.history.filter((e) => e === "list")).toHaveLength(1);
    for (const board of [BOARD_A, BOARD_B]) {
      expect(
        gateway.history.filter((e) => e === `field:${canonical(board)}`),
      ).toHaveLength(1);
      expect(
        gateway.history.filter(
          (e) => e === `add:${canonical(board)}` || e === `update:${canonical(board)}`,
        ),
      ).toHaveLength(2);
    }
  });
});

describe("t345 membership union", () => {
  test("a board the Issue already belongs to is synced even unconfigured", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    const stray: MirrorProjectRef = { owner: "acme", number: 9 };
    gateway.items = [item(BOARD_A, null), item(stray, null)];

    await run(store, gateway, { targets: [TARGET_A] });

    expect(rowFor(store.state(), stray)).toMatchObject({
      state: "synced",
      lastAppliedStatus: "Ideation",
    });
  });

  test("no configured target at all keeps the whole step off", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    const stray: MirrorProjectRef = { owner: "acme", number: 9 };
    gateway.items = [item(stray, null)];

    await run(store, gateway, { targets: [] });

    // The union only opens once configuration exists: with no target the Issue is
    // edited and no Project API is touched at all.
    expect(gateway.history).toEqual(["edit"]);
    expect(store.state().projectSync).toBeNull();
  });

  test("only a configured board has the Issue added to it", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    const stray: MirrorProjectRef = { owner: "acme", number: 9 };
    gateway.items = [item(stray, null)];

    await run(store, gateway, { targets: [TARGET_A] });

    // Board A is configured and absent, so it is joined; the stray already holds
    // the Issue and is only updated.
    expect(gateway.history).toContain(`add:${canonical(BOARD_A)}`);
    expect(gateway.history).not.toContain(`add:${canonical(stray)}`);
  });
});

describe("t345 layer separation", () => {
  test("an unsettled board parks the receipt at pending, not safety-blocked", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    // A permission failure: safety-blocked in the ledger by classification.
    gateway.updateResults.set(BOARD_B.number, failure("permission"));

    const outcome = await run(store, gateway);
    expect(outcome.kind).toBe("pending");

    const state = store.state();
    expect(rowFor(state, BOARD_B)?.state).toBe("safety-blocked");

    const key = mirrorEventKey(
      mirrorEventIdentity(
        "intent-1",
        { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
        "sync",
      ),
    );
    const receipt = state.receipts[key];
    // The board's terminal status must not reach the receipt: it is terminal in
    // the completion policy and would stop the mirror permanently.
    expect(receipt.status).toBe("pending");
    expect(receipt.status).not.toBe("safety-blocked");
    expect(receipt.projectSyncHold).toEqual({
      reason: "project-sync-unsettled",
      heldAt: NOW,
    });
  });

  test("the hold makes no claim that the Issue mutation failed", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("network"));

    await run(store, gateway);

    const state = store.state();
    const key = mirrorEventKey(
      mirrorEventIdentity(
        "intent-1",
        { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
        "sync",
      ),
    );
    const receipt = state.receipts[key];
    expect(receipt.failureClass).toBeUndefined();
    expect(receipt.lastEffect).toBeUndefined();
    // The Issue body really did land, and the link is recorded.
    expect(receipt.completedAt).toBe(NOW);
    expect(state.issueNumber).toBe(7);
    expect(gateway.issue.body).toContain("snapshot");
  });

  test("no board is left unsettled, so the operation completes outright", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];

    const outcome = await run(store, gateway);

    expect(outcome).toEqual({ kind: "completed", operation: "sync", issueNumber: 7 });
    const key = mirrorEventKey(
      mirrorEventIdentity(
        "intent-1",
        { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
        "sync",
      ),
    );
    expect(store.state().receipts[key].status).toBe("succeeded");
    expect(store.state().receipts[key].projectSyncHold).toBeUndefined();
  });

  test("a created Issue is linked before any board work, so a failure cannot strand it", async () => {
    const store = fileStore(EMPTY_MIRROR_STATE);
    const gateway = new BoardGateway(markerBody());
    gateway.addResults.set(BOARD_A.number, failure("permission"));
    gateway.addResults.set(BOARD_B.number, failure("permission"));

    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: store.state(),
    });

    expect(outcome.kind).toBe("pending");
    const state = store.state();
    // The remote Issue exists, so its number and provenance must be on disk even
    // though every board failed.
    expect(state.issueNumber).toBe(7);
    expect(state.provenance?.issueNumber).toBe(7);
  });

  test("the held state document stays parseable", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(BOARD_B.number, failure("network"));

    await run(store, gateway);

    expect(store.document()).toContain('"projectSyncHold"');
    expect(parseMirrorStateDocument(store.document()).kind).toBe("ok");
  });
});

// Where a token could actually travel. The real gateway builds every failure
// summary from a fixed template over a classification, an effect, an exit code
// and an HTTP status (amadeus-mirror-gateway.ts:565-574 — its single `summary:`
// site), and t272 "network summary never transcribes stderr sentinels" pins that
// boundary: response bytes never reach `summary` in production. These tests
// therefore inject a token-bearing summary as a hostile fixture and prove the
// surfaces U2 newly writes — the ledger rows and the receipt hold — carry no free
// text from it at all, which is structural rather than filtered.
describe("t345 secret containment", () => {
  test("a secret in a gateway summary reaches no ledger row, receipt, or diagnostic", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(
      BOARD_B.number,
      failure("network", `GraphQL errors: token ${SECRET} rejected`),
    );
    const diagnostics: MirrorProjectDiagnostic[] = [];

    const outcome = await run(store, gateway, { diagnostics });

    // The failure was observed at all — otherwise this proves nothing.
    expect(outcome.kind).toBe("pending");
    expect(diagnostics.map((d) => d.reason)).toEqual(["update-failed"]);

    const state = store.state();
    expect(JSON.stringify(state.projectSync)).not.toContain(SECRET);
    expect(JSON.stringify(state.receipts)).not.toContain(SECRET);
    // The per-Project path writes no global warning, so nothing on this run
    // carries the summary into state at all.
    expect(state.warnings).toEqual([]);
    expect(store.document()).not.toContain(SECRET);
  });

  test("a membership failure classifies every board without a token in the ledger", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.listResult = failure("api", `GraphQL errors: ${SECRET}`);
    const diagnostics: MirrorProjectDiagnostic[] = [];

    await run(store, gateway, { diagnostics });

    expect(diagnostics.map((d) => d.reason)).toEqual(["membership-query-failed"]);
    // Both configured boards are classified by the one read they all depend on.
    expect(rowFor(store.state(), BOARD_A)?.state).toBe("pending");
    expect(rowFor(store.state(), BOARD_B)?.state).toBe("pending");
    expect(JSON.stringify(store.state().projectSync)).not.toContain(SECRET);
    expect(JSON.stringify(store.state().receipts)).not.toContain(SECRET);
  });

  test("the ledger row and the hold carry no free text at all", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.items = [item(BOARD_A, null), item(BOARD_B, null)];
    gateway.updateResults.set(
      BOARD_B.number,
      failure("network", `GraphQL errors: ${SECRET}`),
    );

    await run(store, gateway);

    // Structural containment: a row's only string fields are the board's own
    // identity and a timestamp, and the hold's are a closed reason plus a clock.
    expect(Object.keys(rowFor(store.state(), BOARD_B) ?? {}).sort()).toEqual([
      "itemId",
      "lastAppliedStatus",
      "project",
      "projectId",
      "state",
      "updatedAt",
    ]);
    const key = mirrorEventKey(
      mirrorEventIdentity(
        "intent-1",
        { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
        "sync",
      ),
    );
    expect(store.state().receipts[key].projectSyncHold).toEqual({
      reason: "project-sync-unsettled",
      heldAt: NOW,
    });
  });
});

describe("t345 defensive classification", () => {
  test("an unconfigured target with no board item is classified, not joined", async () => {
    const gateway = new BoardGateway(markerBody());
    const diagnostics: MirrorProjectDiagnostic[] = [];
    const ctx = context("sync", gateway, { diagnostics });
    const resolution = await resolveMembership(
      ctx,
      { project: BOARD_A, phaseField: "Intent Phase", statusNames: {} },
      { issueNodeId: ISSUE_NODE_ID, items: [] },
      {
        projectId: nodeIdOf(BOARD_A),
        lifecycle: {
          fieldId: `PVTSSF_${BOARD_A.number}`,
          fieldName: "Intent Phase",
          options: DEFAULT_OPTIONS,
        },
        auxiliaryStatus: null,
      },
      false,
    );
    expect(resolution).toEqual({ kind: "failed", classification: "configuration" });
    // No add mutation was attempted, and the diagnostic explains why.
    expect(mutations(gateway)).toEqual([]);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.summary).toContain("not configured");
  });

  test("a state-write failure after a failed issue view surfaces as state failure", async () => {
    const store = fileStore(linkedState());
    const gateway = new BoardGateway(markerBody());
    gateway.viewIssue = async () => failure("network");
    // Fail only the write that persists the view warning; the receipt writes
    // before it (and any after) go through, so the injection hits the
    // set-warning transition alone.
    const realWrite = store.ports.writeDocumentAtomic.bind(store.ports);
    store.ports.writeDocumentAtomic = (text: string) =>
      text.includes('"classification":"network"')
        ? { kind: "io-failure", summary: "disk full" }
        : realWrite(text);

    const outcome = await run(store, gateway);

    expect(outcome.kind).toBe("safety-blocked");
    if (outcome.kind === "safety-blocked") {
      expect(outcome.warning.classification).toBe("state-write");
      expect(outcome.warning.summary).toBe("disk full");
    }
  });
});
