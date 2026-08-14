import { canonicalContractValueDigest } from "./amadeus-autonomy-review.ts";
import type { HoldReason, VoterKind } from "./amadeus-election-model.ts";

export type ElectionCodecErrorCategory =
  | "shape"
  | "unsupported-version"
  | "unknown-field"
  | "duplicate-id"
  | "missing-reference"
  | "invalid-value"
  | "coverage-mismatch";

export interface ElectionCodecError {
  readonly category: ElectionCodecErrorCategory;
  readonly path: string;
  readonly expected: string;
}

export type ElectionCodecResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ElectionCodecError };

export interface CanonicalElectionChoice {
  readonly internalNo: number;
  readonly label: string;
  readonly description?: string;
}

export interface CanonicalElectionQuestion {
  readonly questionId: string;
  readonly text: string;
  readonly choices: readonly CanonicalElectionChoice[];
}

export interface CanonicalElectionDefinition {
  readonly schemaVersion: 2;
  readonly electionId: string;
  readonly kind: string;
  readonly questions: readonly CanonicalElectionQuestion[];
  readonly voters: readonly string[];
}

export interface CanonicalBallotResponse {
  readonly questionId: string;
  readonly choiceInternalNo: number;
  readonly goa: number;
  readonly reservation: string | null;
  readonly rationale: string | null;
}

export interface CanonicalBallotRef {
  readonly electionId: string;
  readonly voter: string;
  readonly submittedAt: string;
}

interface CanonicalBallotBase {
  readonly schemaVersion: 2;
  readonly electionId: string;
  readonly voter: string;
  readonly voterKind: VoterKind;
  readonly responses: readonly CanonicalBallotResponse[];
  readonly submittedAt: string;
  readonly receivedAt?: string;
}

export type CanonicalBallot =
  | (CanonicalBallotBase & { readonly kind: "original" })
  | (CanonicalBallotBase & { readonly kind: "amend"; readonly ref: CanonicalBallotRef });

export interface CanonicalGoaCounts {
  readonly favor: number;
  readonly against: number;
  readonly abstain: number;
  readonly discuss: number;
}

export interface CanonicalChoiceCount {
  readonly internalNo: number;
  readonly label: string;
  readonly count: number;
}

export type CanonicalQuestionResult =
  | {
      readonly questionId: string;
      readonly kind: "established";
      readonly winner: { readonly internalNo: number; readonly label: string };
      readonly choiceCounts: readonly CanonicalChoiceCount[];
      readonly goa: CanonicalGoaCounts;
    }
  | {
      readonly questionId: string;
      readonly kind: "hold";
      readonly reason: HoldReason;
      readonly counts: CanonicalGoaCounts;
    };

export interface CanonicalTally {
  readonly schemaVersion: 2;
  readonly runId: string;
  readonly targetQuestionIds: readonly string[];
  readonly results: readonly CanonicalQuestionResult[];
  readonly preservedResultDigest: string | null;
  readonly talliedAt: string;
}

export interface BallotDecodeContext {
  readonly targetQuestionIds: readonly string[];
  readonly establishedQuestionIds?: readonly string[];
}

const HOLD_REASONS: ReadonlySet<string> = new Set<HoldReason>([
  "tie",
  "block",
  "quorum-short",
  "discussion-needed",
  "split",
]);
const ISO_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const SHA256 = /^sha256:[0-9a-f]{64}$/;

function success<T>(value: T): ElectionCodecResult<T> {
  return { ok: true, value };
}

function failure(
  category: ElectionCodecErrorCategory,
  path: string,
  expected: string,
): ElectionCodecResult<never> {
  return { ok: false, error: { category, path, expected } };
}

function isRecord(raw: unknown): raw is Record<string, unknown> {
  return typeof raw === "object" && raw !== null && !Array.isArray(raw);
}

function unknownField(
  raw: Record<string, unknown>,
  allowed: readonly string[],
  path: string,
): ElectionCodecResult<never> | null {
  const known = new Set(allowed);
  const extra = Object.keys(raw)
    .filter((field) => !known.has(field))
    .sort()[0];
  return extra === undefined
    ? null
    : failure("unknown-field", `${path}.${extra}`, `one of: ${allowed.join(", ")}`);
}

function nonBlank(raw: unknown): raw is string {
  return typeof raw === "string" && raw.trim().length > 0;
}

