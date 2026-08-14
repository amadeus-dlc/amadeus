import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";
import {
  type TlaModelPipelineError,
  type VerifiedModelSource,
  type VerifiedTlaSource,
  loadVerifiedTlaSource,
} from "./tla-model-loader.ts";
import {
  type ModelLoadError,
  type ModelMapModel,
  TLA_MODEL_MAP_PATH,
} from "./tla-model-map.ts";

export const TLA_VOTERS = ["V1", "V2", "V3"] as const;
export const TLA_CHOICES = ["C1", "C2", "C3"] as const;
export const TLA_SUBMITTED_AT = ["T0", "T1", "T2"] as const;
export const TLA_RECEIVED_AT = ["T0", "T1", "T2"] as const;
export const TLA_GOA = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export type TlaVoter = (typeof TLA_VOTERS)[number];
export type TlaChoice = (typeof TLA_CHOICES)[number];
export type TlaSubmittedAt = (typeof TLA_SUBMITTED_AT)[number];
export type TlaReceivedAt = (typeof TLA_RECEIVED_AT)[number];
export type TlaGoa = (typeof TLA_GOA)[number];
export type TlaChoiceInput = TlaChoice | "UNKNOWN_CHOICE";
export type TlaSubmittedAtInput = TlaSubmittedAt | "INVALID_FORMAT" | "INVALID_DATE";

export interface TlaBallotRef {
  voter: TlaVoter;
  submittedAt: TlaSubmittedAt;
  arrivalSeq: number;
}

export interface TlaBallot {
  kind: "original" | "amend";
  voter: TlaVoter;
  choice: TlaChoice;
  submittedAt: TlaSubmittedAt;
  receivedAt: TlaReceivedAt;
  goa: TlaGoa;
  arrivalSeq: number;
  ref: TlaBallotRef | null;
}

export interface TlaLateBallot {
  ballot: TlaBallot;
  late: true;
  reexamRequired: boolean;
}

export type TlaHoldReason = "BLOCK" | "DISCUSSION_NEEDED" | "QUORUM_SHORT" | "TIE";

interface TlaTallyBase {
  cutoffSeq: number;
  receivedAt: TlaReceivedAt;
  ballotSnapshot: TlaBallot[];
  resolved: TlaBallot[];
  eligible: TlaBallot[];
  perVoterResolution: Partial<Record<TlaVoter, number>>;
  choiceWinner: TlaChoice | null;
  counts: Record<TlaChoice, number>;
}

export type TlaTallyReceipt =
  | (TlaTallyBase & { kind: "HOLD"; reason: TlaHoldReason; winner: null })
  | (TlaTallyBase & { kind: "ESTABLISHED"; winner: TlaChoice });

export type TlaModelOutcome =
  | "INITIAL"
  | "ORIGINAL_ACCEPTED"
  | "AMEND_ACCEPTED"
  | "ORIGINAL_LATE"
  | "AMEND_LATE"
  | "UNKNOWN_CHOICE_REJECTED"
  | "INVALID_TIMESTAMP_REJECTED"
  | "UNKNOWN_REF_REJECTED"
  | "BUDGET_EXHAUSTED"
  | "TALLY_RECORDED"
  | "HOLD_RECORDED"
  | "ACTION_REJECTED";

export interface TlaElectionState {
  accepted: TlaBallot[];
  late: TlaLateBallot[];
  initialBudget: Record<TlaVoter, 0 | 1>;
  amendBudget: Record<TlaVoter, 0 | 1>;
  holdBudget: 0 | 1;
  holdMarkers: TlaHoldReason[];
  arrivalSeq: number;
  tallyReceipt: TlaTallyReceipt | null;
  lastOutcome: TlaModelOutcome;
}

