// t349 — the read-only Project diagnostics `repair status` reports over a real
// record on disk: drift against the column the sync itself would apply, an
// unreachable Status field, a missing option with the board's own vocabulary, a
// credential without the `project` scope, the partial-success view a ledger of
// several boards produces, and the negative assertion that diagnosing mutates
// nothing at all.
// covers: packages/framework/core/tools/amadeus-mirror-lifecycle.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  type MirrorRepairProjectDiagnostic,
  runMirrorRepairCommand,
} from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import { renderMirrorMarker } from "../../packages/framework/core/tools/amadeus-mirror-provenance.ts";
import {
  EMPTY_MIRROR_STATE,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import {
  createMirrorStateStorePorts,
  type MirrorStateStorePorts,
} from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  GatewayOutcome,
  MirrorCreateIdentity,
  MirrorGitHubGateway,
  MirrorProjectItem,
  MirrorProjectItemsView,
  MirrorProjectRef,
  MirrorProjectStatusField,
  MirrorProjectSyncEntry,
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
const INTENT_UUID = "intent-t349";
const ISSUE = 91;
const BOARD_A: MirrorProjectRef = { owner: "acme", number: 5 };
const BOARD_B: MirrorProjectRef = { owner: "acme", number: 6 };

// A credential leaks through a raw response, never through a diagnostic: this
// token is injected into the gateway's failure summaries and must not surface.
const SECRET = "ghp-t349-secret-token";

const OPTIONS = [
  { id: "opt-ideation", name: "Ideation" },
  { id: "opt-construction", name: "Construction" },
  { id: "opt-done", name: "Done" },
];

type GatewayFailureClass = Extract<
  GatewayOutcome<never>,
  { kind: "failure" }
>["classification"];

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

function failure<T>(
  classification: GatewayFailureClass,
  summary: string,
): GatewayOutcome<T> {
  return {
    kind: "failure",
    classification,
    summary,
    retryable: classification !== "permission",
    effect: "not-started",
  };
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

// The observation surface. `history` records every gateway call so a test can
// assert that no mutation verb was ever reached, and the mutation methods throw
// so an accidental call fails loudly rather than being counted after the fact.
class DiagnosticGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  items: MirrorProjectItem[] = [];
  membershipFailure: GatewayFailureClass | null = null;
  fieldFailures = new Map<number, GatewayFailureClass>();
  options: ReadonlyArray<Readonly<{ id: string; name: string }>> = OPTIONS;
  issue: RemoteMirrorIssue = {
    repository: REPO,
    number: ISSUE,
    title: "Mirror",
    body: `snapshot\n${renderMirrorMarker(identity())}`,
    state: "OPEN",
  };

  async readiness(): Promise<GatewayOutcome<void>> {
    return ok(undefined);
  }
  async createIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    throw new Error("repair status must not create an Issue");
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    return ok([this.issue]);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("view");
    return ok(this.issue);
  }
  async editIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    throw new Error("repair status must not edit an Issue");
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    throw new Error("repair status must not close an Issue");
  }

  async listProjectItems(): Promise<GatewayOutcome<MirrorProjectItemsView>> {
    this.history.push("list");
    if (this.membershipFailure !== null) {
      return failure(
        this.membershipFailure,
        `membership query rejected for ${SECRET}`,
      );
    }
    return ok({ issueNodeId: "I_issue", items: [...this.items] });
  }
  async resolveProjectStatusField(
    project: MirrorProjectRef,
  ): Promise<GatewayOutcome<MirrorProjectStatusField>> {
    this.history.push(`field:${canonical(project)}`);
    const injected = this.fieldFailures.get(project.number);
    if (injected !== undefined) {
      return failure(injected, `GraphQL errors: [{"message":"${SECRET}"}]`);
    }
    return ok({
      projectId: `PVT_${project.number}`,
      fieldId: `PVTSSF_${project.number}`,
      options: this.options,
    });
  }
  async addProjectItem(): Promise<GatewayOutcome<{ itemId: string }>> {
    this.history.push("add");
    throw new Error("repair status must not add a Project item");
  }
  async updateProjectItemStatus(): Promise<GatewayOutcome<void>> {
    this.history.push("update");
    throw new Error("repair status must not update a Project item status");
  }
}

