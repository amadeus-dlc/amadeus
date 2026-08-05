import { describe, expect, test } from "bun:test";
import {
  InvariantNameCodec,
  MutationSource,
  ProofObligations,
  TraceCoverage,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";
import { IdentityDigest } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { StableId } from "../../plugins/formal-model-check/tools/tla-evidence.ts";
import type { TlcExploration } from "../../plugins/formal-model-check/tools/tlc-toolchain.ts";
import type {
  CoverageFailure,
  CoverageProof,
  InvariantName,
  ModelArtifacts,
  MutationWorkshop,
  ProofEvidence,
  ProofFailure,
  ReductionManifest,
  TlcRunRequest,
  TlcToolchain,
  TraceRow,
} from "../../plugins/formal-model-check/tools/tla-referees.ts";

// U3 C3 pin (business-rules.md BR-U3-06..11, business-logic-model.md §1).
// Pure layer only: no filesystem, so this stays a unit-size test
// (cid:code-generation:fs-tests-integration-first).

function unwrap<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): T {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.error)}`);
  return result.value;
}

function failure<T, E>(result: { ok: true; value: T } | { ok: false; error: E }): E {
  if (result.ok) throw new Error(`expected failure, got ${JSON.stringify(result.value)}`);
  return result.error;
}

function subject(raw: string): StableId {
  return unwrap(IdentityDigest.normalizeStableId(raw));
}

function invariant(raw: string): InvariantName {
  return unwrap(InvariantNameCodec.parse(raw));
}

function row(subjectRaw: string, invariantRaw: string, rationale = "trace"): TraceRow {
  return { subject: subject(subjectRaw), invariant: invariant(invariantRaw), rationale };
}

describe("InvariantNameCodec.parse", () => {
  test.each(["TypeOK", "NoCloseWithoutLandedSync", "_private", "Inv2"])("accepts %s", (raw) => {
    expect(String(unwrap(InvariantNameCodec.parse(raw)))).toBe(raw);
  });

  test.each(["2Inv", "has space", "dash-name", "", "Inv!"])("rejects %p", (raw) => {
    expect(failure(InvariantNameCodec.parse(raw))).toEqual({
      kind: "invalid-invariant-name",
      tokens: [raw],
    });
  });
});

describe("TraceCoverage.evaluate — full coverage", () => {
  test("mints a CoverageProof when every subject and invariant is bound", () => {
    const proof: CoverageProof = unwrap(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-008")],
        [row("FR-006", "TypeOK"), row("FR-008", "NoDuplicateCreate")],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(proof.subjectsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(proof.rowsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(proof.invariantsDigest).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  test("digests ignore input order (NFR-001 determinism)", () => {
    const subjects = [subject("FR-006"), subject("FR-008")];
    const rows = [row("FR-006", "TypeOK"), row("FR-008", "NoDuplicateCreate")];
    const invariants = [invariant("TypeOK"), invariant("NoDuplicateCreate")];
    const forward = unwrap(TraceCoverage.evaluate(subjects, rows, invariants));
    const reversed = unwrap(
      TraceCoverage.evaluate([...subjects].reverse(), [...rows].reverse(), [...invariants].reverse()),
    );
    expect(reversed).toEqual(forward);
  });

  test("a rationale-free row is unresolvable rather than a proof (FR-006 auditability)", () => {
    const failed: CoverageFailure = failure(
      TraceCoverage.evaluate(
        [subject("FR-006")],
        [row("FR-006", "TypeOK", "")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed.unresolvedRows).toHaveLength(1);
  });
});

describe("TraceCoverage.evaluate — the four defect classes", () => {
  test("BR-U3-08: a subject no row names lands in uncoveredSubjects", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-008")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed).toEqual({
      kind: "coverage-failure",
      uncoveredSubjects: [subject("FR-008")],
      orphanInvariants: [],
      duplicateSubjects: [],
      unresolvedRows: [],
    });
  });

  test("BR-U3-09: a declared invariant no row names lands in orphanInvariants", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(failed.orphanInvariants).toEqual([invariant("NoDuplicateCreate")]);
    expect(failed.uncoveredSubjects).toEqual([]);
  });

  test("BR-U3-06: a repeated subject lands in duplicateSubjects once", () => {
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-006"), subject("FR-006")],
        [row("FR-006", "TypeOK")],
        [invariant("TypeOK")],
      ),
    );
    expect(failed.duplicateSubjects).toEqual([subject("FR-006")]);
    expect(failed.unresolvedRows).toEqual([]);
  });

  test("BR-U3-07: a row whose subject is unknown lands in unresolvedRows, not duplicateSubjects", () => {
    const stray = row("FR-009", "TypeOK");
    const failed = failure(
      TraceCoverage.evaluate([subject("FR-006")], [row("FR-006", "TypeOK"), stray], [invariant("TypeOK")]),
    );
    expect(failed.unresolvedRows).toEqual([stray]);
    expect(failed.duplicateSubjects).toEqual([]);
  });

  test("BR-U3-07: a row whose invariant is undeclared lands in unresolvedRows", () => {
    const stray = row("FR-006", "Undeclared");
    const failed = failure(
      TraceCoverage.evaluate([subject("FR-006")], [row("FR-006", "TypeOK"), stray], [invariant("TypeOK")]),
    );
    expect(failed.unresolvedRows).toEqual([stray]);
    expect(failed.orphanInvariants).toEqual([]);
  });

  test("BR-U3-10: all four defect classes are enumerated at once, not short-circuited", () => {
    const unknownSubject = row("FR-009", "TypeOK");
    const undeclaredInvariant = row("FR-006", "Undeclared");
    const failed = failure(
      TraceCoverage.evaluate(
        [subject("FR-006"), subject("FR-007"), subject("FR-008"), subject("FR-008")],
        [row("FR-006", "TypeOK"), row("FR-008", "TypeOK"), unknownSubject, undeclaredInvariant],
        [invariant("TypeOK"), invariant("NoDuplicateCreate")],
      ),
    );
    expect(failed).toEqual({
      kind: "coverage-failure",
      uncoveredSubjects: [subject("FR-007")],
      orphanInvariants: [invariant("NoDuplicateCreate")],
      duplicateSubjects: [subject("FR-008")],
      unresolvedRows: [unknownSubject, undeclaredInvariant],
    });
  });
});

// ---------------------------------------------------------------------------
// U3 C5 pin (business-rules.md BR-U3-12..17, business-logic-model.md §2).
// The decision table runs against a fake toolchain and a fake workshop, so the
// five obligations stay in-process and filesystem-free.
// ---------------------------------------------------------------------------

const IDENTITY = IdentityDigest.aggregateDigest([
  [subject("FR-008"), IdentityDigest.contentDigest(subject("FR-008"), "body")],
]);
const OTHER_IDENTITY = IdentityDigest.aggregateDigest([
  [subject("FR-006"), IdentityDigest.contentDigest(subject("FR-006"), "other")],
]);

const MODEL: ModelArtifacts = {
  modulePath: "specs/tla/Sample.tla",
  configPath: "specs/tla/Sample.cfg",
  reductionManifestPath: "specs/tla/Sample.reduction.json",
};

const COMPLETE: TlcExploration = {
  kind: "COMPLETE",
  generatedStates: 12,
  distinctStates: 7,
  statesLeftOnQueue: 0,
  searchDepth: 4,
  completionMarker: "Model checking completed. No error has been found.",
  terminationReason: "EXHAUSTED",
};

function counterexample(invariantName: string, identity: string): TlcExploration {
  return {
    kind: "COUNTEREXAMPLE",
    invariant: invariantName,
    sourceLocation: { line: 1, column: 1 },
    trace: [],
    counterexampleIdentity: identity,
    generatedStates: 3,
    distinctStates: 2,
    statesLeftOnQueue: 0,
    searchDepth: 1,
  };
}

const HARNESS_ERROR: TlcExploration = { kind: "HARNESS_ERROR", reason: "TIMEOUT", detail: "120s" };

function manifest(overrides: Partial<ReductionManifest> = {}): ReductionManifest {
  return {
    declaredIdentity: IDENTITY,
    items: [
      {
        reductionItem: "MaxReceipts=3",
        preservedMeaning: "unbounded receipt growth is represented by three slots",
        sourceSubjects: [subject("FR-008")],
      },
    ],
    injections: {
      TypeOK: {
        witness: "receipts # {}",
        fallingMutation: { find: "TypeOK ==", replace: "TypeOK == FALSE /\\" },
      },
    },
    ...overrides,
  };
}

/** A toolchain whose verdict per run kind is dictated by the test. */
function fakeToolchain(
  verdicts: Partial<Record<TlcRunRequest["kind"], TlcExploration>> = {},
): { toolchain: TlcToolchain } {
  const toolchain: TlcToolchain = {
    versionLine: "TLC2 Version 2.19",
    run: (request) => {
      const dictated = verdicts[request.kind];
      if (dictated !== undefined) return Promise.resolve(dictated);
      return Promise.resolve(
        request.kind === "baseline" ? COMPLETE : counterexample("X", `ce-${request.kind}`),
      );
    },
  };
  return { toolchain };
}

function fakeWorkshop(failFor: readonly string[] = []): MutationWorkshop {

  return {
    prepare: (_model, spec) =>
      Promise.resolve(
        failFor.includes(spec.kind)
          ? { ok: false, error: { kind: "mutation-failure", detail: `cannot build ${spec.kind}` } }
          : {
              ok: true,
              value: {
                modulePath: `/tmp/${spec.kind}/Sample.tla`,
                configPath: `/tmp/${spec.kind}/Sample.cfg`,
                mutationRef: `${spec.kind}:${spec.invariant}`,
              },
            },
      ),
    discard: () => {},
  };
}

function evaluateProof(options: {
  readonly toolchain?: TlcToolchain;
  readonly workshop?: MutationWorkshop;
  readonly manifest?: ReductionManifest | { readonly kind: "manifest-failure"; readonly detail: string };
  readonly identity?: string;
}) {
  const loaded = options.manifest ?? manifest();
  return ProofObligations.evaluate(
    MODEL,
    [invariant("TypeOK")],
    (options.identity ?? IDENTITY) as typeof IDENTITY,
    options.toolchain ?? fakeToolchain().toolchain,
    {
      workshop: options.workshop ?? fakeWorkshop(),
      readManifest: () =>
        "kind" in loaded && loaded.kind === "manifest-failure"
          ? { ok: false, error: { kind: "manifest-failure", detail: loaded.detail } }
          : { ok: true, value: loaded as ReductionManifest },
    },
  );
}

describe("ProofObligations.evaluate — all five obligations satisfied", () => {
  test("mints ProofEvidence bound to the current identity", async () => {
    const evidence: ProofEvidence = unwrap(await evaluateProof({}));
    expect(evidence.tlcExploration).toEqual({
      outcome: "not-detected",
      completionMarker: COMPLETE.completionMarker,
      stateStatistics: { statesGenerated: 12, distinctStates: 7 },
      toolchainVersionLine: "TLC2 Version 2.19",
    });
    expect(evidence.fallingProofs).toEqual([
      {
        invariant: invariant("TypeOK"),
        mutationRef: "falling:TypeOK",
        detectedOutcome: "detected",
        counterexampleIdentity: "ce-falling",
      },
    ]);
    expect(evidence.vacuityProof.obligations).toEqual([
      {
        invariant: invariant("TypeOK"),
        witness: "receipts # {}",
        detectedOutcome: "witness-reachable",
        counterexampleIdentity: "ce-vacuity",
      },
    ]);
    expect(evidence.reductionEvidence.items).toHaveLength(1);
    expect(evidence.boundIdentity).toBe(IDENTITY);
  });

  test("BR-U3-05: every mutation plan is discarded after it is measured", async () => {
    const discarded: string[] = [];
    const workshop = fakeWorkshop();
    const spy: MutationWorkshop = {
      prepare: workshop.prepare,
      discard: (plan) => {
        discarded.push(plan.mutationRef);
        workshop.discard(plan);
      },
    };
    await evaluateProof({ workshop: spy });
    expect(discarded).toEqual(["falling:TypeOK", "vacuity:TypeOK"]);
  });
});

describe("ProofObligations.evaluate — the five failure branches", () => {
  test("BR-U3-12: a timeout on the baseline run is missing tlc-exploration, not a success", async () => {
    const { toolchain } = fakeToolchain({ baseline: HARNESS_ERROR });
    const failed: ProofFailure = failure(await evaluateProof({ toolchain }));
    expect(failed.missing).toEqual(["tlc-exploration"]);
    expect(failed.detail).toContain("TIMEOUT");
  });

  test("BR-U3-12: a counterexample on the baseline run withholds the receipt", async () => {
    const { toolchain } = fakeToolchain({ baseline: counterexample("TypeOK", "ce-base") });
    expect(failure(await evaluateProof({ toolchain })).missing).toEqual(["tlc-exploration"]);
  });

  test("BR-U3-12: a COMPLETE run without a completion marker withholds the receipt", async () => {
    const hollow = { ...COMPLETE, completionMarker: "" } as unknown as TlcExploration;
    const { toolchain } = fakeToolchain({ baseline: hollow });
    expect(failure(await evaluateProof({ toolchain })).missing).toEqual(["tlc-exploration"]);
  });

  test("BR-U3-12: a COMPLETE run without state statistics withholds the receipt", async () => {
    const hollow = { ...COMPLETE, distinctStates: null } as unknown as TlcExploration;
    const { toolchain } = fakeToolchain({ baseline: hollow });
    expect(failure(await evaluateProof({ toolchain })).missing).toEqual(["tlc-exploration"]);
  });

  test("BR-U3-14: a mutation that fails to go red (blank injection) fails falling proof", async () => {
    const { toolchain } = fakeToolchain({ falling: COMPLETE });
    const failed = failure(await evaluateProof({ toolchain }));
    expect(failed.missing).toEqual(["falling-proof"]);
    expect(failed.failedFallingInvariants).toEqual([invariant("TypeOK")]);
  });

  test("BR-U3-13: an unbuildable falling mutation fails that invariant", async () => {
    const failed = failure(await evaluateProof({ workshop: fakeWorkshop(["falling"]) }));
    expect(failed.missing).toEqual(["falling-proof"]);
    expect(failed.failedFallingInvariants).toEqual([invariant("TypeOK")]);
  });

  test("BR-U3-14a: an undeclared witness fails vacuity proof", async () => {
    const failed = failure(
      await evaluateProof({
        manifest: manifest({ injections: {} }),
      }),
    );
    expect(failed.missing).toContain("vacuity-proof");
    expect(failed.failedVacuityInvariants).toEqual([invariant("TypeOK")]);
  });

  test("BR-U3-14a: an unreachable witness (NOT_DETECTED) fails vacuity proof", async () => {
    const { toolchain } = fakeToolchain({ vacuity: COMPLETE });
    const failed = failure(await evaluateProof({ toolchain }));
    expect(failed.missing).toEqual(["vacuity-proof"]);
    expect(failed.failedVacuityInvariants).toEqual([invariant("TypeOK")]);
  });

  test("BR-U3-15: a reduction item without preserved meaning fails reduction evidence", async () => {
    const failed = failure(
      await evaluateProof({
        manifest: manifest({
          items: [{ reductionItem: "MaxReceipts=3", preservedMeaning: "", sourceSubjects: [subject("FR-008")] }],
        }),
      }),
    );
    expect(failed.missing).toEqual(["reduction-evidence"]);
  });

  test("BR-U3-15: a reduction item with no source subjects fails reduction evidence", async () => {
    const failed = failure(
      await evaluateProof({
        manifest: manifest({
          items: [{ reductionItem: "MaxReceipts=3", preservedMeaning: "kept", sourceSubjects: [] }],
        }),
      }),
    );
    expect(failed.missing).toEqual(["reduction-evidence"]);
  });

  test("BR-U3-15a: a manifest with no declared identity fails identity binding", async () => {
    const failed = failure(await evaluateProof({ manifest: manifest({ declaredIdentity: "" }) }));
    expect(failed.missing).toEqual(["identity-binding"]);
  });

  test("BR-U3-15a: a stale declared identity fails identity binding", async () => {
    const failed = failure(await evaluateProof({ manifest: manifest({ declaredIdentity: OTHER_IDENTITY }) }));
    expect(failed.missing).toEqual(["identity-binding"]);
    expect(failed.detail).toContain("stale");
  });

  test("BR-U3-16: every missing obligation is enumerated at once", async () => {
    const { toolchain } = fakeToolchain({ baseline: HARNESS_ERROR, falling: COMPLETE, vacuity: COMPLETE });
    const failed = failure(
      await evaluateProof({
        toolchain,
        manifest: manifest({ declaredIdentity: OTHER_IDENTITY, items: [] }),
      }),
    );
    expect(failed.missing).toEqual([
      "tlc-exploration",
      "falling-proof",
      "vacuity-proof",
      "reduction-evidence",
      "identity-binding",
    ]);
    expect(failed.failedFallingInvariants).toEqual([invariant("TypeOK")]);
    expect(failed.failedVacuityInvariants).toEqual([invariant("TypeOK")]);
  });

  test("an unreadable manifest fails every manifest-fed obligation", async () => {
    // The manifest declares the falling mutation and the witness as well as the
    // reduction items and the identity, so losing it fails four of the five.
    const failed = failure(
      await evaluateProof({ manifest: { kind: "manifest-failure", detail: "ENOENT" } }),
    );
    expect(failed.missing).toEqual([
      "falling-proof",
      "vacuity-proof",
      "reduction-evidence",
      "identity-binding",
    ]);
    expect(failed.detail).toContain("ENOENT");
  });
});

describe("mutation sources (pure transformations)", () => {
  const module = ["---- MODULE Sample ----", "TypeOK == receipts \\in Seq(Nat)", "===="].join("\n");
  const config = ["CONSTANTS", "MaxReceipts = 3", "SPECIFICATION Spec", "INVARIANT TypeOK", "INVARIANT Other"].join(
    "\n",
  );

  test("the vacuity probe appends a negated-witness operator before the module terminator", () => {
    const built = unwrap(MutationSource.vacuityModule(module, invariant("TypeOK"), "receipts # {}"));
    expect(built.source).toContain(`${built.probeInvariant} == ~(receipts # {})`);
    expect(built.source.trimEnd().endsWith("====")).toBe(true);
  });

  test("the single-invariant config keeps the run's setup and drops the other invariants", () => {
    const built = MutationSource.singleInvariantConfig(config, "Probe_TypeOK" as InvariantName);
    expect(built).toContain("SPECIFICATION Spec");
    expect(built).toContain("MaxReceipts = 3");
    expect(built).toContain("INVARIANT Probe_TypeOK");
    expect(built).not.toContain("INVARIANT Other");
  });

  test("a folded INVARIANT list falls entirely, continuation lines included", () => {
    const folded = ["SPECIFICATION Spec", "INVARIANT TypeOK,", "          Other", "CONSTANT MaxReceipts = 3", ""].join("\n");
    const built = MutationSource.singleInvariantConfig(folded, "Probe_TypeOK" as InvariantName);
    expect(built).not.toContain("Other");
    expect(built).toContain("SPECIFICATION Spec");
    expect(built).toContain("CONSTANT MaxReceipts = 3");
    expect(built).toContain("INVARIANT Probe_TypeOK");
  });

  test("a falling mutation is applied textually and its anchor must be unique", () => {
    const applied = unwrap(
      MutationSource.fallingModule(module, { find: "TypeOK ==", replace: "TypeOK == FALSE /\\" }),
    );
    expect(applied).toContain("TypeOK == FALSE /\\ receipts");

    const ambiguous = MutationSource.fallingModule(`${module}\n${module}`, {
      find: "TypeOK ==",
      replace: "TypeOK == FALSE /\\",
    });
    expect(failure(ambiguous).kind).toBe("mutation-failure");
  });

  test("a falling mutation whose anchor is absent fails instead of silently no-op", () => {
    const missing = MutationSource.fallingModule(module, { find: "Absent ==", replace: "x" });
    expect(failure(missing).kind).toBe("mutation-failure");
  });
});