export type TlaElectionAction =
  | {
      kind: "SubmitOriginal";
      voter: TlaVoter;
      choice: TlaChoiceInput;
      submittedAt: TlaSubmittedAtInput;
      receivedAt: TlaReceivedAt;
      goa: TlaGoa;
    }
  | {
      kind: "SubmitAmend";
      voter: TlaVoter;
      ref: TlaBallotRef | "UNKNOWN_REF";
      choice: TlaChoiceInput;
      submittedAt: TlaSubmittedAtInput;
      receivedAt: TlaReceivedAt;
      goa: TlaGoa;
    }
  | { kind: "Tally"; receivedAt: TlaReceivedAt }
  | { kind: "RecordHold"; reason: TlaHoldReason }
  | { kind: "TerminalStutter" };

function budgets(value: 0 | 1): Record<TlaVoter, 0 | 1> {
  return { V1: value, V2: value, V3: value };
}

export function createInitialTlaElectionState(): TlaElectionState {
  return {
    accepted: [],
    late: [],
    initialBudget: budgets(1),
    amendBudget: budgets(1),
    holdBudget: 1,
    holdMarkers: [],
    arrivalSeq: 0,
    tallyReceipt: null,
    lastOutcome: "INITIAL",
  };
}

function copyState(state: TlaElectionState): TlaElectionState {
  return {
    ...state,
    accepted: [...state.accepted],
    late: [...state.late],
    initialBudget: { ...state.initialBudget },
    amendBudget: { ...state.amendBudget },
    holdMarkers: [...state.holdMarkers],
    tallyReceipt: state.tallyReceipt === null ? null : {
      ...state.tallyReceipt,
      ballotSnapshot: [...state.tallyReceipt.ballotSnapshot],
      resolved: [...state.tallyReceipt.resolved],
      eligible: [...state.tallyReceipt.eligible],
      perVoterResolution: { ...state.tallyReceipt.perVoterResolution },
      counts: { ...state.tallyReceipt.counts },
    },
  };
}

function isChoice(value: unknown): value is TlaChoice {
  return TLA_CHOICES.includes(value as TlaChoice);
}

function isSubmittedAt(value: unknown): value is TlaSubmittedAt {
  return TLA_SUBMITTED_AT.includes(value as TlaSubmittedAt);
}

function isVoter(value: unknown): value is TlaVoter {
  return TLA_VOTERS.includes(value as TlaVoter);
}

function isReceivedAt(value: unknown): value is TlaReceivedAt {
  return TLA_RECEIVED_AT.includes(value as TlaReceivedAt);
}

function isGoa(value: unknown): value is TlaGoa {
  return TLA_GOA.includes(value as TlaGoa);
}

function isReference(value: unknown): value is TlaBallotRef | "UNKNOWN_REF" {
  if (value === "UNKNOWN_REF") return true;
  return exactPlainObject(value, ["voter", "submittedAt", "arrivalSeq"])
    && isVoter(value.voter)
    && isSubmittedAt(value.submittedAt)
    && Number.isSafeInteger(value.arrivalSeq)
    && (value.arrivalSeq as number) > 0;
}

function isSubmissionRecord(record: Record<string, unknown>, kind: "SubmitOriginal" | "SubmitAmend"): boolean {
  const keys = kind === "SubmitAmend"
    ? ["kind", "voter", "ref", "choice", "submittedAt", "receivedAt", "goa"]
    : ["kind", "voter", "choice", "submittedAt", "receivedAt", "goa"];
  if (!exactPlainObject(record, keys) || record.kind !== kind) return false;
  const choiceValid = isChoice(record.choice) || record.choice === "UNKNOWN_CHOICE";
  const submittedValid = isSubmittedAt(record.submittedAt) || record.submittedAt === "INVALID_FORMAT" || record.submittedAt === "INVALID_DATE";
  const referenceValid = kind === "SubmitOriginal" || isReference(record.ref);
  return isVoter(record.voter) && choiceValid && submittedValid && isReceivedAt(record.receivedAt) && isGoa(record.goa) && referenceValid;
}

