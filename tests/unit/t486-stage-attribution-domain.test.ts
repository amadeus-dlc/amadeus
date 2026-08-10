import { describe, expect, test } from "bun:test";
import {
  ATTRIBUTION_CATEGORIES,
  attributionCategoryForFamily,
  CANDIDATE_FAMILIES,
  CANDIDATE_REJECTION_REASON_PRECEDENCE,
  candidatePrimaryReason,
  createAccountedDisposition,
  createAttributionPopulationAccounting,
  createAttributionWindow,
  createExplicitLifecycleInterval,
  createCandidateWindowContribution,
  createRejectedDisposition,
  createAttributionWindowId,
  createCandidateId,
  createEventSetId,
  createIntentIdentity,
  createLifecycleIdentity,
  createSecondInterval,
  type AttributionResult,
  type CandidateFinding,
  type CandidateRejectionReason,
  type CandidateWindowContribution,
  type DecodedCandidate,
  type CandidateId,
  type IntentIdentity,
  parseOutlierLimit,
  parseTargetStage,
} from "../../packages/framework/core/tools/amadeus-stage-attribution-domain.ts";

function unwrapResult<T, E>(result: AttributionResult<T, E>): T {
  if (!result.ok) throw new TypeError("expected successful domain construction");
  return result.value;
}

function decodedCandidate(overrides: Partial<DecodedCandidate> = {}): DecodedCandidate {
  const sourceId = unwrapResult(createEventSetId("event-set-a"));
  return {
    type: "decoded-candidate",
    candidateId: unwrapResult(createCandidateId("candidate-a")),
    sourceIds: [sourceId],
    family: "sensor",
    category: "sensor-execution",
    explicitIntent: unwrapResult(createIntentIdentity("intent-a")),
    explicitStage: unwrapResult(parseTargetStage("code-generation")),
    lifecycleIdentity: unwrapResult(createLifecycleIdentity("fire-a")),
    starts: [{ sourceId, kind: "start", at: 10 }],
    terminals: [{ sourceId, kind: "terminal", at: 20 }],
    findings: [],
    ...overrides,
  };
}

describe("TargetStage", () => {
  test("defaults to code-generation and accepts only bounded lowercase kebab-case", () => {
    for (const [raw, expected] of [
      [undefined, "code-generation"],
      ["a", "a"],
      ["stage2", "stage2"],
      ["a-0-b", "a-0-b"],
      ["a".repeat(64), "a".repeat(64)],
    ] as const) {
      const result = parseTargetStage(raw);
      expect(result.ok).toBe(true);
      if (result.ok) expect(String(result.value)).toBe(expected);
    }

    for (const raw of [
      "",
      "A",
      "0stage",
      "-stage",
      "stage-",
      "stage--name",
      "stage_name",
      " stage",
      "stage ",
      "a".repeat(65),
    ]) {
      expect(parseTargetStage(raw)).toEqual({
        ok: false,
        error: {
          type: "usage",
          code: "invalid-target-stage",
          argument: "stage",
          value: raw,
        },
      });
    }
  });
});

describe("closed attribution vocabularies", () => {
  test("candidate families map one-to-one to categories in canonical order", () => {
    expect(CANDIDATE_FAMILIES).toEqual([
      "sensor",
      "swarm",
      "bolt",
      "subagent",
      "loop-monitor",
      "merge-dispatch",
      "execution-event-set",
      "unit-pool-event-set",
      "transaction-envelope",
    ]);
    expect(ATTRIBUTION_CATEGORIES).toEqual([
      "sensor-execution",
      "swarm-lifecycle",
      "bolt-lifecycle",
      "subagent-lifecycle",
      "loop-monitor-lifecycle",
      "merge-dispatch-lifecycle",
      "execution-lifecycle",
      "unit-pool-lifecycle",
      "transaction-lifecycle",
    ]);
    expect(CANDIDATE_FAMILIES.map(attributionCategoryForFamily)).toEqual([...ATTRIBUTION_CATEGORIES]);
  });

  test("primary rejection reason follows the fixed precedence under permutations", () => {
    expect(CANDIDATE_REJECTION_REASON_PRECEDENCE).toEqual([
      "malformed-event-set",
      "digest-mismatch",
      "unsupported-event-set-schema",
      "duplicate-event-set-id",
      "missing-intent",
      "intent-mismatch",
      "missing-stage",
      "stage-mismatch",
      "missing-identity",
      "duplicate-start",
      "duplicate-terminal",
      "missing-start",
      "missing-terminal",
      "invalid-timestamp",
      "non-positive-interval",
      "outside-window",
      "empty-after-idle",
    ]);

    const findings = CANDIDATE_REJECTION_REASON_PRECEDENCE.map((reason) => ({
      type: "candidate-finding" as const,
      reason,
    }));
    const reversed = [...findings].reverse();
    expect(candidatePrimaryReason(findings)).toBe("malformed-event-set");
    expect(candidatePrimaryReason(reversed)).toBe("malformed-event-set");
    expect(reversed.map(({ reason }) => reason)).toEqual([...CANDIDATE_REJECTION_REASON_PRECEDENCE].reverse());

    for (let index = 0; index < findings.length; index += 1) {
      const suffix = findings.slice(index);
      const permuted = [...suffix.slice(1), suffix[0]!] as CandidateFinding[];
      expect(candidatePrimaryReason(permuted)).toBe(findings[index]!.reason);
    }
  });

  test("empty findings throw the required built-in TypeError", () => {
    expect(() => candidatePrimaryReason([])).toThrow(
      new TypeError("candidatePrimaryReason requires at least one finding"),
    );
  });
});