function validTimestamp(raw: unknown): raw is string {
  return (
    typeof raw === "string" &&
    ISO_SECONDS.test(raw) &&
    !Number.isNaN(new Date(raw).getTime())
  );
}

function duplicate<T>(values: readonly T[]): T | undefined {
  const seen = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) return value;
    seen.add(value);
  }
  return undefined;
}

function sameSet(left: readonly string[], right: readonly string[]): boolean {
  const expected = new Set(right);
  return left.length === expected.size && left.every((value) => expected.has(value));
}

function parseChoice(raw: unknown, path: string): ElectionCodecResult<CanonicalElectionChoice> {
  if (!isRecord(raw)) return failure("shape", path, "choice object");
  const extra = unknownField(raw, ["internalNo", "label", "description"], path);
  if (extra !== null) return extra;
  if (!Number.isInteger(raw.internalNo)) return failure("shape", `${path}.internalNo`, "integer");
  if (typeof raw.label !== "string") return failure("shape", `${path}.label`, "string");
  if (raw.description !== undefined && typeof raw.description !== "string") {
    return failure("shape", `${path}.description`, "string when present");
  }
  return success(
    raw.description === undefined
      ? { internalNo: raw.internalNo as number, label: raw.label }
      : { internalNo: raw.internalNo as number, label: raw.label, description: raw.description },
  );
}

function parseChoices(
  raw: unknown,
  path: string,
): ElectionCodecResult<readonly CanonicalElectionChoice[]> {
  if (!Array.isArray(raw) || raw.length === 0) {
    return failure("shape", path, "nonempty choice array");
  }
  const choices: CanonicalElectionChoice[] = [];
  for (let index = 0; index < raw.length; index++) {
    const parsed = parseChoice(raw[index], `${path}[${index}]`);
    if (!parsed.ok) return parsed;
    choices.push(parsed.value);
  }
  const repeated = duplicate(choices.map((choice) => choice.internalNo));
  if (repeated !== undefined) {
    return failure("duplicate-id", path, `unique internalNo; duplicated ${repeated}`);
  }
  return success(choices);
}

function parseQuestion(raw: unknown, path: string): ElectionCodecResult<CanonicalElectionQuestion> {
  if (!isRecord(raw)) return failure("shape", path, "question object");
  const extra = unknownField(raw, ["questionId", "text", "choices"], path);
  if (extra !== null) return extra;
  if (!nonBlank(raw.questionId)) {
    return failure("invalid-value", `${path}.questionId`, "nonblank string");
  }
  if (!nonBlank(raw.text)) return failure("invalid-value", `${path}.text`, "nonblank string");
  const choices = parseChoices(raw.choices, `${path}.choices`);
  return choices.ok
    ? success({ questionId: raw.questionId, text: raw.text, choices: choices.value })
    : choices;
}

function parseVoters(raw: unknown, path: string): ElectionCodecResult<readonly string[]> {
  if (!Array.isArray(raw) || raw.length === 0 || raw.some((voter) => !nonBlank(voter))) {
    return failure("shape", path, "nonempty array of nonblank strings");
  }
  const voters = raw as string[];
  const repeated = duplicate(voters);
  return repeated === undefined
    ? success(voters)
    : failure("duplicate-id", path, `unique voter ids; duplicated ${repeated}`);
}

function decodeDefinition(
  raw: Record<string, unknown>,
): ElectionCodecResult<CanonicalElectionDefinition> {
  const extra = unknownField(raw, ["schemaVersion", "electionId", "kind", "questions", "voters"], "$");
  if (extra !== null) return extra;
  if (!nonBlank(raw.electionId)) return failure("invalid-value", "$.electionId", "nonblank string");
  if (typeof raw.kind !== "string") return failure("shape", "$.kind", "string");
  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    return failure("shape", "$.questions", "nonempty question array");
  }
  const questions: CanonicalElectionQuestion[] = [];
  for (let index = 0; index < raw.questions.length; index++) {
    const parsed = parseQuestion(raw.questions[index], `$.questions[${index}]`);
    if (!parsed.ok) return parsed;
    questions.push(parsed.value);
  }
  const repeated = duplicate(questions.map((question) => question.questionId));
  if (repeated !== undefined) {
    return failure("duplicate-id", "$.questions", `unique questionId; duplicated ${repeated}`);
  }
  const voters = parseVoters(raw.voters, "$.voters");
  if (!voters.ok) return voters;
  return success({
    schemaVersion: 2,
    electionId: raw.electionId,
    kind: raw.kind,
    questions,
    voters: voters.value,
  });
}

