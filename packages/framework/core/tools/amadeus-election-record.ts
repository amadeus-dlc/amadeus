// amadeus-election-record.ts — pure render/verify functions for the election
// record. Turns a canonical tally and its ballot set into the record.md surface
// and machine-checks that surface back against the stored facts (section
// identity, response coverage, recomputed counts, history and timeline
// sources). No fs, no clock — every function is total or returns a
// discriminated-union Result (functional-domain-modeling-ts).

import {
  type CanonicalBallot,
  type CanonicalElectionChoice,
  type CanonicalElectionDefinition,
  type CanonicalQuestionResult,
  type CanonicalTally,
  TallyCodec,
} from "./amadeus-election-codec.ts";
import { err, ok, type Result } from "./amadeus-election-model.ts";
import { resolveResponses, tallyQuestions } from "./amadeus-election-question-tally.ts";

// --- canonical multi-question record surface ------------------------------

export interface DistributionChoice extends CanonicalElectionChoice {
  readonly displayNo: number;
}

export interface DistributionQuestion {
  readonly questionId: string;
  readonly text: string;
  readonly ordered: readonly DistributionChoice[];
}

export interface DistributionView {
  readonly electionId: string;
  readonly voter: string;
  readonly questions: readonly DistributionQuestion[];
}

function viewSeed(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index++) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function viewRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffledChoices(
  electionId: string,
  voter: string,
  questionId: string,
  choices: readonly CanonicalElectionChoice[],
): readonly DistributionChoice[] {
  const random = viewRandom(viewSeed(`${electionId}:${voter}:${questionId}`));
  const ordered = [...choices];
  for (let index = ordered.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [ordered[index], ordered[swap]] = [ordered[swap] as CanonicalElectionChoice, ordered[index] as CanonicalElectionChoice];
  }
  return ordered.map((choice, index) => ({ ...choice, displayNo: index + 1 }));
}

// A single voter view contains every question. The output shape deliberately
// has no peer vote, status, recommendation, or response field.
export function buildDistributionView(
  election: CanonicalElectionDefinition,
  voter: string,
): DistributionView {
  return {
    electionId: election.electionId,
    voter,
    questions: election.questions.map((question) => ({
      questionId: question.questionId,
      text: question.text,
      ordered: shuffledChoices(
        election.electionId,
        voter,
        question.questionId,
        question.choices,
      ),
    })),
  };
}

export interface ElectionRecordLateResponse {
  readonly voter: string;
  readonly questionId: string;
  readonly receivedAt: string;
  readonly reason: string;
}

// The one event the store books: a tally run entering the record's timeline.
export interface ElectionRecordTimelineEvent {
  readonly schemaVersion: 2;
  readonly kind: "tallied";
  readonly runId: string;
  readonly at: string;
}

export type ElectionRecordLifecycle = "partial" | "tallied";

export interface ElectionRecordInput {
  readonly definition: CanonicalElectionDefinition;
  readonly tally: CanonicalTally;
  readonly lifecycle: ElectionRecordLifecycle;
  readonly materializedBallots: readonly CanonicalBallot[];
  readonly lateResponses: readonly ElectionRecordLateResponse[];
  readonly history: readonly CanonicalTally[];
  readonly timeline: readonly ElectionRecordTimelineEvent[];
}

export type ElectionRecordFindingKind =
  | "missing-question"
  | "duplicate-question"
  | "result-mismatch"
  | "count-mismatch"
  | "reservation-mismatch"
  | "history-mismatch"
  | "digest-mismatch"
  | "timeline-order"
  | "summary-mismatch";

export interface ElectionRecordFinding {
  readonly kind: ElectionRecordFindingKind;
  readonly questionId?: string;
  readonly expected: string;
  readonly actual: string;
}