describe("OutlierLimit", () => {
  test("defaults to 10 and accepts only unsigned decimal integers from 0 through 100", () => {
    for (const [raw, expected] of [
      [undefined, 10],
      ["0", 0],
      ["00", 0],
      ["10", 10],
      ["100", 100],
    ] as const) {
      const result = parseOutlierLimit(raw);
      expect(result.ok).toBe(true);
      if (result.ok) expect(Number(result.value)).toBe(expected);
    }

    for (const raw of ["", "-1", "+1", "1.0", "1e2", " 1", "1 ", "101", "999999999999999999999"]) {
      expect(parseOutlierLimit(raw)).toEqual({
        ok: false,
        error: {
          type: "usage",
          code: "invalid-outlier-limit",
          argument: "outliers",
          value: raw,
        },
      });
    }
  });
});

describe("SecondInterval", () => {
  test("accepts finite integer seconds only when start is strictly before end", () => {
    expect(createSecondInterval(0, 1)).toEqual({
      ok: true,
      value: { start: 0, end: 1 },
    });

    for (const [start, end] of [
      [0, 0],
      [1, 0],
      [0.5, 1],
      [0, 1.5],
      [Number.NaN, 1],
      [0, Number.POSITIVE_INFINITY],
      [Number.NEGATIVE_INFINITY, 0],
    ]) {
      const result = createSecondInterval(start, end);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("accounting-invariant");
        expect(result.error.code).toBe("invalid-second-interval");
        expect(result.error.subject).toEqual({ type: "population" });
      }
    }
  });
});

describe("opaque identities", () => {
  test("constructors reject empty, edge whitespace, and ASCII control characters", () => {
    const constructors = [
      ["intent", createIntentIdentity],
      ["candidate", createCandidateId],
      ["event-set", createEventSetId],
      ["attribution-window", createAttributionWindowId],
      ["lifecycle", createLifecycleIdentity],
    ] as const;

    for (const [kind, construct] of constructors) {
      const valid = construct(`${kind}-id`);
      expect(valid.ok).toBe(true);
      if (valid.ok) expect(String(valid.value)).toBe(`${kind}-id`);
      for (const invalid of ["", " value", "value ", "\tvalue", "value\n", "a\u007fb"]) {
        expect(construct(invalid)).toEqual({
          ok: false,
          error: {
            type: "decode",
            code: "invalid-identity",
            identity: kind,
            value: invalid,
          },
        });
      }
    }
  });

  test("identity brands are mutually non-assignable", () => {
    const intent = unwrapResult(createIntentIdentity("intent-a"));
    const candidate = unwrapResult(createCandidateId("candidate-a"));
    // @ts-expect-error CandidateId must not cross the IntentIdentity boundary.
    const wrongIntent: IntentIdentity = candidate;
    // @ts-expect-error IntentIdentity must not cross the CandidateId boundary.
    const wrongCandidate: CandidateId = intent;
    expect(String(wrongIntent)).toBe("candidate-a");
    expect(String(wrongCandidate)).toBe("intent-a");
  });
});