// The canonical wire format is schemaVersion 2 and nothing else: an absent or
// different stamp is rejected loudly, never decoded under another shape.
function requireCanonicalVersion(raw: Record<string, unknown>): ElectionCodecResult<void> {
  return raw.schemaVersion === 2
    ? success(undefined)
    : failure("unsupported-version", "$.schemaVersion", "exact integer 2");
}

export const ElectionDefinitionCodec = {
  decode(raw: unknown): ElectionCodecResult<CanonicalElectionDefinition> {
    if (!isRecord(raw)) return failure("shape", "$", "election definition object");
    const version = requireCanonicalVersion(raw);
    return version.ok ? decodeDefinition(raw) : version;
  },

  encode(value: CanonicalElectionDefinition): ElectionCodecResult<string> {
    const checked = validateCanonicalDefinition(value);
    if (!checked.ok) return checked;
    return success(JSON.stringify(canonicalDefinitionWire(checked.value)));
  },
};

function validateCanonicalDefinition(
  value: CanonicalElectionDefinition,
): ElectionCodecResult<CanonicalElectionDefinition> {
  return decodeDefinition(value as unknown as Record<string, unknown>);
}

function canonicalDefinitionWire(value: CanonicalElectionDefinition): unknown {
  return {
    schemaVersion: 2,
    electionId: value.electionId,
    kind: value.kind,
    questions: value.questions.map((question) => ({
      questionId: question.questionId,
      text: question.text,
      choices: question.choices.map((choice) =>
        choice.description === undefined
          ? { internalNo: choice.internalNo, label: choice.label }
          : {
              internalNo: choice.internalNo,
              label: choice.label,
              description: choice.description,
            },
      ),
    })),
    voters: [...value.voters],
  };
}

function questionMap(definition: CanonicalElectionDefinition): Map<string, CanonicalElectionQuestion> {
  return new Map(definition.questions.map((question) => [question.questionId, question]));
}

function parseResponse(
  raw: unknown,
  path: string,
): ElectionCodecResult<CanonicalBallotResponse> {
  if (!isRecord(raw)) return failure("shape", path, "response object");
  const extra = unknownField(
    raw,
    ["questionId", "choiceInternalNo", "goa", "reservation", "rationale"],
    path,
  );
  if (extra !== null) return extra;
  if (!nonBlank(raw.questionId)) return failure("invalid-value", `${path}.questionId`, "nonblank string");
  if (!Number.isInteger(raw.choiceInternalNo)) {
    return failure("shape", `${path}.choiceInternalNo`, "integer");
  }
  if (!Number.isInteger(raw.goa)) return failure("shape", `${path}.goa`, "integer 1..8");
  if (raw.reservation !== null && typeof raw.reservation !== "string") {
    return failure("shape", `${path}.reservation`, "string or null");
  }
  if (raw.rationale !== null && typeof raw.rationale !== "string") {
    return failure("shape", `${path}.rationale`, "string or null");
  }
  return success({
    questionId: raw.questionId as string,
    choiceInternalNo: raw.choiceInternalNo as number,
    goa: raw.goa as number,
    reservation: raw.reservation,
    rationale: raw.rationale,
  });
}

function validateResponses(
  responses: readonly CanonicalBallotResponse[],
  definition: CanonicalElectionDefinition,
  kind: "original" | "amend",
  context: BallotDecodeContext,
): ElectionCodecResult<readonly CanonicalBallotResponse[]> {
  const ids = responses.map((response) => response.questionId);
  const repeated = duplicate(ids);
  if (repeated !== undefined) {
    return failure("duplicate-id", "$.responses", `unique questionId; duplicated ${repeated}`);
  }
  const questions = questionMap(definition);
  const choiceIds = new Map(
    definition.questions.map((question) => [
      question.questionId,
      new Set(question.choices.map((choice) => choice.internalNo)),
    ]),
  );
  const entries = validateResponseEntries(responses, questions, choiceIds);
  if (!entries.ok) return entries;
  const coverage = validateResponseCoverage(ids, questions, kind, context);
  return coverage.ok ? success(responses) : coverage;
}

