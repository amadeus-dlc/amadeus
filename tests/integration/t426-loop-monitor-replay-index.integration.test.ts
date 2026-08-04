// covers: file:packages/framework/core/tools/amadeus-loop-monitor-replay.ts audit:LOOP_MONITOR_EVENT_SET_COMMITTED
// size: medium

import { afterEach, describe, expect, spyOn, test } from "bun:test";
import * as nodeFs from "node:fs";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  compileLoopMonitorManifest,
  createLoopDelivery,
  type CompiledLoopMonitorGraph,
  type LoopMonitorPartition,
} from "../../packages/framework/core/tools/amadeus-loop-monitor.ts";
import {
  createLoopMonitorCoordinator,
  type LoopMonitorEventSet,
} from "../../packages/framework/core/tools/amadeus-loop-monitor-runtime.ts";
import {
  createAuditLoopMonitorRepository,
  createDurableLoopMonitorRepository,
  decodeLoopMonitorEventSet,
  initializeLoopMonitorReplayIndex,
  LOOP_MONITOR_REPLAY_INDEX_FILE,
  LOOP_MONITOR_REPLAY_WAL_FILE,
  LoopMonitorReplayIncompleteError,
  mergeLoopMonitorEventSets,
  repairLoopMonitorReplayIndex,
  readLoopMonitorEventSetsFromAudit,
} from "../../packages/framework/core/tools/amadeus-loop-monitor-replay.ts";
import { setupIntegrationProject } from "../harness/fixtures.ts";

function graph(): CompiledLoopMonitorGraph {
  const result = compileLoopMonitorManifest({
    loopMonitors: [{
      id: "monitor",
      cycle: ["a", "b"],
      ignoreEvents: [],
      threshold: 2,
      evidenceProviderId: "provider",
      judgeInstructionId: "instruction",
      routes: ["continue"],
      transitionTable: { a: ["b"], b: ["a"] },
    }],
    runtimeLimits: { maxPendingDeliveries: 2 },
  }, {
    evidenceProviders: [{ id: "provider" }],
    judgeInstructions: [{ id: "instruction" }],
    routes: [{ id: "continue", kind: "transition", targetEvent: "a" }],
  });
  if (!result.ok) throw new Error(result.errors.map((item) => item.message).join("\n"));
  return result.graph;
}

const compiled = graph();
const partition: LoopMonitorPartition = {
  intentUuid: "intent",
  monitorId: "monitor",
  stageInstanceId: "stage",
  graphRevision: compiled.graphRevision,
};

function delivery(eventId: string, predecessorDeliveryId: string | null, upstream: string) {
  return createLoopDelivery({
    partition,
    eventId,
    predecessorDeliveryId,
    upstreamEventIdentity: upstream,
    payloadFingerprint: `sha256:${"a".repeat(64)}`,
    payload: { stageId: "stage", references: [] },
    evidence: { fingerprint: `sha256:${"b".repeat(64)}`, obligationIds: [] },
    routeConstraint: compiled.loopMonitors[0]!.routeConstraint,
    trace: { traceId: "0123456789abcdef0123456789abcdef", spanId: "0123456789abcdef" },
  });
}

const roots: string[] = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function tempRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "amadeus-loop-replay-"));
  roots.push(root);
  return root;
}

function incompleteCode(action: () => unknown): LoopMonitorReplayIncompleteError["code"] {
  try {
    action();
  } catch (cause) {
    expect(cause).toBeInstanceOf(LoopMonitorReplayIncompleteError);
    if (cause instanceof LoopMonitorReplayIncompleteError) return cause.code;
    throw cause;
  }
  throw new Error("expected-loop-monitor-replay-incomplete");
}

