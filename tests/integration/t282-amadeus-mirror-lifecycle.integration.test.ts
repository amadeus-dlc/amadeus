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
  resolveMirrorRecordIdentity,
  runMirrorLifecycleBoundary,
  runMirrorLifecycleMain,
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

  // Project sync is not wired in these contexts (no `projectSync` on the
  // execution context), so a call here is a defect rather than a fixture gap.
  // Throwing asserts by construction that the lifecycle boundaries under test make no Project calls.
  async listProjectItems(
    ..._args: Parameters<MirrorGitHubGateway["listProjectItems"]>
  ): ReturnType<MirrorGitHubGateway["listProjectItems"]> {
    throw new Error("LifecycleGateway must not query Project items");
  }
  async resolveProjectStatusField(
    ..._args: Parameters<MirrorGitHubGateway["resolveProjectStatusField"]>
  ): ReturnType<MirrorGitHubGateway["resolveProjectStatusField"]> {
    throw new Error("LifecycleGateway must not resolve a Project Status field");
  }
  async addProjectItem(
    ..._args: Parameters<MirrorGitHubGateway["addProjectItem"]>
  ): ReturnType<MirrorGitHubGateway["addProjectItem"]> {
    throw new Error("LifecycleGateway must not add a Project item");
  }
  async updateProjectItemStatus(
    ..._args: Parameters<MirrorGitHubGateway["updateProjectItemStatus"]>
  ): ReturnType<MirrorGitHubGateway["updateProjectItemStatus"]> {
    throw new Error("LifecycleGateway must not update a Project item status");
  }
}

class PendingLifecycleGateway extends LifecycleGateway {
  override async createIssue(): Promise<
    GatewayOutcome<RemoteMirrorIssue>
  > {
    this.history.push("create");
    return {
      kind: "failure",
      classification: "network",
      summary: "injected network failure",
      retryable: true,
      effect: "outcome-unknown",
    };
  }
}

// Creates successfully, then fails the first sync edit with an outcome-unknown
// network failure to leave a pending sync receipt, and edits successfully after.
class OnceFailingSyncGateway extends LifecycleGateway {
  private syncEditFailed = false;
  override async editIssue(
    permit: MirrorMutationPermit,
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    if (!this.syncEditFailed) {
      this.syncEditFailed = true;
      this.history.push("edit");
      return {
        kind: "failure",
        classification: "network",
        summary: "injected edit failure",
        retryable: true,
        effect: "outcome-unknown",
      };
    }
    return super.editIssue(permit, body);
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
        config: { autoMirror: mode, projects: [] },
        sources: [],
      }),
    },
  };
}

type SeedRuntime = {
  gateway: LifecycleGateway;
  ports: MirrorStateStorePorts;
  now: () => string;
  newOperationId: () => string;
  newAnswerId?: () => string;
};

// Runs a prompt-mode lifecycle boundary that reconciles the oldest in-progress
// receipt into a durable prompt, and returns the bindingId of a prompt whose
// expected event carries a manual boundary with the given operation.
async function reconcileManualPrompt(
  fx: ReturnType<typeof adapterFixture>,
  runtime: SeedRuntime,
  operation: "create" | "sync",
): Promise<string> {
  const asked = await runMirrorLifecycleBoundary(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: {
        kind: "intent-capture-approved",
        instance: "capture-recon-seed",
      },
    },
    runtime,
  );
  if (asked.kind !== "ok" || asked.outcome.kind !== "ask") {
    throw new Error("expected a manual reconciliation prompt");
  }
  const persisted = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
  if (persisted.kind !== "ok" || !persisted.snapshot.expectedPrompt) {
    throw new Error("expected a persisted binding");
  }
  const expected = persisted.snapshot.expectedPrompt;
  if (expected.event.boundary.kind !== "manual" || expected.operation !== operation) {
    throw new Error(`expected a manual ${operation} binding`);
  }
  return expected.bindingId;
}

