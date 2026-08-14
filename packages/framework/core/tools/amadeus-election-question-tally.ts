import {
  type CanonicalBallot,
  type CanonicalBallotResponse,
  type CanonicalElectionDefinition,
  type CanonicalGoaCounts,
  type CanonicalQuestionResult,
  type CanonicalTally,
  TallyV2Codec,
} from "./amadeus-election-codec.ts";
import type { HoldReason } from "./amadeus-election-model.ts";

export type BallotV2 = CanonicalBallot;
export type QuestionId = string;

export interface ResolvedResponse {
  readonly voter: string;
  readonly voterKind: CanonicalBallot["voterKind"];
  readonly receivedAt?: string;
  readonly response: CanonicalBallotResponse;
  readonly ballot: CanonicalBallot;
}

export interface LateResponse extends ResolvedResponse {
  readonly late: true;
  readonly reexamRequired: boolean;
}

export interface LateResponseClassification {
  readonly onTime: readonly ResolvedResponse[];
  readonly late: readonly LateResponse[];
}

export type TallyErrorCategory =
  | "target-invalid"
  | "target-preserved-overlap"
  | "result-coverage"
  | "response-coverage"
  | "preservation-mismatch"
  | "tally-invariant";

export interface TallyError {
  readonly category: TallyErrorCategory;
  readonly questionId?: string;
  readonly expected?: string;
  readonly actual?: string;
}

export type TallyPolicyResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: TallyError };

export interface ElectionTallyDraft {
  readonly targetResults: readonly CanonicalQuestionResult[];
  readonly results: readonly CanonicalQuestionResult[];
  readonly preservedResultDigest: string;
  readonly lifecycle: "partial" | "tallied";
}

const FAVOR = new Set([1, 2, 3, 6]);
const AGAINST = new Set([7, 8]);
type MutableGoaCounts = { -readonly [Key in keyof CanonicalGoaCounts]: CanonicalGoaCounts[Key] };

function ok<T>(value: T): TallyPolicyResult<T> {
  return { ok: true, value };
}

function fail(
  category: TallyErrorCategory,
  detail: Omit<TallyError, "category"> = {},
): TallyPolicyResult<never> {
  return { ok: false, error: { category, ...detail } };
}

function responseKey(voter: string, questionId: string): string {
  return `${voter.length}:${voter}${questionId}`;
}

export function resolveResponses(
  definition: CanonicalElectionDefinition,
  ballots: readonly BallotV2[],
): readonly ResolvedResponse[] {
  const resolved = new Map<string, ResolvedResponse>();
  for (const ballot of ballots) {
    for (const response of ballot.responses) {
      const key = responseKey(ballot.voter, response.questionId);
      const current = resolved.get(key);
      if ((ballot.receivedAt ?? "") >= (current?.receivedAt ?? "")) {
        resolved.set(key, {
          voter: ballot.voter,
          voterKind: ballot.voterKind,
          ...(ballot.receivedAt === undefined ? {} : { receivedAt: ballot.receivedAt }),
          response,
          ballot,
        });
      }
    }
  }
  const voterOrder = new Map(definition.voters.map((voter, index) => [voter, index]));
  const questionOrder = new Map(
    definition.questions.map((question, index) => [question.questionId, index]),
  );
  return [...resolved.values()].sort((left, right) => {
    const voterDifference =
      (voterOrder.get(left.voter) ?? Number.MAX_SAFE_INTEGER) -
      (voterOrder.get(right.voter) ?? Number.MAX_SAFE_INTEGER);
    if (voterDifference !== 0) return voterDifference;
    return (
      (questionOrder.get(left.response.questionId) ?? Number.MAX_SAFE_INTEGER) -
      (questionOrder.get(right.response.questionId) ?? Number.MAX_SAFE_INTEGER)
    );
  });
}

function resolvedFrom(
  ballot: BallotV2,
  response: CanonicalBallotResponse,
  receivedAt: string | undefined = ballot.receivedAt,
): ResolvedResponse {
  return {
    voter: ballot.voter,
    voterKind: ballot.voterKind,
    ...(receivedAt === undefined ? {} : { receivedAt }),
    response,
    ballot,
  };
}

export function classifyLateResponses(
  boundaries: ReadonlyMap<QuestionId, string>,
  receivedAt: string,
  ballot: BallotV2,
): LateResponseClassification {
  const onTime: ResolvedResponse[] = [];
  const late: LateResponse[] = [];
  for (const response of ballot.responses) {
    const resolved = resolvedFrom(ballot, response, receivedAt);
    const boundary = boundaries.get(response.questionId);
    if (boundary === undefined || receivedAt <= boundary) {
      onTime.push(resolved);
    } else {
      late.push({ ...resolved, receivedAt, late: true, reexamRequired: response.goa === 8 });
    }
  }
  return { onTime, late };
}

