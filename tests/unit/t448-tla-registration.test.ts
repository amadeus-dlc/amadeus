import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { parseTlaModelMap } from "../../plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";
import {
  canonicalIdentity as shippedCanonicalIdentity,
  diffModelMap as diffShippedModelMap,
  evaluateTlaModelReadiness as evaluateShippedReadiness,
  findModelMapModel as findShippedModelMapModel,
  parseAuthoringProvenance as parseShippedAuthoringProvenance,
  parseTlaModelMap as parseShippedModelMap,
  resolveSpecRoots as resolveShippedSpecRoots,
} from "../../dist/plugins/formal-model-check/tools/amadeus-formal-verif-model-map.ts";
import {
  checkPreconditions,
  composeRegisteredMap,
  parseEntryDraft,
  parseModelMapSnapshot,
} from "../../plugins/formal-model-check/tools/tla-registration.ts";
import type {
  PreconditionFailure,
  RegistrationPreconditionsCandidate,
} from "../../plugins/formal-model-check/tools/tla-registration.ts";

// U4 C6 pin (business-rules.md BR-U4-01..18, business-logic-model.md §1/§2).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

const MODEL_IDENTITY = "a".repeat(64);
const CFG_IDENTITY = "b".repeat(64);
const IMPL_SHA = "c".repeat(64);
const BUNDLE_DIGEST = `sha256:${"d".repeat(64)}`;

const AUTHORING_PROVENANCE = {
  intentRecord: "amadeus/spaces/default/intents/260813-bolt-pr-attestation",
  execution: {
    auditShard: "amadeus/spaces/default/intents/260813-bolt-pr-attestation/audit/session.jsonl",
    timestamp: "2026-08-05T00:00:00Z",
    eventIdentity: "e".repeat(64),
  },
};

function modelEntry(name: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    name,
    model: { path: `amadeus/spaces/default/specs/tla/${name}.tla`, identity: MODEL_IDENTITY },
    cfg: { path: `amadeus/spaces/default/specs/tla/${name}.cfg`, identity: CFG_IDENTITY },
    entries: [{ implPath: "packages/framework/core/tools/amadeus-election.ts", sha256: IMPL_SHA }],
    ...extra,
  };
}

function mapBytes(models: readonly Record<string, unknown>[]): Uint8Array {
  return new TextEncoder().encode(JSON.stringify({ schemaVersion: 2, models }, null, 2));
}

describe("model-map validator: optional evidenceBundle key (Q1 ruling A)", () => {
  test("accepts an entry carrying an evidenceBundle reference", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST } })]));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.models[0]?.evidenceBundle).toEqual({ digest: BUNDLE_DIGEST });
  });

  test("still accepts an entry without evidenceBundle (existing four key sets)", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample")]));
    expect(parsed.ok).toBe(true);
  });

  test("rejects a malformed evidenceBundle digest", () => {
    const parsed = parseTlaModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: "sha256:xyz" } })]));
    expect(parsed.ok).toBe(false);
  });

  test("rejects extra keys inside evidenceBundle (exactObject semantics unchanged)", () => {
    const parsed = parseTlaModelMap(
      mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST, note: "x" } })]),
    );
    expect(parsed.ok).toBe(false);
  });

  // The neutral bundle is the shipped plugin copy that an install projects
  // into a host, so the same verdicts are pinned against the authoring source.
  test("the shipped plugin copy reaches the same verdicts", () => {
    expect(parseShippedModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST } })])).ok)
      .toBe(true);
    expect(parseShippedModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: "sha256:xyz" } })])).ok)
      .toBe(false);
    expect(
      parseShippedModelMap(mapBytes([modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST, note: "x" } })])).ok,
    ).toBe(false);
  });

  test("the shipped plugin copy exercises its exported parser seams", () => {
    const counters = { serializations: 0, hashes: 0, encodedBytes: 0 };
    const identity = shippedCanonicalIdentity({ z: [1, true], a: "value" }, undefined, counters);
    expect(identity.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(counters.serializations).toBe(1);
    expect(counters.hashes).toBe(1);
    expect(counters.encodedBytes).toBe(identity.bytes.byteLength);

    const missingWorkspace = "/tmp/amadeus-t448-shipped-copy-missing";
    expect(resolveShippedSpecRoots(missingWorkspace)).toEqual({
      space: "default",
      specsRoot: join(missingWorkspace, "amadeus", "spaces", "default", "specs"),
      tlaDir: join(missingWorkspace, "amadeus", "spaces", "default", "specs", "tla"),
      modelMapPath: join(missingWorkspace, "amadeus", "spaces", "default", "specs", "tla", "model-map.json"),
      evidenceRoot: join(missingWorkspace, "amadeus", "spaces", "default", "specs", "tla-evidence"),
    });

    const seamBytes = mapBytes([
      modelEntry("Sample", {
        auxiliaries: [{ path: "amadeus/spaces/default/specs/tla/Helper.tla", identity: MODEL_IDENTITY }],
        vocabulary: { namedInvariants: ["Invariant"], traceStateVariables: ["state"] },
        authoringProvenance: AUTHORING_PROVENANCE,
      }),
    ]);
    const seamLocation = "amadeus/spaces/default/specs/tla/model-map.json";
    const shippedParsed = parseShippedModelMap(seamBytes, seamLocation);
    expect(shippedParsed.ok).toBe(true);
    if (!shippedParsed.ok) return;
    const shippedModel = findShippedModelMapModel(shippedParsed.value, "Sample");
    expect(shippedModel?.name).toBe("Sample");
    expect(parseShippedAuthoringProvenance(AUTHORING_PROVENANCE).ok).toBe(true);
    expect(evaluateShippedReadiness(seamBytes, () => true, seamLocation).ok).toBe(true);
    const missingCfg = evaluateShippedReadiness(seamBytes, (path) => path.endsWith(".tla"), seamLocation);
    expect(missingCfg.ok).toBe(false);
    if (!missingCfg.ok) expect(missingCfg.error).toMatchObject({ code: "CFG_MISSING" });
    expect(diffShippedModelMap(shippedModel!, [{ implPath: "other.ts", sha256: IMPL_SHA }])).toEqual([
      { implPath: "packages/framework/core/tools/amadeus-election.ts", recorded: IMPL_SHA, current: null },
    ]);
  });
});

