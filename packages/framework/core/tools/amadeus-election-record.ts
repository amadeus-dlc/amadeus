// U3 election-record (Bolt 3) — pure render/verify functions for the election
// tool. Turns an accepted ballot set into the persist-draft surfaces (GoA line,
// timeline line, ruling text) and machine-checks those surfaces against the
// ballots (reservation-count / ballot-count / freq / timeline-order). No fs, no
// clock — every function is total or returns a discriminated-union Result
// (functional-domain-modeling-ts). The CLI wiring (U5 render/verify verbs) is
// out of scope here (functional-design frontend-components N/A).
//
// The GoA line is byte-compatible with the real parseGoaLine
// (packages/framework/core/tools/amadeus-norm-metrics.ts): renderGoaLine
// carries the whole mapping burden so parseGoaLine's canonical schema never
// changes. Codes are constrained to parseGoaLine's own multi-segment accept
// domain at construction, fail-closed.

import {
  type Ballot,
  type Election,
  err,
  type Goa,
  ok,
  type Result,
  type TallyResult,
  type TimelineEvent,
} from "./amadeus-election-model";
import {
  type CanonicalBallot,
  type CanonicalElectionChoice,
  type CanonicalElectionDefinition,
  type CanonicalQuestionResult,
  type CanonicalTally,
  TallyV2Codec,
} from "./amadeus-election-codec.ts";
import {
  resolveResponses,
  tallyQuestions,
} from "./amadeus-election-question-tally.ts";

// --- GoaLineCode -----------------------------------------------------------

// Natural multi-segment codes are accepted; compressed single-segment legacy
// values remain accepted for stored-record compatibility.
export type GoaLineCode = string & { readonly __brand: "GoaLineCode" };

