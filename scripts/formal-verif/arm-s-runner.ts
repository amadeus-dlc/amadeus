// arm-s-runner.ts — U6 ts-arm (B2): exhaustive + property runners and the
// verdict normalizer for the blind Arm S checker. Executes the 5,760-tuple core
// universe and the 160-cell identity matrix against a subject, runs the seven
// fast-check contract properties at the fixed seed, and normalizes the outcome
// into a public CellResult verdict. No Arm T / skeleton / fixture import.

import fc from "fast-check";
import { canonicalIdentity } from "./canonical.ts";
import type { CellResult, Verdict } from "./contract.ts";
import { type Result, err, ok } from "./arm-s-result.ts";
import {
  type ArmBallot,
  type ContractObservation,
  type PropertyId,
  type RawBallot,
  SEQUENCE_BUDGET,
  type SequenceAction,
  type SubjectElection,
  type SubjectPort,
  type SubjectTally,
  type TokenName,
  expectedCoreValidation,
  expectedTally,
  mintReceivedAt,
  parseSubmittedAt,
  tallyEqual,
} from "./arm-s-oracle.ts";
import {
  type CoreUniverseCoverageProof,
  type UniverseTuple,
  type ValidationMatrixProof,
  compileCoreUniverse,
  compileValidationMatrix,
  streamUniverse,
  validationMatrix,
} from "./arm-s-universe.ts";

export const ARM_S_SEED = 20260720;
export const ARM_S_NUM_RUNS = 100;
export const ARM_S_MAX_ACTIONS = SEQUENCE_BUDGET.maxActions;
export const FAST_CHECK_VERSION = "4.9.0";

const ELECTION: SubjectElection = { electionId: "arm-s-election", voters: ["V1", "V2", "V3"], choices: [1, 2, 3] };
const CHOICE_NO: Record<string, number> = { C1: 1, C2: 2, C3: 3, UNKNOWN_CHOICE: 99 };
const TOKEN_INSTANT: Record<string, string> = {
  T0: "2026-07-20T00:00:00Z",
  T1: "2026-07-20T00:00:01Z",
  T2: "2026-07-20T00:00:02Z",
  INVALID_FORMAT: "__INVALID_FORMAT__",
  INVALID_DATE: "2026-02-30T00:00:00Z",
};
const TALLY_AT = mintReceivedAt("T1");

// --- proofs and verdict -----------------------------------------------------

export type Counterexample = {
  propertyId: PropertyId;
  minimalInput: string;
  expected: string;
  actual: string;
  counterexampleId: string;
};

export type TsArmProof =
  | { kind: "counterexample"; counterexample: Counterexample }
  | {
      kind: "completion";
      core: CoreUniverseCoverageProof;
      validation: ValidationMatrixProof;
      propertyRuns: number;
    }
  | { kind: "harness"; reason: string };

export function normalize(proof: TsArmProof): Verdict {
  if (proof.kind === "counterexample") return "DETECTED";
  if (proof.kind === "completion") return "NOT_DETECTED";
  return "HARNESS_ERROR";
}

// --- exhaustive core + validation matrix ------------------------------------

function rawFromTuple(tuple: UniverseTuple): { raw: RawBallot; received: string; refClass: string } {
  const submittedAt = TOKEN_INSTANT[tuple.SUBMITTED_TOKEN]!;
  const refAccepted = tuple.REF_CLASS === "ACCEPTED_REF";
  return {
    received: TOKEN_INSTANT[tuple.RECEIVED_TOKEN]!,
    refClass: tuple.REF_CLASS,
    raw: {
      voter: tuple.VOTER,
      choiceInternalNo: CHOICE_NO[tuple.CHOICE_INPUT]!,
      goa: Number(tuple.GOA),
      kind: tuple.BALLOT_KIND === "AMEND" ? "amend" : "original",
      ref:
        tuple.BALLOT_KIND === "AMEND"
          ? { voter: tuple.VOTER, submittedAt: refAccepted ? TOKEN_INSTANT.T0! : "2026-07-20T00:00:09Z" }
          : null,
      submittedAt,
      reservation: "reserved",
    },
  };
}

