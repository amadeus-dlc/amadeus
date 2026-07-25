// t279 — C6 guarded Mirror operation executor.
// covers: packages/framework/core/tools/amadeus-mirror-executor.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  executeMirrorOperation,
} from "../../packages/framework/core/tools/amadeus-mirror-executor.ts";
import { mirrorEventIdentity, mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
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
  MirrorProvenance,
  MirrorStateSnapshot,
  RemoteMirrorIssue,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "app",
  canonical: "acme/app",
};
const NOW = "2026-07-25T00:00:00Z";
const INTENT_DIR = "amadeus/spaces/default/intents/demo";

function ok<T>(value: T): GatewayOutcome<T> {
  return { kind: "ok", value };
}

function memoryStore(initial: MirrorStateSnapshot = EMPTY_MIRROR_STATE): {
  ports: MirrorStateStorePorts;
  state: () => MirrorStateSnapshot;
} {
  let document = `# State\n\n${renderMirrorStateBlock(initial)}\n`;
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
        return document;
      },
      writeDocumentAtomic(text) {
        document = text;
        return { kind: "ok" };
      },
      appendArtifactUpdated() {
        return { kind: "appended" };
      },
    },
    state() {
      const parsed = parseMirrorStateDocument(document);
      if (parsed.kind === "invalid") {
        throw new Error(parsed.issues.join("; "));
      }
      return parsed.snapshot;
    },
  };
}

class FakeGateway implements MirrorGitHubGateway {
  readonly history: string[] = [];
  candidates: RemoteMirrorIssue[] = [];
  viewed: RemoteMirrorIssue | null = null;
  readinessResult: GatewayOutcome<void> = ok(undefined);

  async readiness(): Promise<GatewayOutcome<void>> {
    this.history.push("readiness");
    return this.readinessResult;
  }
  async createIssue(
    _permit: Parameters<MirrorGitHubGateway["createIssue"]>[0],
    input: Parameters<MirrorGitHubGateway["createIssue"]>[1],
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("create");
    return ok({
      repository: REPO,
      number: 7,
      title: input.title,
      body: input.body,
      state: "OPEN",
    });
  }
  async findIssuesByMarker(): Promise<GatewayOutcome<readonly RemoteMirrorIssue[]>> {
    this.history.push("find");
    return ok(this.candidates);
  }
  async viewIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("view");
    if (!this.viewed) throw new Error("view fixture is absent");
    return ok(this.viewed);
  }
  async editIssue(
    _permit: Parameters<MirrorGitHubGateway["editIssue"]>[0],
    body: string,
  ): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("edit");
    if (!this.viewed) throw new Error("view fixture is absent");
    this.viewed = { ...this.viewed, body };
    return ok(this.viewed);
  }
  async closeIssue(): Promise<GatewayOutcome<RemoteMirrorIssue>> {
    this.history.push("close");
    if (!this.viewed) throw new Error("view fixture is absent");
    this.viewed = { ...this.viewed, state: "CLOSED" };
    return ok(this.viewed);
  }
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

function issue(id = identity(), number = 7, body?: string): RemoteMirrorIssue {
  return {
    repository: REPO,
    number,
    title: "Mirror",
    body: body ?? `snapshot\n${renderMirrorMarker(id)}`,
    state: "OPEN",
  };
}

function linkedState(): MirrorStateSnapshot {
  const provenance: MirrorProvenance = {
    schema: 1,
    createIdentity: identity(),
    issueNumber: 7,
    createdAt: NOW,
  };
  return { ...EMPTY_MIRROR_STATE, issueNumber: 7, provenance };
}

function authorization(
  event: MirrorExecutionContext["event"],
  operation: MirrorOperation,
  finalSyncReceiptKey?: string,
) {
  return {
    kind: "auto" as const,
    event,
    operation,
    boundaryInstance: event.boundary.instance,
    receiptRevision: 1,
    resolvedMode: "auto" as const,
    ...(finalSyncReceiptKey ? { finalSyncReceiptKey } : {}),
  };
}

