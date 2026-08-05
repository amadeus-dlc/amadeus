import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
  ApplicabilityJudge,
  AuthoringHoldEvaluator,
  readModelMapSnapshot,
  verifyHumanApproval,
} from "../../plugins/formal-model-check/tools/tla-applicability.ts";

// U2 C9 pin (business-rules.md BR-U2-13..17, business-logic-model.md §3).
// Pure layer only: the evidence reader is injected, so no filesystem is touched
// (cid:code-generation:fs-tests-integration-first).

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

const CURRENT = `sha256:${"c".repeat(64)}` as never;
const OLD = `sha256:${"d".repeat(64)}` as never;
const SERIES = ApplicabilityJudge.subjectSeriesKey(["FR-001"]);
const OTHER_SERIES = ApplicabilityJudge.subjectSeriesKey(["FR-002"]);

function ref(seed: string): never {
  return { digest: `sha256:${seed.repeat(64).slice(0, 64)}` } as never;
}

function receipt(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    route: "impl-only",
    subjectIdentity: CURRENT,
    subjectSeries: SERIES,
    subjects: ["FR-001"],
    reason: "J4: impl-only — because",
    judgedBy: "tla-authoring",
    humanApproval: { shard: "s.jsonl", timestamp: "2026-08-05T00:00:00Z", eventIdentity: "e" },
    generatedAt: "2026-08-05T00:00:00Z",
    predecessor: { kind: "root" },
    ...overrides,
  };
}

const MODEL_MAP = { models: [{ name: "FormalElection", traceSubjects: ["FR-001"] as never }] };

type Parts = { kind: string; parts: Record<string, unknown> };

function evaluate(
  store: ReadonlyMap<string, Parts | null>,
  modelMap: typeof MODEL_MAP | null = MODEL_MAP,
): ReturnType<typeof AuthoringHoldEvaluator.evaluate> {
  return AuthoringHoldEvaluator.evaluate(
    {
      currentSeries: SERIES,
      currentIdentity: CURRENT,
      modelMap: modelMap as never,
      evidenceIndex: [...store.keys()].map((digest) => ({ digest }) as never),
    },
    (evidenceRef) => {
      const parts = store.get((evidenceRef as { digest: string }).digest);
      return parts === null || parts === undefined
        ? { ok: false, error: { kind: "io-failure", path: "?", detail: "unreadable" } }
        : { ok: true, value: parts as never };
    },
  );
}

function terminal(applicability: Record<string, unknown>): Parts {
  return { kind: "terminal-route-receipt", parts: { applicability, approval: {} } };
}

function authoring(applicability: Record<string, unknown>): Parts {
  return {
    kind: "authoring-bundle",
    parts: { applicability, trace: {}, proof: {}, review: {}, approval: {} },
  };
}