function validateResponseEntries(
  responses: readonly CanonicalBallotResponse[],
  questions: ReadonlyMap<string, CanonicalElectionQuestion>,
  choiceIds: ReadonlyMap<string, ReadonlySet<number>>,
): ElectionCodecResult<void> {
  for (let index = 0; index < responses.length; index++) {
    const response = responses[index] as CanonicalBallotResponse;
    const path = `$.responses[${index}]`;
    const question = questions.get(response.questionId);
    if (question === undefined) {
      return failure("missing-reference", `${path}.questionId`, "definition questionId");
    }
    if (!choiceIds.get(response.questionId)?.has(response.choiceInternalNo)) {
      return failure("missing-reference", `${path}.choiceInternalNo`, "choice in referenced question");
    }
    if (response.goa < 1 || response.goa > 8) {
      return failure("invalid-value", `${path}.goa`, "integer 1..8");
    }
    if (
      (response.goa === 2 || response.goa === 3 || response.goa === 6) &&
      !nonBlank(response.reservation)
    ) {
      return failure("invalid-value", `${path}.reservation`, "nonblank string for GoA 2, 3, or 6");
    }
  }
  return success(undefined);
}

function validateResponseCoverage(
  responseIds: readonly string[],
  questions: ReadonlyMap<string, CanonicalElectionQuestion>,
  kind: "original" | "amend",
  context: BallotDecodeContext,
): ElectionCodecResult<void> {
  const targetIds = [...context.targetQuestionIds];
  if (targetIds.length === 0 || duplicate(targetIds) !== undefined) {
    return failure("coverage-mismatch", "$.responses", "nonempty unique targetQuestionIds");
  }
  for (const target of targetIds) {
    if (!questions.has(target)) {
      return failure("missing-reference", "$.responses", `target definition questionId ${target}`);
    }
  }
  const targets = new Set(targetIds);
  if (kind === "original" && !sameSet(responseIds, targetIds)) {
    return failure("coverage-mismatch", "$.responses", "exact targetQuestionIds coverage");
  }
  if (kind === "amend") {
    if (responseIds.some((id) => !targets.has(id))) {
      return failure("coverage-mismatch", "$.responses", "nonempty subset of targetQuestionIds");
    }
    const established = new Set(context.establishedQuestionIds ?? []);
    const forbidden = responseIds.find((id) => established.has(id));
    if (forbidden !== undefined) {
      return failure("invalid-value", "$.responses", `no established question; found ${forbidden}`);
    }
  }
  return success(undefined);
}

function parseBallotRef(raw: unknown): ElectionCodecResult<CanonicalBallotRef> {
  if (!isRecord(raw)) return failure("shape", "$.ref", "ballot reference object");
  const extra = unknownField(raw, ["electionId", "voter", "submittedAt"], "$.ref");
  if (extra !== null) return extra;
  if (!nonBlank(raw.electionId)) return failure("invalid-value", "$.ref.electionId", "nonblank string");
  if (!nonBlank(raw.voter)) return failure("invalid-value", "$.ref.voter", "nonblank string");
  if (!validTimestamp(raw.submittedAt)) {
    return failure("invalid-value", "$.ref.submittedAt", "second-precision UTC timestamp");
  }
  return success({ electionId: raw.electionId, voter: raw.voter, submittedAt: raw.submittedAt });
}

function buildBallot(
  raw: Record<string, unknown>,
  definition: CanonicalElectionDefinition,
  context: BallotDecodeContext,
  responses: readonly CanonicalBallotResponse[],
): ElectionCodecResult<CanonicalBallot> {
  // decodeBallot already rejected any kind outside the vocabulary, so the
  // narrowing here cannot invent a value the validator did not accept.
  const kind = raw.kind === "amend" ? "amend" : "original";
  const envelope = validateBallotEnvelope(raw, definition);
  if (!envelope.ok) return envelope;
  const validated = validateResponses(responses, definition, kind, context);
  if (!validated.ok) return validated;
  const base: CanonicalBallotBase = {
    schemaVersion: 2 as const,
    electionId: raw.electionId as string,
    voter: raw.voter as string,
    voterKind: raw.voterKind as VoterKind,
    responses: validated.value,
    submittedAt: raw.submittedAt as string,
    ...(raw.receivedAt === undefined ? {} : { receivedAt: raw.receivedAt as string }),
  };
  if (kind === "original") return success({ kind, ...base });
  const ref = parseBallotRef(raw.ref);
  if (!ref.ok) return ref;
  if (ref.value.electionId !== raw.electionId || ref.value.voter !== raw.voter) {
    return failure("missing-reference", "$.ref", "same electionId and voter as amend");
  }
  return success({ kind, ref: ref.value, ...base });
}

