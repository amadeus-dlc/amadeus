// arm-s-oracle.ts — U6 ts-arm (B2): the blind contract oracle. Owns the two
// opaque timestamp brands, the subject port, and the seven independent property
// predicates. The oracle re-derives every expectation from the public election
// contract alone; it never reads the subject's own logic to form an expectation
// (that separation is what makes a subject defect detectable, not verification
// theater). No Arm T / skeleton / fixture import (blind boundary).

import { type Result, err, ok } from "./arm-s-result.ts";
import { TIMESTAMP_TOKEN_MAP } from "./arm-s-universe.ts";

// --- two opaque timestamp brands (BR-08) ------------------------------------

declare const SubmittedBrand: unique symbol;
declare const ReceivedBrand: unique symbol;

// Distinct nominal brands: no shared alias, no cast path. The only way to obtain
// a SubmittedAt is parseSubmittedAt; the only way to obtain a ReceivedAt is
// mintReceivedAt. resolvePerVoter reads SubmittedAt; classifyLate reads
// ReceivedAt. A cross-wire is a compile error (BR-11).
export type SubmittedAt = string & { readonly [SubmittedBrand]: true };
export type ReceivedAt = string & { readonly [ReceivedBrand]: true };

const SUBMITTED_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

export function parseSubmittedAt(raw: string): Result<SubmittedAt, "shape" | "calendar"> {
  if (!SUBMITTED_RE.test(raw)) return err("shape");
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 19) !== raw.slice(0, 19)) {
    return err("calendar");
  }
  return ok(raw as SubmittedAt);
}

// Received instants are minted by the Coordinator test port from the fixed T0/T1/
// T2 map only — never derived from a submitted value (BR-08/BR-10).
export function mintReceivedAt(token: "T0" | "T1" | "T2"): ReceivedAt {
  return TIMESTAMP_TOKEN_MAP[token] as ReceivedAt;
}

// --- Arm S domain shapes ----------------------------------------------------

export interface ArmRef {
  voter: string;
  submittedAt: string;
}

export interface ArmBallot {
  voter: string;
  choiceInternalNo: number;
  goa: number;
  kind: "original" | "amend";
  ref: ArmRef | null;
  submittedAt: SubmittedAt;
}

export interface RawBallot {
  electionId?: string;
  voter: string;
  choiceInternalNo: number;
  goa: number;
  kind: "original" | "amend";
  ref: ArmRef | null;
  submittedAt: string;
  reservation: string | null;
}

export interface SubjectElection {
  electionId: string;
  voters: string[];
  choices: number[];
}

export type SubjectTally =
  | { kind: "hold"; reason: "tie" | "block" | "quorum-short" | "discussion-needed" }
  | { kind: "established"; winner: number };

export type ValidationOutcome = { ok: true; ballot: ArmBallot } | { ok: false; error: string };

// The port the frozen subject implements. Adapters bridge it to a concrete
// election module at run time; the core never imports one.
export interface SubjectPort {
  validate(raw: RawBallot, election: SubjectElection): ValidationOutcome;
  append(ledger: ArmBallot[], ballot: ArmBallot): Result<ArmBallot[], "duplicate" | "unknown-ref">;
  resolve(ballots: ArmBallot[]): ArmBallot[];
  tally(choiceNos: number[], ballots: ArmBallot[]): SubjectTally;
  classifyLate(tallyAt: string, receivedAt: string, ballot: ArmBallot): boolean;
}

// --- independent two-clock reference implementations (BR-09/BR-10) ----------

// Per-voter resolution reads the SUBMITTED axis only: greatest submittedAt, and
// on an equal-timestamp tie the later array position wins. Independent of the
// received axis by construction.
export function resolvePerVoter(ballots: ArmBallot[]): ArmBallot[] {
  const byVoter = new Map<string, ArmBallot>();
  for (const b of ballots) {
    const cur = byVoter.get(b.voter);
    if (cur === undefined || b.submittedAt >= cur.submittedAt) byVoter.set(b.voter, b);
  }
  return [...byVoter.values()];
}

// Lateness reads the RECEIVED axis only: received strictly after the tally
// instant. The ballot argument is deliberately unused for the ordering decision.
export function classifyLate(tallyAt: ReceivedAt, receivedAt: ReceivedAt): boolean {
  return receivedAt > tallyAt;
}

// --- independent contract oracles -------------------------------------------

export type PropertyId =
  | "P1_WINNER"
  | "P2_UNKNOWN_CHOICE"
  | "P3_LATENESS"
  | "P4_INVALID_TS"
  | "P5_AMEND"
  | "P6_UNKNOWN_REF"
  | "P7_RESOLUTION";

export interface ContractObservation {
  propertyId: PropertyId;
  passed: boolean;
  expected: string;
  actual: string;
}

// Core-tuple validation expectation: unknown-choice precedes invalid-timestamp;
// election and voter are always known on the core axes.
export function expectedCoreValidation(
  choices: number[],
  raw: RawBallot,
): "unknown-choice" | "invalid-timestamp" | "valid" {
  if (!choices.includes(raw.choiceInternalNo)) return "unknown-choice";
  // A SubmittedAt brand requires a real UTC instant, so a rollover date like
  // 2026-02-30 is invalid — the same strict check the brand parser applies.
  if (!parseSubmittedAt(raw.submittedAt).ok) return "invalid-timestamp";
  return "valid";
}