function emptyCounts(): MutableGoaCounts {
  return { favor: 0, against: 0, abstain: 0, discuss: 0 };
}

function goaCounts(responses: readonly ResolvedResponse[]): CanonicalGoaCounts {
  const counts: MutableGoaCounts = emptyCounts();
  for (const { response } of responses) {
    if (FAVOR.has(response.goa)) counts.favor++;
    else if (AGAINST.has(response.goa)) counts.against++;
    else if (response.goa === 4) counts.abstain++;
    else counts.discuss++;
  }
  return counts;
}

function consensusHold(
  counts: CanonicalGoaCounts,
  resolvedCount: number,
  voterCount: number,
): HoldReason | null {
  if (voterCount === 2) {
    if (resolvedCount < 2) return "quorum-short";
    if (counts.discuss >= 1) return "discussion-needed";
    if (counts.abstain >= 1) return "quorum-short";
    if (counts.favor === 1 && counts.against === 1) return "split";
    return null;
  }
  if (counts.discuss >= 2) return "discussion-needed";
  if (counts.favor + counts.against === 0) return "quorum-short";
  return null;
}

function responsesByQuestion(
  resolved: readonly ResolvedResponse[],
): ReadonlyMap<string, readonly ResolvedResponse[]> {
  const byQuestion = new Map<string, ResolvedResponse[]>();
  for (const item of resolved) {
    const responses = byQuestion.get(item.response.questionId);
    if (responses === undefined) byQuestion.set(item.response.questionId, [item]);
    else responses.push(item);
  }
  return byQuestion;
}

export function canEarlyTally(
  election: CanonicalElectionDefinition,
  resolved: readonly ResolvedResponse[],
  targetIds: readonly QuestionId[],
): ReadonlyMap<QuestionId, boolean> {
  const byQuestion = responsesByQuestion(resolved);
  const result = new Map<QuestionId, boolean>();
  for (const questionId of targetIds) {
    const responses = byQuestion.get(questionId) ?? [];
    const counts = goaCounts(responses);
    const hasBlock = responses.some(({ response }) => response.goa === 8);
    const policyEstablished =
      !hasBlock && consensusHold(counts, responses.length, election.voters.length) === null;
    const missing = Math.max(0, election.voters.length - responses.length);
    result.set(questionId, policyEstablished && counts.favor > counts.against + missing);
  }
  return result;
}

function validTargets(
  definition: CanonicalElectionDefinition,
  targetIds: readonly QuestionId[],
): TallyPolicyResult<ReadonlySet<string>> {
  const known = new Set(definition.questions.map((question) => question.questionId));
  const targets = new Set(targetIds);
  if (targetIds.length === 0 || targets.size !== targetIds.length) {
    return fail("target-invalid", { expected: "nonempty unique target question ids" });
  }
  const unknown = targetIds.find((questionId) => !known.has(questionId));
  return unknown === undefined
    ? ok(targets)
    : fail("target-invalid", { questionId: unknown, expected: "definition question id" });
}

function validateResolved(
  definition: CanonicalElectionDefinition,
  resolved: readonly ResolvedResponse[],
): TallyPolicyResult<void> {
  const voters = new Set(definition.voters);
  const questions = new Map(definition.questions.map((question) => [question.questionId, question]));
  const choiceIds = new Map(
    definition.questions.map((question) => [
      question.questionId,
      new Set(question.choices.map((choice) => choice.internalNo)),
    ]),
  );
  const seen = new Set<string>();
  for (const item of resolved) {
    const question = questions.get(item.response.questionId);
    const key = responseKey(item.voter, item.response.questionId);
    const validChoice = choiceIds.get(item.response.questionId)?.has(item.response.choiceInternalNo);
    if (
      item.ballot.electionId !== definition.electionId ||
      !voters.has(item.voter) ||
      question === undefined ||
      !validChoice ||
      item.response.goa < 1 ||
      item.response.goa > 8 ||
      seen.has(key)
    ) {
      return fail("response-coverage", { questionId: item.response.questionId });
    }
    seen.add(key);
  }
  return ok(undefined);
}

function preservedResults(
  definition: CanonicalElectionDefinition,
  previous: CanonicalTally | null,
): TallyPolicyResult<readonly CanonicalQuestionResult[]> {
  if (previous === null) return ok([]);
  const digest = TallyV2Codec.establishedResultsDigest(previous, definition);
  if (!digest.ok) return fail("tally-invariant", { expected: "valid prior canonical tally" });
  if (previous.preservedResultDigest !== null && previous.preservedResultDigest !== digest.value) {
    return fail("preservation-mismatch", {
      expected: previous.preservedResultDigest,
      actual: digest.value,
    });
  }
  return ok(previous.results.filter((result) => result.kind === "established"));
}