const TLA_ACTION_GUARDS = [
  (record: Record<string, unknown>) => record.kind === "TerminalStutter" && exactPlainObject(record, ["kind"]),
  (record: Record<string, unknown>) => record.kind === "Tally" && exactPlainObject(record, ["kind", "receivedAt"]) && isReceivedAt(record.receivedAt),
  (record: Record<string, unknown>) => record.kind === "RecordHold" && exactPlainObject(record, ["kind", "reason"]) && ["BLOCK", "DISCUSSION_NEEDED", "QUORUM_SHORT", "TIE"].includes(String(record.reason)),
  (record: Record<string, unknown>) => record.kind === "SubmitOriginal" && isSubmissionRecord(record, record.kind),
  (record: Record<string, unknown>) => record.kind === "SubmitAmend" && isSubmissionRecord(record, record.kind),
] as const;

function assertTlaElectionAction(value: unknown): asserts value is TlaElectionAction {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("action must be a plain object");
  }
  const record = value as Record<string, unknown>;
  if (TLA_ACTION_GUARDS.some((accepts) => accepts(record))) return;
  throw new TypeError("action value is outside the closed election domain");
}

function sameRef(ballot: TlaBallot, ref: TlaBallotRef): boolean {
  return ballot.voter === ref.voter && ballot.submittedAt === ref.submittedAt && ballot.arrivalSeq === ref.arrivalSeq;
}

function refExists(state: TlaElectionState, voter: TlaVoter, ref: TlaBallotRef | "UNKNOWN_REF"): ref is TlaBallotRef {
  if (ref === "UNKNOWN_REF" || ref.voter !== voter || !Number.isSafeInteger(ref.arrivalSeq) || ref.arrivalSeq < 1) return false;
  return state.accepted.some((ballot) => sameRef(ballot, ref));
}

function appendBallot(state: TlaElectionState, ballot: Omit<TlaBallot, "arrivalSeq">): TlaElectionState {
  const next = copyState(state);
  next.arrivalSeq += 1;
  const appended: TlaBallot = { ...ballot, arrivalSeq: next.arrivalSeq };
  if (next.tallyReceipt === null) {
    next.accepted.push(appended);
  } else {
    next.late.push({ ballot: appended, late: true, reexamRequired: appended.goa === 8 });
  }
  return next;
}

// Mirrors the module's Later/Resolve pair: a voter's ballots are ranked by
// arrival, the model's abstraction of the receipt instant the implementation
// stamps on acceptance. The claimed instant never ranks anything (ruling Q2=A,
// 2026-08-05 — Issue #1946, executed under FR-2f).
export function resolveTlaBallots(state: TlaElectionState, cutoffSeq = state.tallyReceipt?.cutoffSeq ?? state.arrivalSeq): Partial<Record<TlaVoter, TlaBallot>> {
  const resolved: Partial<Record<TlaVoter, TlaBallot>> = {};
  for (const ballot of state.accepted) {
    if (ballot.arrivalSeq > cutoffSeq) continue;
    const prior = resolved[ballot.voter];
    if (prior === undefined || ballot.arrivalSeq > prior.arrivalSeq) {
      resolved[ballot.voter] = ballot;
    }
  }
  return resolved;
}

function tallyReceipt(state: TlaElectionState, receivedAt: TlaReceivedAt): TlaTallyReceipt {
  const cutoffSeq = state.arrivalSeq;
  const ballotSnapshot = state.accepted.filter((ballot) => ballot.arrivalSeq <= cutoffSeq);
  const byVoter = resolveTlaBallots(state, cutoffSeq);
  const resolved = TLA_VOTERS.flatMap((voter) => byVoter[voter] === undefined ? [] : [byVoter[voter]!]);
  const eligible = resolved.filter(({ goa }) => goa !== 4);
  const perVoterResolution = Object.fromEntries(resolved.map((ballot) => [ballot.voter, ballot.arrivalSeq])) as Partial<Record<TlaVoter, number>>;
  const counts: Record<TlaChoice, number> = { C1: 0, C2: 0, C3: 0 };
  for (const ballot of eligible) counts[ballot.choice] += 1;
  const blocks = resolved.filter(({ goa }) => goa === 8).length;
  const discuss = resolved.filter(({ goa }) => goa === 5).length;
  const favor = resolved.filter(({ goa }) => [1, 2, 3, 6].includes(goa)).length;
  const against = resolved.filter(({ goa }) => goa === 7 || goa === 8).length;
  const base = { cutoffSeq, receivedAt, ballotSnapshot, resolved, eligible, perVoterResolution, counts };
  if (blocks >= 1) return { ...base, kind: "HOLD", reason: "BLOCK", winner: null, choiceWinner: null };
  if (discuss >= 2) return { ...base, kind: "HOLD", reason: "DISCUSSION_NEEDED", winner: null, choiceWinner: null };
  if (favor + against === 0) return { ...base, kind: "HOLD", reason: "QUORUM_SHORT", winner: null, choiceWinner: null };
  const maximum = Math.max(...Object.values(counts));
  const winners = TLA_CHOICES.filter((choice) => counts[choice] === maximum);
  return winners.length === 1
    ? { ...base, kind: "ESTABLISHED", winner: winners[0]!, choiceWinner: winners[0]! }
    : { ...base, kind: "HOLD", reason: "TIE", winner: null, choiceWinner: null };
}

