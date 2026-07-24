// t275 — S2 pure reducer: receipt transition matrix, invariants, no-op,
// warning coalesce/capacity, repair-challenge transitions.
// covers: packages/framework/core/tools/amadeus-mirror-state-reducer.ts
// size: small

import { describe, expect, test } from "bun:test";
import fc from "fast-check";
import type {
  MirrorEventIdentity,
  MirrorStateSnapshot,
  MirrorWarning,
  RepositoryIdentity,
} from "../../packages/framework/core/tools/amadeus-mirror-types.ts";
import { mirrorEventKey } from "../../packages/framework/core/tools/amadeus-mirror-policy.ts";
import {
  MAX_NORMAL_WARNINGS,
  type MirrorTransition,
  reduceMirrorState,
} from "../../packages/framework/core/tools/amadeus-mirror-state-reducer.ts";

const NOW = "2026-07-24T00:10:00Z";
const REPO: RepositoryIdentity = { owner: "acme", name: "app", canonical: "acme/app" };

function ev(op: "create" | "sync" | "close", instance = "i1"): MirrorEventIdentity {
  return { intentUuid: "u", boundary: { kind: "manual", instance }, operation: op };
}

const EMPTY: MirrorStateSnapshot = {
  revision: 0,
  issueNumber: null,
  provenance: null,
  receipts: {},
  warnings: [],
  repairChallenges: {},
  auditOutbox: null,
};

function apply(snapshot: MirrorStateSnapshot, t: MirrorTransition): MirrorStateSnapshot {
  const r = reduceMirrorState(snapshot, t, NOW);
  if (r.kind !== "changed") throw new Error(`expected changed, got ${r.kind}`);
  return r.snapshot;
}

function warn(operationId: string | null, effect: MirrorWarning["effect"]): MirrorWarning {
  return {
    operationId,
    operation: operationId ? "create" : null,
    classification: operationId ? "network" : "configuration",
    summary: "redacted",
    occurredAt: NOW,
    retryable: true,
    effect,
    source: "persisted-receipt",
  };
}

const prepareCreate: MirrorTransition = {
  kind: "prepare",
  event: ev("create"),
  operationId: "op-1",
  preparedAt: NOW,
  create: { intentDir: "dir", repository: REPO },
};

describe("prepare", () => {
  test("prepare create builds a prepared receipt with create identity", () => {
    const s = apply(EMPTY, prepareCreate);
    const r = s.receipts[mirrorEventKey(ev("create"))];
    expect(r.status).toBe("prepared");
    expect(r.createIdentity?.repository.canonical).toBe("acme/app");
  });

  test("identical re-prepare is unchanged (no write)", () => {
    const s = apply(EMPTY, prepareCreate);
    expect(reduceMirrorState(s, prepareCreate, NOW).kind).toBe("unchanged");
  });

  test("re-prepare with a different operationId for the same key is invalid", () => {
    const s = apply(EMPTY, prepareCreate);
    const r = reduceMirrorState(s, { ...prepareCreate, operationId: "op-2" }, NOW);
    expect(r.kind).toBe("invalid");
  });
});

describe("attempt / complete", () => {
  const attempted = (): MirrorStateSnapshot =>
    apply(apply(EMPTY, prepareCreate), {
      kind: "mark-attempted",
      event: ev("create"),
      attemptedAt: NOW,
    });

  test("mark-attempted from prepared -> attempted", () => {
    expect(attempted().receipts[mirrorEventKey(ev("create"))].status).toBe("attempted");
  });

  test("re-attempt with a different timestamp is invalid", () => {
    const r = reduceMirrorState(
      attempted(),
      { kind: "mark-attempted", event: ev("create"), attemptedAt: "2026-07-24T00:20:00Z" },
      NOW,
    );
    expect(r.kind).toBe("invalid");
  });

  test("create complete requires provenance createdAt and links the issue", () => {
    const s = apply(attempted(), {
      kind: "complete",
      event: ev("create"),
      issueNumber: 42,
      completedAt: NOW,
      createdAt: NOW,
    });
    expect(s.receipts[mirrorEventKey(ev("create"))].status).toBe("succeeded");
    expect(s.issueNumber).toBe(42);
    expect(s.provenance?.issueNumber).toBe(42);
  });

  test("complete from prepared is invalid", () => {
    const s = apply(EMPTY, prepareCreate);
    const r = reduceMirrorState(
      s,
      { kind: "complete", event: ev("create"), issueNumber: 1, completedAt: NOW, createdAt: NOW },
      NOW,
    );
    expect(r.kind).toBe("invalid");
  });
});