function validateBallotEnvelope(
  raw: Record<string, unknown>,
  definition: CanonicalElectionDefinition,
): ElectionCodecResult<void> {
  if (!nonBlank(raw.electionId)) return failure("invalid-value", "$.electionId", "nonblank string");
  if (!nonBlank(raw.voter)) return failure("invalid-value", "$.voter", "nonblank string");
  if (raw.voterKind !== "member" && raw.voterKind !== "subagent") {
    return failure("invalid-value", "$.voterKind", '"member" or "subagent"');
  }
  if (!validTimestamp(raw.submittedAt)) {
    return failure("invalid-value", "$.submittedAt", "second-precision UTC timestamp");
  }
  if (raw.receivedAt !== undefined && !validTimestamp(raw.receivedAt)) {
    return failure("invalid-value", "$.receivedAt", "second-precision UTC timestamp when present");
  }
  if (raw.electionId !== definition.electionId) {
    return failure("missing-reference", "$.electionId", "decoded election definition");
  }
  if (!definition.voters.includes(raw.voter)) {
    return failure("missing-reference", "$.voter", "voter in decoded election definition");
  }
  return success(undefined);
}

function decodeBallot(
  raw: Record<string, unknown>,
  definition: CanonicalElectionDefinition,
  context: BallotDecodeContext,
): ElectionCodecResult<CanonicalBallot> {
  const allowed = [
    "schemaVersion",
    "kind",
    "ref",
    "electionId",
    "voter",
    "voterKind",
    "responses",
    "submittedAt",
    "receivedAt",
  ];
  const extra = unknownField(raw, allowed, "$");
  if (extra !== null) return extra;
  if (raw.kind !== "original" && raw.kind !== "amend") {
    return failure("shape", "$.kind", 'required "original" or "amend"');
  }
  if (raw.kind === "original" && "ref" in raw) {
    return failure("shape", "$.ref", "absent for original ballot");
  }
  if (!Array.isArray(raw.responses) || raw.responses.length === 0) {
    return failure("shape", "$.responses", "nonempty response array");
  }
  const responses: CanonicalBallotResponse[] = [];
  for (let index = 0; index < raw.responses.length; index++) {
    const parsed = parseResponse(raw.responses[index], `$.responses[${index}]`);
    if (!parsed.ok) return parsed;
    responses.push(parsed.value);
  }
  return buildBallot(raw, definition, context, responses);
}

export const BallotCodec = {
  decode(
    raw: unknown,
    definition: CanonicalElectionDefinition,
    context: BallotDecodeContext,
  ): ElectionCodecResult<CanonicalBallot> {
    if (!isRecord(raw)) return failure("shape", "$", "ballot object");
    const version = requireCanonicalVersion(raw);
    return version.ok ? decodeBallot(raw, definition, context) : version;
  },

  encode(
    value: CanonicalBallot,
    definition: CanonicalElectionDefinition,
    context: BallotDecodeContext,
  ): ElectionCodecResult<string> {
    const checked = decodeBallot(value as unknown as Record<string, unknown>, definition, context);
    if (!checked.ok) return checked;
    const order = new Map(definition.questions.map((question, index) => [question.questionId, index]));
    const responses = [...checked.value.responses].sort(
      (left, right) => (order.get(left.questionId) ?? -1) - (order.get(right.questionId) ?? -1),
    );
    return success(JSON.stringify(canonicalBallotWire({ ...checked.value, responses })));
  },
};

function canonicalBallotWire(value: CanonicalBallot): unknown {
  const common = {
    schemaVersion: 2,
    kind: value.kind,
    ...(value.kind === "amend"
      ? {
          ref: {
            electionId: value.ref.electionId,
            voter: value.ref.voter,
            submittedAt: value.ref.submittedAt,
          },
        }
      : {}),
    electionId: value.electionId,
    voter: value.voter,
    voterKind: value.voterKind,
    responses: value.responses.map((response) => ({
      questionId: response.questionId,
      choiceInternalNo: response.choiceInternalNo,
      goa: response.goa,
      reservation: response.reservation,
      rationale: response.rationale,
    })),
    submittedAt: value.submittedAt,
    ...(value.receivedAt === undefined ? {} : { receivedAt: value.receivedAt }),
  };
  return common;
}