describe("ExplicitLifecycleInterval", () => {
  test("retains explicit intent, lifecycle identity, family, category, and stage", () => {
    const candidate = decodedCandidate();
    const result = createExplicitLifecycleInterval(candidate);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({
        type: "explicit-lifecycle-interval",
        candidateId: candidate.candidateId,
        explicitIntent: candidate.explicitIntent as IntentIdentity,
        lifecycleIdentity: unwrapResult(createLifecycleIdentity("fire-a")),
        family: "sensor",
        category: "sensor-execution",
        stage: unwrapResult(parseTargetStage("code-generation")),
        interval: { start: 10, end: 20 },
      });
    }
  });

  test("rejects incomplete, ambiguous, malformed, or non-positive lifecycles", () => {
    const invalidCandidates: Array<[DecodedCandidate, CandidateRejectionReason]> = [
      [decodedCandidate({ explicitIntent: null }), "missing-intent"],
      [decodedCandidate({ explicitStage: null }), "missing-stage"],
      [decodedCandidate({ lifecycleIdentity: null }), "missing-identity"],
      [decodedCandidate({ starts: [] }), "missing-start"],
      [decodedCandidate({ terminals: [] }), "missing-terminal"],
      [decodedCandidate({ starts: [...decodedCandidate().starts, ...decodedCandidate().starts] }), "duplicate-start"],
      [decodedCandidate({ terminals: [...decodedCandidate().terminals, ...decodedCandidate().terminals] }), "duplicate-terminal"],
      [decodedCandidate({ starts: [{ ...decodedCandidate().starts[0]!, at: 10.5 }] }), "invalid-timestamp"],
      [decodedCandidate({ terminals: [{ ...decodedCandidate().terminals[0]!, at: Number.POSITIVE_INFINITY }] }), "invalid-timestamp"],
      [decodedCandidate({ terminals: [{ ...decodedCandidate().terminals[0]!, at: 10 }] }), "non-positive-interval"],
      [decodedCandidate({ family: "bolt", category: "sensor-execution" }), "malformed-event-set"],
    ];

    for (const [candidate, expectedReason] of invalidCandidates) {
      const result = createExplicitLifecycleInterval(candidate);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("rejected-candidate");
        expect(result.error.primaryReason).toBe(expectedReason);
        expect(result.error.candidateId).toBe(candidate.candidateId);
      }
    }
  });
});

describe("AttributionWindow", () => {
  const windowId = unwrapResult(createAttributionWindowId("window-a"));
  const intent = unwrapResult(createIntentIdentity("intent-a"));
  const stage = unwrapResult(parseTargetStage("code-generation"));
  const measuredInterval = unwrapResult(createSecondInterval(100, 120));

  test("requires explicit identity and a positive bounded integer net duration", () => {
    expect(createAttributionWindow({ windowId, intent, stage, measuredInterval, netSeconds: 20 })).toEqual({
      ok: true,
      value: {
        type: "attribution-window",
        windowId,
        intent,
        stage,
        measuredInterval: { start: 100, end: 120 },
        netSeconds: 20,
      },
    });

    for (const [overrides, invariant] of [
      [{ intent: null }, "missing-intent"],
      [{ stage: null }, "missing-stage"],
      [{ measuredInterval: null }, "invalid-measured-interval"],
      [{ measuredInterval: { start: 2, end: 2 } }, "invalid-measured-interval"],
      [{ netSeconds: 0 }, "invalid-net-seconds"],
      [{ netSeconds: 1.5 }, "invalid-net-seconds"],
      [{ netSeconds: Number.POSITIVE_INFINITY }, "invalid-net-seconds"],
      [{ netSeconds: 21 }, "net-seconds-exceed-duration"],
    ] as const) {
      const result = createAttributionWindow({ windowId, intent, stage, measuredInterval, netSeconds: 20, ...overrides });
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.type).toBe("accounting-invariant");
        expect(result.error.code).toBe("invalid-attribution-window");
        expect(result.error.subject).toEqual({ type: "window", windowId });
        if (result.error.code === "invalid-attribution-window") {
          expect(result.error.invariant).toBe(invariant);
        }
      }
    }
  });
});