function applyTallyAction(state: TlaElectionState, receivedAt: TlaReceivedAt): TlaElectionState {
  if (state.tallyReceipt !== null || state.accepted.length === 0) return { ...copyState(state), lastOutcome: "ACTION_REJECTED" };
  return { ...copyState(state), tallyReceipt: tallyReceipt(state, receivedAt), lastOutcome: "TALLY_RECORDED" };
}

function applyHoldAction(state: TlaElectionState, reason: TlaHoldReason): TlaElectionState {
  if (state.tallyReceipt?.kind !== "HOLD" || state.tallyReceipt.reason !== reason || state.holdBudget !== 1 || state.holdMarkers.length !== 0) {
    return { ...copyState(state), lastOutcome: "ACTION_REJECTED" };
  }
  return { ...copyState(state), holdBudget: 0, holdMarkers: [reason], lastOutcome: "HOLD_RECORDED" };
}

function applySubmissionAction(
  state: TlaElectionState,
  action: Extract<TlaElectionAction, { kind: "SubmitOriginal" | "SubmitAmend" }>,
): TlaElectionState {
  const budget = action.kind === "SubmitOriginal" ? state.initialBudget : state.amendBudget;
  if (budget[action.voter] !== 1) return { ...copyState(state), lastOutcome: "BUDGET_EXHAUSTED" };
  if (!isChoice(action.choice)) return { ...copyState(state), lastOutcome: "UNKNOWN_CHOICE_REJECTED" };
  if (!isSubmittedAt(action.submittedAt)) return { ...copyState(state), lastOutcome: "INVALID_TIMESTAMP_REJECTED" };
  if (action.kind === "SubmitAmend" && !refExists(state, action.voter, action.ref)) {
    return { ...copyState(state), lastOutcome: "UNKNOWN_REF_REJECTED" };
  }
  const next = appendBallot(state, {
    kind: action.kind === "SubmitOriginal" ? "original" : "amend",
    voter: action.voter,
    choice: action.choice,
    submittedAt: action.submittedAt,
    receivedAt: action.receivedAt,
    goa: action.goa,
    ref: action.kind === "SubmitAmend" ? action.ref as TlaBallotRef : null,
  });
  const nextBudget = action.kind === "SubmitOriginal" ? next.initialBudget : next.amendBudget;
  nextBudget[action.voter] = 0;
  next.lastOutcome = state.tallyReceipt === null
    ? action.kind === "SubmitOriginal" ? "ORIGINAL_ACCEPTED" : "AMEND_ACCEPTED"
    : action.kind === "SubmitOriginal" ? "ORIGINAL_LATE" : "AMEND_LATE";
  return next;
}

export function applyTlaElectionAction(state: TlaElectionState, action: TlaElectionAction): TlaElectionState {
  assertTlaElectionAction(action);
  if (action.kind === "TerminalStutter") {
    const spendable = TLA_VOTERS.some((voter) => state.initialBudget[voter] === 1
      || (state.amendBudget[voter] === 1 && state.accepted.some((ballot) => ballot.voter === voter)));
    const terminal = state.tallyReceipt !== null && !spendable
      && (state.tallyReceipt.kind === "ESTABLISHED" || state.holdBudget === 0);
    return terminal ? copyState(state) : { ...copyState(state), lastOutcome: "ACTION_REJECTED" };
  }
  if (action.kind === "Tally") return applyTallyAction(state, action.receivedAt);
  if (action.kind === "RecordHold") return applyHoldAction(state, action.reason);
  return applySubmissionAction(state, action);
}