// One accepted original per voter at T0 so an ACCEPTED_REF amend has a real
// referent (the UNKNOWN_REF amend points at an instant absent from the ledger).
function acceptedLedger(subject: SubjectPort, voter: string): ArmBallot[] {
  const parsed = subject.validate(
    { voter, choiceInternalNo: 1, goa: 1, kind: "original", ref: null, submittedAt: TOKEN_INSTANT.T0!, reservation: "reserved" },
    ELECTION,
  );
  return parsed.ok ? [parsed.ballot] : [];
}

function checkCoreTuple(subject: SubjectPort, tuple: UniverseTuple): ContractObservation {
  const { raw, received, refClass } = rawFromTuple(tuple);
  const expected = expectedCoreValidation(ELECTION.choices, raw);
  const outcome = subject.validate(raw, ELECTION);
  if (expected !== "valid") {
    const property: PropertyId = expected === "unknown-choice" ? "P2_UNKNOWN_CHOICE" : "P4_INVALID_TS";
    const passed = !outcome.ok && outcome.error === expected;
    return { propertyId: property, passed, expected, actual: outcome.ok ? "accepted" : outcome.error };
  }
  return checkValidTuple(subject, tuple, outcome, received, refClass);
}

function checkValidTuple(
  subject: SubjectPort,
  tuple: UniverseTuple,
  outcome: ReturnType<SubjectPort["validate"]>,
  received: string,
  refClass: string,
): ContractObservation {
  if (!outcome.ok) return { propertyId: "P7_RESOLUTION", passed: false, expected: "accepted", actual: outcome.error };
  const ballot = outcome.ballot;
  const expectLate = TOKEN_INSTANT[tuple.RECEIVED_TOKEN]! > (TALLY_AT as string);
  const late = subject.classifyLate(TALLY_AT as string, received, ballot);
  if (late !== expectLate) {
    return { propertyId: "P3_LATENESS", passed: false, expected: `late=${expectLate}`, actual: `late=${late}` };
  }
  if (tuple.BALLOT_KIND === "AMEND") {
    const appended = subject.append(acceptedLedger(subject, tuple.VOTER), ballot);
    const shouldAccept = refClass === "ACCEPTED_REF";
    const passed = appended.ok === shouldAccept;
    const property: PropertyId = shouldAccept ? "P5_AMEND" : "P6_UNKNOWN_REF";
    return { propertyId: property, passed, expected: shouldAccept ? "accepted" : "unknown-ref", actual: appended.ok ? "accepted" : appended.error };
  }
  const resolved = subject.resolve([ballot]);
  return { propertyId: "P7_RESOLUTION", passed: resolved.length === 1 && resolved[0] === ballot, expected: "self", actual: `len=${resolved.length}` };
}

function checkValidationCell(subject: SubjectPort, cell: ReturnType<typeof validationMatrix>[number]): ContractObservation {
  const raw: RawBallot = {
    electionId: cell.election === "UNKNOWN_ELECTION" ? "OTHER_ELECTION" : ELECTION.electionId,
    voter: cell.voter === "UNKNOWN_VOTER" ? "VX" : cell.voter,
    choiceInternalNo: cell.choice === "UNKNOWN_CHOICE" ? 99 : CHOICE_NO[cell.choice]!,
    goa: 1,
    kind: "original",
    ref: null,
    submittedAt: TOKEN_INSTANT[cell.submitted]!,
    reservation: "reserved",
  };
  const outcome = subject.validate(raw, ELECTION);
  const actual = outcome.ok ? "valid" : outcome.error;
  const expected = cell.expected ?? "valid";
  return { propertyId: "P2_UNKNOWN_CHOICE", passed: actual === expected, expected, actual };
}

export interface ExhaustiveReport {
  core: CoreUniverseCoverageProof;
  validation: ValidationMatrixProof;
  observationCount: number;
  perProperty: Record<string, number>;
  firstCounterexample: Counterexample | null;
}