export interface ElectionRecordVerificationInput {
  readonly definition: CanonicalElectionDefinition;
  readonly ledgerBallots: readonly CanonicalBallot[];
  readonly materializedBallots: readonly CanonicalBallot[];
  readonly history: readonly CanonicalTally[];
  readonly currentTally: CanonicalTally;
  readonly lifecycle: ElectionRecordLifecycle;
  readonly lateResponses: readonly ElectionRecordLateResponse[];
  readonly timeline: readonly ElectionRecordTimelineEvent[];
  readonly record: string;
}

export type ElectionRecordVerificationResult = Result<void, readonly ElectionRecordFinding[]>;

const RECORD_RESERVATION_GOA = new Set([2, 3, 6]);

function goaLine(counts: { favor: number; against: number; abstain: number; discuss: number }): string {
  return `GoA: favor=${counts.favor} against=${counts.against} abstain=${counts.abstain} discuss=${counts.discuss}`;
}

function ballotIdentity(ballot: CanonicalBallot): string {
  return `${ballot.kind}:${ballot.submittedAt}`;
}

function questionReservations(
  definition: CanonicalElectionDefinition,
  ballots: readonly CanonicalBallot[],
  questionId: string,
): string[] {
  return resolveResponses(definition, ballots).flatMap(({ voter, ballot, response }) => {
    if (
      response.questionId !== questionId ||
      !RECORD_RESERVATION_GOA.has(response.goa) ||
      response.reservation === null
    ) {
      return [];
    }
    return [
      `- Reservation ${voter} [${ballotIdentity(ballot)}] GoA ${response.goa}: ${response.reservation}`,
    ];
  });
}

function questionResultLines(result: CanonicalQuestionResult): string[] {
  if (result.kind === "hold") return [`Hold: ${result.reason}`, goaLine(result.counts)];
  return [
    `Established: ${result.winner.label} (choice ${result.winner.internalNo})`,
    "Choice counts:",
    ...result.choiceCounts.map(
      (choice) => `- Choice ${choice.internalNo} ${choice.label}: ${choice.count}`,
    ),
    goaLine(result.goa),
  ];
}

function goaFrequencyLine(
  responses: readonly CanonicalBallot["responses"][number][],
): string {
  const frequency = [0, 0, 0, 0, 0, 0, 0, 0];
  for (const response of responses) frequency[response.goa - 1] = (frequency[response.goa - 1] ?? 0) + 1;
  return `GoA frequency: ${frequency.map((count, index) => `${index + 1}x${count}`).join(" ")}`;
}

function questionSection(input: ElectionRecordInput, questionId: string): string {
  const question = input.definition.questions.find((candidate) => candidate.questionId === questionId);
  const result = input.tally.results.find((candidate) => candidate.questionId === questionId);
  if (question === undefined || result === undefined) return "";
  const reservations = questionReservations(input.definition, input.materializedBallots, questionId);
  const late = input.lateResponses
    .filter((response) => response.questionId === questionId)
    .map(
      (response) =>
        `- Late ${response.voter} at ${response.receivedAt}: ${response.reason}`,
    );
  const lineage = input.history
    .filter((entry) => entry.targetQuestionIds.includes(questionId))
    .map((entry) => entry.runId);
  return [
    `## Question ${question.questionId}: ${question.text}`,
    ...questionResultLines(result),
    ...(result.kind === "established"
      ? [goaFrequencyLine(responsesForQuestion(input.materializedBallots, questionId))]
      : []),
    "Reservations:",
    ...(reservations.length === 0 ? ["- None"] : reservations),
    "Late responses:",
    ...(late.length === 0 ? ["- None"] : late),
    `Run lineage: ${lineage.join(" -> ") || "none"}`,
  ].join("\n");
}

function timelineLines(events: readonly ElectionRecordTimelineEvent[]): string[] {
  return events.map((event) => `- ${event.kind} at=${event.at} run=${event.runId}`);
}

