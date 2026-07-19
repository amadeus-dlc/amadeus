// amadeus-election-model.ts — U1 election-model: pure domain layer for the
// election TS foundation (intent 260718-election-ts-foundation, Bolt 1
// walking-skeleton). Core types + Election.parse + minimal tally + trivial
// ballot acceptance. No fs/network/clock access — every fallible API returns a
// discriminated-union Result and never throws (functional-domain-modeling-ts).
//
// Bolt 2 (model-complete) finishes the layer: full 5-class fail-closed ballot
// validation, deterministic distribution views (fnv1a + mulberry32 +
// Fisher-Yates), early tally, and late-ballot classification. Amend acceptance
// stays with the store (C2 owns duplicate/amend bookkeeping — ADR-5).

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// --- branded GoA -----------------------------------------------------------

// Branded 1-8 integer. Smart constructor is the only build path; "five" or 9
// never reach tally (verification-numeric-parse).
export type Goa = number & { readonly __brand: "Goa" };

export const Goa = {
  parse(raw: unknown): Result<Goa, "goa-out-of-range"> {
    if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1 || raw > 8) {
      return err("goa-out-of-range");
    }
    return ok(raw as Goa);
  },
};

// --- election definition ---------------------------------------------------

export type ElectionState =
  | "draft"
  | "open"
  | "collecting"
  | "tallied"
  | "rendered"
  | "recorded"
  | "hold";

export type Choice = { internalNo: number; label: string };

export type Election = {
  electionId: string;
  kind: string;
  question: string;
  choices: Choice[];
  voters: string[];
};

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function parseChoices(raw: unknown): Choice[] | null {
  if (!Array.isArray(raw)) return null;
  const choices: Choice[] = [];
  for (const c of raw) {
    if (typeof c !== "object" || c === null) return null;
    const cc = c as Record<string, unknown>;
    if (typeof cc.internalNo !== "number" || typeof cc.label !== "string") return null;
    choices.push({ internalNo: cc.internalNo, label: cc.label });
  }
  return choices;
}

export const Election = {
  parse(raw: unknown): Result<Election, "parse-failure"> {
    if (typeof raw !== "object" || raw === null) return err("parse-failure");
    const r = raw as Record<string, unknown>;
    if (typeof r.electionId !== "string" || r.electionId.length === 0) return err("parse-failure");
    if (typeof r.kind !== "string" || typeof r.question !== "string") return err("parse-failure");
    const choices = parseChoices(r.choices);
    if (choices === null) return err("parse-failure");
    if (!isStringArray(r.voters) || r.voters.length === 0) return err("parse-failure");
    return ok({
      electionId: r.electionId,
      kind: r.kind,
      question: r.question,
      choices,
      voters: r.voters,
    });
  },
};

// --- ballots ---------------------------------------------------------------

// Classification order convention: identifier checks first (unknown-election ->
// unknown-voter -> unknown-choice), then content checks (goa-out-of-range ->
// reservation-missing); parse-failure precedes all of them (structural). New
// content-side classes insert after unknown-choice.
export type BallotError =
  | "unknown-election"
  | "unknown-voter"
  | "unknown-choice"
  | "goa-out-of-range"
  | "reservation-missing"
  | "parse-failure";

export type BallotRef = { electionId: string; voter: string; submittedAt: string };

// FR-3a required attribute (D-12): who cast the ballot — a team member over
// agmsg or a solo-mode subagent. Recorded verbatim; weighting is the human
// consumer's business (FR-7b).
export type VoterKind = "member" | "subagent";

export type OriginalBallot = {
  kind: "original";
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  choiceInternalNo: number;
  goa: Goa;
  reservation: string | null;
  rationale: string | null;
  submittedAt: string;
};

export type AmendBallot = {
  kind: "amend";
  ref: BallotRef;
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  choiceInternalNo: number;
  goa: Goa;
  reservation: string | null;
  rationale: string | null;
  submittedAt: string;
};

export type Ballot = OriginalBallot | AmendBallot;