export function runExhaustive(subject: SubjectPort): Result<ExhaustiveReport, string> {
  const core = compileCoreUniverse();
  const validation = compileValidationMatrix();
  if (!core.ok) return err(`core:${core.error.kind}`);
  if (!validation.ok) return err(`validation:${validation.error.kind}`);
  const perProperty: Record<string, number> = {};
  let observationCount = 0;
  let firstCounterexample: Counterexample | null = null;
  const record = (obs: ContractObservation, input: string): void => {
    observationCount++;
    perProperty[obs.propertyId] = (perProperty[obs.propertyId] ?? 0) + 1;
    if (!obs.passed && firstCounterexample === null) {
      firstCounterexample = {
        propertyId: obs.propertyId,
        minimalInput: input,
        expected: obs.expected,
        actual: obs.actual,
        counterexampleId: canonicalIdentity({ property: obs.propertyId, input, expected: obs.expected }).sha256,
      };
    }
  };
  for (const { tuple, key } of streamUniverse()) record(checkCoreTuple(subject, tuple), key);
  for (const cell of validationMatrix()) record(checkValidationCell(subject, cell), JSON.stringify(cell));
  return ok({ core: core.value, validation: validation.value, observationCount, perProperty, firstCounterexample });
}

// --- property-based runner (action sequences, BR-15/BR-16) ------------------

const CHOICES = ELECTION.choices;
const TOKEN_ARB: fc.Arbitrary<TokenName> = fc.constantFrom("T0", "T1", "T2");
const VOTER_ARB: fc.Arbitrary<string> = fc.constantFrom("V1", "V2", "V3");

function submissionFields() {
  return {
    voter: VOTER_ARB,
    choice: fc.integer({ min: 1, max: 3 }),
    goa: fc.integer({ min: 1, max: 8 }),
    sub: TOKEN_ARB,
    rec: TOKEN_ARB,
  };
}

const ORIGINAL_ARB: fc.Arbitrary<SequenceAction> = fc.record({ kind: fc.constant("SUBMIT_ORIGINAL" as const), ...submissionFields() });
const AMEND_ARB: fc.Arbitrary<SequenceAction> = fc.record({ kind: fc.constant("SUBMIT_AMEND" as const), ...submissionFields(), refSub: TOKEN_ARB });

function submissionBallot(action: SequenceAction): ArmBallot | null {
  if (action.kind !== "SUBMIT_ORIGINAL" && action.kind !== "SUBMIT_AMEND") return null;
  const brand = parseSubmittedAt(TOKEN_INSTANT[action.sub]!);
  if (!brand.ok) return null;
  const ref = action.kind === "SUBMIT_AMEND" ? { voter: action.voter, submittedAt: TOKEN_INSTANT[action.refSub]! } : null;
  return { voter: action.voter, choiceInternalNo: action.choice, goa: action.goa, kind: action.kind === "SUBMIT_AMEND" ? "amend" : "original", ref, submittedAt: brand.value };
}

// Assemble a well-formed sequence (validateSequence-ok): >=1 original before the
// single TALLY (index 1..6), the remaining submissions after it (post-tally
// lateness), and a RECORD_HOLD appended only when the independently-computed
// tally over the pre-tally ballots holds. Total <= SEQUENCE_BUDGET.maxActions.
function assembleSequence(originals: SequenceAction[], amends: SequenceAction[], split: number, wantHold: boolean): SequenceAction[] {
  const submissions = [...originals, ...amends];
  const cut = Math.min(Math.max(split, 1), submissions.length);
  const pre = submissions.slice(0, cut);
  const post = submissions.slice(cut);
  const sequence: SequenceAction[] = [...pre, { kind: "TALLY" }, ...post];
  const preBallots = pre.map(submissionBallot).filter((b): b is ArmBallot => b !== null);
  if (wantHold && expectedTally(CHOICES, preBallots).kind === "hold") sequence.push({ kind: "RECORD_HOLD" });
  return sequence;
}

export function sequenceArb(): fc.Arbitrary<SequenceAction[]> {
  return fc
    .record({
      originals: fc.array(ORIGINAL_ARB, { minLength: 1, maxLength: SEQUENCE_BUDGET.original }),
      amends: fc.array(AMEND_ARB, { maxLength: SEQUENCE_BUDGET.amend }),
      split: fc.integer({ min: 1, max: SEQUENCE_BUDGET.original + SEQUENCE_BUDGET.amend }),
      wantHold: fc.boolean(),
    })
    .map(({ originals, amends, split, wantHold }) => assembleSequence(originals, amends, split, wantHold));
}

interface SequenceRun {
  appendOnlyOk: boolean;
  submissions: Array<{ ballot: ArmBallot; rec: TokenName }>;
  ledgerAtTally: ArmBallot[];
  subjectTally: SubjectTally | null;
}

