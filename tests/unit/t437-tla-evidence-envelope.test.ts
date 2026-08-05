import { describe, expect, test } from "bun:test";
import {
  EvidenceEnvelopeCodec,
  IdentityDigest,
  type EvidenceEnvelope,
  type EvidenceParts,
} from "../../plugins/formal-model-check/tools/tla-evidence.ts";

// U1 C4 pure-layer pin (business-logic-model.md §4-§5, business-rules.md
// BR-U1-04/05/14/18..21, domain-entities.md § EvidenceEnvelope). Bytes in,
// verdicts out — the store handlers are covered by the integration tests.

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

const identity = IdentityDigest.aggregateDigest([
  [
    unwrap(IdentityDigest.normalizeStableId("FR-006")),
    IdentityDigest.contentDigest(unwrap(IdentityDigest.normalizeStableId("FR-006")), "body"),
  ],
]);

const authoringParts: EvidenceParts = {
  kind: "authoring-bundle",
  parts: {
    applicability: { route: "author" },
    trace: { covered: true },
    proof: { invariants: ["I1"] },
    review: { verdict: "READY" },
    approval: { approvedAt: "2026-08-04T00:00:00Z" },
  },
};

const terminalParts: EvidenceParts = {
  kind: "terminal-route-receipt",
  parts: {
    applicability: { route: "non-target" },
    approval: { approvedBy: "human" },
  },
};

function envelope(overrides: Partial<EvidenceEnvelope> = {}): EvidenceEnvelope {
  return {
    schema: 1,
    subjectIdentity: identity,
    evidence: authoringParts,
    predecessor: { kind: "root" },
    generatedAt: "2026-08-04T12:00:00Z",
    generatedBy: "tla-authoring",
    ...overrides,
  };
}

describe("EvidenceEnvelopeCodec.canonicalBytes", () => {
  test("sorts keys so that field order does not change the digest", () => {
    const reordered = Object.fromEntries(
      Object.entries(envelope()).reverse(),
    ) as unknown as EvidenceEnvelope;
    expect(EvidenceEnvelopeCodec.bundleDigest(EvidenceEnvelopeCodec.canonicalBytes(reordered))).toBe(
      EvidenceEnvelopeCodec.bundleDigest(EvidenceEnvelopeCodec.canonicalBytes(envelope())),
    );
  });

  test("digest covers generatedAt and generatedBy", () => {
    const base = EvidenceEnvelopeCodec.bundleDigest(EvidenceEnvelopeCodec.canonicalBytes(envelope()));
    expect(
      EvidenceEnvelopeCodec.bundleDigest(
        EvidenceEnvelopeCodec.canonicalBytes(envelope({ generatedAt: "2026-08-04T12:00:01Z" })),
      ),
    ).not.toBe(base);
    expect(
      EvidenceEnvelopeCodec.bundleDigest(
        EvidenceEnvelopeCodec.canonicalBytes(envelope({ generatedBy: "someone-else" })),
      ),
    ).not.toBe(base);
  });

  test("digest is sha256:<hex64> and the store filename is its hex", () => {
    const digest = EvidenceEnvelopeCodec.bundleDigest(EvidenceEnvelopeCodec.canonicalBytes(envelope()));
    expect(digest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(EvidenceEnvelopeCodec.fileNameFor({ digest })).toBe(`${digest.slice("sha256:".length)}.json`);
  });
});

describe("EvidenceEnvelopeCodec.parse", () => {
  test("round-trips a canonical envelope", () => {
    const bytes = EvidenceEnvelopeCodec.canonicalBytes(envelope());
    expect(unwrap(EvidenceEnvelopeCodec.parse(bytes))).toEqual(envelope());
  });

  test("round-trips the terminal route kind", () => {
    const source = envelope({ evidence: terminalParts });
    expect(unwrap(EvidenceEnvelopeCodec.parse(EvidenceEnvelopeCodec.canonicalBytes(source)))).toEqual(source);
  });

  test("round-trips a bundle predecessor", () => {
    const digest = EvidenceEnvelopeCodec.bundleDigest(EvidenceEnvelopeCodec.canonicalBytes(envelope()));
    const source = envelope({ predecessor: { kind: "bundle", digest } });
    expect(unwrap(EvidenceEnvelopeCodec.parse(EvidenceEnvelopeCodec.canonicalBytes(source)))).toEqual(source);
  });

  test("enumerates every missing envelope field as missing-part", () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ schema: 1, evidence: authoringParts }));
    expect(failure(EvidenceEnvelopeCodec.parse(bytes))).toEqual({
      kind: "missing-part",
      parts: ["subjectIdentity", "predecessor", "generatedAt", "generatedBy"],
    });
  });

  test("enumerates every missing receipt of an authoring bundle", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify(envelope({ evidence: { kind: "authoring-bundle", parts: { applicability: {} } } as EvidenceParts })),
    );
    expect(failure(EvidenceEnvelopeCodec.parse(bytes))).toEqual({
      kind: "missing-part",
      parts: ["evidence.parts.trace", "evidence.parts.proof", "evidence.parts.review", "evidence.parts.approval"],
    });
  });

  test("rejects an unknown evidence kind", () => {
    const bytes = new TextEncoder().encode(
      JSON.stringify({ ...envelope(), evidence: { kind: "surprise", parts: {} } }),
    );
    expect(failure(EvidenceEnvelopeCodec.parse(bytes))).toEqual({
      kind: "missing-part",
      parts: ["evidence.kind"],
    });
  });

  test("rejects unparseable bytes as missing-part rather than throwing", () => {
    expect(failure(EvidenceEnvelopeCodec.parse(new TextEncoder().encode("{ not json")))).toEqual({
      kind: "missing-part",
      parts: ["<envelope>"],
    });
  });
});

