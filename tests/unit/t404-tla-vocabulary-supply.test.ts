import { describe, expect, test } from "bun:test";
import {
  createFrozenTlaModelReceipt,
  generateFrozenTlaModel,
  namedInvariantsFor,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";
import { loadVerifiedTlaSource } from "../../plugins/formal-model-check/tools/tla-model-loader.ts";
import {
  findModelMapModel,
  type ModelMapModel,
} from "../../plugins/formal-model-check/tools/tla-model-map.ts";
import {
  FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
  parseTlcOutput174,
  traceLabelPattern,
  traceVocabularyFor,
} from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";

// u3 AC1/AC2 pin: the model-map vocabulary is the single source of the
// per-model trace/invariant vocabulary. Changing a value, its order, or its
// count must fail this file (FR-6 — the drift pin does not cover vocabulary).
const FORMAL_ELECTION_NAMED_INVARIANTS = [
  "ChoiceWinner",
  "UnknownChoiceRejected",
  "ReceivedAtAxis",
  "InvalidTimestampRejected",
  "AmendSubmission",
  "UnknownRefRejected",
  "PerVoterResolution",
] as const;

const FORMAL_ELECTION_TRACE_STATE_VARIABLES = [
  "initialBudget",
  "amendBudget",
  "accepted",
  "holdMarkers",
  "holdBudget",
  "tally",
  "reexamRequired",
] as const;

// MirrorLifecycle values are u4's declaration responsibility; this fixture
// fixes the supply-side contract (cfg-measured invariants, VARIABLES-measured
// state tuple — tuple order provisional pending the u5 AsIntended run).
const MIRROR_LIFE_CYCLE_FIXTURE: ModelMapModel = {
  name: "MirrorLifecycle",
  model: { path: "specs/tla/MirrorLifecycle.tla", identity: "0".repeat(64) },
  cfg: { path: "specs/tla/MirrorLifecycle.cfg", identity: "1".repeat(64) },
  entries: [{ implPath: "packages/framework/core/tools/amadeus-mirror-types.ts", sha256: "2".repeat(64) }],
  vocabulary: {
    namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
    traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
  },
};

function formalElectionModel(): ModelMapModel {
  // The declaration under test is the loader-verified map itself (the single
  // source), reached through the production loader path.
  const source = loadVerifiedTlaSource();
  if (!source.ok) throw new Error(JSON.stringify(source.error));
  const model = findModelMapModel(source.value.modelMap, "FormalElection");
  if (model === undefined) throw new Error("FormalElection is not registered");
  return model;
}

describe("t404: per-model vocabulary supply", () => {
  test("pins the FormalElection vocabulary in the model map byte-for-byte (AC1)", () => {
    const model = formalElectionModel();
    expect(model.vocabulary?.namedInvariants).toEqual([...FORMAL_ELECTION_NAMED_INVARIANTS]);
    expect(model.vocabulary?.traceStateVariables).toEqual([...FORMAL_ELECTION_TRACE_STATE_VARIABLES]);
    // The declaration did not disturb the drift-pinned identity values. The
    // module identity moved once, with the resolution axis revision published
    // through updateModelMap (ruling Q2=A, 2026-08-05 — Issue #1946, FR-2f);
    // the cfg was untouched, which is why only the module value changed here.
    expect(model.model.identity).toBe("e8cc39a918d6893dc3b8e2f31d8e81857e1885ac0f93dec6212ec2a0b11e7213");
    expect(model.cfg.identity).toBe("92656a5c8cf2a83a0251bc35fef8c8260e9cb1baec459bef2d87a104474ed62b");
    expect(model.entries.length).toBe(5);
  });

  test("keeps the frozen model receipt identical under map-supplied vocabulary (AC1)", () => {
    const first = createFrozenTlaModelReceipt(generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) }));
    const second = createFrozenTlaModelReceipt(generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) }));
    expect(second).toEqual(first);
    expect(Object.keys(first.namedInvariantFormulas)).toEqual([...FORMAL_ELECTION_NAMED_INVARIANTS]);
    expect(Object.keys(first.invariantSourceMap)).toEqual([...FORMAL_ELECTION_NAMED_INVARIANTS]);
    // Regeneration is deterministic and identity-stable across the refactor.
    expect(first.modelIdentity).toMatch(/^[0-9a-f]{64}$/);
  });

  test("resolves the MirrorLifecycle fixture vocabulary and binds its trace labels (AC2 supply contract)", () => {
    const vocabulary = traceVocabularyFor(MIRROR_LIFE_CYCLE_FIXTURE);
    expect(vocabulary).toEqual({
      ok: true,
      value: {
        moduleName: "MirrorLifecycle",
        namedInvariants: ["TypeOK", "NoCloseWithoutLandedSync", "NoDuplicateCreate"],
        traceStateVariables: ["receipts", "issueNumber", "boundaryIdx"],
      },
    });
    if (!vocabulary.ok) return;
    // Label acceptance is module-bound in both directions: each vocabulary
    // accepts its own labels and rejects the other model's.
    const mirrorLabel = "<Close line 42, col 3 to line 43, col 9 of module MirrorLifecycle>";
    const electionLabel = "<Tally line 133, col 3 to line 134, col 9 of module FormalElection>";
    expect(traceLabelPattern(vocabulary.value.moduleName).test(mirrorLabel)).toBe(true);
    expect(traceLabelPattern(vocabulary.value.moduleName).test(electionLabel)).toBe(false);
    expect(traceLabelPattern("FormalElection").test(electionLabel)).toBe(true);
    expect(traceLabelPattern("FormalElection").test(mirrorLabel)).toBe(false);
    // The invariant set is the model's own closed set — no union with
    // FormalElection names (ADR-5 rejected-alternative (a) guard).
    expect(vocabulary.value.namedInvariants).not.toContain("ChoiceWinner");
  });

  test("fails closed when a model declares no vocabulary (AC2)", () => {
    const { vocabulary: _omitted, ...withoutVocabulary } = MIRROR_LIFE_CYCLE_FIXTURE;
    const invariants = namedInvariantsFor(withoutVocabulary);
    expect(invariants).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
    const trace = traceVocabularyFor(withoutVocabulary);
    expect(trace).toMatchObject({
      ok: false,
      error: { kind: "MODEL_LOAD", code: "MODEL_MAP_INVALID" },
    });
    // No silent fallback: neither an empty set nor another model's vocabulary.
    if (invariants.ok) throw new Error("namedInvariantsFor must not succeed without a vocabulary");
    if (trace.ok) throw new Error("traceVocabularyFor must not succeed without a vocabulary");
  });

  test("rejects a counterexample invariant outside the requested model's closed set (AC2, no union)", () => {
    const mirrorVocabulary = traceVocabularyFor(MIRROR_LIFE_CYCLE_FIXTURE);
    if (!mirrorVocabulary.ok) throw new Error("fixture vocabulary must resolve");
    const modelReceipt = createFrozenTlaModelReceipt(
      generateFrozenTlaModel({ publicContractIdentity: "a".repeat(64) }),
    );
    const encoder = new TextEncoder();
    const envelope = (code: number, severity: number, payload: string) =>
      `@!@!@STARTMSG ${code}:${severity} @!@!@\n${payload}\n@!@!@ENDMSG ${code} @!@!@\n`;
    const output = [
      envelope(2262, 0, "TLC2 Version 2.19 of 08 August 2024 (rev: 5a47802)"),
      envelope(2187, 0, "Running breadth-first search Model-Checking with fp 92 and seed 5 with 1 worker."),
      envelope(2220, 0, "Starting SANY..."),
      [
        "Parsing file /workspace/FormalElection.tla",
        "Parsing file /fixed/Naturals.tla",
        "Parsing file /fixed/Sequences.tla",
        "Parsing file /fixed/FiniteSets.tla",
        "Parsing file /fixed/TLC.tla",
        "Semantic processing of module Naturals",
        "Semantic processing of module Sequences",
        "Semantic processing of module FiniteSets",
        "Semantic processing of module TLC",
        "Semantic processing of module FormalElection",
        "",
      ].join("\n"),
      envelope(2219, 0, "SANY finished."),
      envelope(2185, 0, "Starting... (2026-07-21 09:26:25)"),
      envelope(2189, 0, "Computing initial states..."),
      envelope(2190, 0, "Finished computing initial states: 1 distinct state generated at 2026-07-21 09:26:25."),
      // ChoiceWinner belongs to FormalElection — under the MirrorLifecycle
      // vocabulary it is an unknown invariant and must be rejected, proving
      // the membership check is per-model rather than a union.
      envelope(2110, 1, "Invariant ChoiceWinner is violated."),
      envelope(2121, 1, "The behavior up to this point is:"),
      // Two ordered trace states carrying the MirrorLifecycle variable tuple,
      // so the rejection below is attributable to the invariant membership
      // check alone (the trace itself satisfies the mirror vocabulary).
      envelope(2217, 4, [
        "1: <Initial predicate>",
        "/\\ receipts = <<>>",
        "/\\ issueNumber = 0",
        "/\\ boundaryIdx = 0",
      ].join("\n")),
      envelope(2217, 4, [
        "2: <Close line 42, col 3 to line 43, col 9 of module MirrorLifecycle>",
        "/\\ receipts = <<>>",
        "/\\ issueNumber = 1",
        "/\\ boundaryIdx = 0",
      ].join("\n")),
      envelope(2199, 0, "3 states generated, 2 distinct states found, 0 states left on queue."),
      envelope(2194, 0, "The depth of the complete state graph search is 2."),
      envelope(2186, 0, "Finished in 272ms at (2026-07-21 09:26:25)"),
    ].join("");
    const result = parseTlcOutput174({
      chunks: [encoder.encode(output)],
      exitCode: 12,
      signal: null,
      timedOut: false,
      expectedModuleName: "FormalElection",
      expectedModulePath: "/workspace/FormalElection.tla",
      expectedStandardModuleDirectory: "/fixed",
      verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      modelReceipt,
      vocabulary: mirrorVocabulary.value,
    });
    expect(result).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "GRAMMAR",
      detail: "counterexample invariant is outside the frozen set",
    });
    const absentSourceMapResult = parseTlcOutput174({
      chunks: [encoder.encode(output.replace(
        "Invariant ChoiceWinner is violated.",
        "Invariant NoCloseWithoutLandedSync is violated.",
      ))],
      exitCode: 12,
      signal: null,
      timedOut: false,
      expectedModuleName: "FormalElection",
      expectedModulePath: "/workspace/FormalElection.tla",
      expectedStandardModuleDirectory: "/fixed",
      verifiedArtifactDescriptorIdentity: FIXED_TLC_ARTIFACT_DESCRIPTOR_IDENTITY,
      modelReceipt,
      vocabulary: mirrorVocabulary.value,
    });
    expect(absentSourceMapResult).toMatchObject({
      kind: "HARNESS_ERROR",
      reason: "GRAMMAR",
      detail: "counterexample source map or trace is invalid",
    });
  });
});