// The named-invariant vocabulary has exactly one source: the model-map.json
// `vocabulary` declaration (ADR-6). No code-level default remains here — a
// model without a vocabulary declaration is an explicit failure, never a
// fallback (BR-V1/V3).
export function namedInvariantsFor(
  model: ModelMapModel,
): Result<readonly string[], ModelLoadError> {
  if (model.vocabulary === undefined) {
    return {
      ok: false,
      error: {
        kind: "MODEL_LOAD",
        code: "MODEL_MAP_INVALID",
        relativePath: TLA_MODEL_MAP_PATH,
        detail: `model ${model.name} does not declare a vocabulary`,
      },
    };
  }
  return { ok: true, value: model.vocabulary.namedInvariants };
}

export interface TlaInvariantSourceLocation {
  line: number;
  column: number;
}

interface TlaInvariantDeclaration extends TlaInvariantSourceLocation {
  readonly start: number;
  readonly rhsStart: number;
}

function tlaInvariantDeclaration(
  source: string,
  name: string,
): TlaInvariantDeclaration | undefined {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`^${escapedName}[ \\t]*==`, "m").exec(source);
  if (match === null) return undefined;
  return {
    start: match.index,
    rhsStart: match.index + match[0].length,
    line: source.slice(0, match.index).split("\n").length,
    column: 1,
  };
}

export interface FrozenTlaModelReceipt {
  modelIdentity: string;
  moduleBytesIdentity: string;
  cfgBytesIdentity: string;
  profileIdentity: string;
  publicContractIdentity: string;
  auxiliaryModules: readonly { readonly name: string; readonly moduleBytesIdentity: string }[];
  // Key set = the selected model's vocabulary; closed-set enforced at runtime
  // by exactPlainObject inside validateFrozenTlaModelReceipt.
  namedInvariantFormulas: Record<string, string>;
  invariantSourceMap: Record<string, TlaInvariantSourceLocation>;
  freezeRevision: 1;
}

export interface FrozenTlaModelBundle extends FrozenTlaModelReceipt {
  moduleBytes: Uint8Array;
  cfgBytes: Uint8Array;
  moduleSource: string;
  cfgSource: string;
}

export function tlaInvariantSourceMap(
  source: string,
  invariants: readonly string[],
): Result<Record<string, TlaInvariantSourceLocation>, { readonly missingInvariant: string }> {
  const locations: Record<string, TlaInvariantSourceLocation> = {};
  for (const name of invariants) {
    const declaration = tlaInvariantDeclaration(source, name);
    if (declaration === undefined) return { ok: false, error: { missingInvariant: name } };
    locations[name] = { line: declaration.line, column: declaration.column };
  }
  return { ok: true, value: locations };
}

function exactPlainObject(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key !== "string")) return false;
  const actual = (ownKeys as string[]).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index])
    && actual.every((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      return descriptor?.enumerable === true && "value" in descriptor;
    });
}

export type TlaSourceIdentityError = { kind: "TlaSourceIdentityError"; message: string };

function tlaSourceBytesIdentity(
  bytes: Uint8Array,
  domain: string,
): Result<string, TlaSourceIdentityError> {
  try {
    const source = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, value: canonicalIdentity(source, domain).sha256 };
  } catch {
    return { ok: false, error: { kind: "TlaSourceIdentityError", message: "source bytes are not valid UTF-8" } };
  }
}

export function tlaModuleBytesIdentity(bytes: Uint8Array): Result<string, TlaSourceIdentityError> {
  return tlaSourceBytesIdentity(bytes, "amadeus.formal-verif.tla.module.v1");
}

export function tlaCfgBytesIdentity(bytes: Uint8Array): Result<string, TlaSourceIdentityError> {
  return tlaSourceBytesIdentity(bytes, "amadeus.formal-verif.tla.cfg.v1");
}