// Canonical ledger timeline event (single definition — U2 persists it, U3
// renders it; both depend on U1 so the DAG stays acyclic). Bolt 3 declared
// reconciliation: the U3 FD's "tally" kind / voter-only shape and the U2
// implementation's "tallied"/detail shape are unified here (store is the
// persisting owner; voter is carried explicitly for rendering).
export type TimelineEvent = {
  kind: "distributed" | "ballot" | "tallied" | "late";
  at: string;
  detail: string;
  voter?: string;
};

type BallotShape = {
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  choiceInternalNo: number;
  submittedAt: string;
  goa: unknown;
  reservation: string | null;
  rationale: string | null;
};

// Structural half of the validation: field presence and primitive types only.
function parseBallotShape(raw: unknown): BallotShape | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.electionId !== "string" || typeof r.voter !== "string") return null;
  if (typeof r.choiceInternalNo !== "number" || typeof r.submittedAt !== "string") return null;
  if (r.voterKind !== "member" && r.voterKind !== "subagent") return null;
  const reservation =
    typeof r.reservation === "string" && r.reservation.trim().length > 0 ? r.reservation : null;
  return {
    electionId: r.electionId,
    voter: r.voter,
    voterKind: r.voterKind,
    choiceInternalNo: r.choiceInternalNo,
    submittedAt: r.submittedAt,
    goa: r.goa,
    reservation,
    rationale: typeof r.rationale === "string" ? r.rationale : null,
  };
}

export const Ballot = {
  // Full 6-class fail-closed validation (FR-3a/3b, order: parse-failure ->
  // unknown-election -> unknown-voter -> unknown-choice -> goa-out-of-range ->
  // reservation-missing). GoA 2/3/6 require a reservation sentence (norm (ii)).
  parse(raw: unknown, election: Election): Result<Ballot, BallotError> {
    const shape = parseBallotShape(raw);
    if (shape === null) return err("parse-failure");
    if (shape.electionId !== election.electionId) return err("unknown-election");
    if (!election.voters.includes(shape.voter)) return err("unknown-voter");
    if (!election.choices.some((c) => c.internalNo === shape.choiceInternalNo)) {
      return err("unknown-choice");
    }
    const goa = Goa.parse(shape.goa);
    if (!goa.ok) return err(goa.error);
    const needsReservation = goa.value === 2 || goa.value === 3 || goa.value === 6;
    if (needsReservation && shape.reservation === null) return err("reservation-missing");
    return ok({
      kind: "original",
      electionId: shape.electionId,
      voter: shape.voter,
      voterKind: shape.voterKind,
      choiceInternalNo: shape.choiceInternalNo,
      goa: goa.value,
      reservation: shape.reservation,
      rationale: shape.rationale,
      submittedAt: shape.submittedAt,
    });
  },
};

// --- distribution view (FR-1b/1c, ADR-4) -----------------------------------

// Structurally blind: exactly these fields exist — no recommendation marker,
// no prior votes, no peer status (BR-2 pins the key set).
export type DistributionView = {
  electionId: string;
  voter: string;
  ordered: Array<{ displayNo: number; internalNo: number; label: string }>;
};

// FNV-1a 32-bit — deterministic, non-cryptographic (the seed only orders a
// display shuffle; this is not a security boundary — nfr tech-stack decision).
export function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

// mulberry32 — tiny deterministic PRNG over a 32-bit seed.
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deterministic per-(election, voter) display order: seed = fnv1a(id + ":" +
// voter), Fisher-Yates over the choice list. Ballots record internalNo, so
// tallying is shuffle-invariant (BR-1).
export function shuffleView(election: Election, voter: string): DistributionView {
  const rand = mulberry32(fnv1a(`${election.electionId}:${voter}`));
  const order = [...election.choices];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const a = order[i] as Choice;
    order[i] = order[j] as Choice;
    order[j] = a;
  }
  return {
    electionId: election.electionId,
    voter,
    ordered: order.map((choice, idx) => ({
      displayNo: idx + 1,
      internalNo: choice.internalNo,
      label: choice.label,
    })),
  };
}

// --- early tally (FR-4c) ----------------------------------------------------