const GOA_LINE_CODE_RE = /^E-[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export const GoaLineCode = {
  parse(raw: unknown): Result<GoaLineCode, "goa-code-invalid"> {
    if (typeof raw !== "string" || !GOA_LINE_CODE_RE.test(raw)) return err("goa-code-invalid");
    return ok(raw as GoaLineCode);
  },
};

// --- GoaFreq ---------------------------------------------------------------

// The 8-bin (GoA 1..8) frequency distribution, recomputed from the accepted
// vote set. Fixed length 8; never persisted (domain-entities invariant — no
// document-shaped field). Index i holds the count of GoA (i+1).
export type GoaFreq = readonly [number, number, number, number, number, number, number, number];

export const GoaFreq = {
  fromVotes(votes: Goa[]): GoaFreq {
    const bins: [number, number, number, number, number, number, number, number] = [0, 0, 0, 0, 0, 0, 0, 0];
    for (const g of votes) bins[g - 1]++;
    return bins;
  },
};

// --- timeline & verify types (domain-entities declared columns) -------------

// Canonical TimelineEvent now lives in the U1 model (Bolt 3 declared
// reconciliation — U2 persists, U3 renders, both depend only on U1).
export type { TimelineEvent } from "./amadeus-election-model";

export type VerifyFinding = {
  kind: "reservation-count" | "ballot-count" | "freq-mismatch" | "timeline-order" | "kind-order";
  expected: string | number;
  actual: string | number;
};

// --- kind-order (state-machine legality) check class (#2125 FR-3) ----------

// Caller-supplied context for the kind-order class: which election is being
// verified (for the FR-3d ledger exemption) and the hold resolutions recorded
// in tally.json (a `resumedTo: "collecting"` resolution is a lawful reopen and
// grants one reopen of the collection segment — FR-3b). Kept structural so
// verifySelf stays pure: no fs, no clock, no store types.
export type KindOrderContext = {
  readonly electionId: string;
  readonly resolutions: ReadonlyArray<{ readonly resumedTo?: string }>;
};

// FR-3d: known-broken records that predate the #2125 guards. These timelines
// are faithful records of real operation sequences and are never rewritten
// (C-1), so verify exempts them from the kind-order class by name. Mechanical
// rescan at implementation ref (segment model with reopen budget) over
// amadeus/spaces/default/elections/*/timeline.json; 260803-e-esg-res13 is this
// intent's own §13 election, broken by an out-of-band tally while the intent
// was in flight.
const KIND_ORDER_LEDGER: ReadonlySet<string> = new Set([
  "E-CCCRA",
  "E-TCRRA1",
  "260724-e-hpugs13",
  "260724-e-tlau2",
  "260730-e-obb2-cgs13",
  "260801-e-cpg-u2abs",
  "260801-e-omsb4-dev",
  "260803-e-esg-res13",
  "260803-e-pi-nfrd-s13",
  "260803-e-rrp-fmcs13",
  "260803-e-sia-cgs13",
]);

// All findings are enumerated — verifySelf never stops at the first (FR-6b).
export type VerifyResult = Result<void, VerifyFinding[]>;

// --- render ----------------------------------------------------------------

// `GoA[<code>]: 1x<n> 2x<n> ... 8x<n>` — all 8 bins always emitted (0 included,
// never elided) so parseGoaLine round-trips byte-for-byte (BR-R1).
export function renderGoaLine(code: GoaLineCode, freq: GoaFreq): string {
  const bins = freq.map((n, i) => `${i + 1}x${n}`).join(" ");
  return `GoA[${code}]: ${bins}`;
}

// `配信 <t> → <voter> <t> → … → 開票 <t> → 後着 <voter> <t>` — one line, in the
// given event order (persist-vote-timeline-field shape).
export function renderTimeline(events: TimelineEvent[]): string {
  return events.map(timelineSegment).join(" → ");
}

function timelineSegment(e: TimelineEvent): string {
  switch (e.kind) {
    case "distributed":
      return `配信 ${e.at}`;
    case "ballot": {
      // Co-display the receipt time only when it diverges from the claimed time
      // (delay visualization, Issue #1262) — a same-instant receipt adds no
      // signal. Scoped to the ballot row per the E-BRARA1 e3 reservation (no
      // blanket receivedAt expansion across the other event renderers).
      const base = `${e.voter ?? "?"} ${e.at}`;
      return e.receivedAt !== undefined && e.receivedAt !== e.at
        ? `${base}(受理 ${e.receivedAt})`
        : base;
    }
    case "tallied":
      return `開票 ${e.at}`;
    case "late":
      return `後着 ${e.voter ?? "?"} ${e.at}`;
  }
}

// GoA values that require a reservation sentence (gradients-of-agreement 2/3/6).
const RESERVATION_GOA = new Set<number>([2, 3, 6]);
// Machine marker for a transcribed reservation line, both emitted by
// renderPersistDraft and counted by verifyReservations (one contract, two ends).
const RESERVATION_LINE_RE = /^- 留保\(/;

// The ruling line for an automatically-tallied result: an established result
// names the winning choice and its vote count, followed by the per-choice
// breakdown line (Issue #1261 — the ruling must reflect choiceInternalNo, not a
// choice-blind adopted/rejected). A hold names its typed reason. A human ruling
// over a hold is rendered separately (see renderPersistDraft's rulingOverride).
function rulingText(result: TallyResult): string {
  if (result.kind === "established") {
    const winnerCount =
      result.choiceCounts.find((c) => c.internalNo === result.winner.internalNo)?.count ?? 0;
    const breakdown = result.choiceCounts
      .map((c) => `choice${c.internalNo}=${c.count}票`)
      .join(" ");
    return `裁定: ${result.winner.label}(choice ${result.winner.internalNo}: ${winnerCount}票)\n内訳: ${breakdown}`;
  }
  return `裁定: 保留(${result.reason})`;
}

function reservationLines(ballots: Ballot[]): string[] {
  const lines: string[] = [];
  for (const b of ballots) {
    if (RESERVATION_GOA.has(b.goa)) {
      lines.push(`- 留保(${b.voter}, GoA${b.goa}): ${b.reservation ?? ""}`);
    }
  }
  return lines;
}

// Persist-draft skeleton: ruling + full reservation transcription (BR-R6, one
// line per GoA 2/3/6 ballot — citation-reservation-preservation) + timeline
// line + GoA line. Total over validated inputs; deterministic (BR-R5).
// `rulingOverride`, when supplied, replaces the derived ruling line verbatim.
// It carries a human hold-resolution ruling (裁定: 採用 / 裁定: 不採用), which is
// choice-blind and therefore not expressible as a tally winner — the caller
// computes it from the resolution and passes it in (Issue #1261 ruling A).
export function renderPersistDraft(
  code: GoaLineCode,
  _election: Election,
  result: TallyResult,
  ballots: Ballot[],
  timeline: TimelineEvent[],
  rulingOverride?: string,
): string {
  const freq = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  return [
    rulingOverride ?? rulingText(result),
    ...reservationLines(ballots),
    `票タイムライン: ${renderTimeline(timeline)}`,
    renderGoaLine(code, freq),
  ].join("\n");
}

// --- verify ----------------------------------------------------------------

// Reservation transcription count check (BR-R3, FR-6a): the number of ballots
// that require a reservation (GoA 2/3/6) must equal the number of transcribed
// reservation lines in `document`. Mismatch is a fail-closed reject.
export function verifyReservations(ballots: Ballot[], document: string): Result<void, VerifyFinding> {
  const required = ballots.filter((b) => RESERVATION_GOA.has(b.goa)).length;
  let transcribed = 0;
  for (const line of document.split("\n")) {
    if (RESERVATION_LINE_RE.test(line.trim())) transcribed++;
  }
  if (required !== transcribed) {
    return err({ kind: "reservation-count", expected: required, actual: transcribed });
  }
  return ok(undefined);
}

// The two ballot counts, each read from a SEPARATE file: `ledger` from
// ledger.json (the append lane), `materialized` from tally.json (the frozen set
// the record was rendered from). Naming them keeps the two sources apart at the
// call site (Issue #1457: two positional numbers taken from one array made this
// check `x === x`).
export type BallotCounts = { readonly ledger: number; readonly materialized: number };

// Self-check of a generated record against its own ballots (BR-R4, FR-6b) —
// three classes, all findings enumerated: ballot count (ledger vs materialized),
// GoA frequency (stored vs recomputed), timeline monotonicity (ISO strings sort
// chronologically). Every class compares one value the caller read off disk
// against one this function derives, never a value against itself (no
// verification-theatre self-reference).
export function verifySelf(
  counts: BallotCounts,
  ballots: Ballot[],
  storedFreq: GoaFreq,
  timeline: TimelineEvent[],
  kindOrder?: KindOrderContext,
): VerifyResult {
  const findings: VerifyFinding[] = [];
  if (counts.ledger !== counts.materialized) {
    findings.push({ kind: "ballot-count", expected: counts.ledger, actual: counts.materialized });
  }
  const recomputed = GoaFreq.fromVotes(ballots.map((b) => b.goa));
  if (!freqEqual(recomputed, storedFreq)) {
    findings.push({ kind: "freq-mismatch", expected: storedFreq.join(","), actual: recomputed.join(",") });
  }
  for (let i = 1; i < timeline.length; i++) {
    // Monotonicity is checked on the RECEIPT axis (Issue #1262): an agmsg-relayed
    // ballot can be accepted out of submittedAt order (relay delay), so the
    // claimed `at` is legitimately non-monotonic while the receipt order (the
    // append order) is monotonic. `receivedAt ?? at` is the single read fork —
    // every ballot/late event minted after the fix carries receivedAt; a pre-fix
    // in-flight record (opened before the fix) has none and is checked on the
    // legacy `at` axis. That fallback exists only for records already open at the
    // migration: no election is ever re-verified after the fix lands, so a new
    // election always has receivedAt on every timeline event.
    const prev = timeline[i - 1].receivedAt ?? timeline[i - 1].at;
    const cur = timeline[i].receivedAt ?? timeline[i].at;
    if (cur < prev) findings.push({ kind: "timeline-order", expected: prev, actual: cur });
  }
  // kind-order (#2125 FR-3): state-machine legality of the event SEQUENCE,
  // judged by position only — `at`/`receivedAt` never enter (orthogonal to
  // timeline-order, which owns the clock axis). A `tallied` closes the
  // collection segment; any later ballot / distributed / tallied is lawful
  // only against the reopen budget: one credit per `resumedTo: "collecting"`
  // hold resolution, and one credit reopens the whole segment until the next
  // tallied closes it again (FR-3b). Ledgered pre-guard records are exempt by
  // name (FR-3d).
  if (kindOrder !== undefined && !KIND_ORDER_LEDGER.has(kindOrder.electionId)) {
    let credits = kindOrder.resolutions.filter((r) => r.resumedTo === "collecting").length;
    let closed = false;
    for (const [i, e] of timeline.entries()) {
      if (!closed) {
        if (e.kind === "tallied") closed = true;
        continue;
      }
      if (e.kind === "ballot" || e.kind === "distributed" || e.kind === "tallied") {
        if (credits > 0) {
          credits--;
          closed = e.kind === "tallied";
        } else {
          findings.push({
            kind: "kind-order",
            expected: "no ballot/distributed/tallied after tallied without a collecting reopen",
            actual: `${e.kind}#${i}`,
          });
        }
      }
    }
  }
  return findings.length === 0 ? ok(undefined) : err(findings);
}

function freqEqual(a: GoaFreq, b: GoaFreq): boolean {
  for (let i = 0; i < 8; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// --- canonical multi-question record surface ------------------------------

export interface DistributionChoiceV2 extends CanonicalElectionChoice {
  readonly displayNo: number;
}

export interface DistributionQuestionV2 {
  readonly questionId: string;
  readonly text: string;
  readonly ordered: readonly DistributionChoiceV2[];
}

export interface DistributionViewV2 {
  readonly electionId: string;
  readonly voter: string;
  readonly questions: readonly DistributionQuestionV2[];
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
): readonly DistributionChoiceV2[] {
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
): DistributionViewV2 {
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

export interface ElectionRecordTimelineEvent {
  readonly schemaVersion?: 2;
  readonly kind: string;
  readonly runId?: string;
  readonly questionIds?: readonly string[];
  readonly at: string;
  readonly receivedAt?: string;
  readonly voter?: string;
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
  return events.map((event) => {
    const run = event.runId === undefined ? "" : ` run=${event.runId}`;
    const questions = event.questionIds === undefined ? "" : ` questions=${event.questionIds.join(",")}`;
    const voter = event.voter === undefined ? "" : ` voter=${event.voter}`;
    const receipt = event.receivedAt === undefined ? "" : ` received=${event.receivedAt}`;
    return `- ${event.kind} at=${event.at}${receipt}${run}${questions}${voter}`;
  });
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
  const leftBytes = TallyV2Codec.encode(left, definition);
  const rightBytes = TallyV2Codec.encode(right, definition);
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
    materializedBallots: input.materializedBallots,
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

function verifyResponseCoverage(
  input: ElectionRecordVerificationInput,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const ledger = latestResponses(input.ledgerBallots);
  const materialized = latestResponses(input.materializedBallots);
  for (const voter of input.definition.voters) {
    for (const questionId of expectedIds) {
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
  const responses = responsesForQuestion(input.materializedBallots, questionId);
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
    resolveResponses(input.definition, input.materializedBallots),
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
  const digest = TallyV2Codec.establishedResultsDigest(previous, definition);
  if (!digest.ok || digest.value !== current.preservedResultDigest) {
    findings.push({
      kind: "digest-mismatch",
      expected: digest.ok ? digest.value : "valid established digest",
      actual: current.preservedResultDigest ?? "null",
    });
  }
  return findings;
}

function verifyTimelineSources(
  input: ElectionRecordVerificationInput,
  expectedIds: readonly string[],
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const knownRuns = new Set(input.history.map((entry) => entry.runId));
  const knownQuestions = new Set(expectedIds);
  for (let index = 0; index < input.timeline.length; index++) {
    const event = input.timeline[index] as ElectionRecordTimelineEvent;
    const previous = input.timeline[index - 1];
    findings.push(...verifyTimelineEvent(event, previous, knownRuns, knownQuestions));
  }
  return findings;
}

function verifyTimelineEvent(
  event: ElectionRecordTimelineEvent,
  previous: ElectionRecordTimelineEvent | undefined,
  knownRuns: ReadonlySet<string>,
  knownQuestions: ReadonlySet<string>,
): ElectionRecordFinding[] {
  const findings: ElectionRecordFinding[] = [];
  const axis = event.receivedAt ?? event.at;
  const previousAxis = previous === undefined ? axis : previous.receivedAt ?? previous.at;
  if (axis < previousAxis) {
    findings.push({ kind: "timeline-order", expected: previousAxis, actual: axis });
  }
  if (event.runId !== undefined && !knownRuns.has(event.runId)) {
    findings.push({ kind: "history-mismatch", expected: "history runId", actual: event.runId });
  }
  for (const questionId of event.questionIds ?? []) {
    if (!knownQuestions.has(questionId)) {
      findings.push({
        kind: "result-mismatch",
        questionId,
        expected: "definition question id",
        actual: "unknown",
      });
    }
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
    ...verifyResponseCoverage(input, expectedIds),
    ...verifyCurrentResults(input, expectedIds),
    ...verifyHistorySources(input),
    ...verifyTimelineSources(input, expectedIds),
  ];
  return findings.length === 0 ? ok(undefined) : err(findings);
}