describe("EvidenceEnvelopeCodec.verifyBytes", () => {
  const bytes = EvidenceEnvelopeCodec.canonicalBytes(envelope());
  const ref = { digest: EvidenceEnvelopeCodec.bundleDigest(bytes) };

  test("accepts matching digest and identity", () => {
    const verified = unwrap(EvidenceEnvelopeCodec.verifyBytes(bytes, ref, identity));
    expect(verified.ref).toEqual(ref);
    expect(verified.envelope).toEqual(envelope());
  });

  test("detects tampering as digest-mismatch", () => {
    const tampered = EvidenceEnvelopeCodec.canonicalBytes(envelope({ generatedBy: "attacker" }));
    expect(failure(EvidenceEnvelopeCodec.verifyBytes(tampered, ref, identity))).toEqual({
      kind: "digest-mismatch",
      expected: ref.digest,
      actual: EvidenceEnvelopeCodec.bundleDigest(tampered),
    });
  });

  test("detects a stale subject identity as identity-mismatch", () => {
    const expected = IdentityDigest.aggregateDigest([
      [
        unwrap(IdentityDigest.normalizeStableId("FR-007")),
        IdentityDigest.contentDigest(unwrap(IdentityDigest.normalizeStableId("FR-007")), "other"),
      ],
    ]);
    expect(failure(EvidenceEnvelopeCodec.verifyBytes(bytes, ref, expected))).toEqual({
      kind: "identity-mismatch",
      expected,
      actual: identity,
    });
  });
});

describe("EvidenceEnvelopeCodec.resolveHeads", () => {
  const a = { digest: unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"a".repeat(64)}`)) };
  const b = { digest: unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"b".repeat(64)}`)) };
  const c = { digest: unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"c".repeat(64)}`)) };

  test("returns the refs no other envelope points at", () => {
    const heads = EvidenceEnvelopeCodec.resolveHeads([
      { ref: a, predecessor: { kind: "root" } },
      { ref: b, predecessor: { kind: "bundle", digest: a.digest } },
      { ref: c, predecessor: { kind: "root" } },
    ]);
    expect(heads).toEqual([b, c]);
  });

  test("an empty store has no head", () => {
    expect(EvidenceEnvelopeCodec.resolveHeads([])).toEqual([]);
  });
});