const SUBJECT_IDENTITY = `sha256:${"1".repeat(64)}`;

const APPROVAL = { shard: "audit/shard.jsonl", timestamp: "2026-08-05T00:00:00Z", eventIdentity: "f".repeat(64) };

function candidate(overrides: Record<string, unknown> = {}): RegistrationPreconditionsCandidate {
  return {
    applicability: {
      route: "author-new",
      subjectIdentity: SUBJECT_IDENTITY,
      subjectSeries: "series",
      subjects: ["FR-010"],
      reason: "J1",
      judgedBy: "author",
      humanApproval: null,
      generatedAt: "2026-08-05T00:00:00Z",
      predecessor: { kind: "root" },
    },
    coverage: {
      __brand: "CoverageProof",
      subjectsDigest: "s",
      rowsDigest: "r",
      invariantsDigest: "i",
    },
    freshness: { kind: "current" },
    proof: {
      tlcExploration: {
        outcome: "not-detected",
        completionMarker: "Model checking completed",
        stateStatistics: { statesGenerated: 10, distinctStates: 5 },
        toolchainVersionLine: "TLC2 Version 2.20",
      },
      fallingProofs: [],
      vacuityProof: { obligations: [] },
      reductionEvidence: { items: [] },
      boundIdentity: SUBJECT_IDENTITY,
    },
    review: {
      reviewer: "reviewer",
      modelAuthor: "author",
      verdict: "READY",
      reviewedAt: "2026-08-05T00:00:00Z",
      artifactDigests: [],
    },
    humanApproval: APPROVAL,
    ...overrides,
  };
}

function kindsOf(failures: readonly PreconditionFailure[]): readonly string[] {
  return failures.map((failure) => failure.kind);
}

function refuse(candidateValue: RegistrationPreconditionsCandidate): readonly PreconditionFailure[] {
  const checked = checkPreconditions(candidateValue, () => true);
  if (checked.ok) throw new Error("expected the preconditions to be refused");
  return checked.error;
}