function parseGoaCounts(raw: unknown, path: string): ElectionCodecResult<CanonicalGoaCounts> {
  if (!isRecord(raw)) return failure("shape", path, "GoA counts object");
  const extra = unknownField(raw, ["favor", "against", "abstain", "discuss"], path);
  if (extra !== null) return extra;
  for (const field of ["favor", "against", "abstain", "discuss"] as const) {
    if (!Number.isInteger(raw[field]) || (raw[field] as number) < 0) {
      return failure("invalid-value", `${path}.${field}`, "nonnegative integer");
    }
  }
  return success({
    favor: raw.favor as number,
    against: raw.against as number,
    abstain: raw.abstain as number,
    discuss: raw.discuss as number,
  });
}

function parseQuestionResult(
  raw: unknown,
  path: string,
  questions: ReadonlyMap<string, CanonicalElectionQuestion>,
): ElectionCodecResult<CanonicalQuestionResult> {
  if (!isRecord(raw)) return failure("shape", path, "question result object");
  if (!nonBlank(raw.questionId)) return failure("invalid-value", `${path}.questionId`, "nonblank string");
  const question = questions.get(raw.questionId);
  if (question === undefined) {
    return failure("missing-reference", `${path}.questionId`, "definition questionId");
  }
  if (raw.kind === "hold") return parseHoldQuestionResult(raw, path);
  if (raw.kind !== "established") {
    return failure("invalid-value", `${path}.kind`, '"established" or "hold"');
  }
  return parseEstablishedQuestionResult(raw, path, question);
}

function parseHoldQuestionResult(
  raw: Record<string, unknown>,
  path: string,
): ElectionCodecResult<CanonicalQuestionResult> {
  const extra = unknownField(raw, ["questionId", "kind", "reason", "counts"], path);
  if (extra !== null) return extra;
  if (typeof raw.reason !== "string" || !HOLD_REASONS.has(raw.reason)) {
    return failure("invalid-value", `${path}.reason`, "closed HoldReason");
  }
  const counts = parseGoaCounts(raw.counts, `${path}.counts`);
  if (!counts.ok) return counts;
  return success({
    questionId: raw.questionId as string,
    kind: "hold",
    reason: raw.reason as HoldReason,
    counts: counts.value,
  });
}

function parseEstablishedQuestionResult(
  raw: Record<string, unknown>,
  path: string,
  question: CanonicalElectionQuestion,
): ElectionCodecResult<CanonicalQuestionResult> {
  const extra = unknownField(raw, ["questionId", "kind", "winner", "choiceCounts", "goa"], path);
  if (extra !== null) return extra;
  if (!isRecord(raw.winner)) return failure("shape", `${path}.winner`, "winner object");
  const winnerExtra = unknownField(raw.winner, ["internalNo", "label"], `${path}.winner`);
  if (winnerExtra !== null) return winnerExtra;
  if (!Number.isInteger(raw.winner.internalNo) || typeof raw.winner.label !== "string") {
    return failure("shape", `${path}.winner`, "integer internalNo and string label");
  }
  const winnerInternalNo = raw.winner.internalNo as number;
  const winnerLabel = raw.winner.label;
  const choices = new Map(question.choices.map((choice) => [choice.internalNo, choice]));
  const winningChoice = choices.get(winnerInternalNo);
  if (winningChoice === undefined || winningChoice.label !== winnerLabel) {
    return failure("missing-reference", `${path}.winner`, "exact choice in referenced question");
  }
  const parsedCounts = parseChoiceCounts(raw.choiceCounts, `${path}.choiceCounts`, question, choices);
  if (!parsedCounts.ok) return parsedCounts;
  const choiceCounts = parsedCounts.value;
  const goa = parseGoaCounts(raw.goa, `${path}.goa`);
  if (!goa.ok) return goa;
  return success({
    questionId: raw.questionId as string,
    kind: "established",
    winner: { internalNo: winnerInternalNo, label: winnerLabel },
    choiceCounts,
    goa: goa.value,
  });
}

