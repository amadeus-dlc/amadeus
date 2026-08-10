import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  buildAttributionCorpus,
  decodeCandidateInventory,
  decodeEventSetEnvelope,
} from "../../packages/framework/core/tools/amadeus-stage-attribution-candidates.ts";
import {
  createAttributionWindow,
  createAttributionWindowId,
  createIntentIdentity,
  createSecondInterval,
  parseTargetStage,
  type AttributionResult,
  type AttributionWindow,
  type TargetStage,
} from "../../packages/framework/core/tools/amadeus-stage-attribution-domain.ts";
import type { AttributedRecord } from "../../packages/framework/core/tools/amadeus-stage-stats.ts";
import type { JournalEntry } from "../../packages/framework/core/tools/amadeus-journal.ts";

function row(
  event: string,
  timestamp: string,
  fields: Readonly<Record<string, string>> = {},
  overrides: Partial<JournalEntry> = {},
): AttributedRecord {
  return {
    intent: "intent-a",
    record: {
      schemaVersion: 1,
      seq: 1,
      cloneId: "clone-a",
      intentId: "intent-a",
      timestamp,
      heading: event,
      event,
      fields,
      ...overrides,
    },
  };
}

function unwrap<T, E>(result: AttributionResult<T, E>): T {
  if (!result.ok) throw new TypeError("expected fixture construction to succeed");
  return result.value;
}

const TARGET_STAGE = unwrap(parseTargetStage("code-generation"));

function window(intent = "intent-a", stage: TargetStage = TARGET_STAGE): AttributionWindow {
  return unwrap(createAttributionWindow({
    windowId: unwrap(createAttributionWindowId(`window-${intent}-${stage}`)),
    intent: unwrap(createIntentIdentity(intent)),
    stage,
    measuredInterval: unwrap(createSecondInterval(0, 2_000_000_000)),
    netSeconds: 1,
  }));
}

function executionSet(eventSetId: string, events: readonly unknown[]): Record<string, unknown> {
  const digest = createHash("sha256").update(JSON.stringify({ eventSetId, events })).digest("hex");
  return { eventSetId, rootOperationId: "root-a", idempotencyKey: eventSetId, payloadFingerprint: "fp", digest, events };
}

function eventSetRow(
  event: "EXECUTION_EVENT_SET_COMMITTED" | "UNIT_POOL_EVENT_SET_COMMITTED" | "LOOP_MONITOR_EVENT_SET_COMMITTED",
  timestamp: string,
  set: Readonly<Record<string, unknown>>,
  seq: number,
): AttributedRecord {
  const fields: Record<string, string> = {
    "Event Set": JSON.stringify(set),
    "Event Set Id": String(set.eventSetId),
    Stage: "code-generation",
  };
  if (event === "EXECUTION_EVENT_SET_COMMITTED") fields["Event Set Digest"] = String(set.digest);
  if (event === "LOOP_MONITOR_EVENT_SET_COMMITTED") fields["Partition Key"] = String(set.partitionKey);
  return row(event, timestamp, fields, { seq });
}

describe("buildAttributionCorpus", () => {
  test("deduplicates canonical wire rows without mutating input and is order invariant", () => {
    const first = row("SENSOR_FIRED", "2026-08-10T00:00:00Z", {
      "Fire id": "fire-a",
      "Stage slug": "code-generation",
    });
    const second = row("SENSOR_PASSED", "2026-08-10T00:00:01Z", {
      "Fire id": "fire-a",
      "Stage slug": "code-generation",
    }, { seq: 2 });
    const outside = row("STAGE_STARTED", "2026-08-10T00:00:02Z", { Stage: "code-generation" }, { seq: 3 });
    const input = [second, outside, first, structuredClone(first)] as const;
    const before = structuredClone(input);

    const forward = buildAttributionCorpus(input);
    const reverse = buildAttributionCorpus([...input].reverse());

    expect(forward.canonicalDuplicateCount).toBe(1);
    expect(forward.records).toHaveLength(2);
    expect(forward).toEqual(reverse);
    expect(input).toEqual(before);
  });
});

