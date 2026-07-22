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
  | "parse-failure"
  | "unknown-election"
  | "unknown-voter"
  | "unknown-choice"
  | "invalid-timestamp" // E-BFARA1: mint-normal-form only (regex + real-date)
  | "goa-out-of-range"
  | "reservation-missing";

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
  // Receipt (append) time minted by the CLI (Issue #1262): `at` is the claimed
  // instant, `receivedAt` the order the conductor actually accepted the event.
  // Optional — its absence marks a pre-fix in-flight record (migration window).
  receivedAt?: string;
};

// Mint normal form for submittedAt: second-precision UTC with a trailing Z
// (E-BFARA1). The regex fixes the *shape*; new Date fixes *existence* — the two
// are complementary (Date alone accepts a date-only string; the regex alone
// accepts an impossible instant like 2026-13-45T99:99:99Z). Module scope so the
// literal is compiled once (bun-inbody-comment-da0).
const SUBMITTED_AT_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// Two-stage validity: mint-form shape AND a real calendar instant. Shared by
// the ballot's own submittedAt (Ballot.parse -> invalid-timestamp) and an
// amend's ref.submittedAt (parseBallotShape -> parse-failure).
function isValidSubmittedAt(s: string): boolean {
  if (!SUBMITTED_AT_RE.test(s)) return false;
  return !Number.isNaN(new Date(s).getTime());
}

type BallotShapeBase = {
  electionId: string;
  voter: string;
  voterKind: VoterKind;
  choiceInternalNo: number;
  submittedAt: string;
  goa: unknown;
  reservation: string | null;
  rationale: string | null;
};

// kind/ref carried on the shape so Ballot.parse builds the right variant.
// A missing kind means "original" (backward compat, FR-3a); any string other
// than "original"/"amend" fails closed (parse-failure).
type BallotShape =
  | (BallotShapeBase & { kind: "original"; ref: null })
  | (BallotShapeBase & { kind: "amend"; ref: BallotRef });

// kind/ref discriminator (FR-3): a missing kind means "original"; "amend"
// requires a well-formed ref; any other kind value fails closed. Split out of
// parseBallotShape so that function stays under the complexity threshold.
function parseKindRef(
  kind: unknown,
  refRaw: unknown,
): { kind: "original"; ref: null } | { kind: "amend"; ref: BallotRef } | null {
  if (kind === undefined || kind === "original") return { kind: "original", ref: null };
  if (kind !== "amend") return null;
  const ref = parseBallotRef(refRaw);
  if (ref === null) return null;
  return { kind: "amend", ref };
}

// Structural half of the validation: field presence and primitive types only.
function parseBallotShape(raw: unknown): BallotShape | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.electionId !== "string" || typeof r.voter !== "string") return null;
  if (typeof r.choiceInternalNo !== "number" || typeof r.submittedAt !== "string") return null;
  if (r.voterKind !== "member" && r.voterKind !== "subagent") return null;
  const kindRef = parseKindRef(r.kind, r.ref);
  if (kindRef === null) return null;
  const reservation =
    typeof r.reservation === "string" && r.reservation.trim().length > 0 ? r.reservation : null;
  const base: BallotShapeBase = {
    electionId: r.electionId,
    voter: r.voter,
    voterKind: r.voterKind,
    choiceInternalNo: r.choiceInternalNo,
    submittedAt: r.submittedAt,
    goa: r.goa,
    reservation,
    rationale: typeof r.rationale === "string" ? r.rationale : null,
  };
  return { ...base, ...kindRef };
}

// An amend's ref: all three fields present and typed, submittedAt in mint form.
// Any deviation is structural (returns null -> parse-failure).
function parseBallotRef(raw: unknown): BallotRef | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.electionId !== "string" || typeof r.voter !== "string") return null;
  if (typeof r.submittedAt !== "string" || !isValidSubmittedAt(r.submittedAt)) return null;
  return { electionId: r.electionId, voter: r.voter, submittedAt: r.submittedAt };
}

