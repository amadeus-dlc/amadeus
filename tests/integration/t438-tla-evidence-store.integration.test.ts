import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  EvidenceBundle,
  EvidenceEnvelopeCodec,
  IdentityDigest,
  type AggregateDigest,
  type EvidenceParts,
} from "../../plugins/formal-model-check/tools/tla-evidence.ts";

// U1 C4 store pin (business-rules.md BR-U1-02/08/14..22/24, BR-U1-27 fixtures:
// happy path, missing-part, digest-mismatch tampering, identity-mismatch stale,
// partial write (.tmp residue), idempotent rebuild). Real filesystem, so this
// lives in the integration tier (cid:code-generation:fs-tests-integration-first).

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

function identityOf(body: string): AggregateDigest {
  const id = unwrap(IdentityDigest.normalizeStableId("FR-006"));
  return IdentityDigest.aggregateDigest([[id, IdentityDigest.contentDigest(id, body)]]);
}

const identity = identityOf("body");
const otherIdentity = identityOf("other body");

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
  parts: { applicability: { route: "non-target" }, approval: { approvedBy: "human" } },
};

const meta = {
  subjectIdentity: identity,
  generatedAt: "2026-08-04T12:00:00Z",
  generatedBy: "t438",
} as const;

let storeRoot = "";

beforeEach(() => {
  storeRoot = join(mkdtempSync(join(tmpdir(), "tla-evidence-")), "tla-evidence");
});

afterEach(() => {
  rmSync(storeRoot, { recursive: true, force: true });
});

describe("EvidenceBundle.build", () => {
  test("places one canonical file named after its digest and nothing partial", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    expect(readdirSync(storeRoot).filter((name) => name.endsWith(".json"))).toEqual([
      EvidenceEnvelopeCodec.fileNameFor(ref),
    ]);
    const bytes = readFileSync(join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(ref)));
    expect(EvidenceEnvelopeCodec.bundleDigest(bytes)).toBe(ref.digest);
  });

  test("leaves no .tmp residue behind on success", () => {
    unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    expect(readdirSync(join(storeRoot, ".tmp"))).toEqual([]);
  });

  test("is idempotent for identical input (same digest, single file)", () => {
    const first = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    const second = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    expect(second.digest).toBe(first.digest);
    expect(readdirSync(storeRoot).filter((name) => name.endsWith(".json"))).toHaveLength(1);
  });

  test("a differing generatedAt yields a new envelope rather than overwriting", () => {
    const first = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    const second = unwrap(
      EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, { ...meta, generatedAt: "2026-08-04T12:00:01Z" }),
    );
    expect(second.digest).not.toBe(first.digest);
    expect(readdirSync(storeRoot).filter((name) => name.endsWith(".json"))).toHaveLength(2);
  });

  test("chains onto an existing predecessor", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const child = unwrap(
      EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, meta),
    );
    expect(unwrap(EvidenceBundle.verify(storeRoot, child, identity)).envelope.predecessor).toEqual({
      kind: "bundle",
      digest: root.digest,
    });
  });

  test("refuses to start a broken chain when the predecessor is absent", () => {
    const absent = unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"f".repeat(64)}`));
    expect(failure(EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: absent }, meta))).toEqual({
      kind: "predecessor-broken",
      digest: absent,
    });
  });

  // BR-U1-15 covers "absent OR unverifiable": a chain whose base is corrupt has
  // no inductive foundation, so the child must not be accepted either.
  test("refuses a predecessor whose bytes no longer parse", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    writeFileSync(join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(root)), "{ not json", "utf8");
    expect(failure(EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, meta))).toEqual({
      kind: "predecessor-broken",
      digest: root.digest,
    });
  });

  test("refuses a predecessor whose bytes no longer match its filename", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const path = join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(root));
    writeFileSync(path, readFileSync(path, "utf8").replace('"t438"', '"tamper"'), "utf8");
    expect(failure(EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, meta))).toEqual({
      kind: "predecessor-broken",
      digest: root.digest,
    });
  });

  test("accepts a predecessor recording a different subject identity (a revision)", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const revised = unwrap(
      EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, {
        ...meta,
        subjectIdentity: otherIdentity,
      }),
    );
    expect(unwrap(EvidenceBundle.verify(storeRoot, revised, otherIdentity)).envelope.predecessor).toEqual({
      kind: "bundle",
      digest: root.digest,
    });
  });

  test("reports a corrupted collision as io-failure instead of overwriting", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    writeFileSync(join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(ref)), "corrupted", "utf8");
    const rebuilt = EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta);
    expect(failure(rebuilt).kind).toBe("io-failure");
  });
});

describe("EvidenceBundle.verify", () => {
  test("accepts a freshly built bundle", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    expect(unwrap(EvidenceBundle.verify(storeRoot, ref, identity)).envelope.evidence).toEqual(authoringParts);
  });

  test("reports an absent file as missing-part", () => {
    const absent = { digest: unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"e".repeat(64)}`)) };
    expect(failure(EvidenceBundle.verify(storeRoot, absent, identity))).toEqual({
      kind: "missing-part",
      parts: [EvidenceEnvelopeCodec.fileNameFor(absent)],
    });
  });

  test("detects tampering on disk as digest-mismatch", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    const path = join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(ref));
    const tampered = readFileSync(path, "utf8").replace('"t438"', '"attacker"');
    writeFileSync(path, tampered, "utf8");
    expect(failure(EvidenceBundle.verify(storeRoot, ref, identity)).kind).toBe("digest-mismatch");
  });

  test("detects a stale subject identity as identity-mismatch", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "root" }, meta));
    expect(failure(EvidenceBundle.verify(storeRoot, ref, otherIdentity))).toEqual({
      kind: "identity-mismatch",
      expected: otherIdentity,
      actual: identity,
    });
  });

  test("reports a predecessor that disappeared as predecessor-broken", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const child = unwrap(
      EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, meta),
    );
    rmSync(join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(root)));
    expect(failure(EvidenceBundle.verify(storeRoot, child, identity))).toEqual({
      kind: "predecessor-broken",
      digest: root.digest,
    });
  });
});

