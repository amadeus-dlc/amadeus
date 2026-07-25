// t280 — C7 Mirror boundary coordinator.
// covers: packages/framework/core/tools/amadeus-mirror-coordinator.ts
// size: small

import { describe, expect, test } from "bun:test";
import {
  driveMirrorBoundary,
  selectMirrorReconciliation,
  selectNextCompletion,
} from "../../packages/framework/core/tools/amadeus-mirror-coordinator.ts";
import { mirrorEventIdentity, mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  EMPTY_MIRROR_STATE,
  parseMirrorStateDocument,
  renderMirrorStateBlock,
} from "../../packages/framework/core/tools/amadeus-mirror-state-codec.ts";
import type { MirrorStateStorePorts } from "../../packages/framework/core/tools/amadeus-mirror-state-store.ts";
import type {
  MirrorBoundary,
  MirrorGitHubGateway,
  MirrorOperation,
  MirrorOperationReceipt,
  MirrorStateSnapshot,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";

const NOW = "2026-07-25T00:00:00Z";
const REPO: RepositoryIdentity = {
  owner: "acme",
  name: "app",
  canonical: "acme/app",
};

function memoryStore(initial: MirrorStateSnapshot = EMPTY_MIRROR_STATE): {
  ports: MirrorStateStorePorts;
  state: () => MirrorStateSnapshot;
  writes: () => number;
} {
  let document = `# State\n\n${renderMirrorStateBlock(initial)}\n`;
  let locked = false;
  let writeCount = 0;
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
        writeCount += 1;
        document = text;
        return { kind: "ok" };
      },
      appendArtifactUpdated() {
        return { kind: "appended" };
      },
    },
    state() {
      const parsed = parseMirrorStateDocument(document);
      if (parsed.kind === "invalid") throw new Error(parsed.issues.join("; "));
      return parsed.snapshot;
    },
    writes: () => writeCount,
  };
}

const GATEWAY = {} as MirrorGitHubGateway;

function boundary(kind: "phase" | "completion" = "phase"): MirrorBoundary {
  return kind === "completion"
    ? { kind: "workflow-completed", instance: "complete-1" }
    : { kind: "phase-verified", phase: "ideation", instance: "phase-1" };
}

function input(
  store: ReturnType<typeof memoryStore>,
  mode: "off" | "prompt" | "auto",
  kind: "phase" | "completion" = "phase",
) {
  return {
    context: {
      projectDir: "/project",
      statePath: "/state",
      intentUuid: "intent-1",
      intentDir: "amadeus/spaces/default/intents/demo",
      repository: REPO,
      boundary: boundary(kind),
      snapshot: {
        intentUuid: "intent-1",
        intentDir: "amadeus/spaces/default/intents/demo",
        projectSummary: "Mirror lifecycle",
        lifecyclePhase: "CONSTRUCTION",
        currentStage: "code-generation",
        status: "Running",
        registryStatus: "in-flight",
        updatedAt: NOW,
      },
    },
    ports: store.ports,
    gateway: GATEWAY,
    now: () => NOW,
    newOperationId: () => "op-1",
    dependencies: {
      resolveConfig: () => ({
        kind: "resolved" as const,
        config: { autoMirror: mode },
        sources: ["/project/amadeus/config.json"],
      }),
    },
  };
}

function receipt(
  operation: MirrorOperation,
  status: MirrorOperationReceipt["status"],
  boundaryValue = boundary("completion"),
): MirrorOperationReceipt {
  const event = mirrorEventIdentity("intent-1", boundaryValue, operation);
  return {
    key: mirrorEventKey(event),
    event,
    operationId: `op-${operation}`,
    status,
    preparedAt: NOW,
    ...(status === "attempted" || status === "pending"
      ? { attemptedAt: NOW }
      : {}),
    ...(status === "succeeded" ? { attemptedAt: NOW, completedAt: NOW } : {}),
  };
}