function context(
  operation: MirrorOperation,
  gateway: MirrorGitHubGateway,
  body?: string,
): MirrorExecutionContext {
  const event = mirrorEventIdentity(
    "intent-1",
    { kind: "phase-verified", phase: "ideation", instance: "phase-1" },
    operation,
  );
  return {
    statePath: "/state",
    intentUuid: "intent-1",
    intentDir: INTENT_DIR,
    repository: REPO,
    triggerEvent: event,
    event,
    operation,
    issueContent: {
      title: "Mirror",
      body: body ?? `snapshot\n${renderMirrorMarker(identity())}`,
      labels: ["amadeus-intent-mirror"],
    },
    expectedMirrorRevision: 0,
    now: () => NOW,
    newOperationId: () => "op-1",
    gateway,
    authorization: authorization(event, operation),
  };
}

describe("t279 create", () => {
  test("fresh create claims attempted state before one remote create", async () => {
    const store = memoryStore();
    const gateway = new FakeGateway();
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: EMPTY_MIRROR_STATE,
    });
    expect(outcome).toEqual({
      kind: "completed",
      operation: "create",
      issueNumber: 7,
    });
    expect(gateway.history).toEqual(["readiness", "find", "create"]);
    expect(store.state().receipts[mirrorEventKey(context("create", gateway).event)]?.status).toBe(
      "succeeded",
    );
  });

  test("attempted create adopts the one matching candidate without creating", async () => {
    const event = context("create", new FakeGateway()).event;
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-1",
      status: "attempted" as const,
      preparedAt: NOW,
      attemptedAt: NOW,
      createIdentity: identity(),
      authorization: authorization(event, "create"),
    };
    const initial = {
      ...EMPTY_MIRROR_STATE,
      revision: 1,
      receipts: { [receipt.key]: receipt },
    };
    const store = memoryStore(initial);
    const gateway = new FakeGateway();
    gateway.candidates = [issue()];
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("completed");
    expect(gateway.history).toEqual(["readiness", "find"]);
  });

  test("attempted create with zero candidates blocks duplicate creation", async () => {
    const event = context("create", new FakeGateway()).event;
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-1",
      status: "attempted" as const,
      preparedAt: NOW,
      attemptedAt: NOW,
      createIdentity: identity(),
      authorization: authorization(event, "create"),
    };
    const initial = {
      ...EMPTY_MIRROR_STATE,
      revision: 1,
      receipts: { [receipt.key]: receipt },
    };
    const store = memoryStore(initial);
    const gateway = new FakeGateway();
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("safety-blocked");
    expect(gateway.history).toEqual(["readiness", "find"]);
  });

  test("multiple matching candidates block mutation", async () => {
    const event = context("create", new FakeGateway()).event;
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-1",
      status: "prepared" as const,
      preparedAt: NOW,
      createIdentity: identity(),
    };
    const initial = {
      ...EMPTY_MIRROR_STATE,
      receipts: { [receipt.key]: receipt },
    };
    const store = memoryStore(initial);
    const gateway = new FakeGateway();
    gateway.candidates = [issue(identity(), 7), issue(identity(), 8)];
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("safety-blocked");
    expect(gateway.history).not.toContain("create");
  });

  test("persisted identity mismatch blocks before readiness", async () => {
    const gateway = new FakeGateway();
    const ctx = context("create", gateway);
    const event = ctx.event;
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-1",
      status: "prepared" as const,
      preparedAt: NOW,
      createIdentity: { ...identity(), intentDir: "other" },
    };
    const initial = {
      ...EMPTY_MIRROR_STATE,
      receipts: { [receipt.key]: receipt },
    };
    const store = memoryStore(initial);
    const outcome = await executeMirrorOperation({
      context: ctx,
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("safety-blocked");
    expect(gateway.history).toEqual([]);
  });

  test("a durable authorization binding mismatch blocks before readiness", async () => {
    const gateway = new FakeGateway();
    const ctx = context("create", gateway);
    const event = ctx.event;
    const wrongEvent = mirrorEventIdentity(
      "intent-1",
      { kind: "phase-verified", phase: "ideation", instance: "phase-other" },
      "create",
    );
    const receipt = {
      key: mirrorEventKey(event),
      event,
      operationId: "op-1",
      status: "prepared" as const,
      preparedAt: NOW,
      createIdentity: identity(),
      authorization: authorization(wrongEvent, "create"),
    };
    const initial = {
      ...EMPTY_MIRROR_STATE,
      revision: 1,
      receipts: { [receipt.key]: receipt },
    };
    const outcome = await executeMirrorOperation({
      context: ctx,
      ports: memoryStore(initial).ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("safety-blocked");
    expect(gateway.history).toEqual([]);
  });

  test("readiness failure stays pending and performs no mutation", async () => {
    const store = memoryStore();
    const gateway = new FakeGateway();
    gateway.readinessResult = {
      kind: "failure",
      classification: "unauthenticated",
      summary: "authentication required",
      retryable: false,
      effect: "no-effect-confirmed",
    };
    const outcome = await executeMirrorOperation({
      context: context("create", gateway),
      ports: store.ports,
      localState: EMPTY_MIRROR_STATE,
    });
    expect(outcome.kind).toBe("pending");
    expect(gateway.history).toEqual(["readiness"]);
  });
});

describe("t279 sync and close convergence", () => {
  test("sync body already matches after attempted re-entry and performs no edit", async () => {
    const gateway = new FakeGateway();
    const desired = `current\n${renderMirrorMarker(identity())}`;
    gateway.viewed = issue(identity(), 7, desired);
    const event = context("sync", gateway, desired).event;
    const initial = {
      ...linkedState(),
      receipts: {
        [mirrorEventKey(event)]: {
          key: mirrorEventKey(event),
          event,
          operationId: "op-sync",
          status: "attempted" as const,
          preparedAt: NOW,
          attemptedAt: NOW,
          authorization: authorization(event, "sync"),
        },
      },
      revision: 1,
    };
    const store = memoryStore(initial);
    const outcome = await executeMirrorOperation({
      context: context("sync", gateway, desired),
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("completed");
    expect(gateway.history).toEqual(["view"]);
  });

  test("close of an open verified Issue retries through one close call", async () => {
    const gateway = new FakeGateway();
    gateway.viewed = issue();
    const base = context("close", gateway);
    const syncEvent = mirrorEventIdentity(
      "intent-1",
      { kind: "workflow-completed", instance: "complete-1" },
      "sync",
    );
    const syncKey = mirrorEventKey(syncEvent);
    const closeContext = {
      ...base,
      authorization: authorization(base.event, "close", syncKey),
    };
    const event = base.event;
    const initial = {
      ...linkedState(),
      receipts: {
        [mirrorEventKey(event)]: {
          key: mirrorEventKey(event),
          event,
          operationId: "op-close",
          status: "pending" as const,
          preparedAt: NOW,
          attemptedAt: NOW,
          lastEffect: "outcome-unknown" as const,
          failureClass: "network" as const,
          authorization: authorization(event, "close", syncKey),
        },
        [syncKey]: {
          key: syncKey,
          event: syncEvent,
          operationId: "op-sync-final",
          status: "succeeded" as const,
          preparedAt: NOW,
          attemptedAt: NOW,
          completedAt: NOW,
          authorization: authorization(syncEvent, "sync"),
        },
      },
      revision: 1,
    };
    const store = memoryStore(initial);
    const outcome = await executeMirrorOperation({
      context: closeContext,
      ports: store.ports,
      localState: initial,
    });
    expect(outcome.kind).toBe("completed");
    expect(gateway.history).toEqual(["view", "readiness", "close"]);
  });
});