// Walk the action list against the subject: append each submission (accepted
// appends must extend the ledger prefix by exactly one — append-only), snapshot
// the ledger and tally at the TALLY marker, and collect every submission with
// its received token for the lateness property.
function interpretSequence(subject: SubjectPort, actions: SequenceAction[]): SequenceRun {
  let ledger: ArmBallot[] = [];
  let appendOnlyOk = true;
  const submissions: Array<{ ballot: ArmBallot; rec: TokenName }> = [];
  let ledgerAtTally: ArmBallot[] = [];
  let subjectTally: SubjectTally | null = null;
  for (const action of actions) {
    if (action.kind === "TALLY") {
      ledgerAtTally = ledger;
      subjectTally = subject.tally(CHOICES, subject.resolve(ledger));
      continue;
    }
    if (action.kind === "RECORD_HOLD") continue;
    const ballot = submissionBallot(action);
    if (!ballot) continue;
    submissions.push({ ballot, rec: action.rec });
    const appended = subject.append(ledger, ballot);
    if (appended.ok) {
      if (appended.value.length !== ledger.length + 1 || appended.value.some((b, i) => i < ledger.length && b !== ledger[i])) {
        appendOnlyOk = false;
      }
      ledger = appended.value;
    }
  }
  return { appendOnlyOk, submissions, ledgerAtTally, subjectTally };
}

const PROPERTIES: Array<{ id: PropertyId; holds: (subject: SubjectPort, actions: SequenceAction[]) => boolean }> = [
  {
    id: "P7_RESOLUTION",
    holds: (subject, actions) => {
      const run = interpretSequence(subject, actions);
      if (!run.appendOnlyOk) return false;
      const once = subject.resolve(run.ledgerAtTally);
      const twice = subject.resolve(once);
      const perVoterUnique = new Set(once.map((b) => b.voter)).size === once.length;
      return perVoterUnique && JSON.stringify(once) === JSON.stringify(twice);
    },
  },
  {
    id: "P1_WINNER",
    holds: (subject, actions) => {
      const run = interpretSequence(subject, actions);
      if (run.subjectTally === null) return false;
      // Hold precedence + winner shuffle invariance: the subject's tally must
      // equal the independent oracle over the pre-tally resolved ledger, and
      // reversing the CHOICE display must not move the outcome (ballots carry
      // internalNo).
      const expected = expectedTally(CHOICES, run.ledgerAtTally);
      const reChoiced = subject.tally([...CHOICES].reverse(), subject.resolve(run.ledgerAtTally));
      return tallyEqual(run.subjectTally, expected) && tallyEqual(run.subjectTally, reChoiced);
    },
  },
  {
    id: "P3_LATENESS",
    holds: (subject, actions) => {
      const run = interpretSequence(subject, actions);
      return run.submissions.every(
        ({ ballot, rec }) => subject.classifyLate(TALLY_AT as string, TOKEN_INSTANT[rec]!, ballot) === (TOKEN_INSTANT[rec]! > (TALLY_AT as string)),
      );
    },
  },
];

export interface PropertyRunReport {
  failed: boolean;
  propertyRuns: number;
  counterexample: Counterexample | null;
}

export function runProperties(subject: SubjectPort, seed = ARM_S_SEED, numRuns = ARM_S_NUM_RUNS): PropertyRunReport {
  let propertyRuns = 0;
  for (const property of PROPERTIES) {
    const res = fc.check(
      fc.property(sequenceArb(), (actions) => property.holds(subject, actions)),
      { seed, numRuns },
    );
    propertyRuns += res.numRuns;
    if (res.failed) {
      const minimalInput = JSON.stringify(res.counterexample?.[0] ?? null);
      return {
        failed: true,
        propertyRuns,
        counterexample: {
          propertyId: property.id,
          minimalInput,
          expected: "contract holds",
          actual: `violated at path ${res.counterexamplePath}`,
          counterexampleId: canonicalIdentity({ property: property.id, minimalInput, seed, path: res.counterexamplePath }).sha256,
        },
      };
    }
  }
  return { failed: false, propertyRuns, counterexample: null };
}

// --- run driver + manifest --------------------------------------------------

