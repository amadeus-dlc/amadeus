// t284 — production repair CLI adapter with real filesystem state.
// covers: packages/framework/core/tools/amadeus-mirror-lifecycle.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  runMirrorRepairCommand,
} from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
import { mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
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
  MirrorGitHubGateway,
  MirrorMutationPermit,
  MirrorStateSnapshot,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

const NOW = "2026-07-25T00:00:00Z";
const REPO: RepositoryIdentity = {
  owner: "owner",
  name: "repo",
  canonical: "owner/repo",
};
const INTENT = "260725-demo-a1b2c3d4";
const UUID = "intent-repair-1";

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

class RepairGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  issue: RemoteMirrorIssue | null = null;

  async readiness(): Promise<GatewayOutcome<void>> {
    this.history.push("readiness");
    return ok(undefined);
  }
  async createIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    throw new Error("repair must not create");
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    this.history.push("find");
    return ok(this.issue ? [this.issue] : []);
  }
  async viewIssue(
    _repository: RepositoryIdentity,
    issueNumber: number,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("view");
    if (!this.issue || this.issue.number !== issueNumber)
      return {
        kind: "failure",
        classification: "api",
        summary: "not found",
        retryable: false,
        effect: "not-started",
      };
    return ok(this.issue);
  }
  async editIssue(
    _permit: MirrorMutationPermit,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("edit");
    throw new Error("repair must not edit");
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("close");
    throw new Error("repair must not close");
  }
}

function fixture(
  state: MirrorStateSnapshot = EMPTY_MIRROR_STATE,
): {
  root: string;
  statePath: string;
  ports: MirrorStateStorePorts;
  gateway: RepairGateway;
} {
  const root = mkdtempSync(join(tmpdir(), "mirror-repair-cli-"));
  roots.push(root);
  const record = join(root, "amadeus", "spaces", "platform", "intents", INTENT);
  mkdirSync(record, { recursive: true });
  const statePath = join(record, "amadeus-state.md");
  writeFileSync(
    statePath,
    [
      "# State",
      "",
      "- **Project**: Repair CLI",
      "- **Lifecycle Phase**: CONSTRUCTION",
      "- **Current Stage**: code-generation",
      "- **Status**: Running",
      `- **Last Updated**: ${NOW}`,
      "",
      renderMirrorStateBlock(state),
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(record, "..", "intents.json"),
    JSON.stringify([
      {
        uuid: UUID,
        slug: "demo",
        dirName: INTENT,
        scope: "feature",
        repos: [REPO.canonical],
        status: "in-flight",
      },
    ]),
  );
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(join(root, "amadeus", "active-space"), "platform\n");
  writeFileSync(join(record, "..", "active-intent"), `${INTENT}\n`);
  const real = createMirrorStateStorePorts({
    projectDir: root,
    statePath,
    intent: INTENT,
    space: "platform",
  });
  const ports: MirrorStateStorePorts = {
    ...real,
    appendArtifactUpdated: () => ({ kind: "appended" }),
  };
  return { root, statePath, ports, gateway: new RepairGateway() };
}

function runtime(fx: ReturnType<typeof fixture>) {
  return {
    gateway: fx.gateway,
    ports: fx.ports,
    now: () => NOW,
    newChallengeId: () => "challenge-1",
    confirmRepair: async (phrase: string) => phrase,
  };
}

function request(
  root: string,
  command:
    | { kind: "status" }
    | { kind: "relink"; issueNumber: number }
    | { kind: "abandon"; operationId: string },
) {
  return {
    projectDir: root,
    space: "platform",
    intentDir: INTENT,
    repository: REPO,
    command,
  } as const;
}

describe("t284 repair CLI", () => {
  test("status resolves a non-default active Intent, is read-only, and performs no remote mutation", async () => {
    const fx = fixture();
    const before = readFileSync(fx.statePath, "utf-8");
    const result = await runMirrorRepairCommand(
      { projectDir: fx.root, command: { kind: "status" } },
      runtime(fx),
    );
    expect(result).toMatchObject({
      kind: "status",
      intentDir: INTENT,
      repository: "owner/repo",
      provenance: "unlinked",
    });
    expect(fx.gateway.history).toEqual([]);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(before);
  });

  test("relink accepts only an owned marker and writes V2 provenance atomically", async () => {
    const fx = fixture();
    const identity = {
      schema: 1 as const,
      intentUuid: UUID,
      intentDir: INTENT,
      repository: REPO,
      operationId: "op-create",
      preparedAt: "2026-07-24T23:59:00Z",
    };
    fx.gateway.issue = {
      repository: REPO,
      number: 42,
      title: "Mirror",
      body: renderMirrorMarker(identity),
      state: "OPEN",
    };
    const result = await runMirrorRepairCommand(
      request(fx.root, { kind: "relink", issueNumber: 42 }),
      runtime(fx),
    );
    expect(result).toEqual({
      kind: "repaired",
      action: "relink",
      issueNumber: 42,
    });
    const parsed = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.snapshot.provenance?.schema).toBe(2);
      expect(parsed.snapshot.provenance?.createdAt).toBe(NOW);
      expect(parsed.snapshot.repairChallenges).toEqual({});
    }
    expect(fx.gateway.history).toEqual(["view"]);
  });

  test("relink rejects an external marker before challenge or state mutation", async () => {
    const fx = fixture();
    fx.gateway.issue = {
      repository: REPO,
      number: 42,
      title: "External",
      body: renderMirrorMarker({
        schema: 1,
        intentUuid: "another-intent",
        intentDir: "another-record",
        repository: REPO,
        operationId: "external-op",
        preparedAt: NOW,
      }),
      state: "OPEN",
    };
    const before = readFileSync(fx.statePath, "utf-8");
    const result = await runMirrorRepairCommand(
      request(fx.root, { kind: "relink", issueNumber: 42 }),
      runtime(fx),
    );
    expect(result.kind).toBe("error");
    expect(readFileSync(fx.statePath, "utf-8")).toBe(before);
    expect(fx.gateway.history).toEqual(["view"]);
  });

  test("abandon is atomic, replay-idempotent, and never mutates GitHub", async () => {
    const event = {
        intentUuid: UUID,
        boundary: { kind: "manual" as const, instance: "repair-source" },
        operation: "create" as const,
    };
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-pending",
      status: "pending" as const,
      preparedAt: "2026-07-24T23:58:00Z",
      attemptedAt: "2026-07-24T23:59:00Z",
      failureClass: "network" as const,
      lastEffect: "outcome-unknown" as const,
    };
    const fx = fixture({
      ...EMPTY_MIRROR_STATE,
      receipts: { [receipt.key]: receipt },
    });
    const first = await runMirrorRepairCommand(
      request(fx.root, {
        kind: "abandon",
        operationId: "op-pending",
      }),
      runtime(fx),
    );
    expect(first).toEqual({
      kind: "repaired",
      action: "abandon",
      issueNumber: null,
    });
    const afterFirst = readFileSync(fx.statePath, "utf-8");
    const second = await runMirrorRepairCommand(
      request(fx.root, {
        kind: "abandon",
        operationId: "op-pending",
      }),
      runtime(fx),
    );
    expect(second).toEqual(first);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(afterFirst);
    expect(fx.gateway.history).toEqual([]);
  });
});