function recordSummary(input: ElectionRecordInput): string {
  const established = input.tally.results.filter((result) => result.kind === "established").length;
  const held = input.definition.questions.flatMap((question) => {
    const result = input.tally.results.find((candidate) => candidate.questionId === question.questionId);
    return result?.kind === "hold" ? [question.questionId] : [];
  });
  return [
    "# Election Record",
    `Election ID: ${input.definition.electionId}`,
    `Run ID: ${input.tally.runId}`,
    `Lifecycle: ${input.lifecycle}`,
    `Established questions: ${established}`,
    `Hold questions: ${held.length}`,
    `Held question IDs: ${held.join(", ") || "none"}`,
  ].join("\n");
}

export function renderElectionRecord(input: ElectionRecordInput): string {
  const sections = input.definition.questions.map((question) =>
    questionSection(input, question.questionId),
  );
  return [
    recordSummary(input),
    ...sections,
    ["## Timeline", ...timelineLines(input.timeline)].join("\n"),
  ].join("\n\n");
}

function recordSections(record: string): ReadonlyMap<string, readonly string[]> {
  const sections = new Map<string, string[]>();
  const matches = [...record.matchAll(/^## Question ([^:\n]+):[^\n]*$/gm)];
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index] as RegExpMatchArray;
    const id = match[1] as string;
    const start = match.index as number;
    const end = matches[index + 1]?.index ?? record.indexOf("\n\n## Timeline", start);
    const text = record.slice(start, end < 0 ? record.length : end).trim();
    const existing = sections.get(id);
    if (existing === undefined) sections.set(id, [text]);
    else existing.push(text);
  }
  return sections;
}

function sameCanonicalTally(
  left: CanonicalTally,
  right: CanonicalTally,
  definition: CanonicalElectionDefinition,
): boolean {
  const leftBytes = TallyCodec.encode(left, definition);
  const rightBytes = TallyCodec.encode(right, definition);
  return leftBytes.ok && rightBytes.ok && leftBytes.value === rightBytes.value;
}

function responseKey(voter: string, questionId: string): string {
  return `${voter.length}:${voter}:${questionId}`;
}

function latestResponses(ballots: readonly CanonicalBallot[]): ReadonlyMap<string, string> {
  const latest = new Map<string, { axis: string; value: string }>();
  for (const ballot of ballots) {
    for (const response of ballot.responses) {
      const key = responseKey(ballot.voter, response.questionId);
      const axis = ballot.receivedAt ?? "";
      const value = JSON.stringify({ ballot: ballotIdentity(ballot), response });
      if (axis >= (latest.get(key)?.axis ?? "")) latest.set(key, { axis, value });
    }
  }
  return new Map([...latest].map(([key, entry]) => [key, entry.value]));
}

function addSectionFindings(
  findings: ElectionRecordFinding[],
  questionId: string,
  expected: string,
  actual: string,
): void {
  const initialCount = findings.length;
  const expectedLines = expected.split("\n");
  const actualLines = actual.split("\n");
  const groups: Array<{ kind: ElectionRecordFindingKind; match: (line: string) => boolean }> = [
    { kind: "count-mismatch", match: (line) => line.startsWith("- Choice ") || line.startsWith("GoA: ") || line.startsWith("GoA frequency: ") },
    { kind: "reservation-mismatch", match: (line) => line.startsWith("- Reservation ") },
    { kind: "result-mismatch", match: (line) => line.startsWith("## Question ") || line.startsWith("Established: ") || line.startsWith("Hold: ") || line.startsWith("- Late ") || line.startsWith("Run lineage: ") },
  ];
  for (const group of groups) {
    const left = expectedLines.filter(group.match).join("\n");
    const right = actualLines.filter(group.match).join("\n");
    if (left !== right) findings.push({ kind: group.kind, questionId, expected: left, actual: right });
  }
  if (expected !== actual && findings.length === initialCount) {
    findings.push({ kind: "result-mismatch", questionId, expected, actual });
  }
}