const FAVOR = new Set([1, 2, 3, 6]);
const AGAINST = new Set([7, 8]);

// Independent tally oracle: resolve, then block → discussion-needed →
// quorum-short → unique choice argmax / tie. Re-derived from the contract, not
// from the subject.
export function expectedTally(choices: number[], ballots: ArmBallot[]): SubjectTally {
  const resolved = resolvePerVoter(ballots);
  let favor = 0;
  let against = 0;
  let discuss = 0;
  let blocks = 0;
  for (const b of resolved) {
    if (FAVOR.has(b.goa)) favor++;
    else if (AGAINST.has(b.goa)) against++;
    else if (b.goa === 5) discuss++;
    if (b.goa === 8) blocks++;
  }
  if (blocks >= 1) return { kind: "hold", reason: "block" };
  if (discuss >= 2) return { kind: "hold", reason: "discussion-needed" };
  if (favor + against === 0) return { kind: "hold", reason: "quorum-short" };
  return decideWinner(choices, resolved);
}

function decideWinner(choices: number[], resolved: ArmBallot[]): SubjectTally {
  const eligible = resolved.filter((b) => b.goa !== 4);
  const counts = choices.map((c) => eligible.filter((b) => b.choiceInternalNo === c).length);
  const top = counts.reduce((m, c) => Math.max(m, c), 0);
  const leaders = choices.filter((_, i) => counts[i] === top);
  if (leaders.length !== 1) return { kind: "hold", reason: "tie" };
  return { kind: "established", winner: leaders[0]! };
}

export function tallyEqual(a: SubjectTally, b: SubjectTally): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === "hold" && b.kind === "hold") return a.reason === b.reason;
  if (a.kind === "established" && b.kind === "established") return a.winner === b.winner;
  return false;
}

// --- action-sequence model (BR-15/BR-16) ------------------------------------

// Closed budget for a well-formed action sequence: 3 SUBMIT_ORIGINAL + 3
// SUBMIT_AMEND + 1 TALLY + 1 RECORD_HOLD = 8 actions. maxActions is the real
// enforcement bound the PBT generator and validator share (BR-15).
export const SEQUENCE_BUDGET = {
  original: 3,
  amend: 3,
  tallyMaxIndex: 6,
  maxActions: 8,
} as const;

export type TokenName = "T0" | "T1" | "T2";

// Closed action union over which the fixed-seed PBT runs (BR-15/BR-16). A
// submission carries both clocks (sub / rec) so the same sequence exercises
// resolution (submitted axis) and lateness (received axis). TALLY and
// RECORD_HOLD are position markers, not payloads.
export type SequenceAction =
  | { kind: "SUBMIT_ORIGINAL"; voter: string; choice: number; goa: number; sub: TokenName; rec: TokenName }
  | { kind: "SUBMIT_AMEND"; voter: string; choice: number; goa: number; sub: TokenName; rec: TokenName; refSub: TokenName }
  | { kind: "TALLY" }
  | { kind: "RECORD_HOLD" };

export type SequenceViolation =
  | "over-budget"
  | "original-budget"
  | "amend-budget"
  | "tally-count"
  | "tally-position"
  | "hold-count"
  | "hold-placement";

// Structural well-formedness (BR-15/BR-16): total within maxActions, per-kind
// budgets, exactly one TALLY at index 1..6 (after >=1 submission, with room for
// post-tally submissions), and at most one RECORD_HOLD placed after the TALLY.
// The outcome condition (RECORD_HOLD only when the tally holds) is a generator
// concern verified by the interpreter, not a structural one.
export function validateSequence(actions: readonly SequenceAction[]): Result<void, SequenceViolation> {
  if (actions.length > SEQUENCE_BUDGET.maxActions) return err("over-budget");
  if (actions.filter((a) => a.kind === "SUBMIT_ORIGINAL").length > SEQUENCE_BUDGET.original) return err("original-budget");
  if (actions.filter((a) => a.kind === "SUBMIT_AMEND").length > SEQUENCE_BUDGET.amend) return err("amend-budget");
  const tallyIndices = indicesOf(actions, "TALLY");
  if (tallyIndices.length !== 1) return err("tally-count");
  const tallyIndex = tallyIndices[0]!;
  if (tallyIndex < 1 || tallyIndex > SEQUENCE_BUDGET.tallyMaxIndex) return err("tally-position");
  const holdIndices = indicesOf(actions, "RECORD_HOLD");
  if (holdIndices.length > 1) return err("hold-count");
  if (holdIndices.length === 1 && holdIndices[0]! < tallyIndex) return err("hold-placement");
  return ok(undefined);
}

function indicesOf(actions: readonly SequenceAction[], kind: SequenceAction["kind"]): number[] {
  const out: number[] = [];
  for (let i = 0; i < actions.length; i++) if (actions[i]!.kind === kind) out.push(i);
  return out;
}
