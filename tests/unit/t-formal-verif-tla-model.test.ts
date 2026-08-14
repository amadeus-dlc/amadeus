import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../plugins/formal-model-check/tools/canonical.ts";
import {
  applyTlaElectionAction,
  createFrozenTlaModelReceipt,
  createInitialTlaElectionState,
  generateFrozenTlaModel,
  tlaCfgBytesIdentity,
  tlaModuleBytesIdentity,
  validateFrozenTlaModelReceipt,
} from "../../plugins/formal-model-check/tools/tla-arm.ts";

const PUBLIC_CONTRACT_IDENTITY = "a".repeat(64);
const INVARIANTS = [
  "TypeOK",
  "QuestionIdsUnique",
  "AcceptedDomain",
  "ResultCompleteness",
  "PerQuestionIsolation",
  "EstablishedImmutable",
  "HeldOnlyTargets",
  "MixedLifecycle",
  "ResponseCoverage",
] as const;

const original = (
  voter: "V1" | "V2" | "V3",
  choice: "C1" | "C2" | "C3" | "UNKNOWN_CHOICE",
  submittedAt: "T0" | "T1" | "T2" | "INVALID_FORMAT" | "INVALID_DATE",
  receivedAt: "T0" | "T1" | "T2",
  goa: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
) => ({ kind: "SubmitOriginal" as const, voter, choice, submittedAt, receivedAt, goa });

const acceptedReference = (state: ReturnType<typeof createInitialTlaElectionState>, voter = "V1") => {
  const ballot = state.accepted.find((candidate) => candidate.voter === voter);
  if (!ballot) throw new Error(`missing accepted ballot for ${voter}`);
  return { voter: ballot.voter, submittedAt: ballot.submittedAt, arrivalSeq: ballot.arrivalSeq };
};