export const Ballot = {
  // Full 7-class fail-closed validation (FR-1/FR-3, order: parse-failure ->
  // unknown-election -> unknown-voter -> unknown-choice -> invalid-timestamp ->
  // goa-out-of-range -> reservation-missing). Identifiers (election/voter/
  // choice) are checked before content; invalid-timestamp heads the content
  // half (BR-1). GoA 2/3/6 require a reservation sentence (norm (ii)).
  parse(raw: unknown, election: Election): Result<Ballot, BallotError> {
    const shape = parseBallotShape(raw);
    if (shape === null) return err("parse-failure");
    if (shape.electionId !== election.electionId) return err("unknown-election");
    if (!election.voters.includes(shape.voter)) return err("unknown-voter");
    if (!election.choices.some((c) => c.internalNo === shape.choiceInternalNo)) {
      return err("unknown-choice");
    }
    if (!isValidSubmittedAt(shape.submittedAt)) return err("invalid-timestamp");
    const goa = Goa.parse(shape.goa);
    if (!goa.ok) return err(goa.error);
    const needsReservation = goa.value === 2 || goa.value === 3 || goa.value === 6;
    if (needsReservation && shape.reservation === null) return err("reservation-missing");
    const base = {
      electionId: shape.electionId,
      voter: shape.voter,
      voterKind: shape.voterKind,
      choiceInternalNo: shape.choiceInternalNo,
      goa: goa.value,
      reservation: shape.reservation,
      rationale: shape.rationale,
      submittedAt: shape.submittedAt,
    };
    if (shape.kind === "amend") return ok({ kind: "amend", ref: shape.ref, ...base });
    return ok({ kind: "original", ...base });
  },
};

// Per-voter resolution (BR-4): for each voter keep the single ballot with the
// greatest submittedAt; on an equal-timestamp tie, later arrival wins (>=).
// Structural invariant — the store's unknown-ref check guarantees an amend is
// always appended strictly after the ballot it references, so a same-timestamp
// amend sits later in the array; "later arrival wins" therefore realizes
// "amend beats its referenced ballot on a tie" without inspecting kind.
// Idempotent (a resolved list resolves to itself) and pure.
export function resolveBallots(ballots: Ballot[]): Ballot[] {
  const byVoter = new Map<string, Ballot>();
  for (const b of ballots) {
    const cur = byVoter.get(b.voter);
    if (cur === undefined || b.submittedAt >= cur.submittedAt) byVoter.set(b.voter, b);
  }
  return [...byVoter.values()];
}

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

// Lateness is decided on the RECEIPT axis (E-BRARA2, Issue #1262): a ballot is
// late when the conductor accepted it after the tally was fixed, regardless of
// its self-reported submittedAt. An agmsg-relayed ballot can carry an early
// submittedAt yet arrive after tally (relay delay) — the receipt time is the
// only monotonic, tamper-resistant ordering. `receivedAt` is supplied by the
// caller (mint→pass, same shape as materialize's talliedAt); the per-voter
// resolveBallots axis stays on submittedAt and is deliberately independent.
export function classifyLate(
  tallyTime: string,
  receivedAt: string,
  ballot: Ballot,
): LateBallot | null {
  if (receivedAt <= tallyTime) return null;
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
  // BR-4 #1: resolve to each voter's latest ballot before any counting — an
  // amend supersedes the voter's earlier ballot, so the superseded original
  // must count toward neither the GoA-consensus holds nor the choice winner.
  const resolved = ballots;
  const counts: GoaCounts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  let blocks = 0;
  for (const b of resolved) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
    else if (b.goa === 4) counts.abstain++;
    else counts.discuss++;
    if (b.goa === 8) blocks++;
  }
  // GoA is counted over the resolved set (one ballot per voter) for these holds.
  if (blocks >= 1) return { kind: "hold", reason: "block", counts };
  if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };
  if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };
  // Winner-selection population: the resolved per-voter ballot set minus GoA-4
  // abstentions. Choice tallies are simple vote counts over this population only
  // (no choice x GoA cross distribution).
  const eligible = resolved.filter((b) => b.goa !== 4);
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