describe("AuthoringHoldEvaluator.evaluate — the closed hold table", () => {
  test("row 1: no receipt for this series holds (BR-U2-13)", () => {
    const store = new Map<string, Parts>([["a", terminal(receipt({ subjectSeries: OTHER_SERIES }))]]);
    const verdict = unwrap(evaluate(store));
    expect(verdict.kind).toBe("hold");
    expect(verdict.kind === "hold" && verdict.reasons.map((reason) => reason.kind)).toEqual([
      "no-applicability-receipt",
    ]);
  });

  test("row 3: same series, changed content is stale — an old verdict does not release (BR-U2-15, AC-006)", () => {
    const store = new Map<string, Parts>([["a", terminal(receipt({ subjectIdentity: OLD }))]]);
    const verdict = unwrap(evaluate(store));
    expect(verdict.kind === "hold" && verdict.reasons).toEqual([
      { kind: "stale-evidence", recorded: OLD, current: CURRENT },
    ]);
  });

  test("row 2: an authoring route without a registered model holds (BR-U2-14)", () => {
    const store = new Map<string, Parts>([["a", authoring(receipt({ route: "revise-model" }))]]);
    const verdict = unwrap(evaluate(store, { models: [] }));
    expect(verdict.kind === "hold" && verdict.reasons).toEqual([
      { kind: "authoring-incomplete", route: "revise-model" },
    ]);
  });

  test("row 2: an authoring route recorded as a terminal receipt holds", () => {
    const store = new Map<string, Parts>([["a", terminal(receipt({ route: "author-new" }))]]);
    const verdict = unwrap(evaluate(store));
    expect(verdict.kind === "hold" && verdict.reasons).toEqual([
      { kind: "authoring-incomplete", route: "author-new" },
    ]);
  });

  test("a terminal route carried by an authoring bundle is not a releasing receipt", () => {
    // Contradictory shape: the release rule for a terminal route names the
    // terminal-route-receipt kind, so this holds rather than falling through.
    const store = new Map<string, Parts>([["a", authoring(receipt({ route: "non-target" }))]]);
    const verdict = unwrap(evaluate(store));
    expect(verdict.kind === "hold" && verdict.reasons.map((reason) => reason.kind)).toEqual([
      "no-applicability-receipt",
    ]);
  });

  test("row 4: a current terminal receipt releases the hold, naming its basis", () => {
    const store = new Map<string, Parts>([["a", terminal(receipt({}))]]);
    const verdict = unwrap(evaluate(store));
    expect(verdict).toEqual({ kind: "no-hold", basis: { digest: "a" } } as never);
  });

  test("row 5: a current registered authoring bundle releases the hold", () => {
    const store = new Map<string, Parts>([["a", authoring(receipt({ route: "revise-model" }))]]);
    expect(unwrap(evaluate(store)).kind).toBe("no-hold");
  });

  test("only the chain tip decides: a superseded current receipt does not release a stale tip", () => {
    const store = new Map<string, Parts>([
      ["a", terminal(receipt({}))],
      ["b", terminal(receipt({ subjectIdentity: OLD, predecessor: { kind: "bundle", digest: "a" } }))],
    ]);
    const verdict = unwrap(evaluate(store));
    expect(verdict.kind === "hold" && verdict.reasons.map((reason) => reason.kind)).toEqual(["stale-evidence"]);
  });

  test("an unreadable evidence file fails closed rather than releasing (BR-U2-16)", () => {
    const store = new Map<string, Parts | null>([["a", null]]);
    expect(failure(evaluate(store)).kind).toBe("evidence-unreadable");
  });

  test("an unreadable model map fails closed (BR-U2-16)", () => {
    const store = new Map<string, Parts>([["a", terminal(receipt({}))]]);
    expect(failure(evaluate(store, null)).kind).toBe("model-map-unreadable");
  });

  test("an empty store holds instead of releasing (AC-001)", () => {
    expect(unwrap(evaluate(new Map())).kind).toBe("hold");
  });
});

// The two readers the hold evaluator is fed from. Both take text, so they stay
// in the pure layer with the rest of C9.
describe("readModelMapSnapshot", () => {
  const noBundles = () => null;

  test("an unparseable map reads as unreadable rather than as an empty map", () => {
    expect(readModelMapSnapshot("{ not json", noBundles)).toBeNull();
  });

  test("a model with no evidence link yet contributes no trace subjects", () => {
    const snapshot = readModelMapSnapshot(
      JSON.stringify({ models: [{ name: "Election", evidence: null }] }),
      () => {
        throw new Error("an unlinked model must not be resolved against the store");
      },
    );
    expect(snapshot?.models).toEqual([{ name: "Election", traceSubjects: [] }]);
  });

  test("a linked bundle that cannot be resolved makes the whole map unreadable", () => {
    const text = JSON.stringify({ models: [{ name: "Election", evidence: { digest: "a" } }] });
    expect(readModelMapSnapshot(text, noBundles)).toBeNull();
  });
});

describe("verifyHumanApproval", () => {
  const approval = { shard: "s.jsonl", timestamp: "2026-08-05T00:00:00Z", eventIdentity: "" };

  function withDigest(line: string) {
    return { ...approval, eventIdentity: createHash("sha256").update(line).digest("hex") };
  }

  test("accepts a HUMAN_TURN record whose bytes and timestamp both match", () => {
    const line = JSON.stringify({ timestamp: approval.timestamp, attributes: { Event: "HUMAN_TURN" } });
    expect(verifyHumanApproval(line, withDigest(line))).toBe(true);
  });

  test("a digest-matching line that is not JSON is skipped rather than trusted", () => {
    const line = "{ not json";
    expect(verifyHumanApproval(line, withDigest(line))).toBe(false);
  });
});