describe("finite TLA election model", () => {
  test("starts with the closed three-voter budgets and rejects unknown actions or +1 domain values", () => {
    const initial = createInitialTlaElectionState();
    expect(initial).toMatchObject({
      accepted: [],
      late: [],
      arrivalSeq: 0,
      initialBudget: { V1: 1, V2: 1, V3: 1 },
      amendBudget: { V1: 1, V2: 1, V3: 1 },
      holdBudget: 1,
      holdMarkers: [],
      tallyReceipt: null,
      lastOutcome: "INITIAL",
    });

    const invalidActions: unknown[] = [
      { ...original("V1", "C1", "T0", "T0", 1), voter: "V4" },
      { ...original("V1", "C1", "T0", "T0", 1), choice: "C4" },
      { ...original("V1", "C1", "T0", "T0", 1), submittedAt: "T3" },
      { ...original("V1", "C1", "T0", "T0", 1), receivedAt: "INVALID_DATE" },
      { ...original("V1", "C1", "T0", "T0", 1), goa: 9 },
      { ...original("V1", "C1", "T0", "T0", 1), unexpected: true },
      { kind: "DeleteBallot", voter: "V1" },
    ];
    for (const action of invalidActions) {
      expect(() => applyTlaElectionAction(initial, action as never)).toThrow();
    }
    expect(applyTlaElectionAction(initial, { kind: "TerminalStutter" })).toEqual({
      ...initial,
      lastOutcome: "ACTION_REJECTED",
    });
  });

  test("applies unknown-choice, invalid-timestamp, then unknown-reference precedence without mutation", () => {
    const initial = createInitialTlaElectionState();
    const unknownChoice = applyTlaElectionAction(initial, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: "UNKNOWN_REF",
      choice: "UNKNOWN_CHOICE",
      submittedAt: "INVALID_DATE",
      receivedAt: "T0",
      goa: 1,
    });
    expect(unknownChoice.lastOutcome).toBe("UNKNOWN_CHOICE_REJECTED");
    expect(unknownChoice).toMatchObject({ accepted: [], late: [], arrivalSeq: 0, amendBudget: { V1: 1 } });

    const invalidTimestamp = applyTlaElectionAction(initial, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: "UNKNOWN_REF",
      choice: "C1",
      submittedAt: "INVALID_FORMAT",
      receivedAt: "T0",
      goa: 1,
    });
    expect(invalidTimestamp.lastOutcome).toBe("INVALID_TIMESTAMP_REJECTED");
    expect(invalidTimestamp).toMatchObject({ accepted: [], late: [], arrivalSeq: 0, amendBudget: { V1: 1 } });

    const unknownReference = applyTlaElectionAction(initial, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: "UNKNOWN_REF",
      choice: "C1",
      submittedAt: "T0",
      receivedAt: "T0",
      goa: 1,
    });
    expect(unknownReference.lastOutcome).toBe("UNKNOWN_REF_REJECTED");
    expect(unknownReference).toMatchObject({ accepted: [], late: [], arrivalSeq: 0, amendBudget: { V1: 1 } });
  });

  test("consumes each initial/amend budget once and records a tally-derived hold once", () => {
    const first = applyTlaElectionAction(
      createInitialTlaElectionState(),
      original("V1", "C1", "T0", "T0", 8),
    );
    const duplicateInitial = applyTlaElectionAction(first, original("V1", "C2", "T1", "T1", 1));
    expect(duplicateInitial.accepted).toEqual(first.accepted);
    expect(duplicateInitial.initialBudget.V1).toBe(0);

    const amended = applyTlaElectionAction(first, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: acceptedReference(first),
      choice: "C2",
      submittedAt: "T1",
      receivedAt: "T1",
      goa: 8,
    });
    const duplicateAmend = applyTlaElectionAction(amended, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: acceptedReference(first),
      choice: "C3",
      submittedAt: "T2",
      receivedAt: "T2",
      goa: 1,
    });
    expect(duplicateAmend.accepted).toEqual(amended.accepted);
    expect(duplicateAmend.amendBudget.V1).toBe(0);

    const tallied = applyTlaElectionAction(amended, { kind: "Tally", receivedAt: "T2" });
    expect(tallied.tallyReceipt).toMatchObject({
      kind: "HOLD",
      reason: "BLOCK",
      winner: null,
      choiceWinner: null,
    });
    const recorded = applyTlaElectionAction(tallied, { kind: "RecordHold", reason: "BLOCK" });
    expect(recorded.holdMarkers).toEqual(["BLOCK"]);
    const duplicateHold = applyTlaElectionAction(recorded, { kind: "RecordHold", reason: "BLOCK" });
    expect(duplicateHold.holdMarkers).toEqual(["BLOCK"]);
    expect(duplicateHold.holdBudget).toBe(0);
  });

  // Test-contract revision (ruling Q2=A, 2026-08-05 — Issue #1946, executed
  // under FR-2f): resolution follows the arrival axis, which is the model's
  // abstraction of the receipt stamp the CLI mints on acceptance. The claimed
  // instant is carried but never ranks a voter's ballots, so an amendment wins
  // for every claimed value — including one below its own original's.
  test("resolves T0/T1/T2 amendments by arrival while preserving amend provenance", () => {
    for (const [submittedAt, expectedArrivalSeq] of [["T0", 2], ["T1", 2], ["T2", 2]] as const) {
      const originalState = applyTlaElectionAction(
        createInitialTlaElectionState(),
        original("V1", "C1", "T1", "T1", 1),
      );
      const reference = acceptedReference(originalState);
      const amended = applyTlaElectionAction(originalState, {
        kind: "SubmitAmend",
        voter: "V1",
        ref: reference,
        choice: "C2",
        submittedAt,
        receivedAt: "T2",
        goa: 1,
      });

      expect(amended.accepted).toHaveLength(2);
      expect(amended.accepted[1]).toMatchObject({ kind: "amend", ref: reference, arrivalSeq: 2 });
      expect(amended.initialBudget).toEqual(originalState.initialBudget);
      expect(amended.amendBudget).toEqual({ ...originalState.amendBudget, V1: 0 });
      const tallied = applyTlaElectionAction(amended, { kind: "Tally", receivedAt: "T2" });
      expect(tallied.tallyReceipt?.perVoterResolution.V1).toBe(expectedArrivalSeq);
    }
  });

  test("freezes tally resolution to cutoffSeq and ballotSnapshot when a later original has an earlier receivedAt", () => {
    const beforeTally = applyTlaElectionAction(
      createInitialTlaElectionState(),
      original("V1", "C1", "T1", "T1", 1),
    );
    const tallied = applyTlaElectionAction(beforeTally, { kind: "Tally", receivedAt: "T1" });
    expect(tallied.tallyReceipt).toMatchObject({
      receivedAt: "T1",
      cutoffSeq: 1,
      ballotSnapshot: beforeTally.accepted,
      resolved: beforeTally.accepted,
      eligible: beforeTally.accepted,
      perVoterResolution: { V1: 1 },
      choiceWinner: "C1",
      counts: { C1: 1, C2: 0, C3: 0 },
    });
    const frozenReceipt = structuredClone(tallied.tallyReceipt);

    const afterLateOriginal = applyTlaElectionAction(
      tallied,
      original("V2", "C2", "T0", "T0", 8),
    );
    expect(afterLateOriginal.accepted).toEqual(beforeTally.accepted);
    expect(afterLateOriginal.late).toHaveLength(1);
    expect(afterLateOriginal.late[0]).toMatchObject({
      ballot: {
        kind: "original",
        voter: "V2",
        choice: "C2",
        submittedAt: "T0",
        receivedAt: "T0",
        arrivalSeq: 2,
      },
      late: true,
      reexamRequired: true,
    });
    expect(afterLateOriginal.arrivalSeq).toBe(2);
    expect(afterLateOriginal.initialBudget.V2).toBe(0);
    expect(afterLateOriginal.tallyReceipt).toEqual(frozenReceipt);
    expect(afterLateOriginal.tallyReceipt?.choiceWinner).toBe("C1");
    expect(afterLateOriginal.tallyReceipt?.counts).toEqual({ C1: 1, C2: 0, C3: 0 });
  });

  test("durably appends a post-tally amendment to the late lane without changing the fixed receipt", () => {
    const beforeTally = applyTlaElectionAction(
      createInitialTlaElectionState(),
      original("V1", "C1", "T1", "T1", 1),
    );
    const tallied = applyTlaElectionAction(beforeTally, { kind: "Tally", receivedAt: "T1" });
    const frozenReceipt = structuredClone(tallied.tallyReceipt);
    const reference = acceptedReference(beforeTally);
    const afterLateAmend = applyTlaElectionAction(tallied, {
      kind: "SubmitAmend",
      voter: "V1",
      ref: reference,
      choice: "C2",
      submittedAt: "T0",
      receivedAt: "T0",
      goa: 1,
    });

    expect(afterLateAmend.accepted).toEqual(beforeTally.accepted);
    expect(afterLateAmend.late).toHaveLength(1);
    expect(afterLateAmend.late[0]).toMatchObject({
      ballot: {
        kind: "amend",
        voter: "V1",
        ref: reference,
        choice: "C2",
        submittedAt: "T0",
        receivedAt: "T0",
        arrivalSeq: 2,
      },
      late: true,
      reexamRequired: false,
    });
    expect(afterLateAmend.amendBudget.V1).toBe(0);
    expect(afterLateAmend.tallyReceipt).toEqual(frozenReceipt);
    expect(afterLateAmend.tallyReceipt?.ballotSnapshot).toEqual(beforeTally.accepted);
  });

  test("rejects an amendment whose reference exists only in the post-tally late lane", () => {
    const accepted = applyTlaElectionAction(
      createInitialTlaElectionState(),
      original("V1", "C1", "T0", "T0", 1),
    );
    const tallied = applyTlaElectionAction(accepted, { kind: "Tally", receivedAt: "T0" });
    const withLateOriginal = applyTlaElectionAction(tallied, original("V2", "C2", "T1", "T1", 1));
    const late = withLateOriginal.late[0]!.ballot;
    const result = applyTlaElectionAction(withLateOriginal, {
      kind: "SubmitAmend",
      voter: "V2",
      ref: { voter: late.voter, submittedAt: late.submittedAt, arrivalSeq: late.arrivalSeq },
      choice: "C3",
      submittedAt: "T2",
      receivedAt: "T2",
      goa: 1,
    });

    expect(result.lastOutcome).toBe("UNKNOWN_REF_REJECTED");
    expect(result.late).toEqual(withLateOriginal.late);
    expect(result.amendBudget.V2).toBe(1);
    expect(result.tallyReceipt).toEqual(tallied.tallyReceipt);
  });

  test("maps every GoA value to its fixed semantic class", () => {
    const expected = new Map([
      [1, { kind: "ESTABLISHED", winner: "C1" }],
      [2, { kind: "ESTABLISHED", winner: "C1" }],
      [3, { kind: "ESTABLISHED", winner: "C1" }],
      [4, { kind: "HOLD", reason: "QUORUM_SHORT" }],
      [5, { kind: "HOLD", reason: "QUORUM_SHORT" }],
      [6, { kind: "ESTABLISHED", winner: "C1" }],
      [7, { kind: "ESTABLISHED", winner: "C1" }],
      [8, { kind: "HOLD", reason: "BLOCK" }],
    ] as const);
    for (const [goa, receipt] of expected) {
      const accepted = applyTlaElectionAction(
        createInitialTlaElectionState(),
        original("V1", "C1", "T0", "T0", goa),
      );
      expect(applyTlaElectionAction(accepted, { kind: "Tally", receivedAt: "T0" }).tallyReceipt).toMatchObject(receipt);
    }
    let discussion = createInitialTlaElectionState();
    discussion = applyTlaElectionAction(discussion, original("V1", "C1", "T0", "T0", 5));
    discussion = applyTlaElectionAction(discussion, original("V2", "C1", "T0", "T0", 5));
    expect(applyTlaElectionAction(discussion, { kind: "Tally", receivedAt: "T0" }).tallyReceipt).toMatchObject({
      kind: "HOLD",
      reason: "DISCUSSION_NEEDED",
    });
  });
});