function invariantRhs(source: string, name: string, invariants: readonly string[]): string {
  const declaration = tlaInvariantDeclaration(source, name);
  if (declaration === undefined) throw new Error(`missing invariant RHS: ${name}`);
  const { start, rhsStart } = declaration;
  const later = invariants
    .map((candidate) => tlaInvariantDeclaration(source.slice(rhsStart), candidate))
    .map((candidate) => candidate === undefined ? -1 : rhsStart + candidate.start)
    .filter((index) => index > rhsStart);
  const end = Math.min(...later, source.indexOf("Spec ==", rhsStart));
  if (start < 0 || rhsStart < 2 || end < rhsStart) throw new Error(`missing invariant RHS: ${name}`);
  return source.slice(rhsStart, end);
}

export class TlaModelHarnessError extends Error {
  readonly verdict = "HARNESS_ERROR" as const;
  readonly exitCode = 2 as const;

  constructor(readonly pipelineError: TlaModelPipelineError) {
    super(`${pipelineError.code}: ${pipelineError.relativePath}: ${pipelineError.detail}`);
    this.name = "TlaModelHarnessError";
  }
}

function unreachablePipelineError(error: never): never {
  throw new Error(`unhandled TLA model pipeline error: ${String(error)}`);
}

export function toTlaModelHarnessError(error: TlaModelPipelineError): TlaModelHarnessError {
  if (error.kind === "SOURCE_DRIFT") return new TlaModelHarnessError(error);
  const code = error.code;
  switch (code) {
    case "MODEL_MISSING":
    case "CFG_MISSING":
    case "MODEL_EMPTY":
    case "CFG_EMPTY":
    case "MODEL_UNREADABLE":
    case "CFG_UNREADABLE":
    case "MODEL_MAP_MISSING":
    case "MODEL_MAP_EMPTY":
    case "MODEL_MAP_UNREADABLE":
    case "MODEL_MAP_INVALID":
      return new TlaModelHarnessError(error);
    default:
      return unreachablePipelineError(code);
  }
}

function generateFrozenTlaModelFromSource(
  source: VerifiedTlaSource | VerifiedModelSource,
  input: { publicContractIdentity: string },
  invariants: readonly string[],
): FrozenTlaModelBundle {
  const profileIdentity = canonicalIdentity({
    voters: TLA_VOTERS,
    choices: TLA_CHOICES,
    choiceInputs: [...TLA_CHOICES, "UNKNOWN_CHOICE"],
    submittedAt: [...TLA_SUBMITTED_AT, "INVALID_FORMAT", "INVALID_DATE"],
    receivedAt: TLA_RECEIVED_AT,
    goa: TLA_GOA,
    maxInitialPerVoter: 1,
    maxAmendPerVoter: 1,
    maxHold: 1,
    workers: 1,
  }, "amadeus.formal-verif.tla.profile.v1");
  const sourceMap = tlaInvariantSourceMap(source.moduleSource, invariants);
  if (!sourceMap.ok) {
    throw new Error(`missing invariant formula: ${sourceMap.error.missingInvariant}`);
  }
  const formulas = Object.fromEntries(invariants.map((name) => [
    name,
    canonicalIdentity(invariantRhs(source.moduleSource, name, invariants), "amadeus.formal-verif.tla.invariant-formula.v1").sha256,
  ]));
  const auxiliaryModules = source.auxIdentities.map(({ path, identity }) => ({
    name: path.split(/[\\/]/).at(-1)!.replace(/\.tla$/, ""),
    moduleBytesIdentity: identity,
  }));
  const modelIdentity = canonicalIdentity({
    moduleBytesIdentity: source.moduleIdentity,
    cfgBytesIdentity: source.cfgIdentity,
    profileIdentity: profileIdentity.sha256,
    publicContractIdentity: input.publicContractIdentity,
    auxiliaryModules,
    namedInvariantFormulas: formulas,
    invariantSourceMap: sourceMap.value,
    freezeRevision: 1,
  }, "amadeus.formal-verif.tla.bundle.v1").sha256;
  return {
    modelIdentity,
    moduleBytes: source.moduleBytes,
    cfgBytes: source.cfgBytes,
    moduleSource: source.moduleSource,
    cfgSource: source.cfgSource,
    moduleBytesIdentity: source.moduleIdentity,
    cfgBytesIdentity: source.cfgIdentity,
    profileIdentity: profileIdentity.sha256,
    publicContractIdentity: input.publicContractIdentity,
    auxiliaryModules,
    namedInvariantFormulas: formulas,
    invariantSourceMap: sourceMap.value,
    freezeRevision: 1,
  };
}

