// The ruling vocabulary shared by every decision point (RFC-0001, FR-1).
//
// A derivation ends in exactly one of three terminals: a unique option, a
// contested set of candidates, or nothing at all. The discriminant IS the
// boundary between "adopt it" and "hand it to a human", so the ladder cannot
// drift into deciding without a basis: only `unique` carries an optionId.
//
// This module owns the representation, never the derivation. It computes no
// fingerprint (the canonical-form digest belongs to the derivation stages that
// know what they hashed) and holds no policy about who consumes an outcome.

export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };

export type RecommendationBasisSource = "norm" | "prior-ruling" | "election" | "agent";

export interface RecommendationBasis {
  readonly source: RecommendationBasisSource;
  readonly fingerprint: string;
}

export interface Candidate {
  readonly optionId: string;
  readonly rationale: string;
  readonly rank: number;
}

export type RecommendationOutcome =
  | { readonly kind: "unique"; readonly optionId: string; readonly basis: RecommendationBasis }
  | { readonly kind: "contested"; readonly candidates: readonly Candidate[]; readonly reason: string }
  | { readonly kind: "none"; readonly reason: string };

// The two terminals that must be ruled on by someone else. Narrowing to this
// type is what makes "ask a human about a unique outcome" unrepresentable.
export type NonUniqueOutcome = Extract<RecommendationOutcome, { readonly kind: "contested" | "none" }>;
export type UniqueOutcome = Extract<RecommendationOutcome, { readonly kind: "unique" }>;

export interface RulingPresentation {
  readonly kind: "contested" | "none";
  readonly candidates: readonly Candidate[];
  readonly nonUniqueReason: string;
}

export interface DecodeError {
  readonly reason: string;
  readonly path: string;
}

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const BASIS_SOURCES: readonly RecommendationBasisSource[] = ["norm", "prior-ruling", "election", "agent"];

function requireReason(reason: string): string {
  if (typeof reason !== "string" || reason.trim().length === 0) throw new Error("outcome-requires-reason");
  return reason;
}

function requireBasis(basis: RecommendationBasis): RecommendationBasis {
  if (!BASIS_SOURCES.includes(basis?.source)) throw new Error("basis-requires-known-source");
  if (!SHA256.test(basis.fingerprint)) throw new Error("basis-requires-sha256-fingerprint");
  return { source: basis.source, fingerprint: basis.fingerprint };
}

