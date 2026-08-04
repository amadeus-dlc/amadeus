// covers: file:packages/framework/core/tools/amadeus-quality-repair-replay.ts
// size: small

import { describe, expect, test } from "bun:test";

import { loopMonitorPartitionKey } from "../../packages/framework/core/tools/amadeus-loop-monitor-runtime.ts";
import { decodeQualityRepairTransaction } from "../../packages/framework/core/tools/amadeus-quality-repair-replay.ts";

const partition = {
  intentUuid: "intent-1",
  monitorId: "quality-repair",
  stageInstanceId: "stage-1",
  graphRevision: `sha256:${"1".repeat(64)}`,
};

function projection() {
  return {
    qualityScopeId: "quality-scope-1",
    partition,
    epoch: {
      qualityScopeId: "quality-scope-1",
      qualityEpochId: "quality-epoch-1",
      epochStartEventIdentity: "quality-epoch-start-1",
      threshold: 2,
      window: [],
      consecutiveNonProgress: 0,
      replanSinceLastProgress: false,
    },
    latestSnapshot: null,
    lastProgress: null,
    observationSequence: 1,
    stalledLatch: null,
    workflowExecutionState: "running",
    lastReplanReceipt: null,
    pendingReplan: null,
  };
}

function transaction(input: { readonly projection?: unknown; readonly loopEventSets?: readonly unknown[] } = {}) {
  return {
    schemaVersion: 1,
    transactionId: "quality-transaction-1",
    qualityScopeId: "quality-scope-1",
    qualityEvents: [{
      type: "QUALITY_SNAPSHOT_OBSERVED",
      snapshotFingerprint: `sha256:${"2".repeat(64)}`,
      progress: {},
      projection: input.projection ?? projection(),
    }],
    loopEventSets: input.loopEventSets ?? [],
  };
}

function loopEventSet() {
  return {
    eventSetId: "loop-event-set-1",
    partition,
    partitionKey: loopMonitorPartitionKey(partition),
    idempotencyKey: "quality-loop-1",
    payloadFingerprint: `sha256:${"3".repeat(64)}`,
    events: [],
  };
}

describe("Quality Repair audit replay validation", () => {
  test("rejects malformed nested projection collections and pending attempts", () => {
    const valid = projection();
    expect(() => decodeQualityRepairTransaction(JSON.stringify(transaction()))).not.toThrow();

    const malformed = [
      { ...valid, latestSnapshot: {} },
      { ...valid, latestSnapshot: { unresolved: [], verifierSuccessReceipts: "not-an-array" } },
      { ...valid, stalledLatch: {} },
      { ...valid, pendingReplan: {} },
      { ...valid, pendingReplan: { attemptIdentity: 1 } },
    ];
    for (const candidate of malformed) {
      expect(() => decodeQualityRepairTransaction(JSON.stringify(transaction({ projection: candidate })))).toThrow(
        "invalid-quality-repair-transaction",
      );
    }
  });

  test("rejects Loop event sets without a canonical partition key", () => {
    const valid = loopEventSet();
    expect(() => decodeQualityRepairTransaction(JSON.stringify(transaction({ loopEventSets: [valid] })))).not.toThrow();

    for (const candidate of [
      { ...valid, partitionKey: undefined },
      { ...valid, partitionKey: 1 },
      { ...valid, partitionKey: "wrong-partition" },
    ]) {
      expect(() => decodeQualityRepairTransaction(JSON.stringify(transaction({ loopEventSets: [candidate] })))).toThrow(
        "invalid-quality-repair-transaction",
      );
    }
  });
});