export function generateFrozenTlaModel(
  input: { publicContractIdentity: string },
  selectedSource?: VerifiedModelSource,
): FrozenTlaModelBundle {
  if (!exactPlainObject(input, ["publicContractIdentity"]) || !/^[0-9a-f]{64}$/.test(input.publicContractIdentity)) {
    throw new TypeError("expected only a lowercase SHA-256 publicContractIdentity");
  }
  // The frozen model is pinned to FormalElection by deliberate design (ADR-10),
  // not by an ungeneralized leftover. MERGE-NOTE(u2): when the plural loader
  // lands, this becomes loadVerifiedTlaSources() + selectVerifiedModel(sources,
  // "FormalElection"); the singular call below is the pre-u2 spelling of the
  // same pin.
  const source = selectedSource === undefined ? loadVerifiedTlaSource() : { ok: true as const, value: selectedSource };
  if (!source.ok) throw toTlaModelHarnessError(source.error);
  const model = "model" in source.value ? source.value.model : source.value.executionModel;
  const invariants = namedInvariantsFor(model);
  if (!invariants.ok) throw toTlaModelHarnessError(invariants.error);
  return generateFrozenTlaModelFromSource(source.value, input, invariants.value);
}

const FROZEN_TLA_RECEIPT_KEYS = [
  "modelIdentity",
  "moduleBytesIdentity",
  "cfgBytesIdentity",
  "profileIdentity",
  "publicContractIdentity",
  "auxiliaryModules",
  "namedInvariantFormulas",
  "invariantSourceMap",
  "freezeRevision",
] as const;

export function createFrozenTlaModelReceipt(bundle: FrozenTlaModelBundle): FrozenTlaModelReceipt {
  return {
    modelIdentity: bundle.modelIdentity,
    moduleBytesIdentity: bundle.moduleBytesIdentity,
    cfgBytesIdentity: bundle.cfgBytesIdentity,
    profileIdentity: bundle.profileIdentity,
    publicContractIdentity: bundle.publicContractIdentity,
    auxiliaryModules: bundle.auxiliaryModules.map((module) => ({ ...module })),
    namedInvariantFormulas: { ...bundle.namedInvariantFormulas },
    invariantSourceMap: Object.fromEntries(Object.keys(bundle.namedInvariantFormulas).map((name) => [
      name,
      { ...bundle.invariantSourceMap[name] },
    ])),
    freezeRevision: bundle.freezeRevision,
  };
}

export type FrozenTlaModelValidationError = {
  kind: "FrozenTlaModelValidationError";
  message: string;
};

function invariantReceiptShapeError(
  formulas: Record<string, unknown>,
  sourceMap: Record<string, unknown>,
  invariants: readonly string[],
): string | null {
  for (const name of invariants) {
    if (typeof formulas[name] !== "string") return `invalid formula identity for ${name}`;
    if (!exactPlainObject(sourceMap[name], ["line", "column"])) return `invalid source location for ${name}`;
  }
  return null;
}

// The closed-set key expectation is the selected frozen model's vocabulary
// (map-declared), resolved through the same loader pin generateFrozenTlaModel
// uses. Resolution failure is unreachable in a healthy workspace and falls
// through to the regeneration failure path below (fail-closed).
function frozenModelNamedInvariants(): readonly string[] | null {
  const source = loadVerifiedTlaSource();
  if (!source.ok) return null;
  const invariants = namedInvariantsFor(source.value.executionModel);
  return invariants.ok ? invariants.value : null;
}