function parseChoiceCounts(
  raw: unknown,
  path: string,
  question: CanonicalElectionQuestion,
  choices: ReadonlyMap<number, CanonicalElectionChoice>,
): ElectionCodecResult<readonly CanonicalChoiceCount[]> {
  if (!Array.isArray(raw)) return failure("shape", path, "choice count array");
  const choiceCounts: CanonicalChoiceCount[] = [];
  for (let index = 0; index < raw.length; index++) {
    const parsed = parseChoiceCount(raw[index], `${path}[${index}]`, choices);
    if (!parsed.ok) return parsed;
    choiceCounts.push(parsed.value);
  }
  const repeated = duplicate(choiceCounts.map((count) => count.internalNo));
  if (repeated !== undefined) {
    return failure("duplicate-id", path, `unique internalNo; duplicated ${repeated}`);
  }
  if (!sameNumberSet(choiceCounts.map((count) => count.internalNo), question.choices.map((choice) => choice.internalNo))) {
    return failure("coverage-mismatch", path, "every definition choice exactly once");
  }
  return success(choiceCounts);
}

function parseChoiceCount(
  raw: unknown,
  path: string,
  choices: ReadonlyMap<number, CanonicalElectionChoice>,
): ElectionCodecResult<CanonicalChoiceCount> {
  if (!isRecord(raw)) return failure("shape", path, "choice count object");
  const extra = unknownField(raw, ["internalNo", "label", "count"], path);
  if (extra !== null) return extra;
  if (
    !Number.isInteger(raw.internalNo) ||
    typeof raw.label !== "string" ||
    !Number.isInteger(raw.count) ||
    (raw.count as number) < 0
  ) {
    return failure("invalid-value", path, "choice identity and nonnegative integer count");
  }
  const choice = choices.get(raw.internalNo as number);
  if (choice === undefined || choice.label !== raw.label) {
    return failure("missing-reference", path, "exact choice in referenced question");
  }
  return success({ internalNo: raw.internalNo as number, label: raw.label, count: raw.count as number });
}

function sameNumberSet(left: readonly number[], right: readonly number[]): boolean {
  const expected = new Set(right);
  return left.length === expected.size && left.every((value) => expected.has(value));
}

