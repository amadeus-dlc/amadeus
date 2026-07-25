// t282 — real-filesystem C3 + C6/C7 lifecycle and failure injection.
// covers: packages/framework/core/tools/amadeus-mirror-{coordinator,executor}.ts
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
  driveMirrorBoundary,
} from "../../packages/framework/core/tools/amadeus-mirror-coordinator.ts";
import {
  runMirrorLifecycleBoundary,
} from "../../packages/framework/core/tools/amadeus-mirror-lifecycle.ts";
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
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

const NOW = "2026-07-25T00:00:00Z";
const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "app",
  canonical: "acme/app",
};

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

class LifecycleGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  readonly issues: RemoteMirrorIssue[] = [];

  async readiness(): Promise<GatewayOutcome<void>> {
    this.history.push("readiness");
    return ok(undefined);
  }
  async createIssue(
    _permit: MirrorMutationPermit,
    content: { title: string; body: string },
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    const issue: RemoteMirrorIssue = {
      repository: REPO,
      number: 101,
      title: content.title,
      body: content.body,
      state: "OPEN",
    };
    this.issues.push(issue);
    return ok(issue);
  }
  async findIssuesByMarker(
    _repository: RepositoryIdentity,
    marker: string,
  ): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    this.history.push("find");
    return ok(this.issues.filter((issue) => issue.body.includes(marker)));
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("view");
    return ok(this.issues[0] as RemoteMirrorIssue);
  }
  async editIssue(
    _permit: MirrorMutationPermit,
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("edit");
    this.issues[0] = { ...(this.issues[0] as RemoteMirrorIssue), body };
    return ok(this.issues[0] as RemoteMirrorIssue);
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("close");
    this.issues[0] = {
      ...(this.issues[0] as RemoteMirrorIssue),
      state: "CLOSED",
    };
    return ok(this.issues[0] as RemoteMirrorIssue);
  }
}

function fixture(): {
  root: string;
  statePath: string;
  ports: MirrorStateStorePorts;
  readState: () => ReturnType<typeof parseMirrorStateDocument>;
} {
  const root = mkdtempSync(join(tmpdir(), "mirror-lifecycle-"));
  roots.push(root);
  const statePath = join(root, "amadeus-state.md");
  writeFileSync(statePath, `# State\n\n${renderMirrorStateBlock(EMPTY_MIRROR_STATE)}\n`);
  const real = createMirrorStateStorePorts({
    projectDir: root,
    statePath,
  });
  const ports: MirrorStateStorePorts = {
    ...real,
    // The integration target is the real file/lock/atomic-write state store.
    // Audit delivery is independently covered by t278 and is kept deterministic
    // here without constructing an unrelated full Intent registry.
    appendArtifactUpdated: () => ({ kind: "appended" }),
  };
  return {
    root,
    statePath,
    ports,
    readState: () => parseMirrorStateDocument(readFileSync(statePath, "utf-8")),
  };
}