describe("population accounting", () => {
  const candidateId = unwrapResult(createCandidateId("candidate-accounted"));
  const windowId = unwrapResult(createAttributionWindowId("window-accounted"));
  const intent = unwrapResult(createIntentIdentity("intent-accounted"));
  const stage = unwrapResult(parseTargetStage("code-generation"));
  const measuredInterval = unwrapResult(createSecondInterval(0, 30));
  const window = unwrapResult(createAttributionWindow({ windowId, intent, stage, measuredInterval, netSeconds: 20 }));

  test("accounted dispositions require one or more positive fragments", () => {
    const fragment = unwrapResult(createSecondInterval(5, 10));
    const contribution = unwrapResult(createCandidateWindowContribution(windowId, [fragment]));
    expect(contribution).toEqual({
      type: "candidate-window-contribution",
      windowId,
      fragments: [{ start: 5, end: 10 }],
    });
    expect(createAccountedDisposition(candidateId, [contribution])).toEqual({
      ok: true,
      value: { type: "accounted", candidateId, contributions: [contribution] },
    });

    const emptyFragments = createCandidateWindowContribution(windowId, []);
    expect(emptyFragments.ok).toBe(false);
    if (!emptyFragments.ok) expect(emptyFragments.error.subject).toEqual({ type: "window", windowId });

    const invalidFragments = createCandidateWindowContribution(windowId, [{ start: 10, end: 10 }]);
    expect(invalidFragments.ok).toBe(false);
    if (!invalidFragments.ok && invalidFragments.error.code === "invalid-candidate-contribution") {
      expect(invalidFragments.error.invariant).toBe("invalid-fragment");
    }

    const emptyContributions = createAccountedDisposition(candidateId, []);
    expect(emptyContributions.ok).toBe(false);
    if (!emptyContributions.ok) {
      expect(emptyContributions.error.subject).toEqual({ type: "population", candidateId });
      if (emptyContributions.error.code === "invalid-accounting-disposition") {
        expect(emptyContributions.error.invariant).toBe("empty-contributions");
      }
    }
  });

  test("population accepts only existing window references and never merges identity collisions", () => {
    const contribution = unwrapResult(createCandidateWindowContribution(windowId, [unwrapResult(createSecondInterval(5, 10))]));
    const accounted = unwrapResult(createAccountedDisposition(candidateId, [contribution]));
    const rejected = createRejectedDisposition(unwrapResult(createCandidateId("candidate-rejected")), "outside-window");
    expect(createAttributionPopulationAccounting([window], [accounted, rejected])).toEqual({
      ok: true,
      value: {
        type: "attribution-population-accounting",
        windows: [window],
        dispositions: [accounted, rejected],
      },
    });

    const collision = createAttributionPopulationAccounting([window, { ...window }], []);
    expect(collision.ok).toBe(false);
    if (!collision.ok) {
      if (collision.error.code === "invalid-attribution-population") {
        expect(collision.error.invariant).toBe("duplicate-window-id");
      }
      expect(collision.error.subject).toEqual({ type: "population" });
    }

    const missingWindowId = unwrapResult(createAttributionWindowId("window-missing"));
    const missingContribution = unwrapResult(createCandidateWindowContribution(missingWindowId, [unwrapResult(createSecondInterval(1, 2))]));
    const missingDisposition = unwrapResult(createAccountedDisposition(candidateId, [missingContribution]));
    const missing = createAttributionPopulationAccounting([window], [missingDisposition]);
    expect(missing.ok).toBe(false);
    if (!missing.ok) {
      if (missing.error.code === "invalid-attribution-population") {
        expect(missing.error.invariant).toBe("unknown-window-id");
      }
      expect(missing.error.subject).toEqual({ type: "population", candidateId });
    }
  });

  test("constructors copy arrays instead of mutating or retaining caller-owned collections", () => {
    const fragments = Object.freeze([unwrapResult(createSecondInterval(1, 3))]);
    const contribution = unwrapResult(createCandidateWindowContribution(windowId, fragments));
    const contributions = Object.freeze([contribution]) as readonly CandidateWindowContribution[];
    const disposition = unwrapResult(createAccountedDisposition(candidateId, contributions));
    const windows = Object.freeze([window]);
    const dispositions = Object.freeze([disposition]);
    const population = unwrapResult(createAttributionPopulationAccounting(windows, dispositions));

    expect(fragments).toEqual([{ start: 1, end: 3 }]);
    expect(contributions).toEqual([contribution]);
    expect(windows).toEqual([window]);
    expect(dispositions).toEqual([disposition]);
    expect(contribution.fragments).not.toBe(fragments);
    expect(disposition.contributions).not.toBe(contributions);
    expect(population.windows).not.toBe(windows);
    expect(population.dispositions).not.toBe(dispositions);
  });
});
