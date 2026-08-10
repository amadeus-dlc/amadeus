// covers: file:packages/framework/core/tools/amadeus-construction-outcome-projection.ts

import { describe, expect, test } from "bun:test";
import {
  constructionFailureTransition,
  normalizeConstructionOutcomeAudit,
  projectConstructionOutcomes,
  type ConstructionOutcomeRecord,
} from "../../packages/framework/core/tools/amadeus-construction-outcome-projection.ts";

const auditRow = (
  eventId: string,
  sequence: number,
  event: string,
  attributes: Record<string, unknown>,
) => JSON.stringify({
  schemaVersion: 2,
  eventId,
  seq: sequence,
  timestamp: `2026-08-10T00:00:${String(sequence).padStart(2, "0")}Z`,
  eventName: `amadeus.${event.toLowerCase()}`,
  attributes: { Event: event, ...attributes },
  intentId: "intent-a",
  space: "default",
  cloneId: "clone-a",
  traceId: null,
  spanId: null,
  traceFlags: 0,
  idempotencyKey: `intent-a:clone-a:${sequence}`,
  canonical: true,
});

const key = (unit: string, attempt: string) => ({
  intent: "intent-a",
  stage: "code-generation",
  unit,
  attempt,
  batch: "1",
});

describe("projectConstructionOutcomes", () => {
  test("orders unresolved failed Units by original batch and then slug", () => {
    const records: ConstructionOutcomeRecord[] = [
      {
        event: "UNIT_POOL_EVENT_SET_COMMITTED",
        eventId: "pool-terminal",
        sequence: 10,
        terminals: [
          { ...key("zulu", "attempt-z"), outcome: "failed", sequence: 10 },
          { ...key("alpha", "attempt-a"), outcome: "failed", sequence: 10 },
        ],
      },
      { event: "BOLT_FAILED", eventId: "bolt-zulu", sequence: 11, target: key("zulu", "attempt-z"), reason: "red" },
      { event: "BOLT_FAILED", eventId: "bolt-alpha", sequence: 12, target: key("alpha", "attempt-a"), reason: "red" },
      { event: "SWARM_BATON_RETURNED", eventId: "baton-zulu", sequence: 13, target: key("zulu", "attempt-z") },
      { event: "SWARM_BATON_RETURNED", eventId: "baton-alpha", sequence: 14, target: key("alpha", "attempt-a") },
    ];

    expect(projectConstructionOutcomes(records, {
      intent: "intent-a",
      stage: "code-generation",
      batches: [["zulu", "alpha"]],
    })).toEqual({
      ok: true,
      projection: {
        units: [
          { ...key("alpha", "attempt-a"), outcome: "failed", sequence: 10 },
          { ...key("zulu", "attempt-z"), outcome: "failed", sequence: 10 },
        ],
        unresolvedFailures: [
          { ...key("alpha", "attempt-a"), outcome: "failed", reason: "red", sequence: 10 },
          { ...key("zulu", "attempt-z"), outcome: "failed", reason: "red", sequence: 10 },
        ],
        constructionSuspended: false,
      },
    });
  });

  test("fails closed when a terminal is missing an immutable join key", () => {
    const records: ConstructionOutcomeRecord[] = [{
      event: "UNIT_POOL_EVENT_SET_COMMITTED",
      eventId: "pool-terminal",
      sequence: 20,
      terminals: [{
        intent: "intent-a",
        stage: "code-generation",
        unit: "alpha",
        outcome: "failed",
        sequence: 20,
      }],
    }];

    expect(projectConstructionOutcomes(records, {
      intent: "intent-a",
      stage: "code-generation",
    })).toEqual({
      ok: false,
      diagnostics: [{
        eventId: "pool-terminal",
        sequence: 20,
        code: "missing-join-key",
        missing: ["attempt", "batch"],
      }],
    });
  });

  test("fails closed on contradictory terminal outcomes at the same canonical sequence", () => {
    const records: ConstructionOutcomeRecord[] = [{
      event: "UNIT_POOL_EVENT_SET_COMMITTED",
      eventId: "pool-contradiction",
      sequence: 30,
      terminals: [
        { ...key("alpha", "attempt-a"), outcome: "failed", sequence: 30 },
        { ...key("alpha", "attempt-a"), outcome: "succeeded", sequence: 30 },
      ],
    }];

    expect(projectConstructionOutcomes(records, {
      intent: "intent-a",
      stage: "code-generation",
    })).toEqual({
      ok: false,
      diagnostics: [{
        eventId: "pool-contradiction",
        sequence: 30,
        code: "contradictory-terminal",
        missing: [],
      }],
    });
  });

  test("fails closed when one attempt identity maps to multiple Unit keys", () => {
    const records: ConstructionOutcomeRecord[] = [{
      event: "UNIT_POOL_EVENT_SET_COMMITTED",
      eventId: "pool-ambiguous",
      sequence: 40,
      terminals: [
        { ...key("alpha", "attempt-shared"), outcome: "failed", sequence: 40 },
        { ...key("beta", "attempt-shared"), outcome: "failed", sequence: 40 },
      ],
    }];

    expect(projectConstructionOutcomes(records, {
      intent: "intent-a",
      stage: "code-generation",
    })).toEqual({
      ok: false,
      diagnostics: [{
        eventId: "pool-ambiguous",
        sequence: 40,
        code: "ambiguous-attempt",
        missing: [],
      }],
    });
  });

  test("awaits a ruling for exactly one failed Unit and preserves sibling outcomes", () => {
    const alpha = { ...key("alpha", "attempt-a"), outcome: "failed" as const, reason: "red", sequence: 10 };
    const beta = { ...key("beta", "attempt-b"), outcome: "succeeded" as const, sequence: 9 };

    expect(constructionFailureTransition({
      units: [alpha, beta],
      unresolvedFailures: [alpha],
      constructionSuspended: false,
    })).toEqual({
      kind: "await-unit-ruling",
      target: key("alpha", "attempt-a"),
      siblings: [beta],
    });
  });

  test("Retry makes only a fresh attempt of the failed Unit eligible", () => {
    const alpha = { ...key("alpha", "attempt-a"), outcome: "failed" as const, sequence: 10 };
    expect(constructionFailureTransition({
      units: [alpha],
      unresolvedFailures: [alpha],
      constructionSuspended: false,
    }, { kind: "retry", attempt: "attempt-a2" })).toEqual({
      kind: "retry-unit",
      target: key("alpha", "attempt-a2"),
    });
  });

  test("Skip cancels the current attempt without changing siblings", () => {
    const alpha = { ...key("alpha", "attempt-a"), outcome: "failed" as const, sequence: 10 };
    expect(constructionFailureTransition({
      units: [alpha],
      unresolvedFailures: [alpha],
      constructionSuspended: false,
    }, { kind: "skip", reason: "human-skipped" })).toEqual({
      kind: "skip-unit",
      target: key("alpha", "attempt-a"),
      outcome: "cancelled",
      reason: "human-skipped",
    });
  });

  test("Abort parks Construction and preserves every Unit outcome", () => {
    const alpha = { ...key("alpha", "attempt-a"), outcome: "failed" as const, sequence: 10 };
    const beta = { ...key("beta", "attempt-b"), outcome: "succeeded" as const, sequence: 9 };
    expect(constructionFailureTransition({
      units: [alpha, beta],
      unresolvedFailures: [alpha],
      constructionSuspended: false,
    }, { kind: "abort", reason: "aborted" })).toEqual({
      kind: "parked",
      trigger: key("alpha", "attempt-a"),
      preservedOutcomes: [alpha, beta],
    });
  });

  test("normalizes a correlated solo failure without inventing a Unit Pool", () => {
    const batch = "solo:1:alpha";
    const audit = [
      auditRow("solo-start", 1, "BOLT_STARTED", {
        "Bolt names": "alpha",
        "Batch number": "1",
        "Walking skeleton": "false",
        Stage: "code-generation",
        "Batch Id": batch,
        "Attempt Id": "attempt-a",
      }),
      auditRow("solo-failed", 2, "BOLT_FAILED", {
        "Failed Bolt": "alpha",
        "Bolt slug": "alpha",
        "Error summary": "red",
        Stage: "code-generation",
        "Batch Id": batch,
        "Attempt Id": "attempt-a",
      }),
    ].join("\n");

    const normalized = normalizeConstructionOutcomeAudit(audit);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(projectConstructionOutcomes(normalized.records, {
      intent: "intent-a",
      stage: "code-generation",
    })).toEqual({
      ok: true,
      projection: {
        units: [{
          intent: "intent-a",
          stage: "code-generation",
          unit: "alpha",
          attempt: "attempt-a",
          batch,
          outcome: "failed",
          sequence: 2,
        }],
        unresolvedFailures: [{
          intent: "intent-a",
          stage: "code-generation",
          unit: "alpha",
          attempt: "attempt-a",
          batch,
          outcome: "failed",
          reason: "red",
          sequence: 2,
        }],
        constructionSuspended: false,
      },
    });
  });

  test("normalizes a correlated solo completion as succeeded", () => {
    const batch = "solo:1:alpha";
    const audit = [
      auditRow("solo-start", 1, "BOLT_STARTED", {
        "Bolt names": "alpha",
        "Batch number": "1",
        "Walking skeleton": "false",
        Stage: "code-generation",
        "Batch Id": batch,
        "Attempt Id": "attempt-a",
      }),
      auditRow("solo-complete", 2, "BOLT_COMPLETED", {
        "Bolt names": "alpha",
        "Batch number": "1",
        Stage: "code-generation",
        "Batch Id": batch,
        "Attempt Id": "attempt-a",
      }),
    ].join("\n");

    const normalized = normalizeConstructionOutcomeAudit(audit);
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(projectConstructionOutcomes(normalized.records, {
      intent: "intent-a",
      stage: "code-generation",
    })).toEqual({
      ok: true,
      projection: {
        units: [{
          intent: "intent-a",
          stage: "code-generation",
          unit: "alpha",
          attempt: "attempt-a",
          batch,
          outcome: "succeeded",
          sequence: 2,
        }],
        unresolvedFailures: [],
        constructionSuspended: false,
      },
    });
  });

  test("fails closed on malformed canonical audit correlation", () => {
    const missingSoloKeys = auditRow("solo-missing", 1, "BOLT_STARTED", {
      Stage: "code-generation",
    });
    const malformedPool = auditRow("pool-malformed", 2, "UNIT_POOL_EVENT_SET_COMMITTED", {
      "Event Set": "{",
    });
    const nonObjectPool = auditRow("pool-non-object", 3, "UNIT_POOL_EVENT_SET_COMMITTED", {
      "Event Set": "[]",
    });

    expect(normalizeConstructionOutcomeAudit([
      auditRow("ignored", 0, "UNKNOWN_EVENT", {}),
      missingSoloKeys,
      malformedPool,
      nonObjectPool,
    ].join("\n"))).toEqual({
      ok: false,
      diagnostics: [
        {
          eventId: "solo-missing",
          sequence: 1,
          code: "missing-join-key",
          missing: ["unit", "attempt", "batch"],
        },
        {
          eventId: "pool-malformed",
          sequence: 2,
          code: "missing-join-key",
          missing: ["unit", "attempt", "batch"],
        },
        {
          eventId: "pool-non-object",
          sequence: 3,
          code: "missing-join-key",
          missing: ["unit", "attempt", "batch"],
        },
      ],
    });
  });

  test("fails closed on a malformed canonical JSON row", () => {
    expect(normalizeConstructionOutcomeAudit("{not-json")).toEqual({
      ok: false,
      diagnostics: [{
        eventId: "(malformed-audit-row)",
        sequence: 0,
        code: "malformed-audit-row",
        missing: [],
      }],
    });
  });

  test("canonical ordering falls back to identity for tied clone sequences", () => {
    const tiedRow = (eventId: string, idempotencyKey?: string) => {
      const row = JSON.parse(auditRow(eventId, 1, "BOLT_FAILED", {
        "Failed Bolt": eventId,
        Stage: "code-generation",
        "Attempt Id": `attempt-${eventId}`,
        "Batch Id": `solo:1:${eventId}`,
        Reason: "red",
      })) as Record<string, unknown>;
      row.timestamp = "2026-08-10T00:00:00Z";
      if (idempotencyKey === undefined) delete row.idempotencyKey;
      else row.idempotencyKey = idempotencyKey;
      return JSON.stringify(row);
    };

    const normalized = normalizeConstructionOutcomeAudit([
      tiedRow("event-z"),
      tiedRow("event-a"),
    ].join("\n"));
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.records.map((record) => record.eventId)).toEqual(["event-a", "event-z"]);
  });

  test("normalizes failed solo completion without rounding it to succeeded", () => {
    const correlation = {
      "Bolt names": "alpha",
      Stage: "code-generation",
      "Attempt Id": "attempt-a",
      "Batch Id": "solo:1:alpha",
    };
    const normalized = normalizeConstructionOutcomeAudit([
      auditRow("started", 1, "BOLT_STARTED", correlation),
      auditRow("completed", 2, "BOLT_COMPLETED", { ...correlation, Outcome: "failed" }),
    ].join("\n"));

    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.records).toContainEqual(expect.objectContaining({
      event: "UNIT_POOL_EVENT_SET_COMMITTED",
      terminals: [expect.objectContaining({ unit: "alpha", outcome: "failed" })],
    }));
  });

  test("fails closed on unsupported solo and Unit Pool outcomes", () => {
    const correlation = {
      "Bolt names": "alpha",
      Stage: "code-generation",
      "Attempt Id": "attempt-a",
      "Batch Id": "solo:1:alpha",
    };
    const pool = auditRow("pool", 3, "UNIT_POOL_EVENT_SET_COMMITTED", {
      Stage: "code-generation",
      "Batch Id": "1",
      "Event Set": JSON.stringify({
        batchId: "1",
        events: [{
          type: "unit-settled",
          terminal: { unitId: "beta", attemptId: "attempt-b", outcome: "unknown" },
        }],
      }),
    });

    const normalized = normalizeConstructionOutcomeAudit([
      auditRow("started", 1, "BOLT_STARTED", correlation),
      auditRow("completed", 2, "BOLT_COMPLETED", { ...correlation, Outcome: "unknown" }),
      pool,
    ].join("\n"));

    expect(normalized.ok).toBe(false);
    if (normalized.ok) return;
    expect(normalized.diagnostics.map((diagnostic) => diagnostic.eventId)).toEqual(["completed", "pool"]);
  });

  test("fails closed on each canonical construction row missing event identity", () => {
    const missingIdentity = (unit: string) => {
      const row = JSON.parse(auditRow(`event-${unit}`, 1, "BOLT_FAILED", {
        "Failed Bolt": unit,
        Stage: "code-generation",
        "Attempt Id": `attempt-${unit}`,
        "Batch Id": `solo:1:${unit}`,
        Reason: "red",
      })) as Record<string, unknown>;
      delete row.eventId;
      return JSON.stringify(row);
    };

    const normalized = normalizeConstructionOutcomeAudit([
      missingIdentity("alpha"),
      missingIdentity("beta"),
    ].join("\n"));

    expect(normalized.ok).toBe(false);
    if (normalized.ok) return;
    expect(normalized.diagnostics).toHaveLength(2);
    expect(normalized.diagnostics.every((diagnostic) => diagnostic.eventId === "(missing-event-identity)")).toBe(true);
  });

  test("a requeue removes the previous terminal outcome from normalized state", () => {
    const poolRow = (eventId: string, sequence: number, events: unknown[]) => auditRow(
      eventId,
      sequence,
      "UNIT_POOL_EVENT_SET_COMMITTED",
      {
        "Event Set": JSON.stringify({ batchId: "1", events }),
      },
    );
    const audit = [
      poolRow("settled", 1, [{
        type: "unit-settled",
        terminal: { unitId: "alpha", attemptId: "attempt-a", outcome: "failed" },
      }]),
      poolRow("requeued", 2, [{
        type: "unit-requeued",
        entry: { unitId: "alpha" },
      }]),
    ].join("\n");

    expect(normalizeConstructionOutcomeAudit(audit)).toEqual({ ok: true, records: [] });
  });

  test("orders custom batch identities by DAG membership before unknown Units", () => {
    const beta = { ...key("beta", "attempt-b"), batch: "custom-beta", outcome: "failed" as const, sequence: 1 };
    const alpha = { ...key("alpha", "attempt-a"), batch: "custom-alpha", outcome: "failed" as const, sequence: 1 };
    const records: ConstructionOutcomeRecord[] = [
      { event: "UNIT_POOL_EVENT_SET_COMMITTED", eventId: "pool", sequence: 1, terminals: [alpha, beta] },
      { event: "BOLT_FAILED", eventId: "failed-alpha", sequence: 2, target: alpha, reason: "red" },
      { event: "BOLT_FAILED", eventId: "failed-beta", sequence: 3, target: beta, reason: "red" },
      { event: "SWARM_BATON_RETURNED", eventId: "baton-alpha", sequence: 4, target: alpha },
      { event: "SWARM_BATON_RETURNED", eventId: "baton-beta", sequence: 5, target: beta },
    ];

    const projected = projectConstructionOutcomes(records, {
      intent: "intent-a",
      stage: "code-generation",
      batches: [["beta"]],
    });
    expect(projected.ok).toBe(true);
    if (!projected.ok) return;
    expect(projected.projection.unresolvedFailures.map((entry) => entry.unit)).toEqual(["beta", "alpha"]);
  });
});