describe("precondition gate (BR-U4-08..11)", () => {
  test("accepts a candidate whose six preconditions are all current", () => {
    const checked = checkPreconditions(candidate(), () => true);
    expect(checked.ok).toBe(true);
    if (!checked.ok) return;
    expect(checked.value.review.verdict).toBe("READY");
    expect(checked.value.freshness.kind).toBe("current");
  });

  test("refuses a terminal applicability route", () => {
    const failures = refuse(candidate({ applicability: { ...(candidate().applicability as object), route: "impl-only" } }));
    expect(failures).toEqual([{ kind: "precondition-missing", precondition: "applicability-route" }]);
  });

  test("refuses a missing coverage proof", () => {
    expect(kindsOf(refuse(candidate({ coverage: undefined })))).toEqual(["precondition-missing"]);
  });

  test("refuses a missing proof evidence", () => {
    expect(refuse(candidate({ proof: { fallingProofs: [] } }))).toEqual([
      { kind: "precondition-missing", precondition: "proof" },
    ]);
  });

  test("refuses stale evidence (FR-007, AC-006)", () => {
    const recorded = `sha256:${"2".repeat(64)}`;
    const failures = refuse(candidate({ freshness: { kind: "stale", recorded, current: SUBJECT_IDENTITY } }));
    expect(failures).toEqual([{ kind: "stale-evidence", recorded, current: SUBJECT_IDENTITY }]);
  });

  test("refuses a non-READY review", () => {
    const review = { ...(candidate().review as object), verdict: "NOT-READY" };
    expect(refuse(candidate({ review }))).toEqual([{ kind: "precondition-missing", precondition: "review" }]);
  });

  test("refuses a self-review (FR-009)", () => {
    const review = { ...(candidate().review as object), reviewer: "author" };
    expect(refuse(candidate({ review }))).toEqual([
      { kind: "reviewer-not-independent", reviewer: "author", modelAuthor: "author" },
    ]);
  });

  test("refuses an empty modelAuthor even when the names differ", () => {
    const review = { ...(candidate().review as object), modelAuthor: "" };
    expect(refuse(candidate({ review }))).toEqual([
      { kind: "reviewer-not-independent", reviewer: "reviewer", modelAuthor: "" },
    ]);
  });

  test("refuses an empty reviewer", () => {
    const review = { ...(candidate().review as object), reviewer: "" };
    expect(kindsOf(refuse(candidate({ review })))).toEqual(["reviewer-not-independent"]);
  });

  test("refuses an approval whose provenance does not re-verify (BR-U4-11)", () => {
    const checked = checkPreconditions(candidate(), () => false);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(checked.error).toEqual([{ kind: "approval-provenance-invalid" }]);
  });

  test("refuses a missing approval reference", () => {
    expect(kindsOf(refuse(candidate({ humanApproval: undefined })))).toEqual(["approval-provenance-invalid"]);
  });

  test("collects every failing precondition rather than stopping at the first (BR-U4-15)", () => {
    const failures = refuse(
      candidate({
        coverage: undefined,
        freshness: { kind: "stale", recorded: SUBJECT_IDENTITY, current: SUBJECT_IDENTITY },
      }),
    );
    expect(kindsOf(failures)).toEqual(["precondition-missing", "stale-evidence"]);
  });

  test("collects all six failures when nothing is supplied", () => {
    const checked = checkPreconditions({}, () => true);
    expect(checked.ok).toBe(false);
    if (checked.ok) return;
    expect(kindsOf(checked.error)).toEqual([
      "precondition-missing",
      "precondition-missing",
      "stale-evidence",
      "precondition-missing",
      "precondition-missing",
      "approval-provenance-invalid",
    ]);
  });
});

const EXISTING_MAP = `${JSON.stringify(
  { schemaVersion: 2, models: [modelEntry("Mirror")] },
  null,
  2,
)}\n`;

describe("draft admission and map composition (BR-U4-05/12/17)", () => {
  test("refuses a draft with no evidenceBundle reference (BR-U4-05)", () => {
    const parsed = parseEntryDraft(modelEntry("Sample"));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.kind).toBe("validator-rejected");
  });

  test("refuses a draft without intent-record authoring provenance", () => {
    const parsed = parseEntryDraft(modelEntry("Sample", { evidenceBundle: { digest: BUNDLE_DIGEST } }));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error).toMatchObject({ kind: "validator-rejected" });
    expect(parsed.error).toMatchObject({ detail: "draft must carry authoringProvenance" });
  });

  test("refuses a draft that is not an object with a name", () => {
    expect(parseEntryDraft("Sample").ok).toBe(false);
    expect(parseEntryDraft({ evidenceBundle: { digest: BUNDLE_DIGEST } }).ok).toBe(false);
  });

  test("refuses a draft whose evidenceBundle digest is malformed", () => {
    const parsed = parseEntryDraft(modelEntry("Sample", { evidenceBundle: { digest: "sha256:nope" } }));
    expect(parsed.ok).toBe(false);
  });

  test("accepts a draft carrying a well-formed reference", () => {
    const parsed = parseEntryDraft(modelEntry("Sample", {
      evidenceBundle: { digest: BUNDLE_DIGEST },
      authoringProvenance: AUTHORING_PROVENANCE,
    }));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.name).toBe("Sample");
  });

  test("author-new composes the draft into the map, sorted by name, and keeps the existing entry byte for byte", () => {
    const snapshot = parseModelMapSnapshot(EXISTING_MAP);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    const draft = parseEntryDraft(modelEntry("Election", {
      evidenceBundle: { digest: BUNDLE_DIGEST },
      authoringProvenance: AUTHORING_PROVENANCE,
    }));
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const composed = composeRegisteredMap(snapshot.value, draft.value, "author-new");
    expect(composed.ok).toBe(true);
    if (!composed.ok) return;
    const document = JSON.parse(composed.value);
    expect(document.models.map((model: { name: string }) => model.name)).toEqual(["Election", "Mirror"]);
    expect(JSON.stringify(document.models[1], null, 2)).toEqual(JSON.stringify(modelEntry("Mirror"), null, 2));
    expect(composed.value.endsWith("\n")).toBe(true);
  });

  // Scoped to the author-new arm: a duplicate name is what append means there.
  // The revise-model arm reaches the same name by replacement instead
  // (FR-REG-4, route-dependent composition below).
  test("author-new refuses a draft that duplicates a registered name (validator on the whole map)", () => {
    const snapshot = parseModelMapSnapshot(EXISTING_MAP);
    expect(snapshot.ok).toBe(true);
    if (!snapshot.ok) return;
    const draft = parseEntryDraft(modelEntry("Mirror", {
      evidenceBundle: { digest: BUNDLE_DIGEST },
      authoringProvenance: AUTHORING_PROVENANCE,
    }));
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;

    const composed = composeRegisteredMap(snapshot.value, draft.value, "author-new");
    expect(composed.ok).toBe(false);
    if (composed.ok) return;
    expect(composed.error).toMatchObject({ kind: "validator-rejected" });
  });

  test("refuses a snapshot the existing validator rejects", () => {
    expect(parseModelMapSnapshot('{"schemaVersion":3,"models":[]}').ok).toBe(false);
    expect(parseModelMapSnapshot("not json").ok).toBe(false);
  });
});