export const INPUT_ALLOWLIST: readonly string[] = [
  "scripts/formal-verif/contract.ts",
  "scripts/formal-verif/canonical.ts",
  "packages/framework/core/tools/amadeus-election-model.ts",
  "packages/framework/core/tools/amadeus-election-store.ts",
];

export const ARM_S_SOURCE_FILES: readonly string[] = [
  "arm-s-result.ts",
  "arm-s-universe.ts",
  "arm-s-oracle.ts",
  "arm-s-model-subject.ts",
  "arm-s-runner.ts",
];

export const FORBIDDEN_IMPORT_MARKERS: readonly string[] = [
  "tla-arm",
  "tlc-toolchain",
  "tla-skeleton",
  "fixture-registry",
  "fixture-scan",
  "fixture-proof",
  "execution-evidence",
  "evidence-bundle",
  "evidence-completeness",
  "evidence-store",
  "provenance",
];

export function scanForbidden(importSpecifiers: readonly string[]): string[] {
  return importSpecifiers.filter((spec) => FORBIDDEN_IMPORT_MARKERS.some((marker) => spec.includes(marker)));
}

export interface FreezeManifest {
  descriptorIdentity: string;
  inputAllowlist: readonly string[];
  forbiddenPaths: readonly string[];
  forbiddenPathCount: number;
  seed: number;
  numRuns: number;
  maxActions: number;
  fastCheckVersion: string;
}

// forbiddenPathCount is derived from an actual scan of the freeze inputs — not a
// hardcoded 0. A poisoned freeze input (an Arm T / skeleton / fixture path) makes
// the count non-zero, so the blind allowlist assertion has real content.
export function freezeManifest(descriptorIdentity: string, freezeInputs: readonly string[] = INPUT_ALLOWLIST): FreezeManifest {
  const forbiddenPaths = scanForbidden(freezeInputs);
  return {
    descriptorIdentity,
    inputAllowlist: freezeInputs,
    forbiddenPaths,
    forbiddenPathCount: forbiddenPaths.length,
    seed: ARM_S_SEED,
    numRuns: ARM_S_NUM_RUNS,
    maxActions: ARM_S_MAX_ACTIONS,
    fastCheckVersion: FAST_CHECK_VERSION,
  };
}

function toCellResult(verdict: Verdict, proof: TsArmProof, startedAt: string, finishedAt: string): CellResult {
  const counterexampleId = proof.kind === "counterexample" ? proof.counterexample.counterexampleId : null;
  return {
    schemaVersion: 1,
    arm: "ts",
    fixtureId: "HEALTHY_BASELINE",
    baselineSha: "0".repeat(64),
    armSha: "0".repeat(64),
    verdict,
    exitCode: verdict === "HARNESS_ERROR" ? 1 : 0,
    toolVersions: { fastCheck: FAST_CHECK_VERSION },
    seedOrBound: { seed: ARM_S_SEED, numRuns: ARM_S_NUM_RUNS, maxActions: ARM_S_MAX_ACTIONS },
    startedAt,
    finishedAt,
    counterexampleId,
    evidencePaths: [],
  };
}

// Full B2 self-run: exhaustive core + validation, then the fixed-seed
// properties. Exhaustive failure or a reproducible property failure is DETECTED;
// all-green is NOT_DETECTED; a runner/coverage fault is HARNESS_ERROR.
export function runArmS(subject: SubjectPort): { verdict: Verdict; proof: TsArmProof; cell: CellResult } {
  const startedAt = "2026-07-20T00:00:00Z";
  const finishedAt = "2026-07-20T00:00:01Z";
  const exhaustive = runExhaustive(subject);
  let proof: TsArmProof;
  if (!exhaustive.ok) {
    proof = { kind: "harness", reason: exhaustive.error };
  } else if (exhaustive.value.firstCounterexample) {
    proof = { kind: "counterexample", counterexample: exhaustive.value.firstCounterexample };
  } else {
    const properties = runProperties(subject);
    if (properties.failed && properties.counterexample) {
      proof = { kind: "counterexample", counterexample: properties.counterexample };
    } else {
      proof = { kind: "completion", core: exhaustive.value.core, validation: exhaustive.value.validation, propertyRuns: properties.propertyRuns };
    }
  }
  const verdict = normalize(proof);
  return { verdict, proof, cell: toCellResult(verdict, proof, startedAt, finishedAt) };
}