function adapterFixture(
  space = "platform",
  intentDir = "260725-demo-a1b2c3d4",
  registryStatus: "in-flight" | "parked" | "complete" = "in-flight",
) {
  const root = mkdtempSync(join(tmpdir(), "mirror-adapter-"));
  roots.push(root);
  const intentsPath = join(root, "amadeus", "spaces", space, "intents");
  const recordPath = join(intentsPath, intentDir);
  mkdirSync(recordPath, { recursive: true });
  const statePath = join(recordPath, "amadeus-state.md");
  const workflowStatus =
    registryStatus === "complete" ? "Completed" : "Running";
  writeFileSync(
    statePath,
    [
      "# Amadeus State",
      "",
      "- **Project**: Adapter lifecycle",
      "- **Lifecycle Phase**: INCEPTION",
      "- **Current Stage**: scope-definition",
      `- **Status**: ${workflowStatus}`,
      `- **Last Updated**: ${NOW}`,
      "",
      renderMirrorStateBlock(EMPTY_MIRROR_STATE),
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(intentsPath, "intents.json"),
    JSON.stringify([
      {
        uuid: "intent-adapter-1",
        slug: "demo",
        dirName: intentDir,
        scope: "feature",
        repos: [REPO.canonical],
        status: registryStatus,
      },
    ]),
  );
  mkdirSync(join(root, "amadeus"), { recursive: true });
  writeFileSync(
    join(root, "amadeus", "config.json"),
    JSON.stringify({ "auto-mirror": "auto" }),
  );
  const real = createMirrorStateStorePorts({
    projectDir: root,
    statePath,
    intent: intentDir,
    space,
  });
  const ports: MirrorStateStorePorts = {
    ...real,
    appendArtifactUpdated: () => ({ kind: "appended" }),
  };
  return { root, space, intentDir, statePath, ports };
}

function boundaryInput(
  fx: ReturnType<typeof fixture>,
  gateway: LifecycleGateway,
  mode: "off" | "prompt" | "auto",
  instance: string,
  kind: "phase" | "completion" = "phase",
) {
  return {
    context: {
      projectDir: fx.root,
      statePath: fx.statePath,
      intentUuid: "intent-1",
      intentDir: "amadeus/spaces/default/intents/demo",
      repository: REPO,
      boundary:
        kind === "completion"
          ? ({ kind: "workflow-completed", instance } as const)
          : ({
              kind: "phase-verified",
              phase: "ideation",
              instance,
            } as const),
      snapshot: {
        intentUuid: "intent-1",
        intentDir: "amadeus/spaces/default/intents/demo",
        projectSummary: "Mirror the complete Intent lifecycle",
        lifecyclePhase: kind === "completion" ? "OPERATION" : "INCEPTION",
        currentStage: kind === "completion" ? "none" : "scope-definition",
        status: kind === "completion" ? "Completed" : "Running",
        registryStatus: kind === "completion" ? "complete" : "in-flight",
        updatedAt: NOW,
      },
    },
    ports: fx.ports,
    gateway,
    now: () => NOW,
    newOperationId: () => "op-create",
    dependencies: {
      resolveConfig: () => ({
        kind: "resolved" as const,
        config: { autoMirror: mode },
        sources: [],
      }),
    },
  };
}

describe("t282 walking-skeleton reconciliation", () => {
  test("remote create success plus one local completion failure converges to the same Issue", async () => {
    const fx = fixture();
    const gateway = new LifecycleGateway();
    let injected = false;
    const failingPorts: MirrorStateStorePorts = {
      ...fx.ports,
      writeDocumentAtomic(text) {
        if (!injected && text.includes('"status":"succeeded"')) {
          injected = true;
          return { kind: "io-failure", summary: "injected complete failure" };
        }
        return fx.ports.writeDocumentAtomic(text);
      },
    };
    const firstInput = boundaryInput(fx, gateway, "auto", "phase-1");
    const first = await driveMirrorBoundary({
      ...firstInput,
      ports: failingPorts,
    });
    expect(first.kind).toBe("continued");
    if (first.kind === "continued") {
      expect(first.outcomes[0]?.kind).toBe("safety-blocked");
    }
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
    const afterFailure = fx.readState();
    expect(afterFailure.kind).toBe("ok");
    if (afterFailure.kind === "ok") {
      expect(Object.values(afterFailure.snapshot.receipts)[0]?.status).toBe(
        "pending",
      );
    }

    const second = await driveMirrorBoundary(
      boundaryInput(fx, gateway, "auto", "phase-2"),
    );
    expect(second.kind).toBe("continued");
    if (second.kind === "continued") {
      expect(second.outcomes[0]?.kind).toBe("completed");
    }
    expect(gateway.issues).toHaveLength(1);
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
    const converged = fx.readState();
    expect(converged.kind).toBe("ok");
    if (converged.kind === "ok") {
      expect(converged.snapshot.issueNumber).toBe(101);
      expect(Object.values(converged.snapshot.receipts)[0]?.status).toBe(
        "succeeded",
      );
    }
  });
});

describe("t282 boundary isolation and completion chain", () => {
  test("off suppresses every remote operation and preserves state bytes", async () => {
    const fx = fixture();
    const gateway = new LifecycleGateway();
    const before = readFileSync(fx.statePath, "utf-8");
    const outcome = await driveMirrorBoundary(
      boundaryInput(fx, gateway, "off", "phase-off"),
    );
    expect(outcome.kind).toBe("continued");
    expect(outcome.workflowMayAdvance).toBe(true);
    expect(gateway.history).toEqual([]);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(before);
  });

  test("auto completion performs create, sync, close in order and once each", async () => {
    const fx = fixture();
    const gateway = new LifecycleGateway();
    const outcome = await driveMirrorBoundary(
      boundaryInput(fx, gateway, "auto", "complete-1", "completion"),
    );
    expect(outcome.kind).toBe("continued");
    if (outcome.kind === "continued") {
      expect(
        outcome.outcomes.map((entry) =>
          "operation" in entry ? entry.operation : null,
        ),
      ).toEqual([
        "create",
        "sync",
        "close",
      ]);
      expect(outcome.outcomes.every((entry) => entry.kind === "completed")).toBe(
        true,
      );
    }
    expect(
      gateway.history.filter((entry) =>
        entry === "create" || entry === "edit" || entry === "close",
      ),
    ).toEqual(["create", "edit", "close"]);
    expect(gateway.issues[0]?.state).toBe("CLOSED");
  });

  test("a pre-remote state write failure performs no remote call", async () => {
    const fx = fixture();
    const gateway = new LifecycleGateway();
    let first = true;
    const failingPorts: MirrorStateStorePorts = {
      ...fx.ports,
      writeDocumentAtomic(text) {
        if (first) {
          first = false;
          return { kind: "io-failure", summary: "injected prepare failure" };
        }
        return fx.ports.writeDocumentAtomic(text);
      },
    };
    const base = boundaryInput(fx, gateway, "auto", "phase-pre");
    const outcome = await driveMirrorBoundary({ ...base, ports: failingPorts });
    expect(outcome.kind).toBe("continued");
    expect(gateway.history).toEqual([]);
    expect(outcome.workflowMayAdvance).toBe(true);
  });
});

describe("t282 awaitable production lifecycle adapter", () => {
  test("prompt approval consumes its durable binding atomically and cannot be replayed", async () => {
    const fx = adapterFixture();
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": "prompt" }),
    );
    const gateway = new LifecycleGateway();
    const request = {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: {
        kind: "intent-capture-approved" as const,
        instance: "capture-prompt-1",
      },
    };
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => crypto.randomUUID(),
    };
    const asked = await runMirrorLifecycleBoundary(request, runtime);
    expect(asked.kind).toBe("ok");
    if (asked.kind !== "ok" || asked.outcome.kind !== "ask") {
      throw new Error("expected a persisted Mirror prompt");
    }
    const answer = {
      choice: "approve" as const,
      answerId: "answer-capture-1",
      event: asked.outcome.event,
      operation: asked.outcome.operation,
    };
    const approved = await runMirrorLifecycleBoundary(
      { ...request, answer },
      runtime,
    );
    expect(approved.kind).toBe("ok");
    const parsed = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.snapshot.expectedPrompt).toBeUndefined();
      const receipt = Object.values(parsed.snapshot.receipts)[0];
      expect(receipt?.authorization?.kind).toBe("prompt-approved");
      if (receipt?.authorization?.kind === "prompt-approved") {
        expect(receipt.authorization.answerId).toBe("answer-capture-1");
      }
    }
    const replayed = await runMirrorLifecycleBoundary(
      { ...request, answer },
      runtime,
    );
    expect(replayed.kind).toBe("ok");
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
  });

  test("resolves an explicit Intent in a non-default Space across Intent, phase, and park boundaries", async () => {
    const fx = adapterFixture();
    const gateway = new LifecycleGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => crypto.randomUUID(),
    };
    for (const boundary of [
      { kind: "intent-capture-approved", instance: "capture-1" },
      { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
      { kind: "parked", stage: "scope-definition", instance: "park-1" },
    ] as const) {
      const result = await runMirrorLifecycleBoundary(
        {
          projectDir: fx.root,
          space: fx.space,
          intentDir: fx.intentDir,
          boundary,
        },
        runtime,
      );
      expect(result.kind).toBe("ok");
    }
    expect(gateway.issues).toHaveLength(1);
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
    expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(2);
  });

  test("manual create and sync use durable invocation identities", async () => {
    const fx = adapterFixture();
    const gateway = new LifecycleGateway();
    for (const operation of ["create", "sync"] as const) {
      const result = await runMirrorLifecycleBoundary(
        {
          projectDir: fx.root,
          space: fx.space,
          intentDir: fx.intentDir,
          boundary: { kind: "manual", instance: `manual-${operation}-1` },
          manualOperation: operation,
          invocationId: `invocation-${operation}-1`,
        },
        {
          gateway,
          ports: fx.ports,
          now: () => NOW,
          newOperationId: () => crypto.randomUUID(),
        },
      );
      expect(result.kind).toBe("ok");
    }
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
    expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(1);
  });

  test("provenance mismatch blocks manual sync before remote mutation", async () => {
    const fx = adapterFixture();
    const gateway = new LifecycleGateway();
    await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: { kind: "manual", instance: "manual-create-1" },
        manualOperation: "create",
        invocationId: "invocation-create-1",
      },
      { gateway, ports: fx.ports, now: () => NOW },
    );
    gateway.issues[0] = {
      ...(gateway.issues[0] as RemoteMirrorIssue),
      body: "tampered without a Mirror marker",
    };
    const result = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: { kind: "manual", instance: "manual-sync-1" },
        manualOperation: "sync",
        invocationId: "invocation-sync-1",
      },
      { gateway, ports: fx.ports, now: () => NOW },
    );
    expect(result.kind).toBe("ok");
    if (result.kind === "ok" && result.outcome.kind === "continued") {
      expect(result.outcome.outcomes[0]?.kind).toBe("safety-blocked");
    }
    expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(0);
  });

  test("sync recovers after remote success and a local completion-write failure", async () => {
    const fx = adapterFixture();
    const gateway = new LifecycleGateway();
    const common = {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
    };
    await runMirrorLifecycleBoundary(
      {
        ...common,
        boundary: { kind: "manual", instance: "manual-create-1" },
        manualOperation: "create",
        invocationId: "invocation-create-1",
      },
      { gateway, ports: fx.ports, now: () => NOW },
    );
    let injected = false;
    const failingPorts: MirrorStateStorePorts = {
      ...fx.ports,
      writeDocumentAtomic(text) {
        if (
          !injected &&
          gateway.history.includes("edit") &&
          text.includes('"status":"succeeded"')
        ) {
          injected = true;
          return { kind: "io-failure", summary: "injected sync completion failure" };
        }
        return fx.ports.writeDocumentAtomic(text);
      },
    };
    const syncRequest = {
      ...common,
      boundary: { kind: "manual" as const, instance: "manual-sync-1" },
      manualOperation: "sync" as const,
      invocationId: "invocation-sync-1",
    };
    const first = await runMirrorLifecycleBoundary(syncRequest, {
      gateway,
      ports: failingPorts,
      now: () => NOW,
    });
    expect(first.kind).toBe("ok");
    const second = await runMirrorLifecycleBoundary(syncRequest, {
      gateway,
      ports: fx.ports,
      now: () => NOW,
    });
    expect(second.kind).toBe("ok");
    expect(gateway.history.filter((entry) => entry === "edit")).toHaveLength(1);
  });

  test("close recovers after remote success, then manual close converges without another mutation", async () => {
    const fx = adapterFixture("platform", "260725-done-a1b2c3d4", "complete");
    const gateway = new LifecycleGateway();
    let injected = false;
    const failingPorts: MirrorStateStorePorts = {
      ...fx.ports,
      writeDocumentAtomic(text) {
        if (
          !injected &&
          gateway.history.includes("close") &&
          text.includes('"status":"succeeded"')
        ) {
          injected = true;
          return { kind: "io-failure", summary: "injected close completion failure" };
        }
        return fx.ports.writeDocumentAtomic(text);
      },
    };
    const completionRequest = {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: { kind: "workflow-completed" as const, instance: "complete-1" },
    };
    const first = await runMirrorLifecycleBoundary(completionRequest, {
      gateway,
      ports: failingPorts,
      now: () => NOW,
    });
    expect(first.kind).toBe("ok");
    const second = await runMirrorLifecycleBoundary(completionRequest, {
      gateway,
      ports: fx.ports,
      now: () => NOW,
    });
    expect(second.kind).toBe("ok");
    const manual = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: { kind: "manual", instance: "manual-close-1" },
        manualOperation: "close",
        invocationId: "invocation-close-1",
      },
      { gateway, ports: fx.ports, now: () => NOW },
    );
    expect(manual.kind).toBe("ok");
    expect(gateway.history.filter((entry) => entry === "close")).toHaveLength(1);
    expect(gateway.issues[0]?.state).toBe("CLOSED");
  });
});