function requireCandidates(candidates: readonly Candidate[]): readonly Candidate[] {
  if (candidates.length < 2) throw new Error("contested-requires-two-candidates");
  for (const candidate of candidates) {
    if (typeof candidate.optionId !== "string" || candidate.optionId.trim().length === 0) {
      throw new Error("candidate-requires-option");
    }
    if (typeof candidate.rationale !== "string" || candidate.rationale.trim().length === 0) {
      throw new Error("candidate-requires-rationale");
    }
  }
  if (new Set(candidates.map((candidate) => candidate.optionId)).size !== candidates.length) {
    throw new Error("candidate-options-must-be-distinct");
  }
  const ordered = [...candidates].sort((left, right) => left.rank - right.rank);
  if (ordered.some((candidate, index) => candidate.rank !== index + 1)) {
    throw new Error("candidate-ranks-must-be-a-dense-sequence");
  }
  return ordered.map((candidate) => ({ optionId: candidate.optionId, rationale: candidate.rationale, rank: candidate.rank }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function err(reason: string, path: string): { readonly ok: false; readonly error: DecodeError } {
  return { ok: false, error: { reason, path } };
}

function refuseUnknownFields(raw: Record<string, unknown>, allowed: readonly string[], prefix: string): DecodeError | null {
  const extra = Object.keys(raw).find((key) => !allowed.includes(key));
  return extra === undefined ? null : { reason: "unknown-field", path: `${prefix}${extra}` };
}

function parseString(raw: Record<string, unknown>, key: string, prefix = ""): Result<string, DecodeError> {
  const value = raw[key];
  return typeof value === "string" ? { ok: true, value } : err("expected-string", `${prefix}${key}`);
}

function parseBasis(value: unknown): Result<RecommendationBasis, DecodeError> {
  if (!isRecord(value)) return err("expected-object", "basis");
  const unknownField = refuseUnknownFields(value, ["source", "fingerprint"], "basis.");
  if (unknownField !== null) return { ok: false, error: unknownField };
  const source = value.source;
  if (typeof source !== "string" || !BASIS_SOURCES.includes(source as RecommendationBasisSource)) {
    return err("unknown-source", "basis.source");
  }
  const fingerprint = value.fingerprint;
  if (typeof fingerprint !== "string") return err("expected-string", "basis.fingerprint");
  if (!SHA256.test(fingerprint)) return err("expected-sha256", "basis.fingerprint");
  return { ok: true, value: { source: source as RecommendationBasisSource, fingerprint } };
}

function parseCandidate(value: unknown, index: number): Result<Candidate, DecodeError> {
  const at = `candidates[${index}].`;
  if (!isRecord(value)) return err("expected-object", `candidates[${index}]`);
  const unknownField = refuseUnknownFields(value, ["optionId", "rationale", "rank"], at);
  if (unknownField !== null) return { ok: false, error: unknownField };
  const optionId = parseString(value, "optionId", at);
  if (!optionId.ok) return optionId;
  const rationale = parseString(value, "rationale", at);
  if (!rationale.ok) return rationale;
  const rank = value.rank;
  if (typeof rank !== "number" || !Number.isInteger(rank) || rank < 1) return err("expected-rank", `${at}rank`);
  return { ok: true, value: { optionId: optionId.value, rationale: rationale.value, rank } };
}

function parseUnique(raw: Record<string, unknown>): Result<RecommendationOutcome, DecodeError> {
  const unknownField = refuseUnknownFields(raw, ["kind", "optionId", "basis"], "");
  if (unknownField !== null) return { ok: false, error: unknownField };
  const optionId = parseString(raw, "optionId");
  if (!optionId.ok) return optionId;
  const basis = parseBasis(raw.basis);
  if (!basis.ok) return basis;
  return build(() => RecommendationOutcome.unique(optionId.value, basis.value), "optionId");
}

function parseContested(raw: Record<string, unknown>): Result<RecommendationOutcome, DecodeError> {
  const unknownField = refuseUnknownFields(raw, ["kind", "candidates", "reason"], "");
  if (unknownField !== null) return { ok: false, error: unknownField };
  if (!Array.isArray(raw.candidates)) return err("expected-array", "candidates");
  const candidates: Candidate[] = [];
  for (const [index, entry] of raw.candidates.entries()) {
    const candidate = parseCandidate(entry, index);
    if (!candidate.ok) return candidate;
    candidates.push(candidate.value);
  }
  const reason = parseString(raw, "reason");
  if (!reason.ok) return reason;
  return build(() => RecommendationOutcome.contested(candidates, reason.value), "candidates");
}

function parseNone(raw: Record<string, unknown>): Result<RecommendationOutcome, DecodeError> {
  const unknownField = refuseUnknownFields(raw, ["kind", "reason"], "");
  if (unknownField !== null) return { ok: false, error: unknownField };
  const reason = parseString(raw, "reason");
  if (!reason.ok) return reason;
  return build(() => RecommendationOutcome.none(reason.value), "reason");
}

// The smart constructors are the single definition of the invariants, so parse
// runs them rather than restating their predicates. A violation reaching parse
// comes from outside and is a decode error, not a programming defect.
function build(construct: () => RecommendationOutcome, path: string): Result<RecommendationOutcome, DecodeError> {
  try {
    return { ok: true, value: construct() };
  } catch (cause) {
    return err(cause instanceof Error ? cause.message : String(cause), path);
  }
}

export const RecommendationOutcome = {
  unique(optionId: string, basis: RecommendationBasis): UniqueOutcome {
    if (typeof optionId !== "string" || optionId.trim().length === 0) throw new Error("unique-requires-option");
    return { kind: "unique", optionId, basis: requireBasis(basis) };
  },

  contested(candidates: readonly Candidate[], reason: string): NonUniqueOutcome {
    return { kind: "contested", candidates: requireCandidates(candidates), reason: requireReason(reason) };
  },

  none(reason: string): NonUniqueOutcome {
    return { kind: "none", reason: requireReason(reason) };
  },

  parse(value: unknown): Result<RecommendationOutcome, DecodeError> {
    if (!isRecord(value)) return err("expected-object", "");
    switch (value.kind) {
      case "unique":
        return parseUnique(value);
      case "contested":
        return parseContested(value);
      case "none":
        return parseNone(value);
      default:
        return err("unknown-kind", "kind");
    }
  },

  // The write side of the persistence boundary U3 stores an outcome across
  // (`parse` is the read side). Emitting a plain value here keeps the storage
  // format owned by this module rather than by each consumer's JSON call.
  serialize(outcome: RecommendationOutcome): Record<string, unknown> {
    switch (outcome.kind) {
      case "unique":
        return { kind: "unique", optionId: outcome.optionId, basis: { ...outcome.basis } };
      case "contested":
        return { kind: "contested", candidates: outcome.candidates.map((candidate) => ({ ...candidate })), reason: outcome.reason };
      case "none":
        return { kind: "none", reason: outcome.reason };
    }
  },

  presentationOf(outcome: NonUniqueOutcome): RulingPresentation {
    return outcome.kind === "contested"
      ? { kind: "contested", candidates: outcome.candidates, nonUniqueReason: outcome.reason }
      : { kind: "none", candidates: [], nonUniqueReason: outcome.reason };
  },
};