// Structural, not serialization-order, comparison: a receipt that spells an
// auxiliary module entry with its keys in the other order carries the same
// frozen model.
function auxiliaryModulesMatch(
  input: readonly unknown[],
  expected: FrozenTlaModelReceipt["auxiliaryModules"],
): boolean {
  return input.length === expected.length
    && input.every((module, index) =>
      exactPlainObject(module, ["name", "moduleBytesIdentity"])
      && module.name === expected[index]!.name
      && module.moduleBytesIdentity === expected[index]!.moduleBytesIdentity
    );
}

function scalarReceiptFieldError(
  input: Record<string, unknown>,
  expectedReceipt: FrozenTlaModelReceipt,
): string | null {
  for (const key of [
    "modelIdentity",
    "moduleBytesIdentity",
    "cfgBytesIdentity",
    "profileIdentity",
    "publicContractIdentity",
    "freezeRevision",
  ] as const) {
    if (input[key] !== expectedReceipt[key]) return `${key} differs from the generated frozen model`;
  }
  return null;
}

function invariantMatchError(
  formulas: Record<string, unknown>,
  sourceMap: Record<string, unknown>,
  expectedReceipt: FrozenTlaModelReceipt,
): string | null {
  for (const name of Object.keys(expectedReceipt.namedInvariantFormulas)) {
    if (formulas[name] !== expectedReceipt.namedInvariantFormulas[name]) {
      return `formula identity differs for ${name}`;
    }
    const location = sourceMap[name];
    if (!exactPlainObject(location, ["line", "column"])) return `invalid source location for ${name}`;
    const expectedLocation = expectedReceipt.invariantSourceMap[name]!;
    if (location.line !== expectedLocation.line || location.column !== expectedLocation.column) {
      return `source location differs for ${name}`;
    }
  }
  return null;
}

export function validateFrozenTlaModelReceipt(
  input: unknown,
): Result<FrozenTlaModelBundle, FrozenTlaModelValidationError> {
  const reject = (message: string): Result<never, FrozenTlaModelValidationError> => ({
    ok: false,
    error: { kind: "FrozenTlaModelValidationError", message },
  });
  if (!exactPlainObject(input, FROZEN_TLA_RECEIPT_KEYS)) return reject("receipt must have the exact frozen model shape");
  const invariants = frozenModelNamedInvariants();
  if (invariants === null) {
    // Unreachable in a healthy workspace: the regeneration below fails the
    // same way. Keep the historical failure message for this path.
    return reject("public contract identity must be a lowercase SHA-256 value");
  }
  if (!exactPlainObject(input.namedInvariantFormulas, invariants)) return reject("named invariant formulas differ from the closed set");
  if (!exactPlainObject(input.invariantSourceMap, invariants)) return reject("invariant source map differs from the closed set");
  const shapeError = invariantReceiptShapeError(input.namedInvariantFormulas, input.invariantSourceMap, invariants);
  if (shapeError !== null) return reject(shapeError);
  if (typeof input.publicContractIdentity !== "string") return reject("public contract identity must be a lowercase SHA-256 value");
  if (!Array.isArray(input.auxiliaryModules)) return reject("auxiliary modules differ from the generated frozen model");
  let expected: FrozenTlaModelBundle;
  try {
    expected = generateFrozenTlaModel({ publicContractIdentity: input.publicContractIdentity });
  } catch {
    return reject("public contract identity must be a lowercase SHA-256 value");
  }
  const expectedReceipt = createFrozenTlaModelReceipt(expected);
  const scalarError = scalarReceiptFieldError(input, expectedReceipt);
  if (scalarError !== null) return reject(scalarError);
  if (!auxiliaryModulesMatch(input.auxiliaryModules, expectedReceipt.auxiliaryModules)) {
    return reject("auxiliary modules differ from the generated frozen model");
  }
  const invariantError = invariantMatchError(
    input.namedInvariantFormulas,
    input.invariantSourceMap,
    expectedReceipt,
  );
  if (invariantError !== null) return reject(invariantError);
  return { ok: true, value: expected };
}