// Seed a prompt-mode Intent whose expected prompt carries a manual create
// boundary: a manual create is left non-terminal (pending) by an injected gh
// failure, then a prompt-mode lifecycle boundary reconciles that receipt.
async function seedManualCreateReconciliationPrompt(
  fx: ReturnType<typeof adapterFixture>,
  runtime: SeedRuntime,
): Promise<string> {
  writeFileSync(
    join(fx.root, "amadeus", "config.json"),
    JSON.stringify({ "auto-mirror": "prompt" }),
  );
  const pending = await runMirrorLifecycleBoundary(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: { kind: "manual", instance: "manual-recon-seed" },
      manualOperation: "create",
      invocationId: "manual-recon-seed",
    },
    {
      gateway: new PendingLifecycleGateway(),
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "op-manual-recon-seed",
    },
  );
  if (pending.kind !== "ok") {
    throw new Error("expected a pending manual create");
  }
  return reconcileManualPrompt(fx, runtime, "create");
}

// Seed a prompt-mode Intent whose expected prompt carries a manual sync
// boundary: a manual create succeeds, a manual sync is left pending by an
// injected edit failure, then a prompt-mode lifecycle boundary reconciles it.
// The idempotent sync re-executes cleanly when the prompt is later approved.
async function seedManualSyncReconciliationPrompt(
  fx: ReturnType<typeof adapterFixture>,
  runtime: SeedRuntime,
): Promise<string> {
  writeFileSync(
    join(fx.root, "amadeus", "config.json"),
    JSON.stringify({ "auto-mirror": "prompt" }),
  );
  const created = await runMirrorLifecycleBoundary(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: { kind: "manual", instance: "manual-create-seed" },
      manualOperation: "create",
      invocationId: "manual-create-seed",
    },
    {
      gateway: runtime.gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "op-manual-create-seed",
    },
  );
  if (created.kind !== "ok" || created.outcome.kind !== "continued") {
    throw new Error("expected a completed manual create seed");
  }
  const pendingSync = await runMirrorLifecycleBoundary(
    {
      projectDir: fx.root,
      space: fx.space,
      intentDir: fx.intentDir,
      boundary: { kind: "manual", instance: "manual-sync-seed" },
      manualOperation: "sync",
      invocationId: "manual-sync-seed",
    },
    {
      gateway: runtime.gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "op-manual-sync-seed",
    },
  );
  if (pendingSync.kind !== "ok") {
    throw new Error("expected a pending manual sync");
  }
  return reconcileManualPrompt(fx, runtime, "sync");
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
  test("fails closed when lifecycle target metadata is incomplete", async () => {
    const unresolvedRoot = mkdtempSync(join(tmpdir(), "mirror-unresolved-"));
    roots.push(unresolvedRoot);
    expect(resolveMirrorRecordIdentity(unresolvedRoot)).toBeNull();
    expect(
      await runMirrorLifecycleBoundary({
        projectDir: unresolvedRoot,
        repository: REPO,
        boundary: { kind: "intent-capture-approved", instance: "missing-intent" },
      }),
    ).toEqual({
      kind: "error",
      message: "Mirror lifecycle could not resolve an Intent.",
    });

    const noRepo = adapterFixture();
    writeFileSync(
      join(noRepo.root, "amadeus", "spaces", noRepo.space, "intents", "intents.json"),
      JSON.stringify([
        {
          uuid: "intent-adapter-1",
          slug: "demo",
          dirName: noRepo.intentDir,
          scope: "feature",
          repos: [],
          status: "in-flight",
        },
      ]),
    );
    expect(
      await runMirrorLifecycleBoundary({
        projectDir: noRepo.root,
        space: noRepo.space,
        intentDir: noRepo.intentDir,
        boundary: { kind: "intent-capture-approved", instance: "missing-repo" },
      }),
    ).toEqual({
      kind: "error",
      message:
        "Mirror lifecycle could not resolve one canonical GitHub repository; pass --repo owner/name.",
    });

    const unreadable = adapterFixture();
    rmSync(unreadable.statePath);
    expect(
      await runMirrorLifecycleBoundary({
        projectDir: unreadable.root,
        space: unreadable.space,
        intentDir: unreadable.intentDir,
        repository: REPO,
        boundary: { kind: "intent-capture-approved", instance: "missing-state" },
      }),
    ).toEqual({
      kind: "error",
      message: `Mirror lifecycle state is unreadable for Intent "${unreadable.intentDir}".`,
    });
  });

  test("rejects incomplete manual lifecycle requests before target resolution", async () => {
    const root = mkdtempSync(join(tmpdir(), "mirror-manual-invalid-"));
    roots.push(root);
    expect(
      await runMirrorLifecycleBoundary({
        projectDir: root,
        repository: REPO,
        boundary: { kind: "manual", instance: "manual-invalid" },
        manualOperation: "create",
      }),
    ).toEqual({
      kind: "error",
      message: "Manual Mirror lifecycle requires an operation and invocation ID.",
    });
  });

  test("CLI returns non-zero while a prompt answer is still required", async () => {
    const fx = adapterFixture();
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": "prompt" }),
    );
    const exitCode = await runMirrorLifecycleMain(
      [
        "boundary",
        "intent-capture",
        "--instance",
        "capture-prompt-cli-1",
        "--project-dir",
        fx.root,
        "--space",
        fx.space,
        "--intent",
        fx.intentDir,
      ],
      {
        gateway: new LifecycleGateway(),
        ports: fx.ports,
        now: () => NOW,
        newOperationId: () => "binding-cli-1",
      },
    );

    expect(exitCode).toBe(1);
  });

  test("CLI returns zero only for completed operation outcomes", async () => {
    const completed = adapterFixture();
    const completedExit = await runMirrorLifecycleMain(
      [
        "boundary",
        "intent-capture",
        "--instance",
        "capture-completed-cli-1",
        "--project-dir",
        completed.root,
        "--space",
        completed.space,
        "--intent",
        completed.intentDir,
      ],
      {
        gateway: new LifecycleGateway(),
        ports: completed.ports,
        now: () => NOW,
        newOperationId: () => "operation-completed-cli-1",
      },
    );
    expect(completedExit).toBe(0);

    const suppressed = adapterFixture();
    writeFileSync(
      join(suppressed.root, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": "off" }),
    );
    const suppressedExit = await runMirrorLifecycleMain(
      [
        "boundary",
        "intent-capture",
        "--instance",
        "capture-suppressed-cli-1",
        "--project-dir",
        suppressed.root,
        "--space",
        suppressed.space,
        "--intent",
        suppressed.intentDir,
      ],
      { gateway: new LifecycleGateway(), ports: suppressed.ports, now: () => NOW },
    );
    expect(suppressedExit).toBe(1);

    const pending = adapterFixture();
    const pendingExit = await runMirrorLifecycleMain(
      [
        "manual",
        "create",
        "--instance",
        "manual-pending-cli-1",
        "--project-dir",
        pending.root,
        "--space",
        pending.space,
        "--intent",
        pending.intentDir,
      ],
      {
        gateway: new PendingLifecycleGateway(),
        ports: pending.ports,
        now: () => NOW,
        newOperationId: () => "operation-pending-cli-1",
      },
    );
    expect(pendingExit).toBe(1);

    const blocked = adapterFixture();
    const blockedExit = await runMirrorLifecycleMain(
      [
        "manual",
        "create",
        "--instance",
        "manual-blocked-cli-1",
        "--project-dir",
        blocked.root,
        "--space",
        blocked.space,
        "--intent",
        blocked.intentDir,
      ],
      {
        gateway: new LifecycleGateway(),
        ports: {
          ...blocked.ports,
          readDocument() {
            throw new Error("injected state read failure");
          },
        },
        now: () => NOW,
        newOperationId: () => "operation-blocked-cli-1",
      },
    );
    expect(blockedExit).toBe(1);
  });

  test("answer approve binds to the persisted prompt and derives its operation", async () => {
    const fx = adapterFixture();
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": "prompt" }),
    );
    const gateway = new LifecycleGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "binding-approve-cli-1",
      newAnswerId: () => "answer-approve-cli-1",
    };
    const asked = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: {
          kind: "intent-capture-approved",
          instance: "capture-approve-cli-1",
        },
      },
      runtime,
    );
    expect(asked.kind).toBe("ok");
    if (asked.kind !== "ok" || asked.outcome.kind !== "ask") {
      throw new Error("expected a persisted Mirror prompt");
    }
    const persisted = parseMirrorStateDocument(
      readFileSync(fx.statePath, "utf-8"),
    );
    expect(persisted.kind).toBe("ok");
    if (persisted.kind !== "ok" || !persisted.snapshot.expectedPrompt) {
      throw new Error("expected a persisted binding");
    }
    expect(
      (asked.outcome as typeof asked.outcome & { bindingId?: string }).bindingId,
    ).toBe(persisted.snapshot.expectedPrompt.bindingId);

    const exitCode = await runMirrorLifecycleMain(
      [
        "answer",
        "approve",
        "--binding-id",
        persisted.snapshot.expectedPrompt.bindingId,
        "--project-dir",
        fx.root,
        "--space",
        fx.space,
        "--intent",
        fx.intentDir,
      ],
      runtime,
    );

    expect(exitCode).toBe(0);
    expect(gateway.history.filter((entry) => entry === "create")).toHaveLength(1);
  });

  test("answer approve consumes a manual-boundary reconciliation prompt and derives its manual operation", async () => {
    const fx = adapterFixture();
    const gateway = new OnceFailingSyncGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "binding-manual-approve-1",
      newAnswerId: () => "answer-manual-approve-1",
    };
    const bindingId = await seedManualSyncReconciliationPrompt(fx, runtime);
    const exitCode = await runMirrorLifecycleMain(
      [
        "answer",
        "approve",
        "--binding-id",
        bindingId,
        "--project-dir",
        fx.root,
        "--space",
        fx.space,
        "--intent",
        fx.intentDir,
      ],
      runtime,
    );
    expect(exitCode).toBe(0);
    const parsed = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.snapshot.expectedPrompt).toBeUndefined();
      const syncReceipt = Object.values(parsed.snapshot.receipts).find(
        (receipt) =>
          receipt.event.boundary.kind === "manual" &&
          receipt.event.operation === "sync",
      );
      expect(syncReceipt?.status).toBe("succeeded");
    }
  });

  test("answer skip consumes a manual-boundary reconciliation prompt without remote mutation", async () => {
    const fx = adapterFixture();
    const gateway = new LifecycleGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "binding-manual-skip-1",
      newAnswerId: () => "answer-manual-skip-1",
    };
    const bindingId = await seedManualCreateReconciliationPrompt(fx, runtime);
    const exitCode = await runMirrorLifecycleMain(
      [
        "answer",
        "skip",
        "--binding-id",
        bindingId,
        "--project-dir",
        fx.root,
        "--space",
        fx.space,
        "--intent",
        fx.intentDir,
      ],
      runtime,
    );
    expect(exitCode).toBe(1);
    expect(gateway.history).toEqual([]);
    const parsed = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.snapshot.expectedPrompt).toBeUndefined();
    }
  });

  test("consuming a manual-boundary answer unblocks the next boundary from a stale expected prompt", async () => {
    const fx = adapterFixture();
    const gateway = new OnceFailingSyncGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "binding-manual-unblock-1",
      newAnswerId: () => "answer-manual-unblock-1",
    };
    const bindingId = await seedManualSyncReconciliationPrompt(fx, runtime);
    const exitCode = await runMirrorLifecycleMain(
      [
        "answer",
        "approve",
        "--binding-id",
        bindingId,
        "--project-dir",
        fx.root,
        "--space",
        fx.space,
        "--intent",
        fx.intentDir,
      ],
      runtime,
    );
    expect(exitCode).toBe(0);
    const consumed = parseMirrorStateDocument(readFileSync(fx.statePath, "utf-8"));
    expect(consumed.kind).toBe("ok");
    if (consumed.kind === "ok") {
      expect(consumed.snapshot.expectedPrompt).toBeUndefined();
    }
    // A later boundary must proceed instead of hitting the state-write safety
    // block that a stale, unconsumable expected prompt would otherwise raise.
    const later = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: {
          kind: "phase-verified",
          phase: "inception",
          instance: "phase-recon-unblock-1",
        },
      },
      {
        gateway,
        ports: fx.ports,
        now: () => "2026-07-25T01:00:00Z",
        newOperationId: () => "binding-manual-unblock-2",
      },
    );
    expect(later.kind).toBe("ok");
    if (later.kind === "ok" && later.outcome.kind === "continued") {
      expect(
        later.outcome.outcomes.some(
          (outcome) =>
            outcome.kind === "safety-blocked" &&
            outcome.warning.summary === "expected prompt could not be persisted",
        ),
      ).toBe(false);
    }
  });

  test("answer skip and invalid bindings fail closed without remote mutation", async () => {
    const fx = adapterFixture();
    writeFileSync(
      join(fx.root, "amadeus", "config.json"),
      JSON.stringify({ "auto-mirror": "prompt" }),
    );
    const gateway = new LifecycleGateway();
    const runtime = {
      gateway,
      ports: fx.ports,
      now: () => NOW,
      newOperationId: () => "binding-skip-cli-1",
      newAnswerId: () => "answer-skip-cli-1",
    };
    const asked = await runMirrorLifecycleBoundary(
      {
        projectDir: fx.root,
        space: fx.space,
        intentDir: fx.intentDir,
        boundary: {
          kind: "intent-capture-approved",
          instance: "capture-skip-cli-1",
        },
      },
      runtime,
    );
    if (asked.kind !== "ok" || asked.outcome.kind !== "ask") {
      throw new Error("expected a persisted Mirror prompt");
    }
    const answerArgs = [
      "--project-dir",
      fx.root,
      "--space",
      fx.space,
      "--intent",
      fx.intentDir,
    ];
    const beforeRejected = readFileSync(fx.statePath, "utf-8");
    expect(
      await runMirrorLifecycleMain(
        ["answer", "approve", "--binding-id", "wrong-binding", ...answerArgs],
        runtime,
      ),
    ).toBe(1);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(beforeRejected);
    expect(
      await runMirrorLifecycleMain(
        ["answer", "approve", ...answerArgs],
        runtime,
      ),
    ).toBe(2);
    expect(
      await runMirrorLifecycleMain(
        [
          "answer",
          "approve",
          "--binding-id",
          asked.outcome.bindingId,
          "--operation",
          "sync",
          ...answerArgs,
        ],
        runtime,
      ),
    ).toBe(2);

    expect(
      await runMirrorLifecycleMain(
        [
          "answer",
          "skip",
          "--binding-id",
          asked.outcome.bindingId,
          ...answerArgs,
        ],
        runtime,
      ),
    ).toBe(1);
    const afterSkip = readFileSync(fx.statePath, "utf-8");
    const skipped = parseMirrorStateDocument(afterSkip);
    expect(skipped.kind).toBe("ok");
    if (skipped.kind === "ok") {
      expect(skipped.snapshot.expectedPrompt).toBeUndefined();
      expect(Object.values(skipped.snapshot.receipts)[0]?.status).toBe(
        "skipped-for-event",
      );
    }
    expect(gateway.history).toEqual([]);

    expect(
      await runMirrorLifecycleMain(
        [
          "answer",
          "skip",
          "--binding-id",
          asked.outcome.bindingId,
          ...answerArgs,
        ],
        runtime,
      ),
    ).toBe(1);
    expect(readFileSync(fx.statePath, "utf-8")).toBe(afterSkip);
    expect(gateway.history).toEqual([]);
  });

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
      bindingId: asked.outcome.bindingId,
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