function memberItem(
  project: MirrorProjectRef,
  currentStatus: string | null,
): MirrorProjectItem {
  return {
    projectId: `PVT_${project.number}`,
    projectNumber: project.number,
    projectOwner: project.owner,
    itemId: `PVTI_${project.number}`,
    currentStatus,
  };
}

function ledgerEntry(
  project: MirrorProjectRef,
  state: MirrorProjectSyncEntry["state"],
  lastAppliedStatus: string | null,
): MirrorProjectSyncEntry {
  return {
    project: canonical(project),
    projectId: `PVT_${project.number}`,
    itemId: `PVTI_${project.number}`,
    lastAppliedStatus,
    state,
    updatedAt: NOW,
  };
}

function linkedState(
  ledger: readonly MirrorProjectSyncEntry[] = [],
): MirrorStateSnapshot {
  return {
    ...EMPTY_MIRROR_STATE,
    issueNumber: ISSUE,
    provenance: {
      schema: 1,
      createIdentity: identity(),
      issueNumber: ISSUE,
      createdAt: NOW,
    },
    ...(ledger.length === 0 ? {} : { projectSync: { projects: ledger } }),
  };
}

type FixtureOptions = Readonly<{
  lifecyclePhase?: string;
  registryStatus?: "in-flight" | "parked" | "complete";
  boards?: ReadonlyArray<
    Readonly<{ project: MirrorProjectRef; statusNames?: Record<string, string> }>
  >;
  state?: MirrorStateSnapshot;
}>;

function fixture(options: FixtureOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), "t349-"));
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
      `- **Lifecycle Phase**: ${options.lifecyclePhase ?? "CONSTRUCTION"}`,
      "- **Current Stage**: code-generation",
      `- **Status**: ${registryStatus === "complete" ? "Completed" : "Running"}`,
      `- **Last Updated**: ${NOW}`,
      "",
      renderMirrorStateBlock(options.state ?? linkedState()),
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
      "auto-mirror": "auto",
      "mirror-projects": (options.boards ?? [{ project: BOARD_A }]).map((board) => ({
        project: canonical(board.project),
        ...(board.statusNames ? { "status-names": board.statusNames } : {}),
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
  return { root, space, statePath, ports, gateway: new DiagnosticGateway() };
}

async function diagnose(
  fx: ReturnType<typeof fixture>,
): Promise<readonly MirrorRepairProjectDiagnostic[]> {
  const result = await runMirrorRepairCommand(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: INTENT_DIR,
      repository: REPO,
      command: { kind: "status" },
    },
    { gateway: fx.gateway, ports: fx.ports, now: () => NOW },
  );
  if (result.kind !== "status") throw new Error(`expected status, got ${result.kind}`);
  return result.projectDiagnostics;
}

function mutations(gateway: DiagnosticGateway): string[] {
  return gateway.history.filter(
    (entry) => entry === "add" || entry === "update",
  );
}

describe("t349 drift", () => {
  test("a board sitting in the expected column reports no drift", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Construction")];
    expect(await diagnose(fx)).toEqual([
      {
        project: "acme/5",
        membership: "member",
        currentStatus: "Construction",
        expectedStatus: "Construction",
        drift: false,
        resolution: "resolved",
        summary: 'this board is already in "Construction".',
      },
    ]);
  });

  test("a board in another column reports the drift and both names", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    expect(await diagnose(fx)).toEqual([
      {
        project: "acme/5",
        membership: "member",
        currentStatus: "Ideation",
        expectedStatus: "Construction",
        drift: true,
        resolution: "resolved",
        summary:
          'this board is in "Ideation" but the workflow expects "Construction".',
      },
    ]);
  });

  test("the expected column follows this Project's status-names override", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A, statusNames: { construction: "Building" } }],
    });
    fx.gateway.options = [...OPTIONS, { id: "opt-building", name: "Building" }];
    fx.gateway.items = [memberItem(BOARD_A, "Building")];
    expect(await diagnose(fx)).toMatchObject([
      { expectedStatus: "Building", drift: false, resolution: "resolved" },
    ]);
  });

  test("a parked Intent expects no column, so nothing can drift", async () => {
    const fx = fixture({ registryStatus: "parked" });
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    expect(await diagnose(fx)).toEqual([
      {
        project: "acme/5",
        membership: "member",
        currentStatus: "Ideation",
        expectedStatus: null,
        drift: false,
        resolution: "resolved",
        summary:
          "no column is expected right now, so this board is left exactly as it is.",
      },
    ]);
  });

  test("a configured board the Issue does not belong to reports not-member", async () => {
    const fx = fixture();
    expect(await diagnose(fx)).toMatchObject([
      { project: "acme/5", membership: "not-member", currentStatus: null, drift: true },
    ]);
  });

  test("a ledger row for a board the Issue has left stays visible", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A }],
      state: linkedState([ledgerEntry(BOARD_B, "synced", "Construction")]),
    });
    fx.gateway.items = [memberItem(BOARD_A, "Construction")];
    expect((await diagnose(fx)).map((row) => [row.project, row.membership])).toEqual([
      ["acme/5", "member"],
      ["acme/6", "not-member"],
    ]);
  });
});

