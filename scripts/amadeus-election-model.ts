// amadeus-election-model.ts — U1 election-model: pure domain layer for the
// election TS foundation (intent 260718-election-ts-foundation, Bolt 1
// walking-skeleton). Types + Election.parse + minimal tally + trivial ballot
// acceptance. No fs/network/clock access — every fallible API returns a
// discriminated-union Result and never throws (functional-domain-modeling-ts).
//
// Bolt 1 scope (bolt-plan.md): full type set, structural parse only (the
// 5-class fail-closed ballot validation completes in Bolt 2), zero-confirm
// tally path. Shuffle / early-tally / late classification land in Bolt 2.

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

export type BallotError =
  | "unknown-election"
  | "unknown-voter"
  | "goa-out-of-range"
  | "reservation-missing"
  | "parse-failure";

export type BallotRef = { electionId: string; voter: string; submittedAt: string };

export type OriginalBallot = {
  kind: "original";
  electionId: string;
  voter: string;
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
  choiceInternalNo: number;
  goa: Goa;
  reservation: string | null;
  rationale: string | null;
  submittedAt: string;
};

export type Ballot = OriginalBallot | AmendBallot;

export const Ballot = {
  // Bolt 1: structural parse + GoA numeric parse (tally consumes Goa, so the
  // numeric boundary cannot be deferred). unknown-election/unknown-voter/
  // reservation-missing complete the fail-closed set in Bolt 2.
  parse(raw: unknown, election: Election): Result<Ballot, BallotError> {
    if (typeof raw !== "object" || raw === null) return err("parse-failure");
    const r = raw as Record<string, unknown>;
    if (typeof r.electionId !== "string" || typeof r.voter !== "string") {
      return err("parse-failure");
    }
    if (typeof r.choiceInternalNo !== "number" || typeof r.submittedAt !== "string") {
      return err("parse-failure");
    }
    if (r.electionId !== election.electionId) return err("unknown-election");
    const goa = Goa.parse(r.goa);
    if (!goa.ok) return err(goa.error);
    return ok({
      kind: "original",
      electionId: r.electionId,
      voter: r.voter,
      choiceInternalNo: r.choiceInternalNo,
      goa: goa.value,
      reservation: typeof r.reservation === "string" ? r.reservation : null,
      rationale: typeof r.rationale === "string" ? r.rationale : null,
      submittedAt: r.submittedAt,
    });
  },
};

// --- tally -----------------------------------------------------------------

export type GoaCounts = {
  favor: number; // GoA 1-3, 6
  against: number; // GoA 7-8
  abstain: number; // GoA 4 (quorum-excluded)
  discuss: number; // GoA 5
};

export type HoldReason = "tie" | "block" | "quorum-short" | "discussion-needed";

export type TallyResult =
  | { kind: "established"; outcome: "adopted" | "rejected"; counts: GoaCounts }
  | { kind: "hold"; reason: HoldReason; counts: GoaCounts };

const FAVOR = new Set([1, 2, 3, 6]);
const AGAINST = new Set([7, 8]);

// First-match decision order (functional-design business-logic-model.md):
// block -> discussion-needed -> quorum-short -> majority/tie.
export function tally(_election: Election, ballots: Ballot[]): TallyResult {
  const counts: GoaCounts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  let blocks = 0;
  for (const b of ballots) {
    if (FAVOR.has(b.goa)) counts.favor++;
    else if (AGAINST.has(b.goa)) counts.against++;
    else if (b.goa === 4) counts.abstain++;
    else counts.discuss++;
    if (b.goa === 8) blocks++;
  }
  if (blocks >= 1) return { kind: "hold", reason: "block", counts };
  if (counts.discuss >= 2) return { kind: "hold", reason: "discussion-needed", counts };
  if (counts.favor + counts.against === 0) return { kind: "hold", reason: "quorum-short", counts };
  if (counts.favor > counts.against) return { kind: "established", outcome: "adopted", counts };
  if (counts.against > counts.favor) return { kind: "established", outcome: "rejected", counts };
  return { kind: "hold", reason: "tie", counts };
}