function verifySectionIdentity(
  input: ElectionRecordVerificationInput,
  sections: ReadonlyMap<string, readonly string[]>,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const actualIds = [...input.record.matchAll(/^## Question ([^:\n]+):/gm)].map(
    (match) => match[1] as string,
  );
  for (const questionId of expectedIds) {
    const count = sections.get(questionId)?.length ?? 0;
    if (count === 0) findings.push({ kind: "missing-question", questionId, expected: "1", actual: "0" });
    if (count > 1) findings.push({ kind: "duplicate-question", questionId, expected: "1", actual: String(count) });
  }
  for (const questionId of sections.keys()) {
    if (!expectedIds.includes(questionId)) {
      findings.push({ kind: "result-mismatch", questionId, expected: "definition question id", actual: "unknown" });
    }
  }
  if (actualIds.length === expectedIds.length && actualIds.some((id, index) => id !== expectedIds[index])) {
    findings.push({
      kind: "result-mismatch",
      expected: expectedIds.join(","),
      actual: actualIds.join(","),
    });
  }
  return findings;
}

function verifyRenderedContent(
  input: ElectionRecordVerificationInput,
  sections: ReadonlyMap<string, readonly string[]>,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const expectedInput: ElectionRecordInput = {
    definition: input.definition,
    tally: input.currentTally,
    lifecycle: input.lifecycle,
    materializedBallots: input.ledgerBallots,
    lateResponses: input.lateResponses,
    history: input.history,
    timeline: input.timeline,
  };
  const expectedRecord = renderElectionRecord(expectedInput);
  const expectedSummary = expectedRecord.split("\n\n## Question", 1)[0] as string;
  const actualSummary = input.record.split("\n\n## Question", 1)[0] as string;
  if (expectedSummary !== actualSummary) {
    findings.push({ kind: "summary-mismatch", expected: expectedSummary, actual: actualSummary });
  }
  const expectedSections = recordSections(expectedRecord);
  for (const questionId of expectedIds) {
    const expected = expectedSections.get(questionId)?.[0];
    const actual = sections.get(questionId)?.[0];
    if (expected !== undefined && actual !== undefined) addSectionFindings(findings, questionId, expected, actual);
  }
  const expectedTimeline = expectedRecord.split("\n\n## Timeline")[1] ?? "";
  const actualTimeline = input.record.split("\n\n## Timeline")[1] ?? "";
  if (expectedTimeline !== actualTimeline) {
    findings.push({ kind: "timeline-order", expected: expectedTimeline, actual: actualTimeline });
  }
  return findings;
}

// The ledger holds every accepted ballot; the materialized store holds each
// voter's latest ballot only, which covers exactly the questions of the current
// run. The two must agree on those questions — a divergence means the
// materialized copy is stale, tampered with, or was never written.
function verifyResponseCoverage(input: ElectionRecordVerificationInput): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const ledger = latestResponses(input.ledgerBallots);
  const materialized = latestResponses(input.materializedBallots);
  for (const voter of input.definition.voters) {
    for (const questionId of input.currentTally.targetQuestionIds) {
      const key = responseKey(voter, questionId);
      if (ledger.get(key) !== materialized.get(key)) {
        findings.push({
          kind: "result-mismatch",
          questionId,
          expected: ledger.get(key) ?? "missing",
          actual: materialized.get(key) ?? "missing",
        });
      }
    }
  }
  return findings;
}

function responsesForQuestion(
  ballots: readonly CanonicalBallot[],
  questionId: string,
): readonly CanonicalBallot["responses"][number][] {
  const latest = new Map<string, { axis: string; response: CanonicalBallot["responses"][number] }>();
  for (const ballot of ballots) {
    const response = ballot.responses.find((candidate) => candidate.questionId === questionId);
    if (response === undefined) continue;
    const axis = ballot.receivedAt ?? "";
    if (axis >= (latest.get(ballot.voter)?.axis ?? "")) latest.set(ballot.voter, { axis, response });
  }
  return [...latest.values()].map((entry) => entry.response);
}