describe("EvidenceBundle.read", () => {
  test("returns the parts without checking identity", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    expect(unwrap(EvidenceBundle.read(storeRoot, ref))).toEqual(terminalParts);
  });

  test("propagates an absent file as missing-part", () => {
    const absent = { digest: unwrap(EvidenceEnvelopeCodec.parseBundleDigest(`sha256:${"d".repeat(64)}`)) };
    expect(failure(EvidenceBundle.read(storeRoot, absent)).kind).toBe("missing-part");
  });

  // read is verify steps 1..3 (business-logic-model.md §5): the digest check is
  // part of reading, so tampered bytes must never reach a caller.
  test("detects tampering as digest-mismatch instead of returning the parts", () => {
    const ref = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const path = join(storeRoot, EvidenceEnvelopeCodec.fileNameFor(ref));
    writeFileSync(path, readFileSync(path, "utf8").replace('"non-target"', '"author"'), "utf8");
    expect(failure(EvidenceBundle.read(storeRoot, ref)).kind).toBe("digest-mismatch");
  });
});

describe("EvidenceBundle.list", () => {
  test("an absent store lists nothing rather than failing", () => {
    const index = unwrap(EvidenceBundle.list(join(storeRoot, "never-created")));
    expect(index).toEqual({ refs: [], corrupted: [] });
  });

  test("lists every consistent envelope", () => {
    const first = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const second = unwrap(
      EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: first.digest }, meta),
    );
    const index = unwrap(EvidenceBundle.list(storeRoot));
    expect(index.refs.map((ref) => ref.digest).sort()).toEqual([first.digest, second.digest].sort());
    expect(index.corrupted).toEqual([]);
  });

  test("ignores the .tmp staging area", () => {
    unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    writeFileSync(join(storeRoot, ".tmp", "leftover.json"), "{}", "utf8");
    const index = unwrap(EvidenceBundle.list(storeRoot));
    expect(index.refs).toHaveLength(1);
    expect(index.corrupted).toEqual([]);
  });

  test("surfaces a file whose name does not match its bytes as corrupted", () => {
    unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    writeFileSync(join(storeRoot, `${"a".repeat(64)}.json`), "{}", "utf8");
    const index = unwrap(EvidenceBundle.list(storeRoot));
    expect(index.refs).toHaveLength(1);
    expect(index.corrupted).toEqual([
      { path: `${"a".repeat(64)}.json`, reason: "digest-filename-mismatch" },
    ]);
  });

  test("surfaces a digest-consistent but schema-invalid file as corrupted", () => {
    const bytes = new TextEncoder().encode('{"schema":1}');
    const digest = EvidenceEnvelopeCodec.bundleDigest(bytes);
    mkdirSync(storeRoot, { recursive: true });
    writeFileSync(join(storeRoot, EvidenceEnvelopeCodec.fileNameFor({ digest })), bytes);
    const index = unwrap(EvidenceBundle.list(storeRoot));
    expect(index.refs).toEqual([]);
    expect(index.corrupted).toEqual([
      { path: EvidenceEnvelopeCodec.fileNameFor({ digest }), reason: "schema-invalid" },
    ]);
  });
});

describe("interrupted build (BR-U1-02/08 fixture)", () => {
  test("staged bytes are invisible: the final position stays empty and verify says missing-part", () => {
    const bytes = EvidenceEnvelopeCodec.canonicalBytes({
      schema: 1,
      subjectIdentity: identity,
      evidence: terminalParts,
      predecessor: { kind: "root" },
      generatedAt: meta.generatedAt,
      generatedBy: meta.generatedBy,
    });
    const ref = { digest: EvidenceEnvelopeCodec.bundleDigest(bytes) };
    mkdirSync(join(storeRoot, ".tmp"), { recursive: true });
    writeFileSync(join(storeRoot, ".tmp", "interrupted.json"), bytes);

    expect(readdirSync(storeRoot).filter((name) => name.endsWith(".json"))).toEqual([]);
    expect(failure(EvidenceBundle.verify(storeRoot, ref, identity)).kind).toBe("missing-part");
    expect(unwrap(EvidenceBundle.head(storeRoot))).toEqual({ refs: [], corrupted: [] });
  });
});

describe("EvidenceBundle.head", () => {
  test("returns only the tip of a chain", () => {
    const root = unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    const tip = unwrap(EvidenceBundle.build(storeRoot, authoringParts, { kind: "bundle", digest: root.digest }, meta));
    const index = unwrap(EvidenceBundle.head(storeRoot));
    expect(index.refs).toEqual([tip]);
  });

  test("carries the corrupted list through unchanged", () => {
    unwrap(EvidenceBundle.build(storeRoot, terminalParts, { kind: "root" }, meta));
    writeFileSync(join(storeRoot, `${"b".repeat(64)}.json`), "{}", "utf8");
    expect(unwrap(EvidenceBundle.head(storeRoot)).corrupted).toEqual([
      { path: `${"b".repeat(64)}.json`, reason: "digest-filename-mismatch" },
    ]);
  });
});