describe("t349 unresolved boards", () => {
  test("an unreachable Status field reports field-missing", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "api");
    expect(await diagnose(fx)).toMatchObject([
      { project: "acme/5", resolution: "field-missing" },
    ]);
  });

  test("a missing option reports the expected name and the board's vocabulary", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A, statusNames: { construction: "Building" } }],
    });
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    const [row] = await diagnose(fx);
    expect(row).toEqual({
      project: "acme/5",
      membership: "member",
      currentStatus: "Ideation",
      expectedStatus: "Building",
      drift: true,
      resolution: "option-missing",
      availableOptions: ["Ideation", "Construction", "Done"],
      summary: expect.stringContaining("status-names"),
    });
  });

  test("a resolved board carries no availableOptions", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Construction")];
    expect((await diagnose(fx))[0]).not.toHaveProperty("availableOptions");
  });

  test("a credential without the project scope reports permission-denied", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "permission");
    expect(await diagnose(fx)).toMatchObject([
      { project: "acme/5", resolution: "permission-denied" },
    ]);
  });

  test("an unauthenticated Project read is permission-denied, not a missing field", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "unauthenticated");
    expect((await diagnose(fx))[0].resolution).toBe("permission-denied");
  });

  test("a failed membership query classifies every board without stopping", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A }, { project: BOARD_B }],
    });
    fx.gateway.membershipFailure = "permission";
    expect(await diagnose(fx)).toEqual([
      {
        project: "acme/5",
        membership: "not-member",
        currentStatus: null,
        expectedStatus: null,
        drift: false,
        resolution: "permission-denied",
        summary: expect.stringContaining("acme/5"),
      },
      {
        project: "acme/6",
        membership: "not-member",
        currentStatus: null,
        expectedStatus: null,
        drift: false,
        resolution: "permission-denied",
        summary: expect.stringContaining("acme/6"),
      },
    ]);
  });
});

describe("t349 partial success", () => {
  test("boards that converged and boards that did not are reported side by side", async () => {
    const fx = fixture({
      boards: [
        { project: BOARD_A },
        { project: BOARD_B, statusNames: { construction: "Building" } },
      ],
      state: linkedState([
        ledgerEntry(BOARD_A, "synced", "Construction"),
        ledgerEntry(BOARD_B, "safety-blocked", null),
      ]),
    });
    fx.gateway.items = [
      memberItem(BOARD_A, "Construction"),
      memberItem(BOARD_B, "Ideation"),
    ];
    expect(
      (await diagnose(fx)).map((row) => [row.project, row.drift, row.resolution]),
    ).toEqual([
      ["acme/5", false, "resolved"],
      ["acme/6", true, "option-missing"],
    ]);
  });
});