function recomputedGoa(
  responses: readonly CanonicalBallot["responses"][number][],
): { favor: number; against: number; abstain: number; discuss: number } {
  const counts = { favor: 0, against: 0, abstain: 0, discuss: 0 };
  for (const response of responses) {
    if ([1, 2, 3, 6].includes(response.goa)) counts.favor++;
    else if ([7, 8].includes(response.goa)) counts.against++;
    else if (response.goa === 4) counts.abstain++;
    else counts.discuss++;
  }
  return counts;
}

function verifyQuestionCounts(
  input: ElectionRecordVerificationInput,
  questionId: string,
): ElectionRecordFinding[] {
  const result = input.currentTally.results.find((candidate) => candidate.questionId === questionId);
  if (result === undefined) {
    return [{ kind: "result-mismatch", questionId, expected: "question result", actual: "missing" }];
  }
  const responses = responsesForQuestion(input.ledgerBallots, questionId);
  const actualGoa = recomputedGoa(responses);
  const storedGoa = result.kind === "established" ? result.goa : result.counts;
  const findings: ElectionRecordFinding[] = [];
  if (JSON.stringify(storedGoa) !== JSON.stringify(actualGoa)) {
    findings.push({
      kind: "count-mismatch",
      questionId,
      expected: JSON.stringify(actualGoa),
      actual: JSON.stringify(storedGoa),
    });
  }
  if (result.kind === "hold") return findings;
  findings.push(...verifyEstablishedCounts(result, responses, questionId));
  return findings;
}

function verifyEstablishedCounts(
  result: Extract<CanonicalQuestionResult, { kind: "established" }>,
  responses: readonly CanonicalBallot["responses"][number][],
  questionId: string,
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const recomputedChoices = new Map<number, number>();
  for (const response of responses) {
    if (response.goa === 4) continue;
    recomputedChoices.set(
      response.choiceInternalNo,
      (recomputedChoices.get(response.choiceInternalNo) ?? 0) + 1,
    );
  }
  for (const count of result.choiceCounts) {
    const recomputed = recomputedChoices.get(count.internalNo) ?? 0;
    if (count.count !== recomputed) {
      findings.push({
        kind: "count-mismatch",
        questionId,
        expected: `${count.internalNo}:${recomputed}`,
        actual: `${count.internalNo}:${count.count}`,
      });
    }
  }
  const maximum = Math.max(...result.choiceCounts.map((count) => count.count));
  const leaders = result.choiceCounts.filter((count) => count.count === maximum);
  if (leaders.length !== 1 || leaders[0]?.internalNo !== result.winner.internalNo) {
    findings.push({
      kind: "result-mismatch",
      questionId,
      expected: leaders.length === 1 ? String(leaders[0]?.internalNo) : "unique winner",
      actual: String(result.winner.internalNo),
    });
  }
  return findings;
}

function verifyCurrentResults(
  input: ElectionRecordVerificationInput,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  return [
    ...expectedIds.flatMap((questionId) => verifyQuestionCounts(input, questionId)),
    ...verifyRecomputedTally(input, expectedIds),
  ];
}

function verifyRecomputedTally(
  input: ElectionRecordVerificationInput,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  const previous = input.history.length > 1 ? input.history.at(-2) ?? null : null;
  const recomputed = tallyQuestions(
    input.definition,
    resolveResponses(input.definition, input.ledgerBallots),
    input.currentTally.targetQuestionIds,
    previous,
  );
  if (!recomputed.ok) {
    return [{
      kind: "result-mismatch",
      expected: "reproducible current tally",
      actual: recomputed.error.category,
    }];
  }
  const expectedById = new Map(
    recomputed.value.results.map((result) => [result.questionId, result]),
  );
  const actualById = new Map(
    input.currentTally.results.map((result) => [result.questionId, result]),
  );
  const findings = expectedIds.flatMap((questionId): ElectionRecordFinding[] => {
    const expected = expectedById.get(questionId);
    const actual = actualById.get(questionId);
    return JSON.stringify(expected) === JSON.stringify(actual)
      ? []
      : [{
          kind: "result-mismatch",
          questionId,
          expected: JSON.stringify(expected ?? "missing"),
          actual: JSON.stringify(actual ?? "missing"),
        }];
  });
  if (input.lifecycle !== recomputed.value.lifecycle) {
    findings.push({
      kind: "result-mismatch",
      expected: recomputed.value.lifecycle,
      actual: input.lifecycle,
    });
  }
  return findings;
}