function validatePartition(
  definition: CanonicalElectionDefinition,
  targets: ReadonlySet<string>,
  preserved: readonly CanonicalQuestionResult[],
): TallyPolicyResult<void> {
  const preservedIds = new Set<string>();
  for (const result of preserved) {
    if (preservedIds.has(result.questionId)) {
      return fail("tally-invariant", { questionId: result.questionId });
    }
    if (targets.has(result.questionId)) {
      return fail("target-preserved-overlap", { questionId: result.questionId });
    }
    preservedIds.add(result.questionId);
  }
  const uncovered = definition.questions.find(
    (question) => !targets.has(question.questionId) && !preservedIds.has(question.questionId),
  );
  if (uncovered !== undefined || targets.size + preservedIds.size !== definition.questions.length) {
    return fail("result-coverage", { questionId: uncovered?.questionId });
  }
  return ok(undefined);
}

function tallyQuestion(
  question: CanonicalElectionDefinition["questions"][number],
  voterCount: number,
  responses: readonly ResolvedResponse[],
): TallyPolicyResult<CanonicalQuestionResult> {
  const questionId = question.questionId;
  const counts = goaCounts(responses);
  if (responses.some(({ response }) => response.goa === 8)) {
    return ok({ questionId, kind: "hold", reason: "block", counts });
  }
  const hold = consensusHold(counts, responses.length, voterCount);
  if (hold !== null) return ok({ questionId, kind: "hold", reason: hold, counts });
  const countsByChoice = new Map<number, number>();
  for (const item of responses) {
    if (item.response.goa === 4) continue;
    const internalNo = item.response.choiceInternalNo;
    countsByChoice.set(internalNo, (countsByChoice.get(internalNo) ?? 0) + 1);
  }
  const choiceCounts = question.choices.map((choice) => ({
    internalNo: choice.internalNo,
    label: choice.label,
    count: countsByChoice.get(choice.internalNo) ?? 0,
  }));
  const top = choiceCounts.reduce((maximum, choice) => Math.max(maximum, choice.count), 0);
  const leaders = choiceCounts.filter((choice) => choice.count === top);
  if (leaders.length !== 1) return ok({ questionId, kind: "hold", reason: "tie", counts });
  const winner = leaders[0];
  if (winner === undefined) return fail("tally-invariant", { questionId });
  return ok({
    questionId,
    kind: "established",
    winner: { internalNo: winner.internalNo, label: winner.label },
    choiceCounts,
    goa: counts,
  });
}

export function deriveLifecycle(
  results: readonly CanonicalQuestionResult[],
): "partial" | "tallied" {
  return results.some((result) => result.kind === "hold") ? "partial" : "tallied";
}

export function tallyQuestions(
  definition: CanonicalElectionDefinition,
  resolved: readonly ResolvedResponse[],
  targetIds: readonly QuestionId[],
  previous: CanonicalTally | null,
): TallyPolicyResult<ElectionTallyDraft> {
  const checkedTargets = validTargets(definition, targetIds);
  if (!checkedTargets.ok) return checkedTargets;
  const checkedResponses = validateResolved(definition, resolved);
  if (!checkedResponses.ok) return checkedResponses;
  const kept = preservedResults(definition, previous);
  if (!kept.ok) return kept;
  const partition = validatePartition(definition, checkedTargets.value, kept.value);
  if (!partition.ok) return partition;

  const byQuestion = responsesByQuestion(resolved);
  const targetResults: CanonicalQuestionResult[] = [];
  for (const question of definition.questions) {
    if (!checkedTargets.value.has(question.questionId)) continue;
    const result = tallyQuestion(question, definition.voters.length, byQuestion.get(question.questionId) ?? []);
    if (!result.ok) return result;
    targetResults.push(result.value);
  }
  const targetById = new Map(targetResults.map((result) => [result.questionId, result]));
  const preservedById = new Map(kept.value.map((result) => [result.questionId, result]));
  const results = definition.questions.map(
    (question) => targetById.get(question.questionId) ?? preservedById.get(question.questionId),
  );
  if (results.some((result) => result === undefined)) return fail("result-coverage");
  const complete = results as CanonicalQuestionResult[];
  const draftTally: CanonicalTally = {
    schemaVersion: 2,
    runId: "question-tally-draft",
    targetQuestionIds: [...targetIds],
    results: complete,
    preservedResultDigest: null,
    talliedAt: "1970-01-01T00:00:00Z",
  };
  const digest = TallyV2Codec.establishedResultsDigest(draftTally, definition);
  if (!digest.ok) return fail("tally-invariant", { expected: "canonical tally result" });
  return ok({
    targetResults,
    results: complete,
    preservedResultDigest: digest.value,
    lifecycle: deriveLifecycle(complete),
  });
}
