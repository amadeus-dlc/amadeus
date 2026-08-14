// amadeus-election-model.ts — shared domain vocabulary for the election
// subsystem: the Result carrier every layer returns and the two closed
// vocabularies (hold reasons, voter kinds) the codec, the tally, and the record
// all bind to. Pure: no fs/network/clock access, nothing throws
// (functional-domain-modeling-ts).
//
// The election data model itself — definitions, ballots, tallies — lives in
// amadeus-election-codec.ts as the canonical schemaVersion 2 shapes.

export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

export function ok<T>(value: T): { ok: true; value: T } {
  return { ok: true, value };
}

export function err<E>(error: E): { ok: false; error: E } {
  return { ok: false, error };
}

// FR-3a required attribute (D-12): who cast the ballot — a team member over
// agmsg or a solo-mode subagent. Recorded verbatim; weighting is the human
// consumer's business (FR-7b).
export type VoterKind = "member" | "subagent";

// "tie" is a CHOICE tie (two or more choices share the top vote count), not a
// GoA-axis tie: the winner is decided from choiceInternalNo (Issue #1261).
export type HoldReason =
  | "tie"
  | "block"
  | "quorum-short"
  | "discussion-needed"
  | "split";