function verifyHistorySources(input: ElectionRecordVerificationInput): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const historyLatest = input.history.at(-1);
  if (historyLatest === undefined || !sameCanonicalTally(historyLatest, input.currentTally, input.definition)) {
    findings.push({
      kind: "history-mismatch",
      expected: historyLatest?.runId ?? "history entry",
      actual: input.currentTally.runId,
    });
  }
  for (let index = 1; index < input.history.length; index++) {
    const previous = input.history[index - 1] as CanonicalTally;
    const current = input.history[index] as CanonicalTally;
    findings.push(...verifyHistoryTransition(previous, current, input.definition));
  }
  return findings;
}

function verifyHistoryTransition(
  previous: CanonicalTally,
  current: CanonicalTally,
  definition: CanonicalElectionDefinition,
): ElectionRecordFinding[] {
  if (current.targetQuestionIds.length === definition.questions.length) return [];
  const findings: ElectionRecordFinding[] = [];
  const targets = new Set(current.targetQuestionIds);
  const previousById = new Map(previous.results.map((result) => [result.questionId, result]));
  for (const result of current.results) {
    const prior = previousById.get(result.questionId);
    if (!targets.has(result.questionId) && JSON.stringify(result) !== JSON.stringify(prior)) {
      findings.push({
        kind: "history-mismatch",
        questionId: result.questionId,
        expected: JSON.stringify(prior ?? "missing"),
        actual: JSON.stringify(result),
      });
    }
  }
  const digest = TallyCodec.establishedResultsDigest(previous, definition);
  if (!digest.ok || digest.value !== current.preservedResultDigest) {
    findings.push({
      kind: "digest-mismatch",
      expected: digest.ok ? digest.value : "valid established digest",
      actual: current.preservedResultDigest ?? "null",
    });
  }
  return findings;
}

function verifyTimelineSources(input: ElectionRecordVerificationInput): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const knownRuns = new Set(input.history.map((entry) => entry.runId));
  for (let index = 0; index < input.timeline.length; index++) {
    const event = input.timeline[index] as ElectionRecordTimelineEvent;
    findings.push(...verifyTimelineEvent(event, input.timeline[index - 1], knownRuns));
  }
  return findings;
}

function verifyTimelineEvent(
  event: ElectionRecordTimelineEvent,
  previous: ElectionRecordTimelineEvent | undefined,
  knownRuns: ReadonlySet<string>,
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  if (previous !== undefined && event.at < previous.at) {
    findings.push({ kind: "timeline-order", expected: previous.at, actual: event.at });
  }
  if (!knownRuns.has(event.runId)) {
    findings.push({ kind: "history-mismatch", expected: "history runId", actual: event.runId });
  }
  return findings;
}

export function verifyElectionRecord(
  input: ElectionRecordVerificationInput,
): ElectionRecordVerificationResult {
  const expectedIds = input.definition.questions.map((question) => question.questionId);
  const sections = recordSections(input.record);
  const findings = [
    ...verifySectionIdentity(input, sections, expectedIds),
    ...verifyRenderedContent(input, sections, expectedIds),
    ...verifyResponseCoverage(input),
    ...verifyCurrentResults(input, expectedIds),
    ...verifyHistorySources(input),
    ...verifyTimelineSources(input),
  ];
  return findings.length === 0 ? ok(undefined) : err(findings);
}
