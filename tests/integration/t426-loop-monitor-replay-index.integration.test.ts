// covers: file:packages/framework/core/tools/amadeus-loop-monitor-replay.ts
// size: medium

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
  createDurableLoopMonitorRepository,
  initializeLoopMonitorReplayIndex,
  LOOP_MONITOR_REPLAY_INDEX_FILE,
  LOOP_MONITOR_REPLAY_WAL_FILE,
  LoopMonitorReplayIncompleteError,
  mergeLoopMonitorEventSets,
  repairLoopMonitorReplayIndex,
} from "../../packages/framework/core/tools/amadeus-loop-monitor-replay.ts";

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

describe("durable Loop Monitor Replay Index", () => {
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
    expect(() => missing.readEventSets(partition)).toThrow(LoopMonitorReplayIncompleteError);

    initializeLoopMonitorReplayIndex(root);
    writeFileSync(join(root, LOOP_MONITOR_REPLAY_INDEX_FILE), "{broken\n");
    expect(() => missing.readEventSets(partition)).toThrow(LoopMonitorReplayIncompleteError);
    repairLoopMonitorReplayIndex(root, canonical);
    expect(missing.readEventSets(partition)).toEqual([]);

    writeFileSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE), "{}\n");
    expect(() => missing.readEventSets(partition)).toThrow(LoopMonitorReplayIncompleteError);
    repairLoopMonitorReplayIndex(root, canonical);
    expect(existsSync(join(root, LOOP_MONITOR_REPLAY_WAL_FILE))).toBe(false);
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
