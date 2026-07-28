// Shared Project lifecycle fixture for t346 and t361.

import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runMirrorLifecycleBoundary } from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
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

export const NOW = "2026-07-27T00:00:00Z";
export const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "app",
  canonical: "acme/app",
};
export const INTENT_DIR = "260727-demo-a1b2c3d4";
export const INTENT_UUID = "intent-t346";
export const ISSUE = 77;
export const BOARD_A: MirrorProjectRef = { owner: "acme", number: 5 };
export const BOARD_B: MirrorProjectRef = { owner: "acme", number: 6 };

export const OPTIONS = [
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

export function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

export function canonical(project: MirrorProjectRef): string {
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
export class ProjectGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue;
  items: MirrorProjectItem[] = [];
  updateFailures = new Map<number, GatewayFailureClass>();

  constructor(body: string) {
    this.issue = {
      repository: REPO,
      number: ISSUE,
      title: "Mirror",
      body,
      state: "OPEN",
    };
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
  async findIssuesByMarker(): Promise<
    GatewayOutcome<readonly RemoteMirrorIssue[]>
  > {
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

export function fieldMutations(gateway: ProjectGateway): string[] {
  return gateway.history.filter((entry) => entry.startsWith("update:"));
}

// A board the Issue already belongs to. Configuration carries one target (U1),
// so a second board reaches the loop through the membership union.
export function memberItem(
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

export type FixtureOptions = Readonly<{
  lifecyclePhase?: string;
  registryStatus?: "in-flight" | "parked" | "complete";
  mode?: "auto" | "prompt" | "off";
  boards?: readonly MirrorProjectRef[];
  phaseField?: string;
  statusNames?: MirrorProjectStatusNames;
  state?: MirrorStateSnapshot;
}>;

export function createProjectFixture(options: FixtureOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), "t346-"));
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
      if (parsed.kind === "invalid")
        throw new Error(parsed.issues.join("; "));
      return parsed.snapshot;
    },
  };
}

export type ProjectFixture = ReturnType<typeof createProjectFixture>;

export function markerBody(): string {
  return `snapshot\n${renderMirrorMarker(identity())}`;
}

export function linkedState(
  overrides: Partial<MirrorStateSnapshot> = {},
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
    ...overrides,
  };
}

export function drive(
  fx: ProjectFixture,
  gateway: ProjectGateway,
  boundary: MirrorBoundary,
  manual?: {
    operation: "create" | "sync" | "close";
    invocationId: string;
  },
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

export function rowFor(
  state: MirrorStateSnapshot,
  project: MirrorProjectRef,
) {
  return state.projectSync?.projects.find(
    (each) => each.project === canonical(project),
  );
}