describe("t349 summaries", () => {
  test("a missing option names both moves that resolve it", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A, statusNames: { construction: "Building" } }],
    });
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    const [row] = await diagnose(fx);
    expect(row.resolution).toBe("option-missing");
    // The board it is about, the column it lacks, and the two ways out: add the
    // option to the board, or remap the phase through the configuration.
    expect(row.summary).toContain("acme/5");
    expect(row.summary).toContain('"Building"');
    expect(row.summary).toContain("add that option to the board");
    expect(row.summary).toContain("`status-names` override");
    expect(row.summary).toContain("mirror-projects");
  });

  test("a permission failure names the board and the scope, and proposes no re-auth", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "permission");
    const [row] = await diagnose(fx);
    expect(row.resolution).toBe("permission-denied");
    expect(row.summary).toContain("acme/5");
    expect(row.summary).toContain("`project` scope");
    // The tool never changes a credential on the reader's behalf.
    expect(row.summary).toContain("Grant that scope");
  });

  test("a permission summary carries no option list and no field detail", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "unauthenticated");
    const [row] = await diagnose(fx);
    expect(row).not.toHaveProperty("availableOptions");
    for (const option of OPTIONS) expect(row.summary).not.toContain(option.name);
  });

  test("an unreachable Status field says so without blaming permissions", async () => {
    const fx = fixture();
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "api");
    const [row] = await diagnose(fx);
    expect(row.resolution).toBe("field-missing");
    expect(row.summary).toContain("acme/5");
    expect(row.summary).toContain("Status");
    expect(row.summary).not.toContain("scope");
  });

  test("a board the Issue has not joined reports the column it would take", async () => {
    const fx = fixture();
    expect((await diagnose(fx))[0].summary).toBe(
      'the Issue is not on this board; the column it would take is "Construction".',
    );
  });

  test("every row carries a non-empty summary whatever its resolution", async () => {
    const fx = fixture({
      boards: [
        { project: BOARD_A },
        { project: BOARD_B, statusNames: { construction: "Building" } },
      ],
    });
    fx.gateway.items = [memberItem(BOARD_A, "Construction"), memberItem(BOARD_B, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "permission");
    for (const row of await diagnose(fx)) expect(row.summary.length).toBeGreaterThan(0);
  });
});

describe("t349 read-only", () => {
  test("diagnosing issues no Project mutation and leaves the record byte-identical", async () => {
    const fx = fixture({
      boards: [{ project: BOARD_A }, { project: BOARD_B }],
      state: linkedState([ledgerEntry(BOARD_B, "pending", null)]),
    });
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    const before = readFileSync(fx.statePath, "utf-8");
    expect(await diagnose(fx)).toHaveLength(2);
    expect(mutations(fx.gateway)).toEqual([]);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(before);
  });

  test("no configured board and no ledger row costs no Project query at all", async () => {
    const fx = fixture({ boards: [] });
    expect(await diagnose(fx)).toEqual([]);
    expect(fx.gateway.history.filter((entry) => entry !== "view")).toEqual([]);
  });

  test("an Intent with no Issue yet is diagnosed without a membership query", async () => {
    const fx = fixture({ state: EMPTY_MIRROR_STATE });
    expect(await diagnose(fx)).toEqual([]);
    expect(fx.gateway.history).toEqual([]);
  });

  test("no diagnostic repeats a credential from a failed Project read", async () => {
    const fx = fixture({ boards: [{ project: BOARD_A }, { project: BOARD_B }] });
    fx.gateway.items = [memberItem(BOARD_A, "Ideation")];
    fx.gateway.fieldFailures.set(BOARD_A.number, "permission");
    fx.gateway.fieldFailures.set(BOARD_B.number, "api");
    expect(JSON.stringify(await diagnose(fx))).not.toContain(SECRET);
  });

  test("a membership failure summary never reaches the diagnostics either", async () => {
    const fx = fixture();
    fx.gateway.membershipFailure = "api";
    expect(JSON.stringify(await diagnose(fx))).not.toContain(SECRET);
  });
});