describe("durable Loop Monitor Replay Index", () => {
  test("atomic index writes clean up temporary files without masking the write failure", () => {
    const root = tempRoot();
    const index = join(root, LOOP_MONITOR_REPLAY_INDEX_FILE);
    mkdirSync(index);
    const remove = nodeFs.rmSync;
    let temporaryCleanupAttempts = 0;
    const removeSpy = spyOn(nodeFs, "rmSync").mockImplementation((path, options) => {
      if (String(path).startsWith(`${index}.tmp-`)) {
        temporaryCleanupAttempts += 1;
        if (temporaryCleanupAttempts === 2) throw new Error("cleanup-failed");
      }
      return remove(path, options);
    });
    try {
      expect(() => repairLoopMonitorReplayIndex(root, [])).toThrow();
      expect(() => repairLoopMonitorReplayIndex(root, [])).toThrow();
      expect(temporaryCleanupAttempts).toBe(2);
    } finally {
      removeSpy.mockRestore();
    }
  });

  test("atomic index writes sync the temporary file before rename and the directory after rename", () => {
    const root = tempRoot();
    const operations: string[] = [];
    const sync = nodeFs.fsyncSync;
    const rename = nodeFs.renameSync;
    const syncSpy = spyOn(nodeFs, "fsyncSync").mockImplementation((fileDescriptor) => {
      operations.push("fsync");
      sync(fileDescriptor);
    });
    const renameSpy = spyOn(nodeFs, "renameSync").mockImplementation((oldPath, newPath) => {
      operations.push("rename");
      rename(oldPath, newPath);
    });
    try {
      repairLoopMonitorReplayIndex(root, []);
    } finally {
      renameSpy.mockRestore();
      syncSpy.mockRestore();
    }
    expect(operations).toEqual(["fsync", "rename", "fsync"]);
  });

  test("event-set decoding validates latch fields and delivery references", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    initializeLoopMonitorReplayIndex(root);
    const repository = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => canonical.push(set),
      readCanonicalForRepair: () => canonical,
    });
    createLoopMonitorCoordinator({ graph: compiled, repository }).observeDelivery(delivery("a", null, "decode-a"));
    const baseSet = canonical[0]!;
    const observed = baseSet.events[0]!;
    if (observed.type !== "LOOP_DELIVERY_OBSERVED") throw new Error("expected-observed-delivery");
    const deliverySet: LoopMonitorEventSet = {
      ...baseSet,
      events: [{
        ...observed,
        delivery: {
          ...observed.delivery,
          payload: {
            ...observed.delivery.payload,
            references: [{ kind: "artifact", id: "result", digest: `sha256:${"c".repeat(64)}` }],
          },
        },
      }],
    };
    expect(decodeLoopMonitorEventSet(JSON.stringify(deliverySet))).toEqual(deliverySet);

    const latchSet: LoopMonitorEventSet = {
      ...baseSet,
      events: [{
        type: "LOOP_LATCH_SET",
        latch: {
          monitorId: "monitor",
          epoch: 1,
          evidenceFingerprint: `sha256:${"d".repeat(64)}`,
          invocationId: "invocation",
          routeId: "continue",
          reasonCode: "human-review-required",
          resumeCondition: "human-retry",
        },
      }],
    };
    expect(decodeLoopMonitorEventSet(JSON.stringify(latchSet))).toEqual(latchSet);
  });

  test("audit adapter persists canonical event sets and rebuilds its replay index", () => {
    const projectDir = setupIntegrationProject({ noAidlcDocs: true, stripEnvScope: true });
    roots.push(projectDir);
    const record = "loop-audit-00000000";
    const intentsRoot = join(projectDir, "amadeus", "spaces", "default", "intents");
    mkdirSync(join(intentsRoot, record, "audit"), { recursive: true });
    writeFileSync(join(projectDir, "amadeus", "active-space"), "default\n", "utf-8");
    writeFileSync(join(intentsRoot, "active-intent"), `${record}\n`, "utf-8");
    const root = tempRoot();
    initializeLoopMonitorReplayIndex(root);
    const repository = createAuditLoopMonitorRepository({
      projectDir,
      intent: record,
      space: "default",
      indexDir: root,
    });
    const coordinator = createLoopMonitorCoordinator({ graph: compiled, repository });
    const first = delivery("a", null, "audit-a");
    const observed = coordinator.observeDelivery(first);
    if (observed.kind !== "observed") throw new Error(JSON.stringify(observed));
    expect(observed.kind).toBe("observed");
    const canonical = readLoopMonitorEventSetsFromAudit(projectDir, record, "default");
    expect(canonical).toHaveLength(1);
    expect(decodeLoopMonitorEventSet(JSON.stringify(canonical[0]))).toEqual(canonical[0]);
    expect(() => decodeLoopMonitorEventSet("{}"))
      .toThrow("invalid-loop-monitor-event-set");
    const malformed = JSON.parse(JSON.stringify(canonical[0])) as Record<string, unknown>;
    malformed.events = [{ type: "LOOP_DELIVERY_OBSERVED" }];
    expect(() => decodeLoopMonitorEventSet(JSON.stringify(malformed)))
      .toThrow("invalid-loop-monitor-event-set");

    rmSync(join(root, LOOP_MONITOR_REPLAY_INDEX_FILE), { force: true });
    expect(() => repository.readEventSets(partition)).toThrow(LoopMonitorReplayIncompleteError);
    repairLoopMonitorReplayIndex(root, repository.readCanonicalForRepair());
    expect(repository.readEventSets(partition)).toHaveLength(1);
    expect(repository.isCommitted({
      receiptId: "loop-receipt-missing",
      partitionKey: canonical[0]!.partitionKey,
      eventSetId: "missing-event-set",
      eventSetDigest: `sha256:${"0".repeat(64)}`,
    })).toBe(false);

    let predecessor = first.deliveryId;
    let reservation: ReturnType<typeof coordinator.observeDelivery> | null = null;
    for (const [index, eventId] of ["b", "a", "b", "a"].entries()) {
      const current = delivery(eventId, predecessor, `reservation-${index}`);
      reservation = coordinator.observeDelivery(current);
      predecessor = current.deliveryId;
    }
    expect(reservation).toMatchObject({ kind: "judge-reserved" });
    expect(readLoopMonitorEventSetsFromAudit(projectDir, record, "default").at(-1)?.events.map((event) => event.type))
      .toEqual(["LOOP_DELIVERY_OBSERVED", "LOOP_MONITOR_TRIGGERED", "LOOP_JUDGE_STARTED"]);
  });

  test("normal cold resume reads only the requested index partition", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    let canonicalReads = 0;
    initializeLoopMonitorReplayIndex(root);
    const repository = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => canonical.push(set),
      readCanonicalForRepair: () => {
        canonicalReads += 1;
        return canonical;
      },
    });
    const coordinator = createLoopMonitorCoordinator({ graph: compiled, repository });
    const a = delivery("a", null, "a-1");
    expect(coordinator.observeDelivery(a).kind).toBe("observed");

    const resumed = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => canonical.push(set),
      readCanonicalForRepair: () => {
        canonicalReads += 1;
        return canonical;
      },
    });
    expect(createLoopMonitorCoordinator({ graph: compiled, repository: resumed }).readProjection(partition).chainHead)
      .toBe(a.deliveryId);
    expect(canonicalReads).toBe(0);
    expect(existsSync(join(root, LOOP_MONITOR_REPLAY_INDEX_FILE))).toBe(true);
  });

  test("missing, corrupt, or in-flight index state is INCOMPLETE until explicit repair", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    const missing = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => canonical.push(set),
      readCanonicalForRepair: () => canonical,
    });
    expect(incompleteCode(() => missing.readEventSets(partition))).toBe("INDEX_MISSING");

    initializeLoopMonitorReplayIndex(root);
    writeFileSync(join(root, LOOP_MONITOR_REPLAY_INDEX_FILE), "{broken\n");
    expect(incompleteCode(() => missing.readEventSets(partition))).toBe("INDEX_CORRUPT");
    repairLoopMonitorReplayIndex(root, canonical);
    expect(missing.readEventSets(partition)).toEqual([]);

    writeFileSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE), "{}\n");
    expect(incompleteCode(() => missing.readEventSets(partition))).toBe("WAL_PENDING");
    repairLoopMonitorReplayIndex(root, canonical);
    expect(existsSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE))).toBe(false);
  });

  test("duplicate digest conflicts fail before WAL or canonical side effects", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    let canonicalAppends = 0;
    initializeLoopMonitorReplayIndex(root);
    const repository = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => {
        canonicalAppends += 1;
        canonical.push(set);
      },
      readCanonicalForRepair: () => canonical,
    });
    createLoopMonitorCoordinator({ graph: compiled, repository }).observeDelivery(delivery("a", null, "duplicate-a"));
    const committed = canonical[0]!;
    const conflicting: LoopMonitorEventSet = {
      ...committed,
      payloadFingerprint: `sha256:${"f".repeat(64)}`,
    };

    expect(() => repository.transaction(partition, (_sets, append) => append(conflicting)))
      .toThrow("loop-monitor-replay-event-set-conflict");
    expect(canonicalAppends).toBe(1);
    expect(canonical).toEqual([committed]);
    expect(existsSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE))).toBe(false);
    expect(repository.readEventSets(partition)).toEqual([committed]);
  });

  test("a crash after canonical append leaves a loud WAL and repair reconstructs the partition", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    initializeLoopMonitorReplayIndex(root);
    let crashOnce = true;
    const repository = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical(set) {
        canonical.push(set);
        if (crashOnce) {
          crashOnce = false;
          throw new Error("crash-after-canonical");
        }
      },
      readCanonicalForRepair: () => canonical,
    });
    const a = delivery("a", null, "a-crash");
    expect(createLoopMonitorCoordinator({ graph: compiled, repository }).observeDelivery(a)).toMatchObject({
      kind: "INCOMPLETE",
    });
    expect(existsSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE))).toBe(true);
    expect(() => repository.readEventSets(partition)).toThrow(LoopMonitorReplayIncompleteError);

    repairLoopMonitorReplayIndex(root, repository.readCanonicalForRepair());
    expect(createLoopMonitorCoordinator({ graph: compiled, repository }).readProjection(partition).chainHead)
      .toBe(a.deliveryId);
  });

  test("merge orders by content identity and causal predecessor, never input or wall-clock order", () => {
    const root = tempRoot();
    const canonical: LoopMonitorEventSet[] = [];
    initializeLoopMonitorReplayIndex(root);
    const repository = createDurableLoopMonitorRepository({
      indexDir: root,
      appendCanonical: (set) => canonical.push(set),
      readCanonicalForRepair: () => canonical,
    });
    const coordinator = createLoopMonitorCoordinator({ graph: compiled, repository });
    const a = delivery("a", null, "merge-a");
    coordinator.observeDelivery(a);
    const b = delivery("b", a.deliveryId, "merge-b");
    coordinator.observeDelivery(b);

    const merged = mergeLoopMonitorEventSets([...canonical].reverse().concat(canonical[0]!));
    expect(merged.ok).toBe(true);
    if (!merged.ok) return;
    expect(merged.eventSets).toHaveLength(2);
    expect(merged.eventSets[0]?.events[0]).toMatchObject({
      type: "LOOP_DELIVERY_OBSERVED",
      delivery: { deliveryId: a.deliveryId },
    });
    expect(merged.eventSets[1]?.events[0]).toMatchObject({
      type: "LOOP_DELIVERY_OBSERVED",
      delivery: { deliveryId: b.deliveryId },
    });
  });

  test("merge rejects two content-distinct successors of one predecessor", () => {
    const rootA = tempRoot();
    const rootB = tempRoot();
    const canonicalA: LoopMonitorEventSet[] = [];
    const canonicalB: LoopMonitorEventSet[] = [];
    for (const root of [rootA, rootB]) initializeLoopMonitorReplayIndex(root);
    const repoA = createDurableLoopMonitorRepository({
      indexDir: rootA,
      appendCanonical: (set) => canonicalA.push(set),
      readCanonicalForRepair: () => canonicalA,
    });
    const repoB = createDurableLoopMonitorRepository({
      indexDir: rootB,
      appendCanonical: (set) => canonicalB.push(set),
      readCanonicalForRepair: () => canonicalB,
    });
    const parent = delivery("a", null, "fork-parent");
    createLoopMonitorCoordinator({ graph: compiled, repository: repoA }).observeDelivery(parent);
    createLoopMonitorCoordinator({ graph: compiled, repository: repoB }).observeDelivery(parent);
    createLoopMonitorCoordinator({ graph: compiled, repository: repoA }).observeDelivery(
      delivery("b", parent.deliveryId, "fork-left"),
    );
    createLoopMonitorCoordinator({ graph: compiled, repository: repoB }).observeDelivery(
      delivery("b", parent.deliveryId, "fork-right"),
    );
    expect(mergeLoopMonitorEventSets([...canonicalA, ...canonicalB])).toMatchObject({
      ok: false,
      status: "CONFLICT",
      reason: "causal-fork",
    });
  });
});