describe("frozen TLA model generator", () => {
  test("generates one deterministic bundle for the finite multi-question domain", () => {
    const first = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    const replay = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    expect(replay).toEqual(first);
    expect(first.publicContractIdentity).toBe(PUBLIC_CONTRACT_IDENTITY);
    expect(first.modelIdentity).toMatch(/^[0-9a-f]{64}$/);

    for (const token of [
      "V1", "V2", "Q1", "Q2", "Q1C1", "Q2C2", "Favor", "Block",
      "AcceptResponse", "TallyQuestion", "FinishRun", "Rerun", "TerminalStutter",
      "accepted", "results", "targets", "preserved", "phase",
    ]) {
      expect(first.moduleSource).toContain(token);
    }
    expect(first.auxiliaryModules).toEqual([{
      name: "FormalElectionCore",
      moduleBytesIdentity: expect.stringMatching(/^[0-9a-f]{64}$/),
    }]);
  });

  test("binds the declared invariants to deterministic module source locations", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    expect(Object.keys(bundle.invariantSourceMap).sort()).toEqual([...INVARIANTS].sort());
    for (const invariant of INVARIANTS) {
      expect(bundle.moduleSource).toContain(invariant);
      expect(bundle.cfgSource).toContain(`INVARIANT ${invariant}`);
      const location = bundle.invariantSourceMap[invariant];
      expect(typeof location.line).toBe("number");
      expect(typeof location.column).toBe("number");
      const start = bundle.moduleSource.indexOf(`${invariant} ==`);
      const rhsStart = bundle.moduleSource.indexOf("==", start) + 2;
      const later = INVARIANTS
        .map((name) => bundle.moduleSource.indexOf(`${name} ==`, rhsStart))
        .filter((index) => index > rhsStart);
      const end = Math.min(...later, bundle.moduleSource.indexOf("Spec ==", rhsStart));
      const rhs = bundle.moduleSource.slice(rhsStart, end);
      expect(bundle.namedInvariantFormulas[invariant]).toBe(
        canonicalIdentity(rhs, "amadeus.formal-verif.tla.invariant-formula.v1").sha256,
      );
      expect(location.line > 0).toBe(true);
      expect(location.column > 0).toBe(true);
    }
  });

  test("models question-local responses, mixed results, and held-only reruns", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    expect(source).toContain("accepted[v][q]");
    expect(source).toContain("results[q]");
    expect(source).toContain("targets' = held");
    expect(source).toContain("preserved' = preserved \\cup EstablishedQuestions(results, targets)");
    expect(source).toContain("IF q \\in held THEN NoResponse ELSE accepted[v][q]");
    expect(source).toContain("EnabledRunCompletes == [](ReadyToComplete => <>RunComplete)");
    expect(source).not.toContain("WF_vars(\\E c \\in Choices[q]");
  });

  test("recomputes frozen module and cfg identities from exact fatal-UTF8 bytes", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    expect(tlaModuleBytesIdentity(bundle.moduleBytes)).toEqual({ ok: true, value: bundle.moduleBytesIdentity });
    expect(tlaCfgBytesIdentity(bundle.cfgBytes)).toEqual({ ok: true, value: bundle.cfgBytesIdentity });

    const drifted = bundle.moduleBytes.slice();
    drifted[drifted.length - 1] ^= 1;
    const driftedIdentity = tlaModuleBytesIdentity(drifted);
    expect(driftedIdentity.ok && driftedIdentity.value).not.toBe(bundle.moduleBytesIdentity);
    expect(tlaCfgBytesIdentity(Uint8Array.of(0xc3, 0x28))).toEqual({
      ok: false,
      error: { kind: "TlaSourceIdentityError", message: "source bytes are not valid UTF-8" },
    });
  });

  test("reconstructs an exact frozen bundle from its persistable receipt", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    const receipt = createFrozenTlaModelReceipt(bundle);

    expect(validateFrozenTlaModelReceipt(receipt)).toEqual({ ok: true, value: bundle });
    expect(Object.keys(receipt).sort()).toEqual([
      "auxiliaryModules",
      "cfgBytesIdentity",
      "freezeRevision",
      "invariantSourceMap",
      "modelIdentity",
      "moduleBytesIdentity",
      "namedInvariantFormulas",
      "profileIdentity",
      "publicContractIdentity",
    ]);

    const forgedModelIdentity = { ...receipt, modelIdentity: "b".repeat(64) };
    const driftedFormula = structuredClone(receipt);
    driftedFormula.namedInvariantFormulas.PerQuestionIsolation = "c".repeat(64);
    const driftedLocation = structuredClone(receipt);
    driftedLocation.invariantSourceMap.PerQuestionIsolation.line += 1;
    const missingField = { ...receipt } as Record<string, unknown>;
    delete missingField.profileIdentity;
    const extraField = { ...receipt, unexpected: true };

    for (const candidate of [forgedModelIdentity, driftedFormula, driftedLocation, missingField, extraField]) {
      expect(validateFrozenTlaModelReceipt(candidate)).toMatchObject({
        ok: false,
        error: { kind: "FrozenTlaModelValidationError" },
      });
    }
  });

  test("compares auxiliary modules structurally rather than by serialization order", () => {
    const receipt = createFrozenTlaModelReceipt(
      generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }),
    );
    expect(receipt.auxiliaryModules.length).toBeGreaterThan(0);

    const reordered = {
      ...receipt,
      auxiliaryModules: receipt.auxiliaryModules.map(({ name, moduleBytesIdentity }) => ({
        moduleBytesIdentity,
        name,
      })),
    };
    expect(validateFrozenTlaModelReceipt(reordered)).toMatchObject({ ok: true });

    for (const auxiliaryModules of [
      receipt.auxiliaryModules.map((module) => ({ ...module, moduleBytesIdentity: "d".repeat(64) })),
      receipt.auxiliaryModules.map((module) => ({ ...module, name: "OtherModule" })),
      receipt.auxiliaryModules.map((module) => ({ ...module, extra: true })),
      [...receipt.auxiliaryModules, ...receipt.auxiliaryModules],
      [],
    ]) {
      expect(validateFrozenTlaModelReceipt({ ...receipt, auxiliaryModules })).toMatchObject({
        ok: false,
        error: { kind: "FrozenTlaModelValidationError" },
      });
    }
  });

  test("does not accept or emit fixture, D-COUNT, branch, or expected-verdict knowledge", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    const serialized = JSON.stringify(bundle).toLowerCase();
    for (const secret of ["fixture", "d-count", "branch", "expectedverdict", "expected verdict", "injection", "defect"]) {
      expect(serialized).not.toContain(secret);
    }

    for (const extra of [
      { fixtureId: "D1" },
      { dCount: 7 },
      { branch: "inject-invalid-timestamp" },
      { expectedVerdict: "DETECTED" },
    ]) {
      expect(() => generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY, ...extra } as never)).toThrow();
    }
  });

  test("rejects public contract identity drift instead of generating an unbound model", () => {
    for (const publicContractIdentity of ["", "A".repeat(64), "a".repeat(63), "g".repeat(64)]) {
      expect(() => generateFrozenTlaModel({ publicContractIdentity })).toThrow();
    }
  });
});
