import { describe, expect, test } from "bun:test";
import { canonicalIdentity } from "../../scripts/formal-verif/canonical.ts";
import {
  applyTlaElectionAction,
  createFrozenTlaModelReceipt,
  createInitialTlaElectionState,
  generateFrozenTlaModel,
  tlaCfgBytesIdentity,
  tlaModuleBytesIdentity,
  validateFrozenTlaModelReceipt,
} from "../../scripts/formal-verif/tla-arm.ts";

const PUBLIC_CONTRACT_IDENTITY = "a".repeat(64);
const INVARIANTS = [
  "ChoiceWinner",
  "UnknownChoiceRejected",
  "ReceivedAtAxis",
  "InvalidTimestampRejected",
  "AmendSubmission",
  "UnknownRefRejected",
  "PerVoterResolution",
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

  test("resolves T0/T1/T2 amendments by timestamp then arrival while preserving amend provenance", () => {
    for (const [submittedAt, expectedArrivalSeq] of [["T0", 1], ["T1", 2], ["T2", 2]] as const) {
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
  test("generates one deterministic blind bundle for the closed domain and action union", () => {
    const first = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    const replay = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    expect(replay).toEqual(first);
    expect(first.publicContractIdentity).toBe(PUBLIC_CONTRACT_IDENTITY);
    expect(first.modelIdentity).toMatch(/^[0-9a-f]{64}$/);

    for (const token of [
      "V1", "V2", "V3", "C1", "C2", "C3", "UNKNOWN_CHOICE",
      "T0", "T1", "T2", "INVALID_FORMAT", "INVALID_DATE", "UNKNOWN_REF",
      "SubmitOriginal", "SubmitAmend", "Tally", "RecordHold", "TerminalStutter",
      "cutoffSeq", "ballotSnapshot", "reexamRequired",
    ]) {
      expect(first.moduleSource).toContain(token);
    }
    for (const forbidden of ["V4", "C4", "T3"]) expect(first.moduleSource).not.toContain(forbidden);
    expect(first.moduleSource).toContain("reexamRequired' = (reexamRequired \\/ (g = 8))");
  });

  test("binds exactly seven named invariants to deterministic module source locations", () => {
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

  test("binds TypeOK to every branch of all seven invariant formulas", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    for (const invariant of INVARIANTS) {
      const start = source.indexOf(`${invariant} ==`);
      const nextStarts = INVARIANTS
        .map((name) => source.indexOf(`${name} ==`, start + invariant.length + 3))
        .filter((index) => index > start);
      const end = Math.min(...nextStarts, source.indexOf("Spec ==", start));
      const formula = source.slice(start, end);
      expect(formula.startsWith(`${invariant} ==\n  /\\ TypeOK\n  /\\ ActionRefinement\n  /\\ (`)).toBe(true);
    }
  });

  test("emits NONE for both winner fields of every HOLD receipt", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    expect(source).toContain('ReceiptWinner(r) == IF TallyKind(r) = "ESTABLISHED" THEN UniqueWinner(r) ELSE "NONE"');
    expect(source).toContain("winner |-> ReceiptWinner(r)");
    expect(source).toContain("choiceWinner |-> ReceiptWinner(r)");
  });

  test("derives counts and action refinement without transition-history state", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    for (const history of ["lastOutcome", "previousAcceptedCount", "previousLateCount", "previousBudgetSpent"]) {
      expect(source).not.toContain(history);
    }
    expect(source).not.toContain("VARIABLES accepted, acceptedCount");
    for (const derived of ["SubmissionCount", "AcceptedCount", "LateCount", "NextSeq", "ActionRefinement"]) {
      expect(source).toContain(derived);
    }
    expect(source.match(/\/\\ ActionRefinement/g)).toHaveLength(7);
  });

  test("proves unknown-reference rejection over the action relation without history state", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    const invariantStart = source.indexOf("UnknownRefRejected ==");
    const invariantEnd = source.indexOf("PerVoterResolution ==", invariantStart);
    const invariant = source.slice(invariantStart, invariantEnd);

    expect(invariant).toContain('~ENABLED (SubmitAmend(v, 0, C1, "T1", 1)');
    expect(invariant).toContain("/\\ ~(UNCHANGED vars)");
    expect(invariant).not.toContain("amendBudget[v] = 0 => accepted[v] /= NoBallot");
    for (const history of ["lastOutcome", "previousAcceptedCount", "previousLateCount", "previousBudgetSpent"]) {
      expect(invariant).not.toContain(history);
    }
  });

  test("pins rejection, amend append, and per-voter argmax to independent action obligations", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    const expectedStart = source.indexOf("ExpectedResolution(prior, ballot) ==");
    const badResolutionStart = source.indexOf("BadResolutionStep ==", expectedStart);
    const expectedResolution = source.slice(expectedStart, badResolutionStart);

    expect(expectedStart).toBeGreaterThan(-1);
    expect(expectedResolution).toContain('ballot.submittedAt = "T0"');
    expect(expectedResolution).toContain("ballot.arrivalSeq > prior.arrivalSeq");
    for (const selfReference of ["Later(", "Resolve(", "SubmittedRank("]) {
      expect(expectedResolution).not.toContain(selfReference);
    }

    expect(source).toContain("UnknownChoiceAction ==");
    expect(source).toContain("InvalidTimestampAction ==");
    expect(source).toContain("BadAmendStep ==");
    expect(source).toContain("BadResolutionStep ==");
    expect(source).toContain("SubmissionCount' = SubmissionCount + 1");
    expect(source).toContain("amendBudget' = [amendBudget EXCEPT ![v] = 0]");
    expect(source).toContain("UNCHANGED <<initialBudget, holdBudget, holdMarkers, tally>>");

    const obligations = {
      UnknownChoiceRejected: "~ENABLED (UnknownChoiceAction /\\ ~(UNCHANGED vars))",
      InvalidTimestampRejected: "~ENABLED (InvalidTimestampAction /\\ ~(UNCHANGED vars))",
      AmendSubmission: "~ENABLED BadAmendStep",
      PerVoterResolution: "~ENABLED BadResolutionStep",
    } as const;
    for (const [name, obligation] of Object.entries(obligations)) {
      const start = source.indexOf(`${name} ==`);
      const next = INVARIANTS.map((candidate) => source.indexOf(`${candidate} ==`, start + 1)).filter((index) => index > start);
      const end = Math.min(...next, source.indexOf("Spec ==", start));
      expect(source.slice(start, end)).toContain(obligation);
    }
  });

  test("enumerates one representative per state-equivalent submission input", () => {
    const source = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY }).moduleSource;
    expect(source).toContain("GoARepresentatives == {1, 4, 5, 7, 8}");
    expect(source).toContain("LateGoARepresentatives == {1, 8}");
    expect(source).toContain('OriginalSubmittedRepresentative == "T1"');
    expect(source).toContain('TallyReceivedRepresentative == "T1"');
    expect(source).not.toContain("SubmitOriginal(v, c, s, received, g)");
    expect(source).not.toContain("ref \\\\in 0..6");
    expect(source).toContain('/\\ tally.kind = "NONE"');
    expect(source).toContain('/\\ tally.kind /= "NONE"');
    expect(source).toContain("SubmitOriginal(v, c, OriginalSubmittedRepresentative, g)");
    expect(source).toContain('SubmitOriginal(v, C1, "T1", g)');
    expect(source).toContain('SubmitOriginal(v, "UNKNOWN_CHOICE", "T1", 1)');
    expect(source).toContain('SubmitOriginal(v, C1, "INVALID_FORMAT", 1)');
    expect(source).toContain("SubmitAmend(v, accepted[v].arrivalSeq, c, s, g)");
    expect(source).toContain('SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)');
    expect(source).toContain('SubmitAmend(v, 0, C1, "T1", 1)');
    expect(source).toContain("Tally(TallyReceivedRepresentative)");
    expect(source).toContain("SpendableSubmission ==");
    expect(source).toContain("TerminalStutter ==");
    expect(source).toContain("\\/ TerminalStutter");
    expect(source).not.toContain("\\E received \\in ReceivedAt: Tally(received)");
    expect(source).not.toContain("c \\\\in ChoiceInputs, s \\\\in SubmittedInputs");
  });

  test("uses only voter and choice permutations as a semantic symmetry quotient", () => {
    const bundle = generateFrozenTlaModel({ publicContractIdentity: PUBLIC_CONTRACT_IDENTITY });
    expect(bundle.moduleSource).toContain("CONSTANTS V1, V2, V3, C1, C2, C3");
    expect(bundle.moduleSource).toContain("pv \\in Permutations(Voters), pc \\in Permutations(Choices)");
    expect(bundle.moduleSource).toContain("IF x \\in Voters THEN pv[x] ELSE pc[x]");
    expect(bundle.cfgSource).toContain("V1 = V1");
    expect(bundle.cfgSource).toContain("C3 = C3");
    expect(bundle.cfgSource).toContain("SYMMETRY Symmetry");
    expect(bundle.cfgSource).not.toContain("CONSTRAINT");
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
    driftedFormula.namedInvariantFormulas.UnknownRefRejected = "c".repeat(64);
    const driftedLocation = structuredClone(receipt);
    driftedLocation.invariantSourceMap.UnknownRefRejected.line += 1;
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