describe("t280 mode routing", () => {
  test("off suppresses before pending reconciliation and does not write", async () => {
    const pending = receipt("create", "pending", boundary("phase"));
    const store = memoryStore({
      ...EMPTY_MIRROR_STATE,
      receipts: { [pending.key]: pending },
    });
    const outcome = await driveMirrorBoundary(input(store, "off"));
    expect(outcome.kind).toBe("continued");
    expect(outcome.workflowMayAdvance).toBe(true);
    expect(store.writes()).toBe(0);
  });

  test("prompt persists the expected event before returning ask", async () => {
    const store = memoryStore();
    const outcome = await driveMirrorBoundary(input(store, "prompt"));
    expect(outcome.kind).toBe("ask");
    expect(outcome.workflowMayAdvance).toBe(true);
    expect(store.state().expectedPrompt?.operation).toBe("create");
  });

  test("auto executes the one phase-boundary operation", async () => {
    const store = memoryStore();
    const operations: MirrorOperation[] = [];
    const base = input(store, "auto");
    const outcome = await driveMirrorBoundary({
      ...base,
      dependencies: {
        ...base.dependencies,
        execute: async ({ context }) => {
          operations.push(context.operation);
          return {
            kind: "completed",
            operation: context.operation,
            issueNumber: 7,
          };
        },
      },
    });
    expect(operations).toEqual(["create"]);
    expect(outcome.kind).toBe("continued");
    expect(outcome.workflowMayAdvance).toBe(true);
  });

  test("invalid config is suppressed, persisted as a global warning, and non-blocking", async () => {
    const store = memoryStore();
    const base = input(store, "auto");
    const outcome = await driveMirrorBoundary({
      ...base,
      dependencies: {
        resolveConfig: () => ({
          kind: "invalid",
          issues: [
            {
              kind: "invalid-value",
              layer: "space",
              path: "/project/amadeus/config.json",
              key: "auto-mirror",
              actualType: "boolean",
              expected: "off | prompt | auto",
            },
          ],
        }),
      },
    });
    expect(outcome.kind).toBe("continued");
    expect(outcome.workflowMayAdvance).toBe(true);
    expect(store.state().warnings[0]?.classification).toBe("configuration");
  });

  test("invalid state returns a non-blocking safety outcome", async () => {
    const store = memoryStore();
    const base = input(store, "auto");
    const outcome = await driveMirrorBoundary({
      ...base,
      dependencies: {
        ...base.dependencies,
        readState: () => ({ kind: "invalid", issues: ["bad state"] }),
      },
    });
    expect(outcome.kind).toBe("continued");
    expect(outcome.workflowMayAdvance).toBe(true);
    if (outcome.kind === "continued") {
      expect(outcome.outcomes[0]?.kind).toBe("safety-blocked");
    }
  });
});

describe("t280 prompt answers and completion", () => {
  test("skip consumes the expected prompt and persists an event-scoped skip", async () => {
    const store = memoryStore();
    const asked = await driveMirrorBoundary(input(store, "prompt"));
    if (asked.kind !== "ask") throw new Error("expected ask");
    const base = input(store, "prompt");
    const skipped = await driveMirrorBoundary({
      ...base,
      answer: {
        choice: "skip",
        bindingId: asked.bindingId,
        answerId: "answer-skip-1",
        event: asked.event,
        operation: asked.operation,
      },
    });
    expect(skipped.kind).toBe("continued");
    expect(store.state().expectedPrompt).toBeUndefined();
    expect(store.state().receipts[mirrorEventKey(asked.event)]?.status).toBe(
      "skipped-for-event",
    );
  });

  test("approve executes only the persisted event binding", async () => {
    const store = memoryStore();
    const asked = await driveMirrorBoundary(input(store, "prompt"));
    if (asked.kind !== "ask") throw new Error("expected ask");
    const operations: MirrorOperation[] = [];
    const base = input(store, "prompt");
    const approved = await driveMirrorBoundary({
      ...base,
      answer: {
        choice: "approve",
        bindingId: asked.bindingId,
        answerId: "answer-approve-1",
        event: asked.event,
        operation: asked.operation,
      },
      dependencies: {
        ...base.dependencies,
        execute: async ({ context }) => {
          operations.push(context.operation);
          return {
            kind: "completed",
            operation: context.operation,
            issueNumber: 7,
          };
        },
      },
    });
    expect(approved.kind).toBe("continued");
    expect(operations).toEqual(["create"]);
  });

  test("completion driver selects create, sync, close, then terminal", () => {
    const completion = boundary("completion");
    if (completion.kind !== "workflow-completed") throw new Error("bad fixture");
    let state = EMPTY_MIRROR_STATE;
    expect(
      selectNextCompletion({
        snapshot: state,
        snapshotRevision: 0,
        intentUuid: "intent-1",
        completionBoundary: completion,
      })?.operation,
    ).toBe("create");
    const create = receipt("create", "succeeded");
    state = {
      ...state,
      issueNumber: 7,
      receipts: { [create.key]: create },
    };
    expect(
      selectNextCompletion({
        snapshot: state,
        snapshotRevision: 1,
        intentUuid: "intent-1",
        completionBoundary: completion,
      })?.operation,
    ).toBe("sync");
    const sync = receipt("sync", "succeeded");
    state = {
      ...state,
      receipts: { ...state.receipts, [sync.key]: sync },
    };
    expect(
      selectNextCompletion({
        snapshot: state,
        snapshotRevision: 2,
        intentUuid: "intent-1",
        completionBoundary: completion,
      })?.operation,
    ).toBe("close");
    const close = receipt("close", "succeeded");
    state = {
      ...state,
      receipts: { ...state.receipts, [close.key]: close },
    };
    expect(
      selectNextCompletion({
        snapshot: state,
        snapshotRevision: 3,
        intentUuid: "intent-1",
        completionBoundary: completion,
      }),
    ).toBeNull();
  });

  test("reconciliation selects the oldest eligible pending receipt", () => {
    const old = {
      ...receipt("sync", "pending", boundary("phase")),
      preparedAt: "2026-07-24T00:00:00Z",
    };
    const recent = receipt("create", "prepared", boundary("phase"));
    const selected = selectMirrorReconciliation({
      snapshot: {
        ...EMPTY_MIRROR_STATE,
        revision: 9,
        receipts: { [recent.key]: recent, [old.key]: old },
      },
      snapshotRevision: 9,
    });
    expect(selected?.operationId).toBe("op-sync");
    expect(selected?.expectedRevision).toBe(9);
  });
});
