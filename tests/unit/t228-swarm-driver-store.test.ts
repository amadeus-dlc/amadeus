// covers: module:amadeus-swarm-driver-store, requirement:FR-18, requirement:FR-20, audit:SWARM_DRIVER_RECONCILED
// size: large

import { describe, expect, test } from "bun:test";
import {
  buildTransition,
  createProbingCheckpoint,
  type AttemptCheckpoint,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-lifecycle.ts";
import {
  AttemptStoreError,
  createDriverAttemptStore,
  type DriverAuditEvent,
} from "../../packages/framework/core/tools/amadeus-swarm-driver-store.ts";

function initial(): AttemptCheckpoint {
  const result = createProbingCheckpoint({
    executionId: "exec-1",
    attemptId: "attempt-1",
    batch: 1,
    origin: "initial",
    nonceHash: "nonce",
    mutationId: "begin-1",
    lease: {
      leaseId: "lease-1",
      fencingToken: 1,
      ownerId: "owner-1",
      heartbeatAt: "2026-07-14T00:00:00.000Z",
      expiresAt: "2026-07-14T00:00:30.000Z",
    },
    selectionInput: {
      requested: { source: "default", requested: "auto" },
      harness: "codex",
      batch: 1,
      expectedUnits: ["alpha", "beta"],
      topologySignals: [],
    },
  });
  if (result.type === "err") throw new Error("fixture failed");
  return result.value;
}

function failedTransition(checkpoint: AttemptCheckpoint) {
  const result = buildTransition(checkpoint, {
    transitionId: "failure-1",
    edge: "attempt-failed",
    executionId: checkpoint.executionId,
    attemptId: checkpoint.attemptId,
    leaseId: checkpoint.lease.leaseId,
    fencingToken: checkpoint.lease.fencingToken,
    post: {
      ...checkpoint,
      state: "failed-resumable",
      failure: { code: "COORDINATOR_FAILED", affectedUnits: ["beta"], failedFromState: "probing" },
    },
  });
  if (result.type === "err") throw new Error("fixture failed");
  return result.value;
}

function fixture() {
  let value: AttemptCheckpoint | null = null;
  let failWrite = false;
  const order: string[] = [];
  const events: { event: DriverAuditEvent; fields: Readonly<Record<string, string>> }[] = [];
  const store = createDriverAttemptStore({
    checkpoint: {
      read: () => value,
      write: (_batch, next) => {
        order.push("write");
        if (failWrite) throw new Error("injected write failure");
        value = next;
      },
    },
    audit: {
      append: (event, fields) => {
        order.push(`audit:${event}`);
        events.push({ event, fields });
      },
      hasEventKey: (key) => events.some(({ fields }) => fields["Event key"] === key),
      read: () =>
        events
          .map(({ event, fields }) =>
            `\n## ${event}\n**Timestamp**: 2026-07-14T00:00:00.000Z\n**Event**: ${event}\n${Object.entries(fields)
              .map(([key, value]) => `**${key}**: ${value}`)
              .join("\n")}\n\n---\n`,
          )
          .join(""),
    },
    lock: { run: (fn) => fn() },
  });
  return {
    store,
    events,
    order,
    current: () => value,
    set: (next: AttemptCheckpoint | null) => {
      value = next;
    },
    failWrites: (enabled: boolean) => {
      failWrite = enabled;
    },
  };
}

describe("t228 swarm driver store", () => {
  test("writes the attempted audit intent before the first checkpoint", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    expect(checkpoint.state).toBe("probing");
    expect(f.order).toEqual(["audit:SWARM_DRIVER_ATTEMPTED", "write"]);
    expect(f.events[0].fields["Pre digest"]).toBe("ABSENT");
  });

  test("does not report success when begin checkpoint materialization fails", () => {
    const f = fixture();
    f.failWrites(true);
    expect(() => f.store.begin(initial())).toThrow("injected write failure");
    expect(f.events.map((entry) => entry.event)).toEqual(["SWARM_DRIVER_ATTEMPTED"]);
    expect(f.current()).toBeNull();
  });

  test("deduplicates a materialized begin", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    expect(f.store.begin(checkpoint)).toBe(checkpoint);
    expect(f.events).toHaveLength(1);
  });

  test("writes transition audit before checkpoint and reconciles an injected write failure", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    const transition = failedTransition(checkpoint);
    f.failWrites(true);
    expect(() => f.store.transition(transition)).toThrow("injected write failure");
    expect(f.current()?.state).toBe("probing");
    f.failWrites(false);
    const reconciled = f.store.reconcileTransition(transition);
    expect(reconciled.action).toBe("reapplied");
    expect(reconciled.checkpoint?.state).toBe("failed-resumable");
  });

  test("reconciles an audit-only transition without reconstructing it in the caller", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    f.failWrites(true);
    expect(() => f.store.transition(failedTransition(checkpoint))).toThrow("injected write failure");
    f.failWrites(false);

    const reconciled = f.store.reconcilePending(1);
    expect(reconciled.map(({ action }) => action)).toEqual(["reapplied"]);
    expect(f.current()?.state).toBe("failed-resumable");
    expect(f.store.reconcilePending(1)).toEqual([]);
  });

  test("returns the reconciled checkpoint from the same store read", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    f.failWrites(true);
    expect(() => f.store.transition(failedTransition(checkpoint))).toThrow("injected write failure");
    f.failWrites(false);

    expect(f.store.readReconciled(1)).toMatchObject({
      state: "failed-resumable",
      lastMutationId: "failure-1",
    });
  });

  test("treats a repeated materialized transition as idempotent", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    const transition = failedTransition(checkpoint);
    const next = f.store.transition(transition);
    const eventCount = f.events.length;
    expect(f.store.transition(transition)).toBe(next);
    expect(f.events).toHaveLength(eventCount);
  });

  test("heartbeat preserves semantic state digest and rejects a stale writer", () => {
    const f = fixture();
    const checkpoint = f.store.begin(initial());
    const next = f.store.heartbeat({
      batch: 1,
      leaseId: "lease-1",
      fencingToken: 1,
      heartbeatAt: "2026-07-14T00:00:05.000Z",
      expiresAt: "2026-07-14T00:00:35.000Z",
    });
    expect(next.stateDigest).toBe(checkpoint.stateDigest);
    expect(() =>
      f.store.heartbeat({
        batch: 1,
        leaseId: "lease-1",
        fencingToken: 0,
        heartbeatAt: "2026-07-14T00:00:06.000Z",
        expiresAt: "2026-07-14T00:00:36.000Z",
      }),
    ).toThrow(AttemptStoreError);
  });

  test("resumes a failed attempt with a fresh pre-probe checkpoint", () => {
    const f = fixture();
    const first = f.store.begin(initial());
    f.store.transition(failedTransition(first));
    const resumed = f.store.beginResume({
      batch: 1,
      previousAttemptId: "attempt-1",
      newAttemptId: "attempt-2",
      nonceHash: "nonce-2",
      leaseId: "lease-2",
      ownerId: "owner-2",
      now: "2026-07-14T00:01:00.000Z",
      expiresAt: "2026-07-14T00:01:30.000Z",
      mutationId: "resume-1",
      reusedConvergedUnits: ["alpha"],
      recoveryVerified: true,
    });
    expect(resumed).toMatchObject({
      executionId: "exec-1",
      attemptId: "attempt-2",
      origin: "resumed",
      previousAttemptId: "attempt-1",
      state: "probing",
    });
    expect("selectedContext" in resumed).toBeFalse();
    expect(resumed.unitStates).toEqual({ alpha: "referee-converged", beta: "pending" });
    expect(resumed.lease.fencingToken).toBe(2);
  });

  test("refuses resume while the persisted lease is still active", () => {
    const f = fixture();
    const first = f.store.begin(initial());
    f.store.transition(failedTransition(first));
    expect(() =>
      f.store.beginResume({
        batch: 1,
        previousAttemptId: "attempt-1",
        newAttemptId: "attempt-2",
        nonceHash: "nonce-2",
        leaseId: "lease-2",
        ownerId: "owner-2",
        now: "2026-07-14T00:00:15.000Z",
        expiresAt: "2026-07-14T00:00:45.000Z",
        mutationId: "resume-1",
        reusedConvergedUnits: [],
        recoveryVerified: true,
      }),
    ).toThrow(AttemptStoreError);
  });

  test("abandons only an unmaterialized begin with proven absent side effects", () => {
    const f = fixture();
    const checkpoint = initial();
    const intent = {
      beginId: "begin-1",
      executionId: "exec-1",
      attemptId: "attempt-1",
      batch: 1,
      preDigest: "ABSENT" as const,
      intendedPostDigest: checkpoint.stateDigest,
      selectionInputDigest: "input",
      probeStatus: "pending" as const,
    };
    expect(f.store.reconcileBegin(intent, true).action).toBe("abandoned-unmaterialized-begin");
    expect(f.store.reconcileBegin(intent, false).action).toBe("marked-failed");
  });

  test("reconciles an audit-only begin as abandoned before probing", () => {
    const f = fixture();
    f.failWrites(true);
    expect(() => f.store.begin(initial())).toThrow("injected write failure");
    f.failWrites(false);

    expect(f.store.reconcilePending(1).map(({ action }) => action)).toEqual([
      "abandoned-unmaterialized-begin",
    ]);
    expect(f.store.reconcilePending(1)).toEqual([]);
  });

});