// True when the favor majority cannot be overturned even if every missing
// ballot lands on the against side. Any received GoA 8 forces false (a block
// hold precedes any majority claim — BR-8).
export function canEarlyTally(election: Election, ballots: Ballot[]): boolean {
  if (ballots.some((b) => b.goa === 8)) return false;
  const counts = { favor: 0, against: 0 };
  for (const b of ballots) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
  }
  const missing = election.voters.length - ballots.length;
  return counts.favor > counts.against + missing;
}

// --- late classification (FR-3d) --------------------------------------------

export type LateBallot = {
  ballot: Ballot;
  late: true;
  // A late GoA 8 reopens the question of the established result
  // (early-tally-with-block-reopen) — flagged, never auto-acted.
  reexamRequired: boolean;
};

// Single source for the reexamination rule (a late block vote reopens the
// question — early-tally-with-block-reopen). Consumed by classifyLate AND the
// store's at-or-before-tally late fallback, so the rule cannot fork.
export function lateReexamRequired(ballot: Ballot): boolean {
  return ballot.goa === 8;
}

export function classifyLate(tallyTime: string, ballot: Ballot): LateBallot | null {
  if (ballot.submittedAt <= tallyTime) return null;
  return { ballot, late: true, reexamRequired: lateReexamRequired(ballot) };
}

// --- tally -----------------------------------------------------------------

export type GoaCounts = {
  favor: number; // GoA 1-3, 6
  against: number; // GoA 7-8
  abstain: number; // GoA 4 (quorum-excluded)
  discuss: number; // GoA 5
};

// "tie" is now a CHOICE tie (two or more choices share the top vote count),
// not the old GoA-axis favor===against tie (that branch is gone — the winner is
// decided from choiceInternalNo, Issue #1261).
export type HoldReason = "tie" | "block" | "quorum-short" | "discussion-needed";

// Per-choice vote count over the winner-selection population (see tally).
export type ChoiceCount = { internalNo: number; label: string; count: number };

export type TallyResult =
  | {
      kind: "established";
      winner: { internalNo: number; label: string };
      choiceCounts: ChoiceCount[];
      goa: GoaCounts;
    }
  | { kind: "hold"; reason: HoldReason; counts: GoaCounts };

const FAVOR = new Set([1, 2, 3, 6]);
const AGAINST = new Set([7, 8]);

// First-match decision order (functional-design business-logic-model.md):
// block -> discussion-needed -> quorum-short -> choice winner / choice tie.
// The GoA-consensus holds are evaluated first, unchanged; only once they pass
// does the choiceInternalNo winner decide the result (Issue #1261).
export function tally(election: Election, ballots: Ballot[]): TallyResult {
  const counts: GoaCounts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  let blocks = 0;
  for (const b of ballots) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
    else if (b.goa === 4) counts.abstain++;
    else counts.discuss++;
    if (b.goa === 8) blocks++;
  }
  // GoA is counted over EVERY ballot (whole-set GoaCounts) for these holds.
  if (blocks >= 1) return { kind: "hold", reason: "block", counts };
  if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };
  if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };
  // Winner-selection population: the per-voter latest-resolved ballot set (amend
  // is not yet implemented, so this is all original ballots) minus GoA-4
  // abstentions. Choice tallies are simple vote counts over this population only
  // (no choice x GoA cross distribution).
  const eligible = ballots.filter((b) => b.goa !== 4);
  const choiceCounts: ChoiceCount[] = election.choices.map((c) => ({
    internalNo: c.internalNo,
    label: c.label,
    count: eligible.filter((b) => b.choiceInternalNo === c.internalNo).length,
  }));
  const top = choiceCounts.reduce((m, c) => Math.max(m, c.count), 0);
  const leaders = choiceCounts.filter((c) => c.count === top);
  if (leaders.length !== 1) return { kind: "hold", reason: "tie", counts };
  const winner = leaders[0] as ChoiceCount;
  return {
    kind: "established",
    winner: { internalNo: winner.internalNo, label: winner.label },
    choiceCounts,
    goa: counts,
  };
}