describe("decodeCandidateInventory", () => {
  test("classifies the closed nine-family census and evaluates the supported boundaries", () => {
    const executionStart = executionSet("execution-start", [{
      type: "operation-started",
      operation: { operationId: "operation-a", origin: { stage: "code-generation" } },
      start: { observedStart: { wall: "2026-08-10T00:00:12Z", monotonicMs: null } },
    }]);
    const executionTerminal = executionSet("execution-terminal", [{
      type: "operation-finished",
      finished: { operation: { operationId: "operation-a", origin: { stage: "code-generation" } } },
    }]);
    const unitStart = {
      eventSetId: "unit-start",
      batchId: "batch-a",
      idempotencyKey: "unit-start",
      payloadFingerprint: "fp",
      events: [{ type: "unit-acquired", queueEntryId: "q-a", attempt: { attemptId: "attempt-a" } }],
    };
    const unitTerminal = {
      eventSetId: "unit-terminal",
      batchId: "batch-a",
      idempotencyKey: "unit-terminal",
      payloadFingerprint: "fp",
      events: [{ type: "unit-settled", terminal: { attemptId: "attempt-a" } }],
    };
    const loopSet = {
      eventSetId: "loop-a",
      partition: { intentUuid: "intent-a", monitorId: "monitor-a", stageInstanceId: "u-a", graphRevision: "g-a" },
      partitionKey: "partition-a",
      idempotencyKey: "loop-a",
      payloadFingerprint: "fp",
      events: [],
    };
    const records = [
      row("SENSOR_FIRED", "2026-08-10T00:00:00Z", { "Fire id": "fire-a", "Stage slug": "code-generation" }, { seq: 1 }),
      row("SENSOR_PASSED", "2026-08-10T00:00:01Z", { "Fire id": "fire-a", "Stage slug": "code-generation" }, { seq: 2 }),
      row("SWARM_STARTED", "2026-08-10T00:00:02Z", { "Batch number": "1", Stage: "code-generation" }, { seq: 3 }),
      row("SWARM_UNIT_CONVERGED", "2026-08-10T00:00:03Z", { "Batch number": "1", Stage: "code-generation" }, { seq: 4 }),
      row("SWARM_COMPLETED", "2026-08-10T00:00:04Z", { "Batch number": "1", Stage: "code-generation" }, { seq: 5 }),
      row("BOLT_STARTED", "2026-08-10T00:00:05Z", { "Bolt slug": "bolt-a", Stage: "code-generation" }, { seq: 6 }),
      row("BOLT_COMPLETED", "2026-08-10T00:00:06Z", { "Bolt slug": "bolt-a", Stage: "code-generation" }, { seq: 7 }),
      row("SUBAGENT_STARTED", "2026-08-10T00:00:07Z", { "Agent ID": "agent-a", Stage: "code-generation" }, { seq: 8 }),
      row("SUBAGENT_COMPLETED", "2026-08-10T00:00:08Z", { "Agent ID": "agent-a", Stage: "code-generation" }, { seq: 9 }),
      row("LOOP_MONITOR_TRIGGERED", "2026-08-10T00:00:09Z", { "Partition Key": "partition-a", "Event Set Id": "loop-a", Stage: "code-generation" }, { seq: 10 }),
      row("MERGE_DISPATCH_INVOKED", "2026-08-10T00:00:10Z", { "Bolt slug": "bolt-a", Stage: "code-generation" }, { seq: 11 }),
      row("MERGE_DISPATCH_RETURNED", "2026-08-10T00:00:11Z", { "Bolt slug": "bolt-a", Stage: "code-generation" }, { seq: 12 }),
      eventSetRow("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:00:12Z", executionStart, 13),
      eventSetRow("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:00:13Z", executionTerminal, 14),
      eventSetRow("UNIT_POOL_EVENT_SET_COMMITTED", "2026-08-10T00:00:14Z", unitStart, 15),
      eventSetRow("UNIT_POOL_EVENT_SET_COMMITTED", "2026-08-10T00:00:15Z", unitTerminal, 16),
      eventSetRow("LOOP_MONITOR_EVENT_SET_COMMITTED", "2026-08-10T00:00:16Z", loopSet, 17),
      row("QUALITY_REPAIR_TRANSACTION_COMMITTED", "2026-08-10T00:00:17Z", { "Transaction Id": "tx-a", Stage: "code-generation" }, { seq: 18 }),
      row("STAGE_STARTED", "2026-08-10T00:00:18Z", { Stage: "code-generation" }, { seq: 19 }),
    ];

    const inventory = decodeCandidateInventory({
      corpus: buildAttributionCorpus(records),
      targetStage: TARGET_STAGE,
      eligibleWindows: [window()],
    });

    expect(inventory.familyCounts.map(({ family, observed, accepted, rejected }) => ({ family, observed, accepted, rejected }))).toEqual([
      { family: "sensor", observed: 1, accepted: 1, rejected: 0 },
      { family: "swarm", observed: 1, accepted: 1, rejected: 0 },
      { family: "bolt", observed: 1, accepted: 1, rejected: 0 },
      { family: "subagent", observed: 1, accepted: 1, rejected: 0 },
      { family: "loop-monitor", observed: 1, accepted: 0, rejected: 1 },
      { family: "merge-dispatch", observed: 1, accepted: 1, rejected: 0 },
      { family: "execution-event-set", observed: 1, accepted: 1, rejected: 0 },
      { family: "unit-pool-event-set", observed: 1, accepted: 1, rejected: 0 },
      { family: "transaction-envelope", observed: 1, accepted: 0, rejected: 1 },
    ]);
    expect(inventory.accepted).toHaveLength(7);
    expect(inventory.rejected).toHaveLength(2);
    expect(inventory.familyCounts.every((count) => count.observed === count.accepted + count.rejected)).toBe(true);
  });

  test("retains compound event-set findings and applies fixed primary precedence", () => {
    const unsupported = {
      eventSetId: "unsupported-a",
      idempotencyKey: "unsupported-a",
      payloadFingerprint: "fp",
      digest: "wrong-embedded-digest",
      events: [{ type: "operation-started", operation: { operationId: "operation-a" } }],
    };
    const record = eventSetRow("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:01:00Z", unsupported, 30);
    const permuted = {
      events: unsupported.events,
      digest: unsupported.digest,
      payloadFingerprint: unsupported.payloadFingerprint,
      idempotencyKey: unsupported.idempotencyKey,
      eventSetId: "unsupported-b",
    };
    const decode = (candidate: AttributedRecord) => decodeCandidateInventory({
      corpus: buildAttributionCorpus([candidate]), targetStage: TARGET_STAGE, eligibleWindows: [window()],
    });
    const inventory = decode(record);
    const permutedInventory = decode(eventSetRow(
      "EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:01:01Z", permuted, 31,
    ));

    expect(inventory.rejected).toHaveLength(1);
    expect(inventory.rejected[0]?.primaryReason).toBe("digest-mismatch");
    expect(inventory.rejected[0]?.secondaryReasons).toContain("unsupported-event-set-schema");
    expect(inventory.secondaryDiagnostics[0]?.reasons).toEqual(inventory.rejected[0]?.secondaryReasons);
    expect(inventory.secondaryDiagnostics[0]?.reasons).not.toContain("digest-mismatch");
    expect(permutedInventory.rejected[0]?.primaryReason).toBe(inventory.rejected[0]?.primaryReason);
    expect(permutedInventory.rejected[0]?.secondaryReasons).toEqual(inventory.rejected[0]?.secondaryReasons);
  });

  test("rejects every outer occurrence of a colliding event-set id without adopting inner lifecycle", () => {
    const start = executionSet("collision-a", [{
      type: "operation-started",
      operation: { operationId: "operation-a", origin: { stage: "code-generation" } },
    }]);
    const terminal = executionSet("collision-a", [{
      type: "operation-finished",
      finished: { operation: { operationId: "operation-a", origin: { stage: "code-generation" } } },
    }]);
    const inventory = decodeCandidateInventory({
      corpus: buildAttributionCorpus([
        eventSetRow("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:02:00Z", start, 40),
        eventSetRow("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:02:01Z", terminal, 41),
      ]),
      targetStage: TARGET_STAGE,
      eligibleWindows: [window()],
    });

    expect(inventory.accepted).toHaveLength(0);
    expect(inventory.rejected).toHaveLength(2);
    expect(inventory.rejected.map(({ primaryReason }) => primaryReason)).toEqual([
      "duplicate-event-set-id",
      "duplicate-event-set-id",
    ]);
    expect(inventory.rejected.every(({ sourceIds }) => sourceIds.length === 1)).toBe(true);
  });

  test("keeps reused lifecycle identities separate across explicit intents and stages", () => {
    const otherStage = unwrap(parseTargetStage("application-design"));
    const forIntent = (intent: string, event: string, timestamp: string, stage: string, seq: number): AttributedRecord => {
      const base = row(event, timestamp, { "Fire id": "reused-fire", "Stage slug": stage }, { seq, intentId: intent });
      return { intent, record: base.record };
    };
    const records = [
      forIntent("intent-a", "SENSOR_FIRED", "2026-08-10T00:03:00Z", "code-generation", 50),
      forIntent("intent-a", "SENSOR_PASSED", "2026-08-10T00:03:01Z", "code-generation", 51),
      forIntent("intent-b", "SENSOR_FIRED", "2026-08-10T00:03:02Z", "code-generation", 52),
      forIntent("intent-b", "SENSOR_PASSED", "2026-08-10T00:03:03Z", "code-generation", 53),
      forIntent("intent-a", "SENSOR_FIRED", "2026-08-10T00:03:04Z", "application-design", 54),
      forIntent("intent-a", "SENSOR_PASSED", "2026-08-10T00:03:05Z", "application-design", 55),
    ];
    const before = structuredClone(records);
    const input = {
      targetStage: TARGET_STAGE,
      eligibleWindows: [window("intent-a"), window("intent-b"), window("intent-a", otherStage)],
    } as const;

    const forward = decodeCandidateInventory({ ...input, corpus: buildAttributionCorpus(records) });
    const reverse = decodeCandidateInventory({ ...input, corpus: buildAttributionCorpus([...records].reverse()) });

    expect(forward).toEqual(reverse);
    expect(records).toEqual(before);
    expect(forward.accepted).toHaveLength(2);
    expect(forward.rejected).toHaveLength(1);
    expect(forward.rejected[0]?.primaryReason).toBe("stage-mismatch");
  });

  test("keeps an undecodable event-set outer as exactly one rejected candidate", () => {
    const malformed = row("EXECUTION_EVENT_SET_COMMITTED", "2026-08-10T00:04:00Z", {
      "Event Set": "not-json",
      "Event Set Digest": "not-a-digest",
      Stage: "code-generation",
    }, { seq: 60 });
    const inventory = decodeCandidateInventory({
      corpus: buildAttributionCorpus([malformed]),
      targetStage: TARGET_STAGE,
      eligibleWindows: [window()],
    });

    expect(inventory.accepted).toHaveLength(0);
    expect(inventory.rejected).toHaveLength(1);
    expect(inventory.rejected[0]?.primaryReason).toBe("malformed-event-set");
    expect(inventory.rejected[0]?.sourceIds).toHaveLength(1);
    expect(decodeEventSetEnvelope(malformed).ok).toBe(false);
  });

  test("rejects ambiguous cardinality and non-UTC integer-second boundaries", () => {
    const records = [
      row("SENSOR_FIRED", "2026-08-10T00:05:00Z", { "Fire id": "duplicate-a", "Stage slug": "code-generation" }, { seq: 70 }),
      row("SENSOR_FIRED", "2026-08-10T00:05:01Z", { "Fire id": "duplicate-a", "Stage slug": "code-generation" }, { seq: 71 }),
      row("SENSOR_PASSED", "2026-08-10T00:05:02Z", { "Fire id": "duplicate-a", "Stage slug": "code-generation" }, { seq: 72 }),
      row("SENSOR_FIRED", "2026-08-10T00:05:03.500Z", { "Fire id": "fractional-a", "Stage slug": "code-generation" }, { seq: 73 }),
      row("SENSOR_PASSED", "2026-08-10T00:05:04Z", { "Fire id": "fractional-a", "Stage slug": "code-generation" }, { seq: 74 }),
    ];
    const inventory = decodeCandidateInventory({
      corpus: buildAttributionCorpus(records), targetStage: TARGET_STAGE, eligibleWindows: [window()],
    });

    expect(inventory.accepted).toHaveLength(0);
    expect(inventory.rejected.map(({ primaryReason }) => primaryReason).sort()).toEqual([
      "duplicate-start",
      "invalid-timestamp",
    ]);
    expect(inventory.rejected.flatMap(({ secondaryReasons }) => secondaryReasons)).not.toContain("outside-window");
    expect(inventory.rejected.flatMap(({ secondaryReasons }) => secondaryReasons)).not.toContain("empty-after-idle");
  });
});