describe("pending / retry", () => {
  const pending = (effect: "no-effect-confirmed" | "outcome-unknown"): MirrorStateSnapshot => {
    const attempted = apply(apply(EMPTY, prepareCreate), {
      kind: "mark-attempted",
      event: ev("create"),
      attemptedAt: NOW,
    });
    return apply(attempted, {
      kind: "mark-pending",
      event: ev("create"),
      effect,
      warning: warn("op-1", effect),
    });
  };

  test("mark-pending from attempted stores effect + failureClass", () => {
    const r = pending("no-effect-confirmed").receipts[mirrorEventKey(ev("create"))];
    expect(r.status).toBe("pending");
    expect(r.lastEffect).toBe("no-effect-confirmed");
  });

  test("retry-after-no-effect only from pending+no-effect-confirmed", () => {
    const ok = reduceMirrorState(
      pending("no-effect-confirmed"),
      { kind: "retry-after-no-effect", event: ev("create"), attemptedAt: "2026-07-24T00:30:00Z" },
      NOW,
    );
    expect(ok.kind).toBe("changed");
    const bad = reduceMirrorState(
      pending("outcome-unknown"),
      { kind: "retry-after-no-effect", event: ev("create"), attemptedAt: "2026-07-24T00:30:00Z" },
      NOW,
    );
    expect(bad.kind).toBe("invalid");
  });
});

describe("skip / warning / terminal", () => {
  test("skip-for-event from absent creates a terminal skipped receipt", () => {
    const s = apply(EMPTY, {
      kind: "skip-for-event",
      event: ev("sync"),
      operationId: "op-9",
      preparedAt: NOW,
      completedAt: NOW,
    });
    expect(s.receipts[mirrorEventKey(ev("sync"))].status).toBe("skipped-for-event");
  });

  test("set-warning on prepared keeps status and requires effect=not-started", () => {
    const prepared = apply(EMPTY, prepareCreate);
    const ok = apply(prepared, { kind: "set-warning", event: ev("create"), warning: warn("op-1", "not-started") });
    expect(ok.receipts[mirrorEventKey(ev("create"))].status).toBe("prepared");
    expect(ok.warnings.length).toBe(1);
    const bad = reduceMirrorState(
      prepared,
      { kind: "set-warning", event: ev("create"), warning: warn("op-1", "outcome-unknown") },
      NOW,
    );
    expect(bad.kind).toBe("invalid");
  });

  test("abandon a succeeded receipt is refused", () => {
    const succeeded = apply(
      apply(apply(EMPTY, prepareCreate), { kind: "mark-attempted", event: ev("create"), attemptedAt: NOW }),
      { kind: "complete", event: ev("create"), issueNumber: 1, completedAt: NOW, createdAt: NOW },
    );
    const r = reduceMirrorState(
      succeeded,
      {
        kind: "abandon-attempt",
        event: ev("create"),
        completedAt: NOW,
        consume: {
          challengeId: "c",
          intentUuid: "u",
          repository: REPO,
          operationId: "op-1",
          planDigest: "a".repeat(64),
          confirmationPhrase: "x",
        },
      },
      NOW,
    );
    expect(r.kind).toBe("invalid");
  });
});

describe("warning coalesce + capacity", () => {
  test("same operationId/classification/effect coalesces to one warning", () => {
    let s = apply(EMPTY, prepareCreate);
    s = apply(s, { kind: "set-warning", event: ev("create"), warning: { ...warn("op-1", "not-started"), occurredAt: NOW } });
    const r = reduceMirrorState(
      s,
      { kind: "set-warning", event: ev("create"), warning: { ...warn("op-1", "not-started"), occurredAt: "2026-07-24T00:40:00Z" } },
      NOW,
    );
    expect(r.kind).toBe("changed");
    if (r.kind === "changed") expect(r.snapshot.warnings.length).toBe(1);
  });

  test("beyond 999 normal warnings the reserved capacity slot is used", () => {
    const warnings: MirrorWarning[] = [];
    for (let i = 0; i < MAX_NORMAL_WARNINGS; i++) {
      warnings.push({ ...warn(`op-${i}`, "not-started"), classification: "network" });
    }
    const full: MirrorStateSnapshot = { ...EMPTY, warnings };
    const globalWarn: MirrorTransition = {
      kind: "set-global-warning",
      warning: { ...warn(null, "not-started"), classification: "configuration" },
    };
    const r = reduceMirrorState(full, globalWarn, NOW);
    expect(r.kind).toBe("changed");
    if (r.kind === "changed") {
      const capacity = r.snapshot.warnings.filter((w) => w.summary.startsWith("state-capacity"));
      expect(capacity.length).toBe(1);
    }
  });
});

describe("property: state-changing transitions are content-changes; no-ops are stable", () => {
  test("identical re-prepare never changes content", () => {
    fc.assert(
      fc.property(fc.string({ minLength: 1, maxLength: 8 }), (opId) => {
        const t: MirrorTransition = { ...prepareCreate, operationId: opId };
        const s = apply(EMPTY, t);
        return reduceMirrorState(s, t, NOW).kind === "unchanged";
      }),
      { numRuns: 100 },
    );
  });
});
