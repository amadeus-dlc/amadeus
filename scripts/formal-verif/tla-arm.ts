import { canonicalIdentity } from "./canonical.ts";
import type { Result } from "./contract.ts";

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

function invariantReceiptShapeError(
  formulas: Record<string, unknown>,
  sourceMap: Record<string, unknown>,
): string | null {
  for (const name of TLA_NAMED_INVARIANTS) {
    if (typeof formulas[name] !== "string") return `invalid formula identity for ${name}`;
    if (!exactPlainObject(sourceMap[name], ["line", "column"])) return `invalid source location for ${name}`;
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
  if (!exactPlainObject(input.namedInvariantFormulas, TLA_NAMED_INVARIANTS)) return reject("named invariant formulas differ from the closed set");
  if (!exactPlainObject(input.invariantSourceMap, TLA_NAMED_INVARIANTS)) return reject("invariant source map differs from the closed set");
  const shapeError = invariantReceiptShapeError(input.namedInvariantFormulas, input.invariantSourceMap);
  if (shapeError !== null) return reject(shapeError);
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