describe("t282 per-operation suppression", () => {
  test("a skipped boundary event is suppressed by name on the next drive", async () => {
    const fx = fixture();
    const gateway = new LifecycleGateway();
    // Link the mirror, then raise a prompt for one phase boundary and skip it.
    await driveMirrorBoundary(boundaryInput(fx, gateway, "auto", "link-1", "completion"));
    const promptInput = boundaryInput(fx, gateway, "prompt", "phase-skip");
    const asked = await driveMirrorBoundary(promptInput);
    expect(asked.kind).toBe("ask");
    if (asked.kind !== "ask") throw new Error("expected an ask outcome");
    const skipped = await driveMirrorBoundary({
      ...promptInput,
      answer: {
        choice: "skip" as const,
        bindingId: asked.bindingId,
        answerId: "answer-skip-suppress-1",
        operation: asked.operation,
        event: asked.event,
      },
    });
    expect(skipped.kind).toBe("continued");
    if (skipped.kind === "continued") {
      expect(skipped.outcomes[0]?.kind).toBe("skipped");
    }
    const before = gateway.history.length;

    // Driving the same boundary again resolves the operation, sees the
    // skipped-for-event receipt, and suppresses that operation by name.
    const outcome = await driveMirrorBoundary(
      boundaryInput(fx, gateway, "auto", "phase-skip"),
    );

    expect(outcome.kind).toBe("continued");
    if (outcome.kind === "continued") {
      expect(outcome.outcomes).toEqual([
        { kind: "suppressed", operation: "sync", reason: "not-applicable" },
      ]);
    }
    expect(gateway.history.length).toBe(before);
  });
});