// The revise-model arm (#2289 / FR-REG-1..3). Before the route reached the
// composer, an absent-name revise draft was appended and accepted — the
// fail-open XR-260820-2289 F1 names. The three faces below pin the replacement,
// the loud refusal that closes that fail-open, and the author-new arm's
// unchanged duplicate-name verdict.
const REVISED_MIRROR = {
  ...modelEntry("Mirror"),
  evidenceBundle: { digest: BUNDLE_DIGEST },
  authoringProvenance: AUTHORING_PROVENANCE,
};

const TWO_ENTRY_MAP = `${JSON.stringify(
  { schemaVersion: 2, models: [modelEntry("Election"), modelEntry("Mirror")] },
  null,
  2,
)}\n`;

function admittedDraft(value: Record<string, unknown>) {
  const draft = parseEntryDraft(value);
  expect(draft.ok).toBe(true);
  if (!draft.ok) throw new Error(`expected the draft to be admitted: ${draft.error.kind}`);
  return draft.value;
}

function admittedSnapshot(bytes: string) {
  const snapshot = parseModelMapSnapshot(bytes);
  expect(snapshot.ok).toBe(true);
  if (!snapshot.ok) throw new Error(`expected the snapshot to parse: ${snapshot.error.kind}`);
  return snapshot.value;
}

describe("route-dependent composition (FR-REG-1..3)", () => {
  test("revise-model replaces the entry of the same name and leaves the others byte for byte", () => {
    const snapshot = admittedSnapshot(TWO_ENTRY_MAP);
    const draft = admittedDraft(REVISED_MIRROR);

    const composed = composeRegisteredMap(snapshot, draft, "revise-model");
    expect(composed.ok).toBe(true);
    if (!composed.ok) throw new Error(`expected the revision to compose: ${composed.error.kind}`);
    const document = JSON.parse(composed.value);
    expect(document.models.map((model: { name: string }) => model.name)).toEqual(["Election", "Mirror"]);
    expect(document.models[1]).toEqual(REVISED_MIRROR);
    // The draft's own provenance is what the revised entry carries
    // (FR-REG-3, last writer wins).
    expect(document.models[1].authoringProvenance).toEqual(AUTHORING_PROVENANCE);
    expect(JSON.stringify(document.models[0], null, 2)).toEqual(JSON.stringify(modelEntry("Election"), null, 2));
    expect(composed.value.endsWith("\n")).toBe(true);
  });

  test("revise-model refuses a draft naming no registered entry instead of appending it (FR-REG-2)", () => {
    const snapshot = admittedSnapshot(EXISTING_MAP);
    const draft = admittedDraft(modelEntry("Absent", {
      evidenceBundle: { digest: BUNDLE_DIGEST },
      authoringProvenance: AUTHORING_PROVENANCE,
    }));

    const composed = composeRegisteredMap(snapshot, draft, "revise-model");
    expect(composed.ok).toBe(false);
    if (composed.ok) throw new Error("expected the absent revision target to be refused");
    expect(composed.error).toEqual({ kind: "revise-target-missing", name: "Absent" });
  });
});