function validateTallyCoverage(
  tally: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionCodecResult<CanonicalTally> {
  const known = new Set(definition.questions.map((question) => question.questionId));
  const targetDuplicate = duplicate(tally.targetQuestionIds);
  if (targetDuplicate !== undefined) {
    return failure("duplicate-id", "$.targetQuestionIds", `unique ids; duplicated ${targetDuplicate}`);
  }
  const unknownTarget = tally.targetQuestionIds.find((id) => !known.has(id));
  if (unknownTarget !== undefined) {
    return failure("missing-reference", "$.targetQuestionIds", `definition questionId; found ${unknownTarget}`);
  }
  const resultIds = tally.results.map((result) => result.questionId);
  const resultDuplicate = duplicate(resultIds);
  if (resultDuplicate !== undefined) {
    return failure("duplicate-id", "$.results", `unique questionId; duplicated ${resultDuplicate}`);
  }
  if (!sameSet(resultIds, [...known])) {
    return failure("coverage-mismatch", "$.results", "every definition question exactly once");
  }
  return success(tally);
}

function decodeTally(
  raw: Record<string, unknown>,
  definition: CanonicalElectionDefinition,
): ElectionCodecResult<CanonicalTally> {
  const extra = unknownField(
    raw,
    ["schemaVersion", "runId", "targetQuestionIds", "results", "preservedResultDigest", "talliedAt"],
    "$",
  );
  if (extra !== null) return extra;
  if (!nonBlank(raw.runId)) return failure("invalid-value", "$.runId", "nonblank string");
  if (!Array.isArray(raw.targetQuestionIds) || raw.targetQuestionIds.length === 0 || raw.targetQuestionIds.some((id) => !nonBlank(id))) {
    return failure("shape", "$.targetQuestionIds", "nonempty string array");
  }
  if (!Array.isArray(raw.results) || raw.results.length === 0) {
    return failure("shape", "$.results", "nonempty result array");
  }
  if (raw.preservedResultDigest !== null && (typeof raw.preservedResultDigest !== "string" || !SHA256.test(raw.preservedResultDigest))) {
    return failure("invalid-value", "$.preservedResultDigest", "sha256 digest or null");
  }
  if (!validTimestamp(raw.talliedAt)) {
    return failure("invalid-value", "$.talliedAt", "second-precision UTC timestamp");
  }
  const results: CanonicalQuestionResult[] = [];
  const questions = questionMap(definition);
  for (let index = 0; index < raw.results.length; index++) {
    const parsed = parseQuestionResult(raw.results[index], `$.results[${index}]`, questions);
    if (!parsed.ok) return parsed;
    results.push(parsed.value);
  }
  return validateTallyCoverage(
    {
      schemaVersion: 2,
      runId: raw.runId,
      targetQuestionIds: raw.targetQuestionIds as string[],
      results,
      preservedResultDigest: raw.preservedResultDigest,
      talliedAt: raw.talliedAt,
    },
    definition,
  );
}

export const TallyCodec = {
  decode(
    raw: unknown,
    definition: CanonicalElectionDefinition,
  ): ElectionCodecResult<CanonicalTally> {
    if (!isRecord(raw)) return failure("shape", "$", "tally object");
    const version = requireCanonicalVersion(raw);
    return version.ok ? decodeTally(raw, definition) : version;
  },

  encode(
    value: CanonicalTally,
    definition: CanonicalElectionDefinition,
  ): ElectionCodecResult<string> {
    const checked = decodeTally(value as unknown as Record<string, unknown>, definition);
    if (!checked.ok) return checked;
    const order = new Map(definition.questions.map((question, index) => [question.questionId, index]));
    const questions = questionMap(definition);
    const results = [...checked.value.results]
      .sort((left, right) => (order.get(left.questionId) ?? -1) - (order.get(right.questionId) ?? -1))
      .map((result) => canonicalResultWire(result, questions.get(result.questionId) as CanonicalElectionQuestion));
    const targets = [...checked.value.targetQuestionIds].sort(
      (left, right) => (order.get(left) ?? -1) - (order.get(right) ?? -1),
    );
    return success(
      JSON.stringify({
        schemaVersion: 2,
        runId: checked.value.runId,
        targetQuestionIds: targets,
        results,
        preservedResultDigest: checked.value.preservedResultDigest,
        talliedAt: checked.value.talliedAt,
      }),
    );
  },

  establishedResultsDigest(
    value: CanonicalTally,
    definition: CanonicalElectionDefinition,
  ): ElectionCodecResult<string> {
    const checked = decodeTally(value as unknown as Record<string, unknown>, definition);
    if (!checked.ok) return checked;
    const byId = new Map(checked.value.results.map((result) => [result.questionId, result]));
    const payload = definition.questions.flatMap((question) => {
      const result = byId.get(question.questionId);
      if (result === undefined || result.kind !== "established") return [];
      const counts = new Map(result.choiceCounts.map((count) => [count.internalNo, count]));
      return [
        {
          questionId: result.questionId,
          winner: { internalNo: result.winner.internalNo, label: result.winner.label },
          choiceCounts: question.choices.map((choice) => {
            const count = counts.get(choice.internalNo) as CanonicalChoiceCount;
            return { internalNo: count.internalNo, label: count.label, count: count.count };
          }),
          goa: {
            favor: result.goa.favor,
            against: result.goa.against,
            abstain: result.goa.abstain,
            discuss: result.goa.discuss,
          },
        },
      ];
    });
    const digest = canonicalContractValueDigest("election-established-results", payload);
    return digest.ok
      ? success(digest.value)
      : failure("invalid-value", "$.results", "canonical established result data");
  },
};

function canonicalResultWire(
  result: CanonicalQuestionResult,
  question: CanonicalElectionQuestion,
): unknown {
  if (result.kind === "hold") {
    return {
      questionId: result.questionId,
      kind: "hold",
      reason: result.reason,
      counts: {
        favor: result.counts.favor,
        against: result.counts.against,
        abstain: result.counts.abstain,
        discuss: result.counts.discuss,
      },
    };
  }
  const counts = new Map(result.choiceCounts.map((count) => [count.internalNo, count]));
  return {
    questionId: result.questionId,
    kind: "established",
    winner: { internalNo: result.winner.internalNo, label: result.winner.label },
    choiceCounts: question.choices.map((choice) => {
      const count = counts.get(choice.internalNo) as CanonicalChoiceCount;
      return { internalNo: count.internalNo, label: count.label, count: count.count };
    }),
    goa: {
      favor: result.goa.favor,
      against: result.goa.against,
      abstain: result.goa.abstain,
      discuss: result.goa.discuss,
    },
  };
}
