import { canonicalIdentity } from "./canonical.ts";
import { parseCellResult, type CellResult, type Result } from "./contract.ts";

export const FIXED_TLC_174_GRAMMAR_DESCRIPTOR_IDENTITY = "d716a11edb04e301d7cdc91c31843bca76e5031f4fe92b2080d38c5d19a3b313";

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

const SUBMITTED_ORDER: Record<TlaSubmittedAt, number> = { T0: 0, T1: 1, T2: 2 };

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

function assertTlaElectionAction(value: unknown): asserts value is TlaElectionAction {
  if (value === null || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError("action must be a plain object");
  }
  const record = value as Record<string, unknown>;
  const kind = record.kind;
  if (kind === "TerminalStutter" && exactPlainObject(record, ["kind"])) return;
  if (kind === "Tally" && exactPlainObject(record, ["kind", "receivedAt"]) && isReceivedAt(record.receivedAt)) return;
  if (kind === "RecordHold" && exactPlainObject(record, ["kind", "reason"]) && ["BLOCK", "DISCUSSION_NEEDED", "QUORUM_SHORT", "TIE"].includes(String(record.reason))) return;
  if (kind === "SubmitOriginal" && isSubmissionRecord(record, kind)) return;
  if (kind === "SubmitAmend" && isSubmissionRecord(record, kind)) return;
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

export function resolveTlaBallots(state: TlaElectionState, cutoffSeq = state.tallyReceipt?.cutoffSeq ?? state.arrivalSeq): Partial<Record<TlaVoter, TlaBallot>> {
  const resolved: Partial<Record<TlaVoter, TlaBallot>> = {};
  for (const ballot of state.accepted) {
    if (ballot.arrivalSeq > cutoffSeq) continue;
    const prior = resolved[ballot.voter];
    if (
      prior === undefined ||
      SUBMITTED_ORDER[ballot.submittedAt] > SUBMITTED_ORDER[prior.submittedAt] ||
      (ballot.submittedAt === prior.submittedAt && ballot.arrivalSeq > prior.arrivalSeq)
    ) {
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

export const TLA_NAMED_INVARIANTS = [
  "ChoiceWinner",
  "UnknownChoiceRejected",
  "ReceivedAtAxis",
  "InvalidTimestampRejected",
  "AmendSubmission",
  "UnknownRefRejected",
  "PerVoterResolution",
] as const;

export type TlaNamedInvariant = (typeof TLA_NAMED_INVARIANTS)[number];

const MODEL_SOURCE = `---- MODULE FormalElection ----
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS V1, V2, V3, C1, C2, C3
Voters == {V1, V2, V3}
Choices == {C1, C2, C3}
Symmetry == {
  [x \\in Voters \\cup Choices |-> IF x \\in Voters THEN pv[x] ELSE pc[x]] :
    pv \\in Permutations(Voters), pc \\in Permutations(Choices)
}
ChoiceInputs == Choices \\cup {"UNKNOWN_CHOICE"}
SubmittedAt == {"T0", "T1", "T2"}
SubmittedInputs == SubmittedAt \\cup {"INVALID_FORMAT", "INVALID_DATE"}
InvalidSubmitted == SubmittedInputs \\ SubmittedAt
ReceivedAt == {"T0", "T1", "T2"}
GoA == 1..8
GoARepresentatives == {1, 4, 5, 7, 8}
LateGoARepresentatives == {1, 8}
OriginalSubmittedRepresentative == "T1"
TallyReceivedRepresentative == "T1"
UnknownRef == "UNKNOWN_REF"
NoBallot == [choice |-> "NONE", submittedAt |-> "T0", goaClass |-> "EXCLUDED", arrivalSeq |-> 0]
GoAClasses == {"FAVOR", "EXCLUDED", "DISCUSS", "AGAINST", "BLOCK"}
HoldReasons == {"BLOCK", "DISCUSSION_NEEDED", "QUORUM_SHORT", "TIE"}
Ballots == [choice: Choices, submittedAt: SubmittedAt, goaClass: GoAClasses, arrivalSeq: 1..6]

GoAClass(g) ==
  CASE g \\in {1, 2, 3, 6} -> "FAVOR"
    [] g = 4 -> "EXCLUDED"
    [] g = 5 -> "DISCUSS"
    [] g = 7 -> "AGAINST"
    [] OTHER -> "BLOCK"

SubmittedRank(s) == CASE s = "T0" -> 0 [] s = "T1" -> 1 [] OTHER -> 2
Later(a, b) ==
  \\/ SubmittedRank(a.submittedAt) > SubmittedRank(b.submittedAt)
  \\/ /\\ a.submittedAt = b.submittedAt
     /\\ a.arrivalSeq > b.arrivalSeq
Resolve(prior, ballot) == IF prior = NoBallot \\/ Later(ballot, prior) THEN ballot ELSE prior
ResolvedVoters(r) == {v \\in Voters : r[v] /= NoBallot}
ResolvedSet(r) == {r[v] : v \\in ResolvedVoters(r)}
EligibleSet(r) == {b \\in ResolvedSet(r) : b.goaClass /= "EXCLUDED"}
ChoiceCount(r, c) == Cardinality({b \\in EligibleSet(r) : b.choice = c})
Counts(r) == [c \\in Choices |-> ChoiceCount(r, c)]
BlockCount(r) == Cardinality({b \\in ResolvedSet(r) : b.goaClass = "BLOCK"})
DiscussCount(r) == Cardinality({b \\in ResolvedSet(r) : b.goaClass = "DISCUSS"})
FavorCount(r) == Cardinality({b \\in ResolvedSet(r) : b.goaClass = "FAVOR"})
AgainstCount(r) == Cardinality({b \\in ResolvedSet(r) : b.goaClass \\in {"AGAINST", "BLOCK"}})
TopChoices(r) == {c \\in Choices : \\A other \\in Choices: ChoiceCount(r, c) >= ChoiceCount(r, other)}
UniqueWinner(r) == IF Cardinality(TopChoices(r)) = 1 THEN CHOOSE c \\in TopChoices(r): TRUE ELSE "NONE"
HoldReason(r) ==
  IF BlockCount(r) >= 1 THEN "BLOCK"
  ELSE IF DiscussCount(r) >= 2 THEN "DISCUSSION_NEEDED"
  ELSE IF FavorCount(r) + AgainstCount(r) = 0 THEN "QUORUM_SHORT"
  ELSE IF Cardinality(TopChoices(r)) /= 1 THEN "TIE"
  ELSE "NONE"
TallyKind(r) == IF HoldReason(r) = "NONE" THEN "ESTABLISHED" ELSE "HOLD"
ReceiptWinner(r) == IF TallyKind(r) = "ESTABLISHED" THEN UniqueWinner(r) ELSE "NONE"
EligibleMap(r) == [v \\in Voters |-> IF r[v] /= NoBallot /\\ r[v].goaClass /= "EXCLUDED" THEN r[v] ELSE NoBallot]
ResolutionSeqs(r) == [v \\in Voters |-> IF r[v] = NoBallot THEN 0 ELSE r[v].arrivalSeq]
EmptyResolution == [v \\in Voters |-> NoBallot]
EmptyCounts == [c \\in Choices |-> 0]
EmptyReceipt == [
  kind |-> "NONE", reason |-> "NONE", winner |-> "NONE", choiceWinner |-> "NONE",
  receivedAt |-> TallyReceivedRepresentative, cutoffSeq |-> 0, ballotSnapshot |-> EmptyResolution,
  resolved |-> EmptyResolution, eligible |-> EmptyResolution,
  perVoterResolution |-> [v \\in Voters |-> 0], counts |-> EmptyCounts
]
Receipt(r, received, cutoff) == [
  kind |-> TallyKind(r), reason |-> HoldReason(r), winner |-> ReceiptWinner(r),
  choiceWinner |-> ReceiptWinner(r), receivedAt |-> received, cutoffSeq |-> cutoff,
  ballotSnapshot |-> r, resolved |-> r, eligible |-> EligibleMap(r),
  perVoterResolution |-> ResolutionSeqs(r), counts |-> Counts(r)
]

VARIABLES accepted, reexamRequired, initialBudget, amendBudget,
          holdBudget, holdMarkers, tally
vars == <<accepted, reexamRequired, initialBudget, amendBudget,
          holdBudget, holdMarkers, tally>>

InitialSpent == 3 - (initialBudget[V1] + initialBudget[V2] + initialBudget[V3])
AmendSpent == 3 - (amendBudget[V1] + amendBudget[V2] + amendBudget[V3])
SubmissionCount == InitialSpent + AmendSpent
AcceptedCount == IF tally.kind = "NONE" THEN SubmissionCount ELSE tally.cutoffSeq
LateCount == SubmissionCount - AcceptedCount
NextSeq == SubmissionCount + 1

Init ==
  /\\ accepted = EmptyResolution
  /\\ reexamRequired = FALSE
  /\\ initialBudget = [v \\in Voters |-> 1]
  /\\ amendBudget = [v \\in Voters |-> 1]
  /\\ holdBudget = 1
  /\\ holdMarkers = <<>>
  /\\ tally = EmptyReceipt

Reject == UNCHANGED vars

Route(v, ballot, g) ==
  /\\ IF tally.kind = "NONE"
     THEN /\\ accepted' = [accepted EXCEPT ![v] = Resolve(@, ballot)]
          /\\ UNCHANGED reexamRequired
     ELSE /\\ UNCHANGED accepted
          /\\ reexamRequired' = (reexamRequired \\/ (g = 8))

SubmitOriginal(v, c, s, g) ==
  /\\ initialBudget[v] = 1
  /\\ IF c = "UNKNOWN_CHOICE"
     THEN Reject
     ELSE IF s \\notin SubmittedAt
     THEN Reject
     ELSE /\\ initialBudget' = [initialBudget EXCEPT ![v] = 0]
          /\\ UNCHANGED <<amendBudget, holdBudget, holdMarkers, tally>>
          /\\ LET ballot == [choice |-> c, submittedAt |-> s, goaClass |-> GoAClass(g), arrivalSeq |-> NextSeq]
             IN Route(v, ballot, g)

SubmitAmend(v, ref, c, s, g) ==
  /\\ amendBudget[v] = 1
  /\\ IF c = "UNKNOWN_CHOICE"
     THEN Reject
     ELSE IF s \\notin SubmittedAt
     THEN Reject
     ELSE IF accepted[v] = NoBallot \\/ ref /= accepted[v].arrivalSeq
     THEN Reject
     ELSE /\\ amendBudget' = [amendBudget EXCEPT ![v] = 0]
          /\\ UNCHANGED <<initialBudget, holdBudget, holdMarkers, tally>>
          /\\ LET ballot == [choice |-> c, submittedAt |-> s, goaClass |-> GoAClass(g), arrivalSeq |-> NextSeq]
             IN Route(v, ballot, g)

Tally(received) ==
  /\\ tally.kind = "NONE"
  /\\ SubmissionCount > 0
  /\\ tally' = Receipt(accepted, received, SubmissionCount)
  /\\ UNCHANGED <<accepted, reexamRequired, initialBudget, amendBudget,
                  holdBudget, holdMarkers>>

RecordHold(reason) ==
  /\\ tally.kind = "HOLD"
  /\\ tally.reason = reason
  /\\ holdBudget = 1
  /\\ holdMarkers = <<>>
  /\\ holdBudget' = 0
  /\\ holdMarkers' = <<reason>>
  /\\ UNCHANGED <<accepted, reexamRequired, initialBudget, amendBudget, tally>>

SpendableSubmission ==
  \\E v \\in Voters:
    \\/ initialBudget[v] = 1
    \\/ /\\ amendBudget[v] = 1
       /\\ accepted[v] /= NoBallot
Terminal ==
  /\\ tally.kind /= "NONE"
  /\\ ~SpendableSubmission
  /\\ (tally.kind = "ESTABLISHED" \\/ holdBudget = 0)
TerminalStutter ==
  /\\ Terminal
  /\\ UNCHANGED vars

Next ==
  \\/ \\E v \\in Voters, c \\in Choices, g \\in GoARepresentatives:
       /\\ tally.kind = "NONE"
       /\\ SubmitOriginal(v, c, OriginalSubmittedRepresentative, g)
  \\/ \\E v \\in Voters, g \\in LateGoARepresentatives:
       /\\ tally.kind /= "NONE"
       /\\ SubmitOriginal(v, C1, "T1", g)
  \\/ \\E v \\in Voters, c \\in Choices, s \\in SubmittedAt,
       g \\in GoARepresentatives:
       /\\ tally.kind = "NONE"
       /\\ SubmitAmend(v, accepted[v].arrivalSeq, c, s, g)
  \\/ \\E v \\in Voters, g \\in LateGoARepresentatives:
       /\\ tally.kind /= "NONE"
       /\\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
  \\/ \\E v \\in Voters: SubmitOriginal(v, "UNKNOWN_CHOICE", "T1", 1)
  \\/ \\E v \\in Voters: SubmitOriginal(v, C1, "INVALID_FORMAT", 1)
  \\/ \\E v \\in Voters: SubmitAmend(v, accepted[v].arrivalSeq, "UNKNOWN_CHOICE", "T1", 1)
  \\/ \\E v \\in Voters: SubmitAmend(v, accepted[v].arrivalSeq, C1, "INVALID_FORMAT", 1)
  \\/ \\E v \\in Voters: SubmitAmend(v, 0, C1, "T1", 1)
  \\/ Tally(TallyReceivedRepresentative)
  \\/ \\E reason \\in HoldReasons: RecordHold(reason)
  \\/ TerminalStutter

TypeOK ==
  /\\ accepted \\in [Voters -> Ballots \\cup {NoBallot}]
  /\\ reexamRequired \\in BOOLEAN
  /\\ initialBudget \\in [Voters -> {0, 1}]
  /\\ amendBudget \\in [Voters -> {0, 1}]
  /\\ holdBudget \\in {0, 1}
  /\\ holdMarkers \\in Seq(HoldReasons)
  /\\ Len(holdMarkers) <= 1
  /\\ tally.kind \\in {"NONE", "HOLD", "ESTABLISHED"}
  /\\ SubmissionCount \\in 0..6
  /\\ AcceptedCount \\in 0..6
  /\\ LateCount \\in 0..6
  /\\ NextSeq \\in 1..7

ActionRefinement ==
  /\\ \\A v \\in Voters: amendBudget[v] = 0 => initialBudget[v] = 0
  /\\ \\A v \\in ResolvedVoters(accepted): initialBudget[v] = 0
  /\\ (holdBudget = 1 => holdMarkers = <<>>)
  /\\ (holdBudget = 0 =>
      /\\ tally.kind = "HOLD"
      /\\ holdMarkers = <<tally.reason>>)
  /\\ (tally.kind = "NONE" =>
      /\\ tally = EmptyReceipt
      /\\ AcceptedCount = SubmissionCount
      /\\ LateCount = 0
      /\\ reexamRequired = FALSE)
  /\\ (tally.kind /= "NONE" =>
      /\\ tally.cutoffSeq \\in 1..SubmissionCount
      /\\ AcceptedCount = tally.cutoffSeq
      /\\ LateCount = SubmissionCount - tally.cutoffSeq
      /\\ tally.ballotSnapshot = accepted
      /\\ tally.resolved = accepted)

UnknownChoiceAction ==
  \\E v \\in Voters:
    \\/ SubmitOriginal(v, "UNKNOWN_CHOICE", "INVALID_FORMAT", 1)
    \\/ SubmitAmend(v, 0, "UNKNOWN_CHOICE", "INVALID_FORMAT", 1)
InvalidTimestampAction ==
  \\E v \\in Voters, s \\in InvalidSubmitted:
    \\/ SubmitOriginal(v, C1, s, 1)
    \\/ SubmitAmend(v, 0, C1, s, 1)
AnyValidAmend == \\E v \\in Voters: amendBudget[v] = 1 /\\ accepted[v] /= NoBallot
ValidAmendStep ==
  \\E v \\in Voters, g \\in LateGoARepresentatives:
    /\\ amendBudget[v] = 1 /\\ accepted[v] /= NoBallot
    /\\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
BadAmendStep ==
  \\E v \\in Voters, g \\in LateGoARepresentatives:
    /\\ amendBudget[v] = 1 /\\ accepted[v] /= NoBallot
    /\\ SubmitAmend(v, accepted[v].arrivalSeq, C1, "T1", g)
    /\\ ~(/\\ SubmissionCount' = SubmissionCount + 1
         /\\ amendBudget' = [amendBudget EXCEPT ![v] = 0]
         /\\ UNCHANGED <<initialBudget, holdBudget, holdMarkers, tally>>
         /\\ (IF tally.kind = "NONE"
             THEN UNCHANGED reexamRequired
             ELSE reexamRequired' = (reexamRequired \\/ (g = 8))))
ExpectedResolution(prior, ballot) ==
  IF prior = NoBallot
     \\/ (CASE ballot.submittedAt = "T0" -> 0 [] ballot.submittedAt = "T1" -> 1 [] OTHER -> 2)
        > (CASE prior.submittedAt = "T0" -> 0 [] prior.submittedAt = "T1" -> 1 [] OTHER -> 2)
     \\/ /\\ ballot.submittedAt = prior.submittedAt
        /\\ ballot.arrivalSeq > prior.arrivalSeq
  THEN ballot ELSE prior
BadResolutionStep ==
  \\E v \\in Voters:
    \\/ LET ballot == [choice |-> C1, submittedAt |-> OriginalSubmittedRepresentative,
                       goaClass |-> GoAClass(1), arrivalSeq |-> NextSeq]
       IN /\\ initialBudget[v] = 1
          /\\ SubmitOriginal(v, C1, OriginalSubmittedRepresentative, 1)
          /\\ ~(IF tally.kind = "NONE"
                THEN accepted' = [accepted EXCEPT ![v] = ExpectedResolution(@, ballot)]
                ELSE UNCHANGED accepted)
    \\/ \\E s \\in SubmittedAt:
         LET ballot == [choice |-> C1, submittedAt |-> s,
                         goaClass |-> GoAClass(1), arrivalSeq |-> NextSeq]
         IN /\\ amendBudget[v] = 1 /\\ accepted[v] /= NoBallot
            /\\ SubmitAmend(v, accepted[v].arrivalSeq, C1, s, 1)
            /\\ ~(IF tally.kind = "NONE"
                  THEN accepted' = [accepted EXCEPT ![v] = ExpectedResolution(@, ballot)]
                  ELSE UNCHANGED accepted)

ChoiceWinner ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (tally.kind = "NONE" \\/
      /\\ tally.kind = TallyKind(tally.resolved)
      /\\ tally.reason = HoldReason(tally.resolved)
      /\\ tally.winner = ReceiptWinner(tally.resolved)
      /\\ tally.choiceWinner = ReceiptWinner(tally.resolved)
      /\\ tally.counts = Counts(tally.resolved))
UnknownChoiceRejected ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (\\A v \\in ResolvedVoters(accepted): accepted[v].choice \\in Choices)
  /\\ ~ENABLED (UnknownChoiceAction /\\ ~(UNCHANGED vars))
ReceivedAtAxis ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ ((tally.kind = "NONE" => LateCount = 0)
      /\\ (tally.kind /= "NONE" => LateCount = SubmissionCount - tally.cutoffSeq))
InvalidTimestampRejected ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (\\A v \\in ResolvedVoters(accepted): accepted[v].submittedAt \\in SubmittedAt)
  /\\ ~ENABLED (InvalidTimestampAction /\\ ~(UNCHANGED vars))
AmendSubmission ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (AmendSpent <= InitialSpent)
  /\\ (AnyValidAmend => ENABLED ValidAmendStep)
  /\\ ~ENABLED BadAmendStep
UnknownRefRejected ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (\\A v \\in Voters:
      ~ENABLED (SubmitAmend(v, 0, C1, "T1", 1)
                /\\ ~(UNCHANGED vars)))
PerVoterResolution ==
  /\\ TypeOK
  /\\ ActionRefinement
  /\\ (tally.kind /= "NONE" =>
      /\\ tally.resolved = tally.ballotSnapshot
      /\\ tally.perVoterResolution = ResolutionSeqs(tally.ballotSnapshot)
      /\\ tally.cutoffSeq <= SubmissionCount)
  /\\ ~ENABLED BadResolutionStep

Spec == Init /\\ [][Next]_vars

====
`;

const CFG_SOURCE = `CONSTANTS
V1 = V1
V2 = V2
V3 = V3
C1 = C1
C2 = C2
C3 = C3
SYMMETRY Symmetry
SPECIFICATION Spec
INVARIANT ChoiceWinner
INVARIANT UnknownChoiceRejected
INVARIANT ReceivedAtAxis
INVARIANT InvalidTimestampRejected
INVARIANT AmendSubmission
INVARIANT UnknownRefRejected
INVARIANT PerVoterResolution
`;

export interface TlaInvariantSourceLocation {
  line: number;
  column: number;
}

export interface FrozenTlaModelReceipt {
  modelIdentity: string;
  moduleBytesIdentity: string;
  cfgBytesIdentity: string;
  profileIdentity: string;
  publicContractIdentity: string;
  namedInvariantFormulas: Record<TlaNamedInvariant, string>;
  invariantSourceMap: Record<TlaNamedInvariant, TlaInvariantSourceLocation>;
  freezeRevision: 1;
}

export interface FrozenTlaModelBundle extends FrozenTlaModelReceipt {
  moduleBytes: Uint8Array;
  cfgBytes: Uint8Array;
  moduleSource: string;
  cfgSource: string;
}

function invariantMap(source: string): Record<TlaNamedInvariant, TlaInvariantSourceLocation> {
  const lines = source.split("\n");
  return Object.fromEntries(TLA_NAMED_INVARIANTS.map((name) => {
    const line = lines.findIndex((value) => value.startsWith(`${name} ==`));
    if (line < 0) throw new Error(`missing invariant formula: ${name}`);
    return [name, { line: line + 1, column: 1 }];
  })) as Record<TlaNamedInvariant, TlaInvariantSourceLocation>;
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

function invariantRhs(source: string, name: TlaNamedInvariant): string {
  const start = source.indexOf(name + " ==");
  const rhsStart = source.indexOf("==", start) + 2;
  const later = TLA_NAMED_INVARIANTS
    .map((candidate) => source.indexOf(candidate + " ==", rhsStart))
    .filter((index) => index > rhsStart);
  const end = Math.min(...later, source.indexOf("Spec ==", rhsStart));
  if (start < 0 || rhsStart < 2 || end < rhsStart) throw new Error(`missing invariant RHS: ${name}`);
  return source.slice(rhsStart, end);
}

export function generateFrozenTlaModel(input: { publicContractIdentity: string }): FrozenTlaModelBundle {
  if (!exactPlainObject(input, ["publicContractIdentity"]) || !/^[0-9a-f]{64}$/.test(input.publicContractIdentity)) {
    throw new TypeError("expected only a lowercase SHA-256 publicContractIdentity");
  }
  const moduleBytes = new TextEncoder().encode(MODEL_SOURCE);
  const cfgBytes = new TextEncoder().encode(CFG_SOURCE);
  const moduleIdentity = tlaModuleBytesIdentity(moduleBytes);
  const cfgIdentity = tlaCfgBytesIdentity(cfgBytes);
  if (!moduleIdentity.ok || !cfgIdentity.ok) throw new Error("frozen TLA source must be valid UTF-8");
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
  const sourceMap = invariantMap(MODEL_SOURCE);
  const formulas = Object.fromEntries(TLA_NAMED_INVARIANTS.map((name) => [
    name,
    canonicalIdentity(invariantRhs(MODEL_SOURCE, name), "amadeus.formal-verif.tla.invariant-formula.v1").sha256,
  ])) as Record<TlaNamedInvariant, string>;
  const modelIdentity = canonicalIdentity({
    moduleBytesIdentity: moduleIdentity.value,
    cfgBytesIdentity: cfgIdentity.value,
    profileIdentity: profileIdentity.sha256,
    publicContractIdentity: input.publicContractIdentity,
    namedInvariantFormulas: formulas,
    invariantSourceMap: sourceMap,
    freezeRevision: 1,
  }, "amadeus.formal-verif.tla.bundle.v1").sha256;
  return {
    modelIdentity,
    moduleBytes,
    cfgBytes,
    moduleSource: MODEL_SOURCE,
    cfgSource: CFG_SOURCE,
    moduleBytesIdentity: moduleIdentity.value,
    cfgBytesIdentity: cfgIdentity.value,
    profileIdentity: profileIdentity.sha256,
    publicContractIdentity: input.publicContractIdentity,
    namedInvariantFormulas: formulas,
    invariantSourceMap: sourceMap,
    freezeRevision: 1,
  };
}

const FROZEN_TLA_RECEIPT_KEYS = [
  "modelIdentity",
  "moduleBytesIdentity",
  "cfgBytesIdentity",
  "profileIdentity",
  "publicContractIdentity",
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
    namedInvariantFormulas: { ...bundle.namedInvariantFormulas },
    invariantSourceMap: Object.fromEntries(TLA_NAMED_INVARIANTS.map((name) => [
      name,
      { ...bundle.invariantSourceMap[name] },
    ])) as Record<TlaNamedInvariant, TlaInvariantSourceLocation>,
    freezeRevision: bundle.freezeRevision,
  };
}

export type FrozenTlaModelValidationError = {
  kind: "FrozenTlaModelValidationError";
  message: string;
};

export function validateFrozenTlaModelReceipt(
  input: unknown,
): Result<FrozenTlaModelBundle, FrozenTlaModelValidationError> {
  const reject = (message: string): Result<never, FrozenTlaModelValidationError> => ({
    ok: false,
    error: { kind: "FrozenTlaModelValidationError", message },
  });
  if (!exactPlainObject(input, FROZEN_TLA_RECEIPT_KEYS)) return reject("receipt must have the exact frozen model shape");
  if (!exactPlainObject(input.namedInvariantFormulas, TLA_NAMED_INVARIANTS)) return reject("named invariant formulas differ from the closed set");
  if (!exactPlainObject(input.invariantSourceMap, TLA_NAMED_INVARIANTS)) return reject("invariant source map differs from the closed set");
  for (const name of TLA_NAMED_INVARIANTS) {
    if (typeof input.namedInvariantFormulas[name] !== "string") return reject(`invalid formula identity for ${name}`);
    const location = input.invariantSourceMap[name];
    if (!exactPlainObject(location, ["line", "column"])) return reject(`invalid source location for ${name}`);
  }
  if (typeof input.publicContractIdentity !== "string") return reject("public contract identity must be a lowercase SHA-256 value");
  let expected: FrozenTlaModelBundle;
  try {
    expected = generateFrozenTlaModel({ publicContractIdentity: input.publicContractIdentity });
  } catch {
    return reject("public contract identity must be a lowercase SHA-256 value");
  }
  const expectedReceipt = createFrozenTlaModelReceipt(expected);
  for (const key of [
    "modelIdentity",
    "moduleBytesIdentity",
    "cfgBytesIdentity",
    "profileIdentity",
    "publicContractIdentity",
    "freezeRevision",
  ] as const) {
    if (input[key] !== expectedReceipt[key]) return reject(`${key} differs from the generated frozen model`);
  }
  for (const name of TLA_NAMED_INVARIANTS) {
    if (input.namedInvariantFormulas[name] !== expectedReceipt.namedInvariantFormulas[name]) {
      return reject(`formula identity differs for ${name}`);
    }
    const location = input.invariantSourceMap[name];
    if (!exactPlainObject(location, ["line", "column"])) return reject(`invalid source location for ${name}`);
    const expectedLocation = expectedReceipt.invariantSourceMap[name];
    if (location.line !== expectedLocation.line || location.column !== expectedLocation.column) {
      return reject(`source location differs for ${name}`);
    }
  }
  return { ok: true, value: expected };
}

interface TlcEnvelope {
  code: number;
  severity: number;
  payload: string;
}

export interface TlcOutputInput {
  chunks: Uint8Array[];
  exitCode: number | null;
  signal: string | null;
  timedOut: boolean;
  expectedModuleName: string;
  expectedModulePath: string;
  expectedStandardModuleDirectory: string;
  verifiedArtifactDescriptorIdentity: string;
  modelReceipt: FrozenTlaModelReceipt;
}

export interface CompleteTlcExploration {
  kind: "COMPLETE";
  generatedStates: number;
  distinctStates: number;
  statesLeftOnQueue: 0;
  searchDepth: number;
  completionMarker: "Model checking completed. No error has been found.";
  terminationReason: "EXHAUSTED";
}

export interface TlcTraceState {
  ordinal: number;
  label: string;
  body: string[];
}

export interface CounterexampleTlcExploration {
  kind: "COUNTEREXAMPLE";
  invariant: string;
  sourceLocation: TlaInvariantSourceLocation;
  trace: TlcTraceState[];
  counterexampleIdentity: string;
  generatedStates: number;
  distinctStates: number;
  statesLeftOnQueue: number;
  searchDepth: number;
}

export interface FailedTlcExploration {
  kind: "HARNESS_ERROR";
  reason: "TIMEOUT" | "SIGNAL" | "OUTPUT_CAPACITY" | "UTF8" | "GRAMMAR" | "OUTCOME_MISMATCH";
  detail: string;
}

export type TlcExploration = CompleteTlcExploration | CounterexampleTlcExploration | FailedTlcExploration;

const MAX_TLC_OUTPUT_BYTES = 16 * 1024 * 1024;
const START = /^@!@!@STARTMSG ([0-9]+):([0-9]+) @!@!@$/;
const END = /^@!@!@ENDMSG ([0-9]+) @!@!@$/;
const ALLOWED_CODES = new Map<number, { severity: number; repeat: boolean }>([
  [2262, { severity: 0, repeat: false }],
  [2187, { severity: 0, repeat: false }],
  [2220, { severity: 0, repeat: false }],
  [2219, { severity: 0, repeat: false }],
  [2185, { severity: 0, repeat: false }],
  [2189, { severity: 0, repeat: false }],
  [2190, { severity: 0, repeat: false }],
  [2193, { severity: 0, repeat: false }],
  [2200, { severity: 0, repeat: true }],
  [2199, { severity: 0, repeat: false }],
  [2194, { severity: 0, repeat: false }],
  [2268, { severity: 0, repeat: false }],
  [2186, { severity: 0, repeat: false }],
  [2110, { severity: 1, repeat: false }],
  [2121, { severity: 1, repeat: false }],
  [2217, { severity: 4, repeat: true }],
]);

function failed(reason: FailedTlcExploration["reason"], detail: string): FailedTlcExploration {
  return { kind: "HARNESS_ERROR", reason, detail };
}

function decodeChunks(chunks: Uint8Array[]): string | FailedTlcExploration {
  let total = 0;
  for (const chunk of chunks) {
    total += chunk.byteLength;
    if (!Number.isSafeInteger(total) || total > MAX_TLC_OUTPUT_BYTES) return failed("OUTPUT_CAPACITY", "TLC stdout exceeds 16 MiB");
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const normalized = decoded.replaceAll("\r\n", "\n");
    if (normalized.includes("\r")) return failed("GRAMMAR", "lone carriage return");
    if (!normalized.endsWith("\n")) return failed("GRAMMAR", "stdout is not LF/EOF closed");
    return normalized;
  } catch {
    return failed("UTF8", "stdout is not valid UTF-8");
  }
}

const STANDARD_MODULES = ["Naturals", "Sequences", "FiniteSets", "TLC"] as const;
function parsedAuxiliaryModule(line: string, input: TlcOutputInput): string | null {
  if (line === `Parsing file ${input.expectedModulePath}`) return input.expectedModuleName;
  const directory = input.expectedStandardModuleDirectory.replace(/\/+$/, "");
  return STANDARD_MODULES.find((module) => line === `Parsing file ${directory}/${module}.tla`) ?? null;
}

type EnvelopeRead = { ok: true; envelope: TlcEnvelope; next: number; repeat: boolean } | { ok: false; error: FailedTlcExploration };

function readEnvelope(lines: string[], startIndex: number): EnvelopeRead {
  const start = START.exec(lines[startIndex]!);
  if (start === null) return { ok: false, error: failed("GRAMMAR", `unframed output at line ${startIndex + 1}`) };
  const code = Number(start[1]);
  const severity = Number(start[2]);
  const spec = ALLOWED_CODES.get(code);
  if (spec === undefined || severity !== spec.severity || severity === 3) {
    return { ok: false, error: failed("GRAMMAR", `unknown code or severity ${code}:${severity}`) };
  }
  const payload: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const candidate = lines[index]!;
    if (START.test(candidate)) return { ok: false, error: failed("GRAMMAR", `nested STARTMSG for ${code}`) };
    const end = END.exec(candidate);
    if (end === null) {
      payload.push(candidate);
      continue;
    }
    if (Number(end[1]) !== code) return { ok: false, error: failed("GRAMMAR", `mismatched ENDMSG for ${code}`) };
    return { ok: true, envelope: { code, severity, payload: payload.join("\n") }, next: index + 1, repeat: spec.repeat };
  }
  return { ok: false, error: failed("GRAMMAR", `unclosed STARTMSG for ${code}`) };
}

function parseEnvelopes(output: string, input: TlcOutputInput): TlcEnvelope[] | FailedTlcExploration {
  const lines = output.split("\n");
  lines.pop();
  const envelopes: TlcEnvelope[] = [];
  const seen = new Map<number, number>();
  const moduleTranscript: string[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index]!;
    const parsedModule = parsedAuxiliaryModule(line, input);
    if (parsedModule !== null) {
      if (seen.get(2220) !== 1 || seen.has(2219)) return failed("GRAMMAR", "parsed module outside SANY envelope window");
      moduleTranscript.push(`P:${parsedModule}`);
      index += 1;
      continue;
    }
    const semantic = /^Semantic processing of module ([A-Za-z_][A-Za-z0-9_]*)$/.exec(line)?.[1];
    if (semantic !== undefined) {
      if (seen.get(2220) !== 1 || seen.has(2219)) return failed("GRAMMAR", "semantic module outside SANY envelope window");
      moduleTranscript.push(`S:${semantic}`);
      index += 1;
      continue;
    }
    const read = readEnvelope(lines, index);
    if (!read.ok) return read.error;
    const occurrences = (seen.get(read.envelope.code) ?? 0) + 1;
    if (occurrences > 1 && !read.repeat) return failed("GRAMMAR", `duplicate singleton code ${read.envelope.code}`);
    seen.set(read.envelope.code, occurrences);
    envelopes.push(read.envelope);
    index = read.next;
  }
  const expectedTranscript = [
    `P:${input.expectedModuleName}`,
    ...STANDARD_MODULES.map((module) => `P:${module}`),
    ...STANDARD_MODULES.map((module) => `S:${module}`),
    `S:${input.expectedModuleName}`,
  ];
  if (
    moduleTranscript.length !== expectedTranscript.length
    || moduleTranscript.some((entry, index) => entry !== expectedTranscript[index])
  ) {
    return failed("GRAMMAR", "SANY module transcript differs from the fixed expected sequence");
  }
  return envelopes;
}

function only(envelopes: TlcEnvelope[], code: number): TlcEnvelope | undefined {
  return envelopes.find((envelope) => envelope.code === code);
}

function count(envelopes: TlcEnvelope[], code: number): number {
  return envelopes.filter((envelope) => envelope.code === code).length;
}

function safeInteger(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function safeFormattedInteger(value: string): number | null {
  if (!/^(?:0|[1-9][0-9]{0,2}(?:,[0-9]{3})*)$/.test(value)) return null;
  return safeInteger(value.replaceAll(",", ""));
}

function parseStatistics(payload: string): { generated: number; distinct: number; queue: number } | null {
  const match = /^([0-9]+) states generated, ([0-9]+) distinct states found, ([0-9]+) states left on queue\.$/.exec(payload);
  if (match === null) return null;
  const generated = safeInteger(match[1]!);
  const distinct = safeInteger(match[2]!);
  const queue = safeInteger(match[3]!);
  return generated === null || distinct === null || queue === null || generated < distinct || distinct < queue
    ? null
    : { generated, distinct, queue };
}

function validProgress(payload: string): boolean {
  const match = /^Progress\(([0-9]+)\)(?: at \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})?: ([0-9][0-9,]*) states generated(?: \(([0-9][0-9,]*) s\/min\))?, ([0-9][0-9,]*) distinct states found(?: \(([0-9][0-9,]*) ds\/min\))?, ([0-9][0-9,]*) states left on queue\.$/.exec(payload);
  if (match === null) return false;
  const values = [safeInteger(match[1]!), ...match.slice(2).filter((value): value is string => value !== undefined).map(safeFormattedInteger)];
  if (values.some((value) => value === null)) return false;
  const generated = safeFormattedInteger(match[2]!);
  const distinct = safeFormattedInteger(match[4]!);
  const queue = safeFormattedInteger(match[6]!);
  return generated !== null && distinct !== null && queue !== null && generated >= distinct && distinct >= queue;
}

function parseDepth(payload: string): number | null {
  const match = /^The depth of the complete state graph search is ([0-9]+)\.$/.exec(payload);
  return match === null ? null : safeInteger(match[1]!);
}

function validOutdegree(payload: string): boolean {
  const match = /^The average outdegree of the complete state graph is ([0-9]+) \(minimum is ([0-9]+), the maximum ([0-9]+) and the 95th percentile is ([0-9]+)\)\.$/.exec(payload);
  if (match === null) return false;
  const [average, minimum, maximum, percentile] = match.slice(1).map(safeInteger);
  return average !== null
    && minimum !== null
    && maximum !== null
    && percentile !== null
    && minimum <= maximum
    && average <= maximum
    && percentile >= minimum
    && percentile <= maximum;
}

function validateLifecycle(envelopes: TlcEnvelope[]): string | null {
  for (const code of [2262, 2187, 2220, 2219, 2185, 2189, 2190, 2199, 2194, 2186]) {
    if (count(envelopes, code) !== 1) return `required lifecycle code ${code} must occur once`;
  }
  const payloadChecks: Array<[number, RegExp]> = [
    [2262, /^TLC2 Version 2\.19 of 08 August 2024 \(rev: 5a47802\)$/],
    [2187, /^Running breadth-first search Model-Checking .+ with 1 worker(?:\.| on .+)$/],
    [2220, /^Starting SANY\.\.\.$/],
    [2219, /^SANY finished\.$/],
    [2185, /^Starting\.\.\. \(.+\)$/],
    [2189, /^Computing initial states\.\.\.$/],
    [2190, /^Finished computing initial states: [0-9]+ distinct state(?:s)? generated at .+\.$/],
    [2186, /^Finished in .+ at \(.+\)$/],
  ];
  for (const [code, pattern] of payloadChecks) if (!pattern.test(only(envelopes, code)!.payload)) return `invalid payload for code ${code}`;
  if (envelopes.filter(({ code }) => code === 2200).some(({ payload }) => !validProgress(payload))) return "invalid payload for code 2200";
  const outdegree = only(envelopes, 2268);
  if (outdegree !== undefined && !validOutdegree(outdegree.payload)) return "invalid payload for code 2268";
  const codes = envelopes.map(({ code }) => code);
  const prefix = [2262, 2187, 2220, 2219, 2185, 2189, 2190];
  if (prefix.some((code, index) => codes[index] !== code)) return "lifecycle prefix codes are out of order";
  let index = prefix.length;
  while (codes[index] === 2200) index += 1;
  if (codes[index] === 2193) {
    index += 1;
  } else {
    if (codes[index] !== 2110 || codes[index + 1] !== 2121) return "semantic terminal header is out of order";
    index += 2;
    const firstState = index;
    while (codes[index] === 2217) index += 1;
    if (index - firstState < 2) return "counterexample terminal requires at least two ordered states";
  }
  while (codes[index] === 2200) index += 1;
  if (codes[index] !== 2199 || codes[index + 1] !== 2194) return "statistics and depth terminals are out of order";
  index += 2;
  if (codes[index] === 2268) index += 1;
  if (codes[index] !== 2186 || index + 1 !== codes.length) return "Finished must be the final terminal marker";
  return null;
}

const TRACE_STATE_VARIABLES = ["initialBudget", "amendBudget", "accepted", "holdMarkers", "holdBudget", "tally", "reexamRequired"] as const;

function parseTrace(envelopes: TlcEnvelope[]): TlcTraceState[] | null {
  const trace: TlcTraceState[] = [];
  for (const envelope of envelopes.filter(({ code }) => code === 2217)) {
    const lines = envelope.payload.split("\n");
    const header = /^([0-9]+): (.+)$/.exec(lines[0] ?? "");
    if (header === null) return null;
    const ordinal = safeInteger(header[1]!);
    const label = header[2]!;
    const validLabel = ordinal === 1
      ? label === "<Initial predicate>"
      : /^<Next line [1-9][0-9]*, col [1-9][0-9]* to line [1-9][0-9]*, col [1-9][0-9]* of module FormalElection>$/.test(label);
    const variables = lines.slice(1).flatMap((line) => /^\/\\ ([A-Za-z_][A-Za-z0-9_]*) =/.exec(line)?.[1] ?? []);
    if (ordinal === null || ordinal !== trace.length + 1 || !validLabel
      || variables.length !== TRACE_STATE_VARIABLES.length
      || variables.some((name, index) => name !== TRACE_STATE_VARIABLES[index])) return null;
    trace.push({ ordinal, label: header[2]!, body: lines.slice(1) });
  }
  return trace;
}

interface TlcStatistics { generated: number; distinct: number; queue: number }

const FINGERPRINT_PROBABILITY = String.raw`(?:0(?:\.0+)?|[1-9][0-9]*(?:\.[0-9]+)?E[+-][0-9]+)`;
const COMPLETE_PAYLOAD = new RegExp(
  String.raw`^Model checking completed\. No error has been found\.\n  Estimates of the probability that TLC did not check all reachable states\n  because two distinct states had the same fingerprint:\n  calculated \(optimistic\):  val = ${FINGERPRINT_PROBABILITY}(?:\n  based on the actual fingerprints:  val = ${FINGERPRINT_PROBABILITY})?$`,
);

function completeExploration(input: TlcOutputInput, parsed: TlcEnvelope[], statistics: TlcStatistics, depth: number): TlcExploration {
  if (!COMPLETE_PAYLOAD.test(only(parsed, 2193)!.payload) || input.exitCode !== 0 || statistics.queue !== 0) {
    return failed("OUTCOME_MISMATCH", "success markers, exit code, or queue disagree");
  }
  return {
    kind: "COMPLETE",
    generatedStates: statistics.generated,
    distinctStates: statistics.distinct,
    statesLeftOnQueue: 0,
    searchDepth: depth,
    completionMarker: "Model checking completed. No error has been found.",
    terminationReason: "EXHAUSTED",
  };
}

function counterexampleExploration(input: TlcOutputInput, parsed: TlcEnvelope[], statistics: TlcStatistics, depth: number, model: FrozenTlaModelBundle): TlcExploration {
  if (input.exitCode !== 12 || count(parsed, 2110) !== 1 || count(parsed, 2121) !== 1 || count(parsed, 2217) < 2) {
    return failed("OUTCOME_MISMATCH", "counterexample markers and exit code disagree");
  }
  const invariantMatch = /^Invariant ([A-Za-z_][A-Za-z0-9_]*) is violated\.$/.exec(only(parsed, 2110)!.payload);
  if (invariantMatch === null || only(parsed, 2121)!.payload !== "The behavior up to this point is:") return failed("GRAMMAR", "invalid counterexample header");
  const invariantName = invariantMatch[1]!;
  if (!TLA_NAMED_INVARIANTS.includes(invariantName as TlaNamedInvariant)) return failed("GRAMMAR", "counterexample invariant is outside the frozen set");
  const sourceLocation = model.invariantSourceMap[invariantName as TlaNamedInvariant];
  const trace = parseTrace(parsed);
  if (sourceLocation === undefined || trace === null) return failed("GRAMMAR", "counterexample source map or trace is invalid");
  return {
    kind: "COUNTEREXAMPLE",
    invariant: invariantName,
    sourceLocation,
    trace,
    counterexampleIdentity: canonicalIdentity({ invariantName, sourceLocation, trace }, "amadeus.formal-verif.tlc.counterexample.v1").sha256,
    generatedStates: statistics.generated,
    distinctStates: statistics.distinct,
    statesLeftOnQueue: statistics.queue,
    searchDepth: depth,
  };
}

export function parseTlcOutput174(input: TlcOutputInput): TlcExploration {
  if (input.timedOut) return failed("TIMEOUT", "TLC process exceeded its deadline");
  if (input.signal !== null) return failed("SIGNAL", `TLC process ended with signal ${input.signal}`);
  if (input.verifiedArtifactDescriptorIdentity !== FIXED_TLC_174_GRAMMAR_DESCRIPTOR_IDENTITY) {
    return failed("GRAMMAR", "TLC output is not bound to the fixed verified artifact descriptor");
  }
  const model = validateFrozenTlaModelReceipt(input.modelReceipt);
  if (!model.ok) return failed("GRAMMAR", `TLC output model receipt is invalid: ${model.error.message}`);
  if (input.expectedModuleName !== "FormalElection" || input.expectedModulePath.split(/[\\/]/).at(-1) !== "FormalElection.tla" || !input.expectedStandardModuleDirectory.startsWith("/")) {
    return failed("GRAMMAR", "TLC output module path is not bound to the frozen model");
  }
  const decoded = decodeChunks(input.chunks);
  if (typeof decoded !== "string") return decoded;
  const parsed = parseEnvelopes(decoded, input);
  if (!Array.isArray(parsed)) return parsed;
  const lifecycleError = validateLifecycle(parsed);
  if (lifecycleError !== null) return failed("GRAMMAR", lifecycleError);
  const statistics = parseStatistics(only(parsed, 2199)!.payload);
  const depth = parseDepth(only(parsed, 2194)!.payload);
  if (statistics === null || depth === null) return failed("GRAMMAR", "invalid statistics or depth payload");
  const hasSuccess = count(parsed, 2193) === 1;
  const hasViolation = count(parsed, 2110) === 1 || count(parsed, 2121) === 1 || count(parsed, 2217) > 0;
  if (hasSuccess === hasViolation) return failed("GRAMMAR", "exactly one terminal semantic class is required");
  return hasSuccess
    ? completeExploration(input, parsed, statistics, depth)
    : counterexampleExploration(input, parsed, statistics, depth, model.value);
}

export interface TlcCellNormalizationInput {
  exploration: TlcExploration;
  fixtureId: string;
  baselineSha: string;
  armSha: string;
  exitCode: number | null;
  startedAt: string;
  finishedAt: string;
  evidencePaths: string[];
}

export type TlcCellNormalizationError = { kind: "NormalizationError"; message: string };

export function normalizeTlcExploration(
  input: TlcCellNormalizationInput,
): Result<CellResult, TlcCellNormalizationError> {
  if (
    (input.exploration.kind === "COMPLETE" && input.exitCode !== 0)
    || (input.exploration.kind === "COUNTEREXAMPLE" && input.exitCode !== 12)
  ) {
    return { ok: false, error: { kind: "NormalizationError", message: "exploration kind and process exit code disagree" } };
  }
  const verdict = input.exploration.kind === "COMPLETE"
    ? "NOT_DETECTED"
    : input.exploration.kind === "COUNTEREXAMPLE" ? "DETECTED" : "HARNESS_ERROR";
  const candidate = {
    schemaVersion: 1 as const,
    arm: "tla" as const,
    fixtureId: input.fixtureId,
    baselineSha: input.baselineSha,
    armSha: input.armSha,
    verdict,
    exitCode: input.exitCode,
    toolVersions: { tlc: "1.7.4" },
    seedOrBound: { workers: 1, voters: 3, choices: 3, maxInitialPerVoter: 1, maxAmendPerVoter: 1, maxHold: 1 },
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    counterexampleId: input.exploration.kind === "COUNTEREXAMPLE" ? input.exploration.counterexampleIdentity : null,
    evidencePaths: [...input.evidencePaths],
  };
  const parsed = parseCellResult(candidate);
  return parsed.ok
    ? parsed
    : { ok: false, error: { kind: "NormalizationError", message: `${parsed.error.path}: ${parsed.error.message}` } };
}
